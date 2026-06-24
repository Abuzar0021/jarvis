"""
Intelligent model router with cost tracking.

Picks the cheapest model capable of a task, then escalates on failure.
Priority order follows the build directive:

    OpenRouter free models  →  DeepSeek  →  Kimi  →  Claude  →  GPT

The router is pure/deterministic and fully unit-testable without an API key.
Live token/cost accounting is persisted to the shared memory DB so the
dashboard Cost report shows real numbers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from core.logger import get_logger

logger = get_logger("jarvis.router")


# ── Model catalogue ─────────────────────────────────────────────────────────
# capability: 1=light (classify/extract), 2=standard (write/summarise),
#             3=strong (plan/code/reason). A model can serve any task whose
# required capability is <= its own capability.
# cost_in / cost_out are USD per 1K tokens (0.0 for free tier).

@dataclass(frozen=True)
class ModelSpec:
    id: str
    provider: str
    tier: int            # 0=free, 1=deepseek, 2=kimi, 3=claude, 4=gpt (priority)
    capability: int      # 1..3
    cost_in: float       # USD / 1K input tokens
    cost_out: float      # USD / 1K output tokens
    supports_tools: bool = True


# Ordered by tier then cost — cheapest-capable-first selection walks this list.
CATALOGUE: list[ModelSpec] = [
    # Tier 0 — OpenRouter free models (best-effort, rate-limited)
    ModelSpec("deepseek/deepseek-chat-v3:free", "openrouter", 0, 3, 0.0, 0.0),
    ModelSpec("meta-llama/llama-3.3-70b-instruct:free", "openrouter", 0, 2, 0.0, 0.0),
    ModelSpec("google/gemini-2.0-flash-exp:free", "openrouter", 0, 2, 0.0, 0.0),
    # Tier 1 — DeepSeek (very cheap, strong)
    ModelSpec("deepseek/deepseek-chat", "deepseek", 1, 3, 0.00027, 0.0011),
    ModelSpec("deepseek/deepseek-r1", "deepseek", 1, 3, 0.00055, 0.00219),
    # Tier 2 — Kimi / Moonshot (cheap, long context)
    ModelSpec("moonshotai/kimi-k2", "moonshot", 2, 3, 0.00057, 0.0023),
    # Tier 3 — Claude (reliable, strong reasoning)
    ModelSpec("anthropic/claude-3-haiku", "anthropic", 3, 2, 0.00025, 0.00125),
    ModelSpec("anthropic/claude-3.5-sonnet", "anthropic", 3, 3, 0.003, 0.015),
    # Tier 4 — GPT (fallback)
    ModelSpec("openai/gpt-4o-mini", "openai", 4, 2, 0.00015, 0.0006),
    ModelSpec("openai/gpt-4o", "openai", 4, 3, 0.0025, 0.01),
]

_BY_ID = {m.id: m for m in CATALOGUE}

# Task → minimum capability required.
_TASK_CAPABILITY: dict[str, int] = {
    "classify": 1, "extract": 1, "score": 1,
    "summarise": 2, "write": 2, "outreach": 2, "proposal": 2,
    "plan": 3, "code": 3, "research": 3, "reason": 3, "audit": 1,
}


@dataclass
class RouteDecision:
    chosen: ModelSpec
    chain: list[ModelSpec]          # full escalation order, chosen first
    task_type: str
    required_capability: int

    @property
    def model_ids(self) -> list[str]:
        return [m.id for m in self.chain]


class ModelRouter:
    """Selects models cheapest-capable-first and tracks usage/cost."""

    def __init__(self, catalogue: Optional[list[ModelSpec]] = None) -> None:
        self._catalogue = catalogue or CATALOGUE

    # ── Selection ───────────────────────────────────────────────────────────

    def candidates(
        self,
        task_type: str = "write",
        needs_tools: bool = False,
        min_capability: Optional[int] = None,
        allow_free: bool = True,
    ) -> list[ModelSpec]:
        """Return capable models ordered by (tier, cost) — cheapest first."""
        req = min_capability if min_capability is not None else _TASK_CAPABILITY.get(task_type, 2)
        pool = [
            m for m in self._catalogue
            if m.capability >= req
            and (m.supports_tools or not needs_tools)
            and (allow_free or m.tier != 0)
        ]
        # Primary key: priority tier. Secondary: blended cost. Keeps free first,
        # then escalates through progressively pricier providers.
        pool.sort(key=lambda m: (m.tier, m.cost_in + m.cost_out))
        return pool

    def route(
        self,
        task_type: str = "write",
        needs_tools: bool = False,
        min_capability: Optional[int] = None,
        allow_free: bool = True,
    ) -> RouteDecision:
        chain = self.candidates(task_type, needs_tools, min_capability, allow_free)
        if not chain:
            # Never return nothing — fall back to the most capable known model.
            chain = sorted(self._catalogue, key=lambda m: -m.capability)
        req = min_capability if min_capability is not None else _TASK_CAPABILITY.get(task_type, 2)
        return RouteDecision(chosen=chain[0], chain=chain, task_type=task_type,
                             required_capability=req)

    # ── Cost ─────────────────────────────────────────────────────────────────

    @staticmethod
    def estimate_cost(model_id: str, in_tokens: int, out_tokens: int) -> float:
        spec = _BY_ID.get(model_id)
        if spec is None:
            return 0.0
        return round(spec.cost_in * in_tokens / 1000 + spec.cost_out * out_tokens / 1000, 6)

    def record_usage(
        self,
        model_id: str,
        in_tokens: int,
        out_tokens: int,
        agent: str = "system",
        memory=None,
    ) -> float:
        """Persist a usage record and return its USD cost."""
        cost = self.estimate_cost(model_id, in_tokens, out_tokens)
        if memory is None:
            from core.memory import get_memory
            memory = get_memory()
        _ensure_usage_table(memory)
        import uuid
        from datetime import datetime
        memory._exec(
            "INSERT INTO model_usage (id, model, provider, agent, in_tokens, "
            "out_tokens, cost_usd, created_at) VALUES (?,?,?,?,?,?,?,?)",
            (
                str(uuid.uuid4()), model_id,
                (_BY_ID.get(model_id).provider if model_id in _BY_ID else "unknown"),
                agent, in_tokens, out_tokens, cost,
                datetime.utcnow().isoformat(),
            ),
        )
        return cost

    def usage_summary(self, memory=None) -> dict:
        """Aggregate cost/token totals for the dashboard Cost report."""
        if memory is None:
            from core.memory import get_memory
            memory = get_memory()
        _ensure_usage_table(memory)
        cur = memory._exec(
            "SELECT model, provider, COUNT(*) AS calls, SUM(in_tokens) AS tin, "
            "SUM(out_tokens) AS tout, SUM(cost_usd) AS cost "
            "FROM model_usage GROUP BY model ORDER BY cost DESC"
        )
        rows = [dict(r) for r in cur.fetchall()]
        total_cost = round(sum(r["cost"] or 0 for r in rows), 6)
        total_calls = sum(r["calls"] or 0 for r in rows)
        return {
            "total_cost_usd": total_cost,
            "total_calls": total_calls,
            "by_model": rows,
        }


def _ensure_usage_table(memory) -> None:
    memory._exec(
        """CREATE TABLE IF NOT EXISTS model_usage (
            id         TEXT PRIMARY KEY,
            model      TEXT NOT NULL,
            provider   TEXT,
            agent      TEXT,
            in_tokens  INTEGER NOT NULL DEFAULT 0,
            out_tokens INTEGER NOT NULL DEFAULT 0,
            cost_usd   REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )"""
    )


# ── Singleton ────────────────────────────────────────────────────────────────
_router: Optional[ModelRouter] = None


def get_router() -> ModelRouter:
    global _router
    if _router is None:
        _router = ModelRouter()
    return _router
