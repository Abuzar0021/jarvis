"""System health, metrics, task history, and log endpoints."""

import time
from typing import Optional

from fastapi import APIRouter

from core.memory import get_memory
from backend.voice.pipeline import get_pipeline
from backend.websocket_manager import manager

router = APIRouter(prefix="/api/system", tags=["system"])
_START_TIME = time.time()


@router.get("/health")
async def health():
    """Basic health check — confirms server is alive."""
    return {
        "status": "ok",
        "uptime_seconds": int(time.time() - _START_TIME),
        "ws_clients": manager.count,
    }


@router.get("/diagnose")
async def diagnose():
    """Full self-diagnostics: mic, speaker, WS, memory, agents, tools, API, browser."""
    from core.diagnostics import run_diagnostics
    return await run_diagnostics()


@router.get("/status")
async def full_status():
    """Full system status — voice, agents, tasks, memory."""
    mem = get_memory()
    tasks = mem.list_tasks()
    recent_logs = mem.get_recent_logs(limit=20)
    voice = get_pipeline().get_status()

    return {
        "voice": voice,
        "tasks": {
            "total": len(tasks),
            "pending": sum(1 for t in tasks if t["status"] == "pending"),
            "running": sum(1 for t in tasks if t["status"] == "running"),
            "done": sum(1 for t in tasks if t["status"] == "done"),
            "failed": sum(1 for t in tasks if t["status"] == "failed"),
        },
        "recent_logs": recent_logs[:10],
        "ws_clients": manager.count,
        "uptime_seconds": int(time.time() - _START_TIME),
    }


@router.get("/tasks")
async def list_tasks(status: Optional[str] = None, limit: int = 50):
    """List tasks with optional status filter."""
    mem = get_memory()
    tasks = mem.list_tasks(status=status)[:limit]
    return {"tasks": tasks, "count": len(tasks)}


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """Get task details + subtasks."""
    mem = get_memory()
    all_tasks = mem.list_tasks()
    task = next((t for t in all_tasks if t["id"].startswith(task_id)), None)
    if not task:
        from fastapi import HTTPException
        raise HTTPException(404, f"Task {task_id!r} not found")
    subtasks = mem.get_subtasks(task["id"])
    return {"task": task, "subtasks": subtasks}


@router.get("/logs")
async def get_logs(limit: int = 50, agent: Optional[str] = None):
    """Recent action logs."""
    mem = get_memory()
    return {"logs": mem.get_recent_logs(limit=limit, agent=agent)}


@router.get("/metrics")
async def get_metrics():
    """Aggregate performance metrics per agent."""
    mem = get_memory()
    logs = mem.get_recent_logs(limit=500)

    per_agent: dict[str, dict] = {}
    for log in logs:
        name = log["agent_name"]
        if name not in per_agent:
            per_agent[name] = {"total": 0, "approved": 0, "rejected": 0, "errors": 0}
        per_agent[name]["total"] += 1
        if log.get("approved"):
            per_agent[name]["approved"] += 1
        else:
            per_agent[name]["rejected"] += 1

    return {"metrics": per_agent}
