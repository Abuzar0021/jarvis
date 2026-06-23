"""
Playwright browser automation with real-time screenshot streaming.
Manages a persistent browser context per tenant (login/cookie persistence).
"""
from __future__ import annotations

import asyncio
import base64
import logging
from typing import Any, Optional

from backend.core.config import settings
from backend.core.events import Event, EventBus, EventType

logger = logging.getLogger(__name__)


class BrowserSession:
    """Persistent Playwright browser session for one tenant."""

    def __init__(self, tenant_id: str, bus: EventBus) -> None:
        self.tenant_id = tenant_id
        self._bus = bus
        self._playwright: Any = None
        self._browser: Any = None
        self._context: Any = None
        self._page: Any = None
        self._screenshot_task: asyncio.Task | None = None
        self._streaming = False

    async def start(self, headless: bool | None = None) -> None:
        from playwright.async_api import async_playwright
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=headless if headless is not None else settings.PLAYWRIGHT_HEADLESS,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        self._context = await self._browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (JarvisV2/2.0)",
        )
        self._page = await self._context.new_page()
        logger.info("Browser session started for tenant %s", self.tenant_id)

    async def navigate(self, url: str) -> str:
        if not self._page:
            await self.start()
        try:
            resp = await self._page.goto(url, wait_until="domcontentloaded", timeout=30000)
            status = resp.status if resp else "unknown"
            await self._emit_screenshot(f"Navigated to {url}")
            if resp and resp.status >= 400:
                return f"ERROR: HTTP {resp.status} for {url}"
            return f"✓ Navigated to {url} (status {status})"
        except Exception as exc:
            return f"ERROR: navigation failed: {exc}"

    async def screenshot(self) -> str:
        return await self._emit_screenshot("Manual screenshot")

    async def click(self, selector: str, by_text: bool = False) -> str:
        if not self._page:
            return "ERROR: No page open. Navigate to a URL first."
        try:
            if by_text:
                await self._page.get_by_text(selector).first.click(timeout=5000)
            else:
                await self._page.click(selector, timeout=5000)
            await asyncio.sleep(0.5)
            await self._emit_screenshot(f"Clicked: {selector}")
            return f"✓ Clicked: {selector}"
        except Exception as exc:
            return f"ERROR: click failed on '{selector}': {exc}"

    async def type_text(self, selector: str, text: str, clear_first: bool = True) -> str:
        if not self._page:
            return "ERROR: No page open."
        try:
            if clear_first:
                await self._page.fill(selector, "")
            await self._page.type(selector, text, delay=50)
            await self._emit_screenshot(f"Typed in: {selector}")
            return f"✓ Typed into {selector}"
        except Exception as exc:
            return f"ERROR: type failed on '{selector}': {exc}"

    async def extract(self, selector: str, extract_type: str = "text") -> str:
        if not self._page:
            return "ERROR: No page open."
        try:
            if extract_type == "text":
                text = await self._page.inner_text(selector)
                return text[:5000]
            elif extract_type == "html":
                html = await self._page.inner_html(selector)
                return html[:5000]
            elif extract_type == "links":
                links = await self._page.eval_on_selector_all(
                    "a[href]", "els => els.map(e => ({text: e.innerText, href: e.href}))"
                )
                return str(links[:50])
            elif extract_type == "table":
                data = await self._page.eval_on_selector_all(
                    f"{selector} tr",
                    "rows => rows.map(r => Array.from(r.cells).map(c => c.innerText))"
                )
                return str(data[:100])
            return f"ERROR: Unknown extract_type: {extract_type}"
        except Exception as exc:
            return f"ERROR: extract failed: {exc}"

    async def wait_for(self, selector: str, timeout_ms: int = 5000) -> str:
        if not self._page:
            return "ERROR: No page open."
        try:
            await self._page.wait_for_selector(selector, timeout=timeout_ms)
            return f"✓ Element appeared: {selector}"
        except Exception as exc:
            return f"ERROR: element did not appear: {exc}"

    async def start_streaming(self, workflow_id: str | None = None) -> None:
        """Emit screenshots every N seconds while the session is active."""
        if self._streaming:
            return
        self._streaming = True

        async def _loop() -> None:
            while self._streaming and self._page:
                try:
                    await self._emit_screenshot("Auto screenshot", workflow_id)
                except Exception:
                    pass
                await asyncio.sleep(settings.SCREENSHOT_INTERVAL_SECONDS)

        self._screenshot_task = asyncio.create_task(_loop())

    async def stop_streaming(self) -> None:
        self._streaming = False
        if self._screenshot_task:
            self._screenshot_task.cancel()
            self._screenshot_task = None

    async def close(self) -> None:
        await self.stop_streaming()
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("Browser session closed for tenant %s", self.tenant_id)

    async def _emit_screenshot(self, label: str = "", workflow_id: str | None = None) -> str:
        if not self._page:
            return "ERROR: No page"
        try:
            png = await self._page.screenshot(type="png", full_page=False)
            b64 = base64.b64encode(png).decode()
            await self._bus.publish(Event(
                type=EventType.BROWSER_SCREENSHOT,
                tenant_id=self.tenant_id,
                workflow_id=workflow_id,
                data={"image_b64": b64, "url": self._page.url, "label": label},
            ))
            return f"✓ Screenshot captured: {self._page.url}"
        except Exception as exc:
            return f"ERROR: screenshot: {exc}"


class BrowserPool:
    """Per-tenant session pool with lifecycle management."""

    def __init__(self, bus: EventBus) -> None:
        self._bus = bus
        self._sessions: dict[str, BrowserSession] = {}

    async def get_session(self, tenant_id: str) -> BrowserSession:
        if tenant_id not in self._sessions:
            session = BrowserSession(tenant_id, self._bus)
            await session.start()
            self._sessions[tenant_id] = session
        return self._sessions[tenant_id]

    async def close_session(self, tenant_id: str) -> None:
        session = self._sessions.pop(tenant_id, None)
        if session:
            await session.close()

    async def close_all(self) -> None:
        for session in self._sessions.values():
            await session.close()
        self._sessions.clear()
