"""
Real-time WebSocket endpoint.
Streams all events for a tenant to connected dashboard clients.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from backend.core.events import EventType, get_bus

logger = logging.getLogger(__name__)
router = APIRouter()

# track active connections per tenant: {tenant_id: set[WebSocket]}
_connections: dict[str, set[WebSocket]] = {}


@router.websocket("/api/ws/{tenant_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    tenant_id: str,
    api_key: Optional[str] = Query(None),
    workflow_id: Optional[str] = Query(None),
):
    """
    Connect as:  ws://host/api/ws/{tenant_id}?api_key=jv2_xxx
    Receives:    JSON event objects (id, type, data, timestamp)
    Sends:       {"action": "submit", "goal": "..."} to submit a workflow
    """
    # Minimal auth for WS (API key or skip in dev)
    # TODO: validate api_key against DB
    await websocket.accept()

    _connections.setdefault(tenant_id, set()).add(websocket)
    logger.info("WS connected: tenant=%s total=%d", tenant_id, len(_connections[tenant_id]))

    bus = get_bus()
    pump_task = asyncio.create_task(
        _pump_events(websocket, tenant_id, workflow_id, bus)
    )

    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
            except asyncio.TimeoutError:
                # Ping to keep alive
                await websocket.send_json({"type": "ping"})
                continue

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            action = msg.get("action")
            if action == "submit":
                goal = msg.get("goal", "").strip()
                if goal:
                    asyncio.create_task(_handle_submit(tenant_id, goal, websocket))
            elif action == "stop":
                wf_id = msg.get("workflow_id")
                if wf_id:
                    await websocket.send_json({"type": "info", "data": {"message": "Stop requested"}})

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning("WS error for tenant %s: %s", tenant_id, exc)
    finally:
        pump_task.cancel()
        _connections.get(tenant_id, set()).discard(websocket)
        logger.info("WS disconnected: tenant=%s", tenant_id)


async def _pump_events(websocket: WebSocket, tenant_id: str, workflow_id: str | None, bus) -> None:
    """Forward bus events to this WebSocket client."""
    try:
        async for event in bus.subscribe(tenant_id):
            if workflow_id and event.workflow_id and event.workflow_id != workflow_id:
                continue
            try:
                await websocket.send_json(event.to_dict())
            except Exception:
                break
    except asyncio.CancelledError:
        pass


async def _handle_submit(tenant_id: str, goal: str, websocket: WebSocket) -> None:
    """Submit a workflow from a WS message and ack the client."""
    try:
        from backend.core.workflow_engine import WorkflowEngine
        from backend.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            engine = WorkflowEngine(get_bus(), db)
            wf_id = await engine.submit(tenant_id=tenant_id, goal=goal)
        await websocket.send_json({
            "type": "workflow.submitted",
            "data": {"workflow_id": wf_id, "goal": goal},
        })
    except Exception as exc:
        logger.exception("WS submit failed: %s", exc)
        await websocket.send_json({"type": "error", "data": {"message": str(exc)}})


async def broadcast(tenant_id: str, payload: dict) -> None:
    """Broadcast to all WS clients for a tenant (used by event handlers)."""
    for ws in list(_connections.get(tenant_id, set())):
        try:
            await ws.send_json(payload)
        except Exception:
            _connections[tenant_id].discard(ws)
