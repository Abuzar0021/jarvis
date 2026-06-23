"""
Workflow engine — manages the lifecycle of a workflow execution.
Persists state to PostgreSQL and emits events to the bus throughout.
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base import AgentContext
from backend.agents.registry import get_agent
from backend.core.events import Event, EventBus, EventType
from backend.db.models import Memory, Workflow, WorkflowEvent, WorkflowStep
from backend.db.repositories.memory_repo import MemoryRepository
from backend.db.repositories.workflow_repo import WorkflowRepository
from backend.tools.registry import get_all_tools

logger = logging.getLogger(__name__)


class WorkflowEngine:
    def __init__(self, bus: EventBus, db: AsyncSession) -> None:
        self._bus = bus
        self._db = db
        self._wf_repo = WorkflowRepository(db)
        self._mem_repo = MemoryRepository(db)

    async def submit(self, tenant_id: str, goal: str, user_id: str | None = None) -> str:
        """Create a workflow record and return its ID. Execution starts asynchronously."""
        wf = await self._wf_repo.create(tenant_id=tenant_id, goal=goal, user_id=user_id)
        asyncio.create_task(self._execute(wf.id, tenant_id, goal))
        return wf.id

    async def _execute(self, workflow_id: str, tenant_id: str, goal: str) -> None:
        start = time.monotonic()

        await self._wf_repo.update_status(workflow_id, "running", started_at=datetime.now(timezone.utc))
        await self._bus.publish(Event(
            type=EventType.WORKFLOW_STARTED,
            tenant_id=tenant_id,
            workflow_id=workflow_id,
            data={"goal": goal},
        ))

        try:
            # Load relevant memory
            memories = await self._mem_repo.search(tenant_id, goal, limit=5)

            # Build tool context with tenant-scoped memory operations
            tools = get_all_tools(tenant_id)
            tools = self._inject_memory_tools(tools, tenant_id, workflow_id)
            tools = self._inject_browser_tools(tools, tenant_id, workflow_id)

            ctx = AgentContext(
                tenant_id=tenant_id,
                workflow_id=workflow_id,
                goal=goal,
                bus=self._bus,
                tools=tools,
                memory=[m.to_dict() for m in memories],
            )

            ceo = get_agent("ceo")
            if ceo is None:
                raise RuntimeError("CEO agent not available")

            result = await ceo.execute(goal, ctx)
            duration_ms = int((time.monotonic() - start) * 1000)

            # Persist result
            await self._wf_repo.update_status(
                workflow_id, "completed",
                result=result,
                duration_ms=duration_ms,
                completed_at=datetime.now(timezone.utc),
                tokens_used=self._estimate_tokens(ctx),
            )

            # Persist tool calls as step records
            for i, tc in enumerate(ctx.tool_calls):
                await self._wf_repo.add_step(WorkflowStep(
                    workflow_id=workflow_id,
                    index=i,
                    agent_type="tool",
                    description=tc.name,
                    status="completed" if not tc.error else "failed",
                    tool_calls=[tc.to_dict()],
                    result=str(tc.result)[:500] if tc.result else None,
                    error=tc.error,
                    duration_ms=tc.duration_ms,
                ))

            # Auto-store result in memory
            await self._mem_repo.store(
                tenant_id=tenant_id,
                workflow_id=workflow_id,
                kind="result",
                content=f"Goal: {goal}\nResult: {result[:500]}",
                importance=0.7,
            )

            await self._bus.publish(Event(
                type=EventType.WORKFLOW_COMPLETED,
                tenant_id=tenant_id,
                workflow_id=workflow_id,
                data={"result": result[:300], "duration_ms": duration_ms},
            ))

        except Exception as exc:
            duration_ms = int((time.monotonic() - start) * 1000)
            logger.exception("Workflow %s failed: %s", workflow_id, exc)
            await self._wf_repo.update_status(
                workflow_id, "failed",
                error=str(exc),
                duration_ms=duration_ms,
                completed_at=datetime.now(timezone.utc),
            )
            await self._bus.publish(Event(
                type=EventType.WORKFLOW_FAILED,
                tenant_id=tenant_id,
                workflow_id=workflow_id,
                data={"error": str(exc), "duration_ms": duration_ms},
            ))

    def _inject_memory_tools(
        self, tools: dict, tenant_id: str, workflow_id: str
    ) -> dict:
        """Replace stub memory tools with tenant-scoped real implementations."""
        mem_repo = self._mem_repo

        async def store_memory(content: str, kind: str = "fact", tags: list | None = None, importance: float = 0.5) -> str:
            await mem_repo.store(tenant_id, workflow_id, kind, content, tags, importance)
            return f"✓ Stored [{kind}]: {content[:60]}"

        async def memory_search(query: str, kind: str = "all", limit: int = 10) -> str:
            results = await mem_repo.search(tenant_id, query, kind if kind != "all" else None, limit)
            if not results:
                return f"No memories found for '{query}'"
            return "\n".join(f"[{m.kind}] {m.content[:200]}" for m in results)

        async def memory_recent(limit: int = 20) -> str:
            results = await mem_repo.recent(tenant_id, limit)
            return "\n".join(f"[{m.kind}] {m.content[:200]}" for m in results)

        tools["store_memory"] = store_memory
        tools["memory_search"] = memory_search
        tools["memory_recent"] = memory_recent
        return tools

    def _inject_browser_tools(
        self, tools: dict, tenant_id: str, workflow_id: str
    ) -> dict:
        """Wire browser tools to the BrowserPool (imported lazily to avoid circular deps)."""
        try:
            from backend.browser.automation import BrowserPool
            pool = _get_browser_pool()

            async def browser_navigate(url: str) -> str:
                s = await pool.get_session(tenant_id)
                return await s.navigate(url)

            async def browser_screenshot() -> str:
                s = await pool.get_session(tenant_id)
                return await s.screenshot()

            async def browser_click(selector: str, by_text: bool = False) -> str:
                s = await pool.get_session(tenant_id)
                return await s.click(selector, by_text)

            async def browser_type(selector: str, text: str, clear_first: bool = True) -> str:
                s = await pool.get_session(tenant_id)
                return await s.type_text(selector, text, clear_first)

            async def browser_extract(selector: str, extract_type: str = "text") -> str:
                s = await pool.get_session(tenant_id)
                return await s.extract(selector, extract_type)

            async def browser_wait(selector: str, timeout_ms: int = 5000) -> str:
                s = await pool.get_session(tenant_id)
                return await s.wait_for(selector, timeout_ms)

            tools["browser_navigate"] = browser_navigate
            tools["browser_screenshot"] = browser_screenshot
            tools["browser_click"] = browser_click
            tools["browser_type"] = browser_type
            tools["browser_extract"] = browser_extract
            tools["browser_wait"] = browser_wait
        except ImportError:
            pass  # Playwright not installed — browser tools unavailable

        return tools

    def _estimate_tokens(self, ctx: AgentContext) -> int:
        total = 0
        for msg in ctx.messages:
            content = msg.get("content") or ""
            total += len(content) // 4
        return total


_browser_pool: Any = None


def _get_browser_pool():
    return _browser_pool


def set_browser_pool(pool) -> None:
    global _browser_pool
    _browser_pool = pool
