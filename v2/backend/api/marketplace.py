"""Agent marketplace — browse, install, rate, and publish agents."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.middleware import AuthContext, get_auth_context
from backend.db.models import AgentConfig, AgentReview
from backend.db.session import get_db

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


class PublishAgentRequest(BaseModel):
    name: str
    agent_type: str
    description: str
    version: str = "1.0.0"
    config: dict = {}
    system_prompt: str | None = None
    tools_allowed: list[str] = []
    is_public: bool = True


class RateAgentRequest(BaseModel):
    rating: int  # 1-5
    comment: str | None = None


@router.get("")
async def list_agents(
    search: str = "",
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List all public agents + this tenant's private agents."""
    stmt = (
        select(AgentConfig)
        .where(AgentConfig.is_public == True)  # noqa: E712
        .order_by(AgentConfig.rating.desc(), AgentConfig.install_count.desc())
        .limit(limit)
        .offset(offset)
    )
    if search:
        stmt = stmt.where(
            AgentConfig.name.ilike(f"%{search}%") | AgentConfig.description.ilike(f"%{search}%")
        )

    result = await db.execute(stmt)
    agents = result.scalars().all()
    return [_agent_dict(a) for a in agents]


@router.get("/{agent_id}")
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    agent = await db.get(AgentConfig, agent_id)
    if not agent or not agent.is_public:
        raise HTTPException(status_code=404, detail="Agent not found")
    return _agent_dict(agent)


@router.post("")
async def publish_agent(
    body: PublishAgentRequest,
    auth: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
):
    agent = AgentConfig(
        tenant_id=auth.tenant_id,
        name=body.name,
        agent_type=body.agent_type,
        description=body.description,
        version=body.version,
        config=body.config,
        system_prompt=body.system_prompt,
        tools_allowed=body.tools_allowed,
        is_public=body.is_public,
        created_by=auth.user_id,
    )
    db.add(agent)
    await db.flush()
    return {"id": agent.id, "message": "Agent published"}


@router.post("/{agent_id}/install")
async def install_agent(
    agent_id: str,
    auth: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
):
    agent = await db.get(AgentConfig, agent_id)
    if not agent or not agent.is_public:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.install_count += 1
    return {"message": f"Agent '{agent.name}' installed"}


@router.post("/{agent_id}/rate")
async def rate_agent(
    agent_id: str,
    body: RateAgentRequest,
    auth: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
):
    if not 1 <= body.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")

    agent = await db.get(AgentConfig, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    review = AgentReview(
        agent_id=agent_id,
        tenant_id=auth.tenant_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(review)

    # Update aggregate rating
    result = await db.execute(
        select(func.avg(AgentReview.rating), func.count(AgentReview.id))
        .where(AgentReview.agent_id == agent_id)
    )
    avg, count = result.one()
    agent.rating = round(float(avg or 0), 2)
    agent.rating_count = count or 0

    return {"message": "Review submitted", "new_rating": agent.rating}


def _agent_dict(a: AgentConfig) -> dict:
    return {
        "id": a.id,
        "name": a.name,
        "agent_type": a.agent_type,
        "description": a.description,
        "version": a.version,
        "rating": a.rating,
        "rating_count": a.rating_count,
        "install_count": a.install_count,
        "tools_allowed": a.tools_allowed,
        "created_at": a.created_at.isoformat(),
    }
