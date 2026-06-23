"""Workflow data access layer."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Workflow, WorkflowStep


class WorkflowRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(
        self, tenant_id: str, goal: str, user_id: str | None = None
    ) -> Workflow:
        wf = Workflow(tenant_id=tenant_id, goal=goal, user_id=user_id, status="pending")
        self._db.add(wf)
        await self._db.flush()
        return wf

    async def get(self, workflow_id: str) -> Optional[Workflow]:
        return await self._db.get(Workflow, workflow_id)

    async def list_for_tenant(
        self, tenant_id: str, limit: int = 50, offset: int = 0
    ) -> list[Workflow]:
        result = await self._db.execute(
            select(Workflow)
            .where(Workflow.tenant_id == tenant_id)
            .order_by(Workflow.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars())

    async def update_status(
        self,
        workflow_id: str,
        status: str,
        result: str | None = None,
        error: str | None = None,
        duration_ms: int | None = None,
        started_at: datetime | None = None,
        completed_at: datetime | None = None,
        tokens_used: int | None = None,
    ) -> None:
        values: dict = {"status": status}
        if result is not None:
            values["result"] = result
        if error is not None:
            values["error"] = error
        if duration_ms is not None:
            values["duration_ms"] = duration_ms
        if started_at is not None:
            values["started_at"] = started_at
        if completed_at is not None:
            values["completed_at"] = completed_at
        if tokens_used is not None:
            values["tokens_used"] = tokens_used

        await self._db.execute(
            update(Workflow).where(Workflow.id == workflow_id).values(**values)
        )

    async def add_step(self, step: WorkflowStep) -> None:
        self._db.add(step)
        await self._db.flush()
