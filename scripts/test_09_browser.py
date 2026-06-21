#!/usr/bin/env python3
"""
TEST 9 — Phase 3 Browser Tools
Verifies: tool registration, Playwright availability, search/fetch, BrowserAgent.

Run: python scripts/test_09_browser.py
     python scripts/test_09_browser.py --live   # actually open pages
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


# ── 9a: Package imports ────────────────────────────────────────────────────────

def test_imports() -> bool:
    sep("9a. Browser package imports")
    ok = True
    for pkg in ["playwright", "duckduckgo_search", "bs4", "aiofiles"]:
        try:
            __import__(pkg)
            print(f"  ✓ {pkg}")
        except ImportError as e:
            print(f"  ✗ {pkg}: {e}")
            ok = False
    return ok


# ── 9b: Tool registry ─────────────────────────────────────────────────────────

def test_registry() -> bool:
    sep("9b. Browser tools registry")
    try:
        from tools import TOOL_REGISTRY
        expected = ["browse", "search_google", "extract_page", "click_element", "fill_form"]
        missing = [t for t in expected if t not in TOOL_REGISTRY]
        if missing:
            print(f"  ✗ Missing: {missing}")
            return False
        for t in expected:
            print(f"  ✓ {t}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 9c: DuckDuckGo search (no API key needed) ─────────────────────────────────

async def test_ddg_search() -> bool:
    sep("9c. DuckDuckGo search (no key)")
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddg:
            results = list(ddg.text("Python programming language", max_results=3))
        if not results:
            print("  ✗ No results returned")
            return False
        for r in results:
            print(f"  ✓ {r.get('title','?')[:60]}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 9d: Playwright install check ──────────────────────────────────────────────

def test_playwright_install() -> bool:
    sep("9d. Playwright browser check")
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto("about:blank")
            title = page.title()
            browser.close()
        print(f"  ✓ Chromium launched, page title: {title!r}")
        return True
    except Exception as e:
        print(f"  ✗ Playwright: {e}")
        print("  → Run: playwright install chromium")
        return False


# ── 9e: browse tool (live) ────────────────────────────────────────────────────

async def test_browse(live: bool) -> bool | None:
    sep("9e. browse tool")
    if not live:
        print("  ⚠ Skipped (pass --live to test)")
        return None
    try:
        from tools import call_tool
        result = await call_tool("browse", url="https://example.com")
        if result.startswith("ERROR"):
            print(f"  ✗ {result[:120]}")
            return False
        print(f"  ✓ {len(result)} chars — {result[:80]!r}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 9f: search_google tool ────────────────────────────────────────────────────

async def test_search_tool(live: bool) -> bool | None:
    sep("9f. search_google tool (DDG backend)")
    if not live:
        print("  ⚠ Skipped (pass --live to test)")
        return None
    try:
        from tools import call_tool
        result = await call_tool("search_google", query="Anthropic Claude AI")
        if result.startswith("ERROR"):
            print(f"  ✗ {result[:120]}")
            return False
        print(f"  ✓ {len(result)} chars — {result[:120]!r}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 9g: BrowserAgent instantiation ───────────────────────────────────────────

def test_agent() -> bool:
    sep("9g. BrowserAgent instantiation")
    try:
        from agents.browser_agent import BrowserAgent
        a = BrowserAgent()
        assert a.name == "browser"
        print(f"  ✓ BrowserAgent name={a.name!r}")
        print(f"  ✓ tools: {a.tool_names}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── Runner ────────────────────────────────────────────────────────────────────

async def main(live: bool) -> None:
    results: dict[str, bool | None] = {}

    results["imports"]           = test_imports()
    results["registry"]          = test_registry()
    results["ddg_search"]        = await test_ddg_search()
    results["playwright_install"] = test_playwright_install()
    results["browse"]            = await test_browse(live)
    results["search_tool"]       = await test_search_tool(live)
    results["agent"]             = test_agent()

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
    parser.add_argument("--live", action="store_true", help="Actually open pages")
    args = parser.parse_args()
    asyncio.run(main(args.live))
