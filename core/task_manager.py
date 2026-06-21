"""Central async task manager — concurrency limiting, deduplication, global error handling."""

from __future__ import annotations

import asyncio
from typing import Any, Awaitable, Optional

from core.logger import get_logger

logger = get_logger("jarvis.task_manager")


class TaskManager:
    """
    Submit fire-and-forget coroutines with:
    - A semaphore capping concurrent work at max_concurrent
    - Optional named-task deduplication (skip or replace in-flight tasks)
    - Structured error logging so unhandled exceptions don't vanish silently
    """

    def __init__(self, max_concurrent: int = 5) -> None:
        self._sem = asyncio.Semaphore(max_concurrent)
        self._active: dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()

    async def submit(
        self,
        coro: Awaitable[Any],
        name: str = "",
        replace: bool = False,
    ) -> asyncio.Task:
        """
        Submit a coroutine as a background task.

        name    — optional stable key; used to detect duplicates.
        replace — if True and a same-named task is running, cancel it first.
                  if False, skip the new submission and return the existing task.
        """
        async with self._lock:
            if name and name in self._active:
                existing = self._active[name]
                if not existing.done():
                    if replace:
                        existing.cancel()
                        logger.debug(f"TaskManager: replaced '{name}'")
                    else:
                        logger.debug(f"TaskManager: '{name}' already running, skipping")
                        return existing

            task = asyncio.create_task(self._run(coro, name), name=name or None)
            if name:
                self._active[name] = task
            return task

    async def _run(self, coro: Awaitable[Any], name: str) -> Any:
        async with self._sem:
            try:
                return await coro
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.error(f"TaskManager task '{name}' raised: {exc}", exc_info=True)
            finally:
                async with self._lock:
                    self._active.pop(name, None)

    def cancel_all(self) -> None:
        """Cancel every tracked task (call on shutdown)."""
        for task in list(self._active.values()):
            if not task.done():
                task.cancel()
        self._active.clear()

    @property
    def active_count(self) -> int:
        return sum(1 for t in self._active.values() if not t.done())


_manager: Optional[TaskManager] = None


def get_task_manager() -> TaskManager:
    global _manager
    if _manager is None:
        _manager = TaskManager()
    return _manager
