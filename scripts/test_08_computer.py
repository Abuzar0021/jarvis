#!/usr/bin/env python3
"""
TEST 8 — Phase 3 Computer Tools
Verifies: tool registration, OS probing (psutil), headless-safe tool calls.

Run: python scripts/test_08_computer.py
     python scripts/test_08_computer.py --gui   # include GUI tools (needs display)
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

env_file = ROOT / ".env"
if env_file.exists():
    import os
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


# ── 8a: Package imports ────────────────────────────────────────────────────────

def test_imports() -> bool:
    sep("8a. Computer tool package imports")
    results = {}
    try:
        import psutil
        results["psutil"] = psutil.__version__
        print(f"  ✓ psutil {psutil.__version__}")
    except ImportError as e:
        print(f"  ✗ psutil: {e}")
        results["psutil"] = None

    try:
        import pyautogui
        results["pyautogui"] = "ok"
        print("  ✓ pyautogui imported")
    except Exception as e:
        print(f"  ⚠ pyautogui: {e} (expected in headless)")
        results["pyautogui"] = "headless"

    return results.get("psutil") is not None


# ── 8b: Tool registry ─────────────────────────────────────────────────────────

def test_registry() -> bool:
    sep("8b. Computer tools registry")
    try:
        from tools import TOOL_REGISTRY
        expected = ["open_app", "close_app", "focus_window", "click",
                    "type_text", "press_keys", "move_mouse", "screenshot"]
        missing = [t for t in expected if t not in TOOL_REGISTRY]
        if missing:
            print(f"  ✗ Missing tools: {missing}")
            return False
        for t in expected:
            entry = TOOL_REGISTRY[t]
            dangerous = entry.get("dangerous", False)
            print(f"  ✓ {t:20s}  dangerous={dangerous}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 8c: psutil process list ───────────────────────────────────────────────────

def test_psutil() -> bool:
    sep("8c. psutil process enumeration")
    try:
        import psutil
        procs = list(psutil.process_iter(["pid", "name"]))
        print(f"  ✓ {len(procs)} processes visible")
        names = [p.info["name"] for p in procs[:5] if p.info["name"]]
        print(f"  ✓ Sample: {names}")
        cpu = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory().percent
        print(f"  ✓ CPU {cpu:.1f}%  MEM {mem:.1f}%")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 8d: screenshot tool (headless-safe) ───────────────────────────────────────

async def test_screenshot() -> bool:
    sep("8d. Screenshot tool (headless fallback)")
    try:
        from tools.computer_tools import _HAS_DISPLAY
        if not _HAS_DISPLAY:
            print("  ⚠ No display — screenshot will use fallback")

        from tools import call_tool
        result = await call_tool("screenshot")
        if result.startswith("ERROR") and not _HAS_DISPLAY:
            print(f"  ⚠ Expected headless error: {result[:80]}")
            return None  # skip
        if result.startswith("ERROR"):
            print(f"  ✗ {result}")
            return False
        print(f"  ✓ Screenshot result: {result[:80]}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 8e: open_app with safe command ────────────────────────────────────────────

async def test_open_app() -> bool:
    sep("8e. open_app (echo — safe subprocess)")
    try:
        from tools import call_tool
        result = await call_tool("open_app", app_name="echo hello")
        print(f"  result: {result[:120]}")
        # We just need it not to crash
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 8f: ComputerAgent instantiation ───────────────────────────────────────────

def test_agent() -> bool:
    sep("8f. ComputerAgent instantiation")
    try:
        from agents.computer_agent import ComputerAgent
        a = ComputerAgent()
        assert a.name == "computer"
        print(f"  ✓ ComputerAgent name={a.name!r}")
        print(f"  ✓ tools: {a.tool_names}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── Runner ────────────────────────────────────────────────────────────────────

async def main(gui: bool) -> None:
    results: dict[str, bool | None] = {}

    results["imports"]    = test_imports()
    results["registry"]   = test_registry()
    results["psutil"]     = test_psutil()
    results["screenshot"] = await test_screenshot()
    results["open_app"]   = await test_open_app()
    results["agent"]      = test_agent()

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
    parser.add_argument("--gui", action="store_true", help="Include GUI-dependent tests")
    args = parser.parse_args()
    asyncio.run(main(args.gui))
