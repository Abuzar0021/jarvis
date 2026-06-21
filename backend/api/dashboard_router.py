"""Dashboard data endpoints — aggregated system state for the Phase 3 HUD."""

from __future__ import annotations

from fastapi import APIRouter

from core.approval import get_approval_manager
from core.memory import get_memory
from core.orchestrator import get_orchestrator
from core.task_manager import get_task_manager
from core.logger import get_logger

logger = get_logger("jarvis.api.dashboard")
router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/state")
async def dashboard_state():
    """Full snapshot: agents, tasks, approvals, memory stats."""
    memory = get_memory()
    orch = get_orchestrator()
    task_mgr = get_task_manager()
    approval_mgr = get_approval_manager()

    recent_tasks = memory.list_tasks()[:10]
    recent_logs = memory.get_recent_logs(limit=30)

    return {
        "available_agents": orch.available_agents(),
        "active_agents": list(orch._pool.keys()),
        "active_task_count": task_mgr.active_count,
        "pending_approvals": approval_mgr.get_pending(),
        "memory_stats": memory.get_stats(),
        "recent_tasks": recent_tasks,
        "recent_logs": recent_logs,
    }


@router.get("/tasks")
async def get_tasks(limit: int = 20, status: str = ""):
    """List tasks, optionally filtered by status."""
    memory = get_memory()
    tasks = memory.list_tasks(status=status or None)
    return tasks[:limit]


@router.get("/tasks/{task_id}/subtasks")
async def get_subtasks(task_id: str):
    return get_memory().get_subtasks(task_id)


@router.get("/logs")
async def get_logs(limit: int = 100, agent: str = ""):
    """Recent action logs, optionally filtered by agent."""
    memory = get_memory()
    return memory.get_recent_logs(limit=limit, agent=agent or None)


@router.get("/agents")
async def get_agents():
    orch = get_orchestrator()
    return {
        "available": orch.available_agents(),
        "loaded": list(orch._pool.keys()),
    }
