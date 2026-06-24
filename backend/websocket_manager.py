"""WebSocket connection manager — broadcasts real-time events to all clients."""

from __future__ import annotations

import asyncio
import json
import time
from enum import Enum
from typing import Any

from fastapi import WebSocket
from core.logger import get_logger

logger = get_logger("jarvis.ws")


class EventType(str, Enum):
    # Voice pipeline states
    STATE_CHANGE    = "state_change"     # pipeline state changed
    WAKE_DETECTED   = "wake_detected"    # wake word fired
    TRANSCRIPT      = "transcript"       # STT result (partial / final)
    RESPONSE        = "response"         # agent text response
    TTS_START       = "tts_start"        # Jarvis starts speaking
    TTS_END         = "tts_end"          # Jarvis done speaking
    INTERRUPT       = "interrupt"        # user interrupted

    # Agent events
    AGENT_START     = "agent_start"
    AGENT_DONE      = "agent_done"
    AGENT_ERROR     = "agent_error"
    TOOL_CALL       = "tool_call"
    TOOL_START      = "tool_start"       # tool execution beginning
    TOOL_COMPLETE   = "tool_complete"    # tool execution finished

    # System
    SYSTEM_STATUS   = "system_status"
    ERROR           = "error"

    # Phase 3 — Approvals
    APPROVAL_REQUEST  = "approval_request"
    APPROVAL_RESPONSE = "approval_response"

    # Phase 3 — Tasks / agents
    TASK_UPDATE       = "task_update"       # task status changed
    AGENT_STATUS      = "agent_status"      # agent pool snapshot
    RESEARCH_PROGRESS = "research_progress" # deep research step
    REVIEW_RESULT     = "review_result"     # reviewer scored an output

    # Execution state — unified snapshot (single source of truth)
    EXECUTION_STATE   = "execution_state"   # full ExecutionState.to_ws() payload

    # Lead-generation pipeline
    LEAD_UPDATE       = "lead_update"       # a lead advanced through the pipeline


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts events."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections.append(ws)
        logger.info(f"WS connected. Total: {len(self._connections)}")

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            if ws in self._connections:
                self._connections.remove(ws)
        logger.info(f"WS disconnected. Total: {len(self._connections)}")

    async def broadcast(self, event_type: EventType, data: dict[str, Any] | None = None) -> None:
        """Send event to every connected client."""
        payload = json.dumps({
            "type": event_type,
            "ts": time.time(),
            **(data or {}),
        })
        dead: list[WebSocket] = []
        async with self._lock:
            snapshot = list(self._connections)
        for ws in snapshot:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)

    async def send_to(self, ws: WebSocket, event_type: EventType, data: dict | None = None) -> None:
        payload = json.dumps({"type": event_type, "ts": time.time(), **(data or {})})
        try:
            await ws.send_text(payload)
        except Exception:
            await self.disconnect(ws)

    @property
    def count(self) -> int:
        return len(self._connections)


# Singleton — imported everywhere
manager = ConnectionManager()
