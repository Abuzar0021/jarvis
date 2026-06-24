"""
Tests for the workflow engine, the run_plan checkpoint/resume extension, and
local semantic memory search. All deterministic — no API key, no network.
"""

import pytest

from core.memory import Memory
from core.workflows import WorkflowEngine
from core.orchestrator import Orchestrator


# ── Fake orchestrator for engine tests (deterministic, no LLM) ───────────────

class FakeOrch:
    def __init__(self, fail_titles=()):
        self.fail_titles = set(fail_titles)
        self.calls = []

    @staticmethod
    def _is_error_result(r):
        return str(r).startswith("ERROR")

    async def run_plan(self, subtasks, task_id=None, show_progress=True,
                       on_step_start=None, on_step_complete=None,
                       prior_results=None, should_continue=None):
        results = dict(prior_results or {})
        for st in subtasks:
            title = st["title"]
            if title in results:
                continue
            if should_continue is not None and not should_continue():
                break
            self.calls.append(title)
            res = "ERROR: boom" if title in self.fail_titles else f"done:{title}"
            results[title] = res
            if on_step_complete:
                await on_step_complete(title, res)
        return results


SUBTASKS = [
    {"title": "a", "agent": "research", "description": "do a", "dependencies": []},
    {"title": "b", "agent": "coding", "description": "do b", "dependencies": ["a"]},
]


@pytest.fixture
def mem(tmp_path):
    return Memory(db_path=tmp_path / "wf.db")


# ── Engine: happy path + persistence ─────────────────────────────────────────

async def test_workflow_completes_and_persists(mem):
    eng = WorkflowEngine(memory=mem, orchestrator=FakeOrch())
    wf_id = eng.create("ship it", SUBTASKS)
    result = await eng.execute(wf_id)

    assert result["status"] == "completed"
    wf = eng.get(wf_id)
    assert wf["status"] == "completed"
    assert all(s["status"] == "completed" for s in wf["steps"])
    # Persisted to the DB — survives a fresh engine instance (restart simulation)
    eng2 = WorkflowEngine(memory=mem, orchestrator=FakeOrch())
    assert eng2.get(wf_id)["status"] == "completed"


async def test_workflow_failure_is_recorded(mem):
    eng = WorkflowEngine(memory=mem, orchestrator=FakeOrch(fail_titles={"b"}))
    wf_id = eng.create("flaky", SUBTASKS)
    result = await eng.execute(wf_id)

    assert result["status"] == "failed"
    wf = eng.get(wf_id)
    statuses = {s["title"]: s["status"] for s in wf["steps"]}
    assert statuses["a"] == "completed"
    assert statuses["b"] == "failed"


# ── Checkpoint / resume / recover ────────────────────────────────────────────

async def test_resume_skips_completed_steps(mem):
    orch = FakeOrch()
    eng = WorkflowEngine(memory=mem, orchestrator=orch)
    wf_id = eng.create("resume me", SUBTASKS)
    # Simulate an interrupted run where 'a' already finished and was checkpointed.
    eng._save_step(wf_id, "a", "completed", "done:a")

    result = await eng.resume(wf_id)

    assert result["status"] == "completed"
    # Only the incomplete step 'b' was re-run; 'a' was skipped via prior_results.
    assert orch.calls == ["b"]


async def test_recover_reruns_only_failed_steps(mem):
    orch = FakeOrch(fail_titles={"b"})
    eng = WorkflowEngine(memory=mem, orchestrator=orch)
    wf_id = eng.create("recover me", SUBTASKS)
    await eng.execute(wf_id)            # a ok, b fails
    assert orch.calls == ["a", "b"]

    orch.fail_titles.clear()           # the transient failure is gone
    result = await eng.recover(wf_id)  # should re-run only b

    assert result["status"] == "completed"
    assert orch.calls == ["a", "b", "b"]   # a not re-run; b retried once


async def test_pause_sets_status(mem):
    eng = WorkflowEngine(memory=mem, orchestrator=FakeOrch())
    wf_id = eng.create("pause me", SUBTASKS)
    eng.pause(wf_id)
    assert eng.get(wf_id)["status"] == "paused"


async def test_summary_counts(mem):
    eng = WorkflowEngine(memory=mem, orchestrator=FakeOrch())
    a = eng.create("one", SUBTASKS)
    await eng.execute(a)
    eng.create("two", SUBTASKS)  # left pending
    summary = eng.summary()
    assert summary["total"] == 2
    assert summary["by_status"].get("completed") == 1


# ── run_plan extension (on the REAL orchestrator) ────────────────────────────

async def test_run_plan_prior_results_and_checkpoint(tmp_path):
    orch = Orchestrator()
    orch.memory = Memory(db_path=tmp_path / "o.db")
    calls, completed = [], []

    async def fake_retry(agent_name, task, context, task_id=None, subtask_id=None):
        calls.append(task.split("\n")[0])
        return f"ok:{task.split(chr(10))[0]}"

    orch._run_with_retry = fake_retry

    async def on_complete(title, result):
        completed.append(title)

    results = await orch.run_plan(
        SUBTASKS,
        prior_results={"a": "cached-a"},
        on_step_complete=on_complete,
    )
    # 'a' came from prior_results → never executed; 'b' executed + checkpointed
    assert "a" not in calls
    assert calls == ["b"]
    assert completed == ["b"]
    assert results["a"] == "cached-a"


async def test_run_plan_should_continue_pauses(tmp_path):
    orch = Orchestrator()
    orch.memory = Memory(db_path=tmp_path / "o2.db")

    async def fake_retry(*a, **k):
        raise AssertionError("no step should run when paused")

    orch._run_with_retry = fake_retry
    results = await orch.run_plan(SUBTASKS, should_continue=lambda: False)
    assert results == {}


# ── Semantic memory search ───────────────────────────────────────────────────

def test_semantic_search_ranks_by_relevance(mem):
    mem.add_message("s", "user", "The quarterly sales revenue report shows strong growth")
    mem.add_message("s", "user", "I love hiking in the mountains on the weekend")
    mem.add_message("s", "user", "Database indexing improves query performance a lot")

    hits = mem.semantic_search("revenue sales report", limit=3)
    assert hits, "semantic search returned nothing"
    assert "revenue" in hits[0]["text"].lower()
    # Scores are sorted descending
    assert hits[0]["score"] >= hits[-1]["score"]


def test_semantic_search_empty_query(mem):
    assert mem.semantic_search("") == []
