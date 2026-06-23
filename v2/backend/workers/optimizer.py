"""
Background optimizer worker.
Runs on a schedule, analyzes metrics, proposes improvements.
"""
from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)


async def run_optimization_cycle(bus, db) -> None:
    """Run one optimization cycle — called hourly in production."""
    from backend.agents.base import AgentContext
    from backend.agents.optimizer import OptimizerAgent
    from backend.tools.registry import get_all_tools

    logger.info("Starting optimization cycle...")

    # Use system tenant for global optimizations
    ctx = AgentContext(
        tenant_id="system",
        workflow_id="optimizer-cycle",
        goal="Analyze agent performance metrics and propose improvements",
        bus=bus,
        tools=get_all_tools(),
    )

    agent = OptimizerAgent()
    try:
        result = await agent.execute(
            "Analyze the last 24h of workflow executions. "
            "Identify the top 3 failure patterns. "
            "For each, propose a concrete improvement.",
            ctx,
        )
        logger.info("Optimization cycle complete: %s", result[:200])
    except Exception as exc:
        logger.exception("Optimization cycle failed: %s", exc)


async def main() -> None:
    """Entry point for the optimizer worker process."""
    import os
    from backend.core.events import init_bus
    from backend.db.session import AsyncSessionLocal

    bus = await init_bus(os.getenv("REDIS_URL"))
    logger.info("Optimizer worker started")

    while True:
        async with AsyncSessionLocal() as db:
            await run_optimization_cycle(bus, db)
        await asyncio.sleep(3600)  # Run hourly


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
