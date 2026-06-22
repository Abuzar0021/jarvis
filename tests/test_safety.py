"""Tests for the safety guard."""

import pytest
from unittest.mock import patch, AsyncMock


def test_is_dangerous():
    from core.safety import SafetyGuard
    guard = SafetyGuard(require_approval=True)
    assert guard.is_dangerous("file_delete") is True
    assert guard.is_dangerous("run_terminal") is True
    assert guard.is_dangerous("file_read") is False
    assert guard.is_dangerous("web_search") is False


@pytest.mark.asyncio
async def test_safe_action_always_approved():
    from core.safety import SafetyGuard
    guard = SafetyGuard(require_approval=True)
    approved = await guard.request_approval("ceo", "file_read", {"path": "/tmp/x"})
    assert approved is True


@pytest.mark.asyncio
async def test_dangerous_action_approved_by_user():
    # Approval is delegated to ApprovalManager; with no WS clients it uses the
    # terminal prompt. Patch that to simulate the user approving.
    from core.safety import SafetyGuard
    from core.approval import ApprovalManager
    guard = SafetyGuard(require_approval=True)

    with patch.object(ApprovalManager, "_terminal_prompt", new=AsyncMock(return_value=True)):
        approved = await guard.request_approval("deployment", "run_terminal", {"command": "ls"})
    assert approved is True


@pytest.mark.asyncio
async def test_dangerous_action_rejected_by_user():
    from core.safety import SafetyGuard
    from core.approval import ApprovalManager
    guard = SafetyGuard(require_approval=True)

    with patch.object(ApprovalManager, "_terminal_prompt", new=AsyncMock(return_value=False)):
        approved = await guard.request_approval("deployment", "run_terminal", {"command": "rm -rf /"})
    assert approved is False


@pytest.mark.asyncio
async def test_approval_disabled_always_passes():
    from core.safety import SafetyGuard
    guard = SafetyGuard(require_approval=False)
    approved = await guard.request_approval("factory", "file_delete", {"path": "/tmp/x"})
    assert approved is True
