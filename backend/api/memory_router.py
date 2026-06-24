"""Memory endpoints — searchable memory + visibility for the dashboard."""

from __future__ import annotations

from fastapi import APIRouter

from core.memory import get_memory
from core.logger import get_logger

logger = get_logger("jarvis.api.memory")
router = APIRouter(prefix="/api/memory", tags=["memory"])


@router.get("/search")
async def search(q: str, limit: int = 30):
    """Search across tasks, conversation messages, and action logs."""
    return {"query": q, "results": get_memory().search(q, limit=limit)}


@router.get("/semantic")
async def semantic(q: str, limit: int = 10):
    """Local TF-IDF semantic retrieval — ranked by relevance, no external API."""
    return {"query": q, "results": get_memory().semantic_search(q, limit=limit)}


@router.get("/recent")
async def recent(limit: int = 20):
    """Short-term + long-term memory snapshot for the dashboard memory panel."""
    return get_memory().recent_activity(limit=limit)


@router.get("/stats")
async def stats():
    """Memory store statistics (row counts, db size)."""
    return get_memory().get_stats()


@router.get("/history")
async def execution_history(limit: int = 30):
    """Execution history: live in-memory executions + persisted task history."""
    from core.execution_state import all_executions
    return {
        "executions": all_executions(limit=limit),
        "tasks": get_memory().list_tasks()[:limit],
    }
