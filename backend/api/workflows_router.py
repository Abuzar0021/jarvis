"""Workflow endpoints — real WorkflowEngine data for the dashboard."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from core.workflows import get_workflow_engine
from core.logger import get_logger

logger = get_logger("jarvis.api.workflows")
router = APIRouter(prefix="/api/workflows", tags=["workflows"])


class RunWorkflowRequest(BaseModel):
    goal: str


@router.get("")
async def list_workflows(limit: int = 50):
    """Recent workflows with status + per-step counts."""
    return {"workflows": get_workflow_engine().list_workflows(limit=limit)}


@router.get("/summary")
async def summary():
    """Workflow counts by status (for the dashboard header)."""
    return get_workflow_engine().summary()


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Full workflow record with every step's state + result."""
    wf = get_workflow_engine().get(workflow_id)
    if not wf:
        return {"error": "workflow not found"}
    return wf


@router.post("/run")
async def run_workflow(req: RunWorkflowRequest):
    """Plan + run a workflow for a goal (requires an API key for planning/agents)."""
    return await get_workflow_engine().run_goal(req.goal)


@router.post("/{workflow_id}/resume")
async def resume_workflow(workflow_id: str):
    return await get_workflow_engine().resume(workflow_id)


@router.post("/{workflow_id}/recover")
async def recover_workflow(workflow_id: str):
    return await get_workflow_engine().recover(workflow_id)


@router.post("/{workflow_id}/pause")
async def pause_workflow(workflow_id: str):
    get_workflow_engine().pause(workflow_id)
    return {"status": "paused", "workflow_id": workflow_id}
