#!/usr/bin/env python3
"""
TEST 11 — Phase 3 Multi-Agent Task System
Verifies: orchestrator, planner, parallel execution, approval system, reviewer.

Run: python scripts/test_11_agents.py
     python scripts/test_11_agents.py --live   # run real LLM calls
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

env_file = ROOT / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())


def sep(title: str) -> None:
    print(f"\n{'─'*56}")
    print(f"  {title}")
    print("─" * 56)


# ── 11a: All agent imports ─────────────────────────────────────────────────────

def test_agent_imports() -> bool:
    sep("11a. All agent imports")
    agents = [
        ("agents.ceo_agent", "CEOAgent"),
        ("agents.research_agent", "ResearchAgent"),
        ("agents.computer_agent", "ComputerAgent"),
        ("agents.browser_agent", "BrowserAgent"),
        ("agents.reviewer_agent", "ReviewerAgent"),
        ("agents.coding_agent", "CodingAgent"),
    ]
    all_ok = True
    for module, cls in agents:
        try:
            m = __import__(module, fromlist=[cls])
            obj = getattr(m, cls)()
            print(f"  ✓ {cls:20s} name={obj.name!r}")
        except Exception as e:
            print(f"  ✗ {cls}: {e}")
            all_ok = False
    return all_ok


# ── 11b: Orchestrator agent roster ────────────────────────────────────────────

def test_orchestrator_roster() -> bool:
    sep("11b. Orchestrator agent roster")
    try:
        from core.orchestrator import get_orchestrator
        orch = get_orchestrator()
        expected = ["research", "coding", "computer", "browser", "reviewer",
                    "qa", "debug", "data", "deployment"]
        agents_attr = getattr(orch, "_agents", None) or getattr(orch, "_BUILTIN_AGENTS", {})
        # Try to reach the internal dict
        if not agents_attr:
            import core.orchestrator as om
            agents_attr = getattr(om, "_BUILTIN_AGENTS", {})
        missing = [a for a in expected if a not in agents_attr]
        if missing:
            print(f"  ✗ Missing agents: {missing}")
            return False
        for name in sorted(agents_attr.keys()):
            print(f"  ✓ {name}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 11c: Task planner prompt ──────────────────────────────────────────────────

def test_planner_prompt() -> bool:
    sep("11c. Task planner agent descriptions")
    try:
        import core.task_planner as tp
        system = tp._PLANNER_SYSTEM
        required_agents = ["research", "coding", "browser", "computer", "vision"]
        missing = [a for a in required_agents if a not in system]
        if missing:
            print(f"  ✗ Missing in planner prompt: {missing}")
            return False
        for a in required_agents:
            print(f"  ✓ '{a}' described")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 11d: Approval system ──────────────────────────────────────────────────────

async def test_approval_system() -> bool:
    sep("11d. Approval system (auto-timeout)")
    try:
        from core.approval import get_approval_manager
        mgr = get_approval_manager()

        # Schedule auto-deny after 0.5s via a task
        async def _deny_soon(req_id: str) -> None:
            await asyncio.sleep(0.3)
            mgr.respond(req_id, False)

        # Submit a request with short timeout
        task = None
        req_id = None

        async def _submit():
            nonlocal req_id
            # Get id from manager internals before requesting
            result = await mgr.request(
                agent="test", action="file_delete",
                details={"path": "/tmp/test.txt"},
                timeout=1.0,
            )
            return result

        # Start submit and deny concurrently
        submit_task = asyncio.create_task(_submit())
        # Give it a moment, then get the pending id and deny
        await asyncio.sleep(0.1)
        pending = mgr.get_pending()
        if pending:
            req_id = pending[0]["id"]
            asyncio.create_task(_deny_soon(req_id))

        approved = await submit_task
        print(f"  ✓ Approval request resolved: approved={approved}")
        history = mgr.get_history(limit=5)
        print(f"  ✓ History entries: {len(history)}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        import traceback; traceback.print_exc()
        return False


# ── 11e: ReviewerAgent scoring ────────────────────────────────────────────────

async def test_reviewer() -> bool | None:
    sep("11e. ReviewerAgent (offline heuristic)")
    try:
        from agents.reviewer_agent import ReviewerAgent
        r = ReviewerAgent()

        # Test passed() method with mock score
        assert r.passed({"score": 85}) is True
        assert r.passed({"score": 79}) is False
        assert r.passed({"score": 80}) is True
        print("  ✓ passed() thresholds correct")
        print(f"  ✓ PASS_THRESHOLD = {r.PASS_THRESHOLD}")

        if not os.environ.get("OPENROUTER_API_KEY"):
            print("  ⚠ LLM review skipped (no API key)")
            return None

        review = await r.review(
            task="Summarise Python in one sentence",
            output="Python is a high-level, interpreted programming language known for readability.",
            agent_name="coding",
        )
        score = review.get("score", 0)
        verdict = review.get("verdict", "?")
        print(f"  ✓ score={score}  verdict={verdict!r}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 11f: Safety guard ─────────────────────────────────────────────────────────

async def test_safety() -> bool:
    sep("11f. SafetyGuard dangerous action check")
    try:
        from core.safety import SafetyGuard
        sg = SafetyGuard(require_approval=False)
        assert sg.is_dangerous("file_delete") is True
        assert sg.is_dangerous("web_search") is False
        print("  ✓ file_delete → dangerous=True")
        print("  ✓ web_search  → dangerous=False")

        # With require=False, approval always granted
        ok = await sg.request_approval("test", "file_delete", {"path": "/tmp/x"})
        assert ok is True
        print("  ✓ require_approval=False → auto-approved")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 11g: Parallel plan execution (mock) ───────────────────────────────────────

async def test_parallel_execution() -> bool:
    sep("11g. Parallel subtask execution (mock)")
    try:
        from core.orchestrator import get_orchestrator
        orch = get_orchestrator()

        # Two independent tasks with no dependencies
        subtasks = [
            {"title": "Task A", "description": "Print hello", "agent": "coding",
             "priority": 3, "dependencies": []},
            {"title": "Task B", "description": "Print world", "agent": "coding",
             "priority": 3, "dependencies": []},
        ]

        if not os.environ.get("OPENROUTER_API_KEY"):
            print("  ⚠ LLM not available — testing orchestrator structure only")
            # Just verify run_plan exists and is callable
            assert callable(getattr(orch, "run_plan", None))
            print("  ✓ run_plan() exists")
            return None

        t0 = time.monotonic()
        results = await orch.run_plan(subtasks, show_progress=False)
        elapsed = time.monotonic() - t0
        print(f"  ✓ {len(results)} results in {elapsed:.2f}s")
        for title, res in results.items():
            print(f"    {title}: {str(res)[:60]!r}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── Runner ────────────────────────────────────────────────────────────────────

async def main(live: bool) -> None:
    results: dict[str, bool | None] = {}

    results["agent_imports"]     = test_agent_imports()
    results["orchestrator"]      = test_orchestrator_roster()
    results["planner_prompt"]    = test_planner_prompt()
    results["approval"]          = await test_approval_system()
    results["reviewer"]          = await test_reviewer()
    results["safety"]            = await test_safety()
    results["parallel_exec"]     = await test_parallel_execution()

    print(f"\n{'═'*56}")
    print("  RESULTS")
    print("═" * 56)
    passed = failed = skipped = 0
    for name, ok in results.items():
        if ok is None:
            print(f"  SKIP  {name}")
            skipped += 1
        elif ok:
            print(f"  PASS  {name}")
            passed += 1
        else:
            print(f"  FAIL  {name}")
            failed += 1
    print(f"\n  {passed} passed · {failed} failed · {skipped} skipped")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="Include live LLM calls")
    args = parser.parse_args()
    asyncio.run(main(args.live))
