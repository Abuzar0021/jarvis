"""
Jarvis V2 — FastAPI application entry point.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.core.config import settings
from backend.core.events import init_bus

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Jarvis V2 backend...")

    # Event bus
    bus = await init_bus(settings.REDIS_URL)
    app.state.bus = bus

    # Database
    try:
        from backend.db.session import create_tables
        await create_tables()
        logger.info("Database tables created/verified")
    except Exception as exc:
        logger.warning("DB init warning (may be ok if migrations manage schema): %s", exc)

    # Browser pool
    try:
        from backend.browser.automation import BrowserPool
        from backend.core.workflow_engine import set_browser_pool
        pool = BrowserPool(bus)
        set_browser_pool(pool)
        app.state.browser_pool = pool
        logger.info("Browser pool ready")
    except ImportError:
        logger.warning("Playwright not installed — browser tools unavailable")
        app.state.browser_pool = None

    # Load built-in tools
    try:
        import backend.tools.builtin.web  # noqa: F401
        import backend.tools.builtin.code  # noqa: F401
        import backend.tools.builtin.memory_tools  # noqa: F401
        logger.info("Built-in tools registered")
    except Exception as exc:
        logger.warning("Tool registration error: %s", exc)

    logger.info("Jarvis V2 startup complete")
    yield

    # Shutdown
    logger.info("Shutting down...")
    if app.state.browser_pool:
        await app.state.browser_pool.close_all()
    await bus.disconnect()
    logger.info("Shutdown complete")


app = FastAPI(
    title="Jarvis V2",
    description="Autonomous AI Operating System — Cloud SaaS Platform",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
from backend.api.auth_router import router as auth_router
from backend.api.workflows import router as workflows_router
from backend.api.websocket import router as ws_router
from backend.api.marketplace import router as marketplace_router
from backend.api.tools_router import router as tools_router

app.include_router(auth_router)
app.include_router(workflows_router)
app.include_router(ws_router)
app.include_router(marketplace_router)
app.include_router(tools_router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}


@app.get("/api/system/info")
async def system_info():
    from backend.tools.registry import stats as tool_stats
    from backend.agents.registry import list_agents
    return {
        "version": settings.APP_VERSION,
        "agents": list_agents(),
        "tools": len(tool_stats()),
        "redis": settings.REDIS_URL is not None,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )
