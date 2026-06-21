"""Approval REST endpoints — dashboard uses these to respond to pending approvals."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from core.approval import get_approval_manager
from core.logger import get_logger

logger = get_logger("jarvis.api.approval")
router = APIRouter(prefix="/api/approval", tags=["approval"])


@router.get("/pending")
async def get_pending():
    """List all pending approval requests."""
    return get_approval_manager().get_pending()


@router.get("/history")
async def get_history(limit: int = 50):
    """List recent approval decisions."""
    return get_approval_manager().get_history(limit)


@router.post("/{request_id}/approve")
async def approve(request_id: str):
    """Approve a pending action."""
    ok = get_approval_manager().respond(request_id, True)
    if not ok:
        raise HTTPException(404, f"No pending approval '{request_id}'")
    return {"success": True, "request_id": request_id, "decision": "approved"}


@router.post("/{request_id}/reject")
async def reject(request_id: str):
    """Reject a pending action."""
    ok = get_approval_manager().respond(request_id, False)
    if not ok:
        raise HTTPException(404, f"No pending approval '{request_id}'")
    return {"success": True, "request_id": request_id, "decision": "rejected"}
