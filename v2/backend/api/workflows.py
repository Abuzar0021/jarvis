"""Workflow CRUD + submission endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.middleware import AuthContext, get_auth_context
from backend.core.workflow_engine import WorkflowEngine
from backend.db.session import get_db

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


class WorkflowSubmit(BaseModel):
    goal: str


class WorkflowResponse(BaseModel):
    id: str
    goal: str
    status: str
    result: str | None = None
    error: str | None = None
    duration_ms: int | None = None
    tokens_used: int = 0
    created_at: str
    steps: list[dict] = []


@router.post("", response_model=dict)
async def submit_workflow(
    body: WorkflowSubmit,
    auth: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
):
    from backend.core.events import get_bus
    engine = WorkflowEngine(get_bus(), db)
    wf_id = await engine.submit(
        tenant_id=auth.tenant_id,
        goal=body.goal,
        user_id=auth.user_id,
    )
    return {"id": wf_id, "status": "pending", "message": "Workflow submitted"}


@router.get("", response_model=list[WorkflowResponse])
async def list_workflows(
    limit: int = 50,
    offset: int = 0,
    auth: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
):
    from backend.db.repositories.workflow_repo import WorkflowRepository
    repo = WorkflowRepository(db)
    wfs = await repo.list_for_tenant(auth.tenant_id, limit, offset)
    return [_wf_to_response(wf) for wf in wfs]


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    auth: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
):
    from backend.db.repositories.workflow_repo import WorkflowRepository
    from sqlalchemy import select
    from backend.db.models import WorkflowStep

    repo = WorkflowRepository(db)
    wf = await repo.get(workflow_id)
    if wf is None or wf.tenant_id != auth.tenant_id:
        raise HTTPException(status_code=404, detail="Workflow not found")

    result = await db.execute(
        select(WorkflowStep)
        .where(WorkflowStep.workflow_id == workflow_id)
        .order_by(WorkflowStep.index)
    )
    steps = [
        {
            "index": s.index,
            "agent_type": s.agent_type,
            "description": s.description,
            "status": s.status,
            "result": s.result,
            "error": s.error,
            "duration_ms": s.duration_ms,
        }
        for s in result.scalars()
    ]

    response = _wf_to_response(wf)
    response["steps"] = steps
    return response


def _wf_to_response(wf) -> dict:
    return {
        "id": wf.id,
        "goal": wf.goal,
        "status": wf.status,
        "result": wf.result,
        "error": wf.error,
        "duration_ms": wf.duration_ms,
        "tokens_used": wf.tokens_used or 0,
        "created_at": wf.created_at.isoformat(),
        "steps": [],
    }
