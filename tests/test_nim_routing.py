"""
Tests for NVIDIA NIM model routing, task→model mapping, and
latency/success tracking. All deterministic — no API key, no network.
"""

from __future__ import annotations

import pytest

from core.model_router import (
    ModelRouter, ModelSpec, CATALOGUE, _NIM_TASK_MODEL, _BY_ID,
)


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def router_with_nim():
    """Router whose catalogue includes NIM models and reports NIM as available."""
    r = ModelRouter(catalogue=CATALOGUE)
    r._nim_available = True
    return r


@pytest.fixture
def router_no_nim():
    """Router that sees NIM as unavailable (key absent)."""
    r = ModelRouter(catalogue=CATALOGUE)
    r._nim_available = False
    return r


# ── NIM availability ─────────────────────────────────────────────────────────

def test_nim_models_present_in_catalogue():
    nim_entries = [m for m in CATALOGUE if m.provider == "nim"]
    assert len(nim_entries) == 4, f"Expected 4 NIM entries, got {len(nim_entries)}"


def test_nim_models_have_tier_minus_one():
    for m in CATALOGUE:
        if m.provider == "nim":
            assert m.tier == -1, f"{m.id} has tier {m.tier}, expected -1"


def test_nim_vision_model_has_vision_flag():
    vis = [m for m in CATALOGUE if m.provider == "nim" and m.supports_vision]
    assert len(vis) == 1
    assert "vl" in vis[0].id or "vision" in vis[0].id


# ── Routing with NIM available ────────────────────────────────────────────────

def test_plan_task_routes_to_nim_pro(router_with_nim):
    decision = router_with_nim.route("plan")
    assert decision.chosen.provider == "nim"
    assert "deepseek-v3" in decision.chosen.id


def test_code_task_routes_to_qwen(router_with_nim):
    decision = router_with_nim.route("code")
    assert decision.chosen.provider == "nim"
    assert "qwen3" in decision.chosen.id


def test_generate_tool_task_routes_to_qwen(router_with_nim):
    decision = router_with_nim.route("generate_tool")
    assert decision.chosen.provider == "nim"
    assert "qwen3" in decision.chosen.id


def test_vision_task_routes_to_qwen_vl(router_with_nim):
    decision = router_with_nim.route("vision", needs_vision=True)
    assert decision.chosen.provider == "nim"
    assert "vl" in decision.chosen.id or "vision" in decision.chosen.id


def test_fast_task_routes_to_nim_flash(router_with_nim):
    decision = router_with_nim.route("extract")
    assert decision.chosen.provider == "nim"
    assert "r1" in decision.chosen.id


def test_nim_preferred_model_matches_task_map(router_with_nim):
    for task, model_id in _NIM_TASK_MODEL.items():
        preferred = router_with_nim.preferred_nim_model(task)
        assert preferred == model_id, f"Task {task!r}: got {preferred!r}, want {model_id!r}"


# ── Fallback when NIM absent ──────────────────────────────────────────────────

def test_fallback_when_nim_absent_gives_non_nim_first(router_no_nim):
    decision = router_no_nim.route("plan")
    # Should not choose a NIM model when key is absent
    assert decision.chosen.provider != "nim"


def test_nim_models_absent_from_candidates_when_key_missing(router_no_nim):
    cands = router_no_nim.candidates("plan")
    providers = {m.provider for m in cands}
    assert "nim" not in providers


def test_candidates_non_empty_without_nim(router_no_nim):
    cands = router_no_nim.candidates("plan")
    assert len(cands) > 0


# ── Chain ordering ───────────────────────────────────────────────────────────

def test_chain_is_ordered_by_tier(router_no_nim):
    chain = router_no_nim.candidates("plan")
    tiers = [m.tier for m in chain]
    assert tiers == sorted(tiers)


def test_nim_chain_nim_first(router_with_nim):
    chain = router_with_nim.candidates("plan")
    # All NIM models (tier -1) must precede all tier 0+ models
    nim_indices = [i for i, m in enumerate(chain) if m.tier == -1]
    non_nim_indices = [i for i, m in enumerate(chain) if m.tier != -1]
    if nim_indices and non_nim_indices:
        assert max(nim_indices) < min(non_nim_indices)


# ── Latency / success tracking ───────────────────────────────────────────────

def test_record_usage_with_latency(tmp_path):
    from core.memory import Memory
    from core.model_router import ModelRouter, CATALOGUE

    mem = Memory(db_path=tmp_path / "mu.db")
    r = ModelRouter(catalogue=CATALOGUE)

    model_id = "nim/deepseek-ai/deepseek-v3-0324"
    cost = r.record_usage(
        model_id, in_tokens=100, out_tokens=50,
        agent="ceo", memory=mem,
        latency_ms=342.5, success=True,
    )
    assert cost >= 0  # NIM model has a cost > 0

    cur = mem._exec(
        "SELECT latency_ms, success FROM model_usage WHERE model=?", (model_id,)
    )
    row = cur.fetchone()
    assert row is not None
    assert abs(row["latency_ms"] - 342.5) < 0.01
    assert row["success"] == 1


def test_record_failure_persists_success_false(tmp_path):
    from core.memory import Memory
    from core.model_router import ModelRouter, CATALOGUE

    mem = Memory(db_path=tmp_path / "mf.db")
    r = ModelRouter(catalogue=CATALOGUE)

    r.record_usage(
        "deepseek/deepseek-chat", 10, 10,
        memory=mem, latency_ms=0, success=False,
    )
    cur = mem._exec("SELECT success FROM model_usage LIMIT 1")
    assert cur.fetchone()["success"] == 0


def test_usage_summary_includes_nim_available_flag(tmp_path):
    from core.memory import Memory
    from core.model_router import ModelRouter, CATALOGUE

    mem = Memory(db_path=tmp_path / "us.db")
    r = ModelRouter(catalogue=CATALOGUE)
    r._nim_available = True

    summary = r.usage_summary(memory=mem)
    assert "nim_available" in summary
    assert summary["nim_available"] is True


# ── BY_ID index ──────────────────────────────────────────────────────────────

def test_nim_models_indexed_by_id():
    for m in CATALOGUE:
        if m.provider == "nim":
            assert m.id in _BY_ID
