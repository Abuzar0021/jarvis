"""
Intelligent model router with cost tracking.

Priority order:
    NVIDIA NIM  →  OpenRouter free  →  DeepSeek  →  Kimi  →  Claude  →  GPT

NIM models (tier -1) are tried first when NVIDIA_NIM_API_KEY is set.
When the key is absent the router skips tier -1 and falls to the
OpenRouter free tier — no code changes required to switch providers.

The router is pure/deterministic and fully unit-testable without any API key.
Live token/cost/latency accounting is persisted to the shared memory DB so the
dashboard Cost report shows real numbers.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from config import NVIDIA_NIM_API_KEY
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
    tier: int            # -1=NIM primary, 0=free, 1=deepseek, 2=kimi, 3=claude, 4=gpt
    capability: int      # 1..3
    cost_in: float       # USD / 1K input tokens
    cost_out: float      # USD / 1K output tokens
    supports_tools: bool = True
    supports_vision: bool = False


# Ordered by tier then cost — cheapest-capable-first selection walks this list.
CATALOGUE: list[ModelSpec] = [
    # Tier -1 — NVIDIA NIM (primary stack; skipped when key is absent)
    # DeepSeek V4 Pro: planning, CEO, reasoning, proposals
    ModelSpec(
        "nim/deepseek-ai/deepseek-v3-0324", "nim", -1, 3,
        0.00027, 0.0011,
    ),
    # DeepSeek V4 Flash: fast execution, lead gen, CRM enrichment
    ModelSpec(
        "nim/deepseek-ai/deepseek-r1-0528", "nim", -1, 3,
        0.00055, 0.00219,
    ),
    # Qwen3 235B/22B-active: code generation, tool generation, self-improvement
    ModelSpec(
        "nim/qwen/qwen3-235b-a22b", "nim", -1, 3,
        0.0004, 0.0016,
    ),
    # Qwen 2.5-VL 72B: vision, screenshot analysis, website UI audits
    ModelSpec(
        "nim/qwen/qwen2.5-vl-72b-instruct", "nim", -1, 3,
        0.0005, 0.002,
        supports_vision=True,
    ),
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
    "generate_tool": 3, "vision": 3,
}

# Task → preferred NIM model ID (within the NIM tier, used for per-task routing).
_NIM_TASK_MODEL: dict[str, str] = {
    # Planning / reasoning → DeepSeek V4 Pro
    "plan":     "nim/deepseek-ai/deepseek-v3-0324",
    "research": "nim/deepseek-ai/deepseek-v3-0324",
    "reason":   "nim/deepseek-ai/deepseek-v3-0324",
    "proposal": "nim/deepseek-ai/deepseek-v3-0324",
    "write":    "nim/deepseek-ai/deepseek-v3-0324",
    # Coding / tool generation → Qwen3
    "code":          "nim/qwen/qwen3-235b-a22b",
    "generate_tool": "nim/qwen/qwen3-235b-a22b",
    # Fast execution / extraction → DeepSeek V4 Flash
    "classify": "nim/deepseek-ai/deepseek-r1-0528",
    "extract":  "nim/deepseek-ai/deepseek-r1-0528",
    "score":    "nim/deepseek-ai/deepseek-r1-0528",
    "summarise":"nim/deepseek-ai/deepseek-r1-0528",
    "audit":    "nim/deepseek-ai/deepseek-r1-0528",
    "outreach": "nim/deepseek-ai/deepseek-r1-0528",
    # Vision → Qwen VL
    "vision":   "nim/qwen/qwen2.5-vl-72b-instruct",
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
    """Selects models cheapest-capable-first and tracks usage/cost/latency."""

    def __init__(self, catalogue: Optional[list[ModelSpec]] = None) -> None:
        self._catalogue = catalogue or CATALOGUE
        self._nim_available = bool(NVIDIA_NIM_API_KEY)

    # ── Selection ───────────────────────────────────────────────────────────

    def candidates(
        self,
        task_type: str = "write",
        needs_tools: bool = False,
        min_capability: Optional[int] = None,
        allow_free: bool = True,
        needs_vision: bool = False,
    ) -> list[ModelSpec]:
        """Return capable models ordered by (tier, cost) — cheapest first.

        NIM tier (-1) models are excluded when NVIDIA_NIM_API_KEY is absent,
        keeping the router deterministic without API-key side-effects.
        """
        req = min_capability if min_capability is not None else _TASK_CAPABILITY.get(task_type, 2)

        # Preferred NIM model for this task type (pinned to front of NIM tier)
        nim_preferred_id = _NIM_TASK_MODEL.get(task_type)

        pool = [
            m for m in self._catalogue
            if m.capability >= req
            and (m.supports_tools or not needs_tools)
            and (allow_free or m.tier != 0)
            and (not needs_vision or m.supports_vision)
            and (m.tier != -1 or self._nim_available)
        ]

        def _sort_key(m: ModelSpec):
            # Within NIM tier, pin preferred model first; then sort by cost
            if m.tier == -1 and nim_preferred_id and m.id == nim_preferred_id:
                return (-1, -1, 0.0)
            return (m.tier, 0, m.cost_in + m.cost_out)

        pool.sort(key=_sort_key)
        return pool

    def route(
        self,
        task_type: str = "write",
        needs_tools: bool = False,
        min_capability: Optional[int] = None,
        allow_free: bool = True,
        needs_vision: bool = False,
    ) -> RouteDecision:
        chain = self.candidates(task_type, needs_tools, min_capability, allow_free, needs_vision)
        if not chain:
            # Never return nothing — fall back to the most capable known model.
            chain = sorted(self._catalogue, key=lambda m: -m.capability)
        req = min_capability if min_capability is not None else _TASK_CAPABILITY.get(task_type, 2)
        return RouteDecision(
            chosen=chain[0], chain=chain,
            task_type=task_type, required_capability=req,
        )

    def preferred_nim_model(self, task_type: str) -> Optional[str]:
        """Return the NIM model ID preferred for this task type, or None."""
        return _NIM_TASK_MODEL.get(task_type)

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
        latency_ms: float = 0.0,
        success: bool = True,
    ) -> float:
        """Persist a usage record (with latency + success) and return USD cost."""
        cost = self.estimate_cost(model_id, in_tokens, out_tokens)
        if memory is None:
            from core.memory import get_memory
            memory = get_memory()
        _ensure_usage_table(memory)
        import uuid
        from datetime import datetime
        memory._exec(
            "INSERT INTO model_usage "
            "(id, model, provider, agent, in_tokens, out_tokens, cost_usd, "
            " latency_ms, success, created_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?)",
            (
                str(uuid.uuid4()),
                model_id,
                (_BY_ID.get(model_id).provider if model_id in _BY_ID else "unknown"),
                agent, in_tokens, out_tokens, cost,
                round(latency_ms, 2),
                1 if success else 0,
                datetime.utcnow().isoformat(),
            ),
        )
        return cost

    def usage_summary(self, memory=None) -> dict:
        """Aggregate cost/token/latency totals for the dashboard Cost report."""
        if memory is None:
            from core.memory import get_memory
            memory = get_memory()
        _ensure_usage_table(memory)
        cur = memory._exec(
            "SELECT model, provider, COUNT(*) AS calls, "
            "SUM(in_tokens) AS tin, SUM(out_tokens) AS tout, "
            "SUM(cost_usd) AS cost, "
            "AVG(latency_ms) AS avg_latency_ms, "
            "SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) AS successes "
            "FROM model_usage GROUP BY model ORDER BY cost DESC"
        )
        rows = [dict(r) for r in cur.fetchall()]
        total_cost = round(sum(r["cost"] or 0 for r in rows), 6)
        total_calls = sum(r["calls"] or 0 for r in rows)
        return {
            "total_cost_usd": total_cost,
            "total_calls": total_calls,
            "by_model": rows,
            "nim_available": self._nim_available,
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
            latency_ms REAL DEFAULT 0,
            success    INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        )"""
    )
    # Non-destructive migration for existing DBs that lack the new columns.
    for col, typedef in [
        ("latency_ms", "REAL DEFAULT 0"),
        ("success",    "INTEGER DEFAULT 1"),
    ]:
        try:
            memory._exec(f"ALTER TABLE model_usage ADD COLUMN {col} {typedef}")
        except Exception:
            pass  # column already exists


# ── Singleton ────────────────────────────────────────────────────────────────
_router: Optional[ModelRouter] = None


def get_router() -> ModelRouter:
    global _router
    if _router is None:
        _router = ModelRouter()
    return _router
