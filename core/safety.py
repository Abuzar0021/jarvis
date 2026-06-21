"""Safety guard — dangerous actions require explicit user approval."""

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm

from config import REQUIRE_APPROVAL, DANGEROUS_ACTIONS
from core.logger import get_logger

logger = get_logger("jarvis.safety")
console = Console()


class SafetyGuard:
    """Checks whether an action is dangerous and requests user approval."""

    def __init__(self, require_approval: bool = REQUIRE_APPROVAL):
        self._require = require_approval

    def is_dangerous(self, action: str) -> bool:
        return action in DANGEROUS_ACTIONS

    async def request_approval(self, agent: str, action: str, details: dict) -> bool:
        """
        Gate a dangerous action.
        Delegates to ApprovalManager which handles WS dashboard + terminal fallback.
        Returns True if approved, False if rejected/timeout.
        """
        if not self._require or not self.is_dangerous(action):
            return True

        from core.approval import get_approval_manager
        approved = await get_approval_manager().request(agent, action, details)

        if approved:
            logger.info(f"[safety] APPROVED {action} by {agent}")
        else:
            logger.warning(f"[safety] REJECTED {action} by {agent}")

        return approved

    def override_approval(self, enabled: bool) -> None:
        self._require = enabled


_guard: SafetyGuard | None = None


def get_safety() -> SafetyGuard:
    global _guard
    if _guard is None:
        _guard = SafetyGuard()
    return _guard
