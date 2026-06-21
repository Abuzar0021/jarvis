"""
Async approval manager — dangerous-action gating via WebSocket UI with terminal fallback.

Flow when a dangerous action is attempted:
  1. Agent calls safety.request_approval()
  2. SafetyGuard delegates here
  3. An ApprovalRequest is created with a unique ID
  4. APPROVAL_REQUEST event is broadcast to all WebSocket clients (dashboard)
  5. Coroutine waits up to TIMEOUT_S for a response
  6. Dashboard user clicks Approve / Reject → POST /api/approval/{id}/approve|reject
  7. That resolves the Future → agent proceeds or is blocked

If no WebSocket clients are connected, falls back to a terminal prompt.
If REQUIRE_APPROVAL=false, all requests are auto-approved.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import asdict, dataclass, field
from typing import Optional

from core.logger import get_logger
from config import REQUIRE_APPROVAL

logger = get_logger("jarvis.approval")

TIMEOUT_S: float = 120.0  # auto-deny after this many seconds


@dataclass
class ApprovalRequest:
    id: str
    agent: str
    action: str
    details: dict
    created_at: float = field(default_factory=time.time)
    status: str = "pending"  # pending | approved | rejected | timeout

    def to_dict(self) -> dict:
        return asdict(self)


class ApprovalManager:
    """
    Async gate for dangerous actions.
    Thread-safe: pending dict is guarded by an asyncio Lock.
    """

    def __init__(self) -> None:
        self._pending: dict[str, tuple[ApprovalRequest, asyncio.Future]] = {}
        self._history: list[ApprovalRequest] = []
        self._lock = asyncio.Lock()

    async def request(
        self,
        agent: str,
        action: str,
        details: dict,
        timeout: float = TIMEOUT_S,
    ) -> bool:
        """Gate a dangerous action. Returns True if approved, False if rejected/timeout."""
        if not REQUIRE_APPROVAL:
            return True

        req = ApprovalRequest(
            id=str(uuid.uuid4())[:8],
            agent=agent,
            action=action,
            details=details,
        )

        loop = asyncio.get_running_loop()
        future: asyncio.Future = loop.create_future()

        async with self._lock:
            self._pending[req.id] = (req, future)

        # Broadcast to dashboard clients
        await self._broadcast_request(req)

        # Check if any WS clients are connected
        no_clients = await self._ws_client_count() == 0

        if no_clients:
            approved = await self._terminal_prompt(req)
        else:
            try:
                approved = await asyncio.wait_for(
                    asyncio.shield(future), timeout=timeout
                )
            except asyncio.TimeoutError:
                req.status = "timeout"
                logger.warning(f"Approval timeout ({timeout}s) for '{action}' by {agent}")
                approved = False

        async with self._lock:
            self._pending.pop(req.id, None)

        req.status = "approved" if approved else req.status
        if req.status == "pending":
            req.status = "rejected"
        self._history.append(req)

        await self._broadcast_response(req.id, approved, action)
        return approved

    def respond(self, request_id: str, approved: bool) -> bool:
        """Called by the approval API to resolve a pending request."""
        if request_id not in self._pending:
            return False
        req, future = self._pending[request_id]
        req.status = "approved" if approved else "rejected"
        if not future.done():
            future.set_result(approved)
        logger.info(f"Approval {request_id} → {'APPROVED' if approved else 'REJECTED'}")
        return True

    def get_pending(self) -> list[dict]:
        return [req.to_dict() for req, _ in self._pending.values()]

    def get_history(self, limit: int = 50) -> list[dict]:
        return [r.to_dict() for r in self._history[-limit:]]

    # ── Internal helpers ───────────────────────────────────────────────────────

    async def _broadcast_request(self, req: ApprovalRequest) -> None:
        try:
            from backend.websocket_manager import manager, EventType
            await manager.broadcast(EventType.APPROVAL_REQUEST, req.to_dict())
        except Exception:
            pass

    async def _broadcast_response(self, rid: str, approved: bool, action: str) -> None:
        try:
            from backend.websocket_manager import manager, EventType
            await manager.broadcast(
                EventType.APPROVAL_RESPONSE,
                {"id": rid, "approved": approved, "action": action},
            )
        except Exception:
            pass

    async def _ws_client_count(self) -> int:
        try:
            from backend.websocket_manager import manager
            return manager.count
        except Exception:
            return 0

    async def _terminal_prompt(self, req: ApprovalRequest) -> bool:
        """Block-on-stdin fallback when no dashboard clients are connected."""
        try:
            from rich.console import Console
            from rich.panel import Panel
            console = Console()
            console.print(
                Panel(
                    f"[bold red]⚠  APPROVAL REQUIRED[/bold red]\n\n"
                    f"[yellow]Agent:[/yellow]  {req.agent}\n"
                    f"[yellow]Action:[/yellow] {req.action}\n"
                    f"[yellow]Details:[/yellow]\n"
                    + "\n".join(f"  {k}: {v}" for k, v in req.details.items()),
                    title="Safety Review",
                    border_style="red",
                )
            )
        except Exception:
            print(f"\n⚠ APPROVAL: {req.agent} wants to {req.action}")

        def _ask() -> bool:
            try:
                return input("Approve? [y/N]: ").strip().lower() in ("y", "yes")
            except (EOFError, KeyboardInterrupt):
                return False

        result = await asyncio.to_thread(_ask)
        req.status = "approved" if result else "rejected"
        return result


# ── Singleton ──────────────────────────────────────────────────────────────────

_manager: Optional[ApprovalManager] = None


def get_approval_manager() -> ApprovalManager:
    global _manager
    if _manager is None:
        _manager = ApprovalManager()
    return _manager
