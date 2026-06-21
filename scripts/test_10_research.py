#!/usr/bin/env python3
"""
TEST 10 — Phase 3 ResearchAgent
Verifies: agent instantiation, tool set, LLM connectivity, research workflow.

Run: python scripts/test_10_research.py
     python scripts/test_10_research.py --full   # run actual LLM research
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
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


# ── 10a: Instantiation ────────────────────────────────────────────────────────

def test_instantiation() -> bool:
    sep("10a. ResearchAgent instantiation")
    try:
        from agents.research_agent import ResearchAgent
        a = ResearchAgent()
        assert a.name == "research"
        required_tools = ["web_search", "web_fetch", "search_google", "browse", "extract_page", "file_write"]
        missing = [t for t in required_tools if t not in a.tool_names]
        if missing:
            print(f"  ✗ Missing tools: {missing}")
            return False
        print(f"  ✓ name={a.name!r}")
        print(f"  ✓ {len(a.tool_names)} tools: {a.tool_names}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 10b: System prompt quality ────────────────────────────────────────────────

def test_system_prompt() -> bool:
    sep("10b. System prompt structure")
    try:
        from agents.research_agent import ResearchAgent
        a = ResearchAgent()
        sp = a.system_prompt
        checks = [
            ("10-20 sources" in sp or "10-20" in sp, "mentions source count"),
            ("Executive Summary" in sp, "has Executive Summary section"),
            ("Key Findings" in sp, "has Key Findings section"),
            ("Discrepancies" in sp, "has Discrepancies section"),
            ("file_write" in sp or "Save" in sp, "mentions saving"),
            ("cite" in sp.lower() or "citation" in sp.lower() or "URL" in sp, "mentions citations"),
        ]
        all_ok = True
        for ok, label in checks:
            mark = "✓" if ok else "✗"
            print(f"  {mark} {label}")
            if not ok:
                all_ok = False
        return all_ok
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 10c: Tool schema validation ───────────────────────────────────────────────

def test_tool_schemas() -> bool:
    sep("10c. Research tool schemas")
    try:
        from tools import TOOL_REGISTRY, get_schemas
        research_tools = ["web_search", "web_fetch", "search_google", "browse",
                          "extract_page", "file_write"]
        available = [t for t in research_tools if t in TOOL_REGISTRY]
        missing = [t for t in research_tools if t not in TOOL_REGISTRY]
        if missing:
            print(f"  ✗ Not registered: {missing}")
        for t in available:
            s = TOOL_REGISTRY[t]["schema"]
            print(f"  ✓ {t} — {s['function']['description'][:50]}")
        return len(missing) == 0
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 10d: Data directory ───────────────────────────────────────────────────────

def test_data_dir() -> bool:
    sep("10d. data/research directory")
    try:
        data_dir = ROOT / "data" / "research"
        data_dir.mkdir(parents=True, exist_ok=True)
        test_file = data_dir / ".test_write"
        test_file.write_text("ok")
        test_file.unlink()
        print(f"  ✓ {data_dir} writable")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 10e: Quick LLM ping ───────────────────────────────────────────────────────

async def test_llm_ping() -> bool | None:
    sep("10e. LLM connectivity ping")
    if not os.environ.get("OPENROUTER_API_KEY"):
        print("  ⚠ OPENROUTER_API_KEY not set — skipping")
        return None
    try:
        from core.llm_client import get_llm
        llm = get_llm()
        result = await llm.simple(
            "Reply with only the word PONG.",
            system="You are a test assistant.",
        )
        if "PONG" in result.upper():
            print(f"  ✓ LLM responded: {result.strip()!r}")
            return True
        print(f"  ⚠ Unexpected response: {result.strip()!r}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 10f: Full research run (optional) ────────────────────────────────────────

async def test_full_research() -> bool | None:
    sep("10f. Full research run (mini-topic)")
    if not os.environ.get("OPENROUTER_API_KEY"):
        print("  ⚠ OPENROUTER_API_KEY not set — skipping")
        return None
    try:
        from agents.research_agent import ResearchAgent
        agent = ResearchAgent()
        result = await agent.run(
            "Write a brief 3-sentence summary of what Python is. "
            "Save it as data/research/report_python_test.md",
            session_id="test10f",
        )
        print(f"  ✓ Research completed ({len(result)} chars)")
        report = ROOT / "data" / "research" / "report_python_test.md"
        if report.exists():
            print(f"  ✓ Report saved: {report}")
        else:
            print("  ⚠ Report file not found (agent may not have saved)")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── Runner ────────────────────────────────────────────────────────────────────

async def main(full: bool) -> None:
    results: dict[str, bool | None] = {}

    results["instantiation"]  = test_instantiation()
    results["system_prompt"]  = test_system_prompt()
    results["tool_schemas"]   = test_tool_schemas()
    results["data_dir"]       = test_data_dir()
    results["llm_ping"]       = await test_llm_ping()
    if full:
        results["full_research"] = await test_full_research()

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
    parser.add_argument("--full", action="store_true", help="Run actual LLM research")
    args = parser.parse_args()
    asyncio.run(main(args.full))
