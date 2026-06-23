"""Memory data access layer."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Memory


class MemoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def store(
        self,
        tenant_id: str,
        workflow_id: str | None,
        kind: str,
        content: str,
        tags: list | None = None,
        importance: float = 0.5,
    ) -> Memory:
        mem = Memory(
            tenant_id=tenant_id,
            workflow_id=workflow_id,
            kind=kind,
            content=content,
            tags=tags or [],
            importance=importance,
        )
        self._db.add(mem)
        await self._db.flush()
        return mem

    async def search(
        self,
        tenant_id: str,
        query: str,
        kind: str | None = None,
        limit: int = 10,
    ) -> list[Memory]:
        stmt = select(Memory).where(
            Memory.tenant_id == tenant_id,
            Memory.content.ilike(f"%{query}%"),
        )
        if kind:
            stmt = stmt.where(Memory.kind == kind)
        stmt = stmt.order_by(Memory.importance.desc(), Memory.created_at.desc()).limit(limit)
        result = await self._db.execute(stmt)
        return list(result.scalars())

    async def recent(self, tenant_id: str, limit: int = 20) -> list[Memory]:
        result = await self._db.execute(
            select(Memory)
            .where(Memory.tenant_id == tenant_id)
            .order_by(Memory.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars())

    def to_dict(self, mem: Memory) -> dict:
        return {
            "id": mem.id,
            "kind": mem.kind,
            "content": mem.content,
            "tags": mem.tags,
            "importance": mem.importance,
            "created_at": mem.created_at.isoformat(),
        }
