"""Lead-generation endpoints — real CRM/pipeline data for the dashboard."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from core.crm import get_crm
from core.lead_pipeline import get_lead_pipeline
from core.model_router import get_router
from core.logger import get_logger

logger = get_logger("jarvis.api.leads")
router = APIRouter(prefix="/api/leads", tags=["leads"])


class RunLeadRequest(BaseModel):
    business: str
    url: str = ""
    industry: str = ""
    location: str = ""
    generate_proposal: bool = True


@router.get("/pipeline")
async def pipeline_summary():
    """Live pipeline funnel — counts + avg score per stage, conversion rate."""
    return get_crm().pipeline_summary()


@router.get("")
async def list_leads(stage: str = "", limit: int = 50, min_score: float = 0.0):
    """List leads (highest score first), optionally filtered by stage."""
    leads = get_crm().list_leads(stage=stage or None, limit=limit, min_score=min_score)
    return {"count": len(leads), "leads": [l.to_dict() for l in leads]}


@router.get("/{lead_id}")
async def get_lead(lead_id: str):
    """Full lead record + activity history."""
    crm = get_crm()
    lead = crm.get_lead(lead_id)
    if not lead:
        return {"error": "lead not found"}
    return {"lead": lead.to_dict(), "activities": crm.activities(lead_id)}


@router.post("/run")
async def run_pipeline(req: RunLeadRequest):
    """Run the full lead pipeline for one business and return the trace."""
    trace = await get_lead_pipeline().run(
        business=req.business, url=req.url, industry=req.industry,
        location=req.location, generate_proposal=req.generate_proposal,
    )
    return trace


@router.get("/system/cost")
async def cost_report():
    """Model usage + cost report (real numbers from recorded usage)."""
    return get_router().usage_summary()
