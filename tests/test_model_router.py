"""Tests for the intelligent model router + cost tracking. No API key needed."""

import pytest

from core.memory import Memory
from core.model_router import ModelRouter, get_router


@pytest.fixture
def mem(tmp_path):
    return Memory(db_path=tmp_path / "router.db")


def test_cheapest_capable_first_prefers_free():
    r = ModelRouter()
    chain = r.candidates(task_type="code")  # requires capability 3
    assert chain, "router must return candidates"
    # The very first option must be a free-tier (tier 0) model that is capable.
    assert chain[0].tier == 0
    assert chain[0].capability >= 3


def test_escalation_order_is_by_priority_tier():
    r = ModelRouter()
    chain = r.candidates(task_type="write")
    tiers = [m.tier for m in chain]
    # Tiers must be non-decreasing: free → deepseek → kimi → claude → gpt
    assert tiers == sorted(tiers)
    # And the documented providers appear in priority order
    providers_seen = []
    for m in chain:
        if m.provider not in providers_seen:
            providers_seen.append(m.provider)
    assert providers_seen[0] == "openrouter"  # free first


def test_needs_tools_filters_models():
    r = ModelRouter()
    chain = r.candidates(task_type="plan", needs_tools=True)
    assert all(m.supports_tools for m in chain)


def test_route_never_empty_even_for_unknown_task():
    r = ModelRouter()
    decision = r.route(task_type="totally-unknown-task")
    assert decision.chosen is not None
    assert decision.model_ids  # non-empty escalation chain


def test_low_capability_task_allows_cheaper_models():
    r = ModelRouter()
    light = r.candidates(task_type="classify")   # cap 1
    heavy = r.candidates(task_type="code")       # cap 3
    # A light task has at least as many candidates as a heavy one.
    assert len(light) >= len(heavy)


def test_cost_estimation_math():
    r = ModelRouter()
    # deepseek-chat: 0.00027 in, 0.0011 out per 1K
    cost = r.estimate_cost("deepseek/deepseek-chat", 1000, 1000)
    assert cost == pytest.approx(0.00027 + 0.0011, rel=1e-6)
    # unknown model → 0 (never crash)
    assert r.estimate_cost("nonexistent/model", 1000, 1000) == 0.0


def test_record_usage_and_summary(mem):
    r = ModelRouter()
    c1 = r.record_usage("deepseek/deepseek-chat", 1000, 500, agent="research", memory=mem)
    c2 = r.record_usage("anthropic/claude-3.5-sonnet", 2000, 1000, agent="ceo", memory=mem)
    assert c1 > 0 and c2 > 0

    summary = r.usage_summary(memory=mem)
    assert summary["total_calls"] == 2
    assert summary["total_cost_usd"] == pytest.approx(c1 + c2, rel=1e-6)
    assert len(summary["by_model"]) == 2
    # claude is pricier than deepseek here, so it sorts first by cost
    assert summary["by_model"][0]["model"] == "anthropic/claude-3.5-sonnet"


def test_free_models_cost_zero():
    r = ModelRouter()
    assert r.estimate_cost("deepseek/deepseek-chat-v3:free", 100000, 100000) == 0.0


def test_singleton():
    assert get_router() is get_router()
