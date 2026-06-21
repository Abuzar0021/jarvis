#!/usr/bin/env python3
"""
TEST 12 — Phase 3 Dashboard & API Endpoints
Verifies: dashboard HTML, approval endpoints, dashboard REST routes.

Run: python scripts/test_12_dashboard.py              # offline checks
     python scripts/test_12_dashboard.py --server     # needs backend running
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
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

BASE_URL = "http://localhost:8000"


def sep(title: str) -> None:
    print(f"\n{'─'*56}")
    print(f"  {title}")
    print("─" * 56)


def get(path: str, timeout: int = 5) -> tuple[int, dict | str]:
    try:
        with urllib.request.urlopen(f"{BASE_URL}{path}", timeout=timeout) as r:
            body = r.read().decode()
            try:
                return r.status, json.loads(body)
            except json.JSONDecodeError:
                return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as e:
        return 0, str(e)


def post(path: str, timeout: int = 5) -> tuple[int, dict | str]:
    try:
        req = urllib.request.Request(
            f"{BASE_URL}{path}", data=b"", method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode()
            try:
                return r.status, json.loads(body)
            except json.JSONDecodeError:
                return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as e:
        return 0, str(e)


def server_running() -> bool:
    code, _ = get("/api/voice/status")
    return code == 200


# ── 12a: Dashboard HTML content ───────────────────────────────────────────────

def test_dashboard_html() -> bool:
    sep("12a. Dashboard HTML (offline check)")
    try:
        import backend.main as m
        html = m._DASHBOARD_HTML
        checks = [
            ("Phase 3" in html or "PHASE 3" in html, "mentions Phase 3"),
            ("agent-flow" in html or "flow-body" in html or "AGENT FLOW" in html, "has agent flow panel"),
            ("approval" in html.lower(), "has approvals panel"),
            ("TASK QUEUE" in html or "tasks-body" in html, "has task queue"),
            ("MEMORY" in html or "memory-body" in html, "has memory panel"),
            ("approval_request" in html, "handles approval_request WS events"),
            ("agent_status" in html, "handles agent_status WS events"),
            ("task_update" in html, "handles task_update WS events"),
            ("research_progress" in html, "handles research_progress WS events"),
            ("review_result" in html, "handles review_result WS events"),
            ("triggerWake" in html, "has wake trigger"),
            ("interrupt" in html, "has interrupt"),
        ]
        all_ok = True
        for ok, label in checks:
            mark = "✓" if ok else "✗"
            print(f"  {mark} {label}")
            if not ok:
                all_ok = False
        print(f"\n  HTML size: {len(html):,} chars")
        return all_ok
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 12b: Router registrations ─────────────────────────────────────────────────

def test_routers() -> bool:
    sep("12b. Router registrations")
    try:
        from backend.main import app
        routes = {r.path for r in app.routes}
        expected = [
            "/api/approval/pending",
            "/api/approval/history",
            "/api/dashboard/state",
            "/api/dashboard/tasks",
            "/api/dashboard/logs",
            "/api/dashboard/agents",
        ]
        missing = [p for p in expected if p not in routes]
        if missing:
            print(f"  ✗ Missing routes: {missing}")
            return False
        for p in expected:
            print(f"  ✓ {p}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 12c: Approval manager ─────────────────────────────────────────────────────

def test_approval_manager() -> bool:
    sep("12c. ApprovalManager import and methods")
    try:
        from core.approval import get_approval_manager
        mgr = get_approval_manager()
        assert callable(getattr(mgr, "request", None))
        assert callable(getattr(mgr, "respond", None))
        assert callable(getattr(mgr, "get_pending", None))
        assert callable(getattr(mgr, "get_history", None))
        print("  ✓ request()")
        print("  ✓ respond()")
        print("  ✓ get_pending()")
        print("  ✓ get_history()")
        pending = mgr.get_pending()
        history = mgr.get_history()
        print(f"  ✓ pending={len(pending)}  history={len(history)}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 12d: Dashboard router endpoints (offline) ─────────────────────────────────

def test_dashboard_router_import() -> bool:
    sep("12d. Dashboard router import")
    try:
        from backend.api.dashboard_router import router
        paths = [r.path for r in router.routes]
        print(f"  ✓ {len(paths)} routes: {paths}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 12e: Approval router import ───────────────────────────────────────────────

def test_approval_router_import() -> bool:
    sep("12e. Approval router import")
    try:
        from backend.api.approval_router import router
        paths = [r.path for r in router.routes]
        print(f"  ✓ {len(paths)} routes: {paths}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── 12f: Server — dashboard page ──────────────────────────────────────────────

def test_server_dashboard(server: bool) -> bool | None:
    sep("12f. GET / — dashboard HTML (server)")
    if not server:
        print("  ⚠ Skipped (pass --server)")
        return None
    code, body = get("/")
    if code != 200:
        print(f"  ✗ HTTP {code}")
        return False
    body_str = body if isinstance(body, str) else ""
    if "JARVIS" not in body_str:
        print("  ✗ Response missing JARVIS content")
        return False
    print(f"  ✓ HTTP 200 — {len(body_str):,} chars")
    return True


# ── 12g: Server — approval pending ────────────────────────────────────────────

def test_server_approval_pending(server: bool) -> bool | None:
    sep("12g. GET /api/approval/pending (server)")
    if not server:
        print("  ⚠ Skipped (pass --server)")
        return None
    code, data = get("/api/approval/pending")
    if code != 200:
        print(f"  ✗ HTTP {code}")
        return False
    assert isinstance(data, list)
    print(f"  ✓ HTTP 200 — {len(data)} pending approvals")
    return True


# ── 12h: Server — dashboard state ─────────────────────────────────────────────

def test_server_dashboard_state(server: bool) -> bool | None:
    sep("12h. GET /api/dashboard/state (server)")
    if not server:
        print("  ⚠ Skipped (pass --server)")
        return None
    code, data = get("/api/dashboard/state")
    if code != 200:
        print(f"  ✗ HTTP {code}")
        return False
    if not isinstance(data, dict):
        print("  ✗ Expected JSON object")
        return False
    print(f"  ✓ HTTP 200 — keys: {list(data.keys())}")
    return True


# ── 12i: WebSocket event types ────────────────────────────────────────────────

def test_ws_event_types() -> bool:
    sep("12i. WebSocket EventType enum")
    try:
        from backend.websocket_manager import EventType
        required = [
            "APPROVAL_REQUEST", "APPROVAL_RESPONSE",
            "TASK_UPDATE", "AGENT_STATUS",
            "RESEARCH_PROGRESS", "REVIEW_RESULT",
        ]
        missing = []
        for name in required:
            if not hasattr(EventType, name):
                missing.append(name)
                print(f"  ✗ EventType.{name} missing")
            else:
                print(f"  ✓ EventType.{name} = {getattr(EventType, name).value!r}")
        return len(missing) == 0
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ── Runner ────────────────────────────────────────────────────────────────────

def main(server: bool) -> None:
    if server and not server_running():
        print("  ✗ Server not reachable at", BASE_URL)
        print("  → Start: python -m backend.main")
        sys.exit(1)

    results: dict[str, bool | None] = {}

    results["dashboard_html"]          = test_dashboard_html()
    results["routers"]                 = test_routers()
    results["approval_manager"]        = test_approval_manager()
    results["dashboard_router_import"] = test_dashboard_router_import()
    results["approval_router_import"]  = test_approval_router_import()
    results["ws_event_types"]          = test_ws_event_types()
    results["server_dashboard"]        = test_server_dashboard(server)
    results["server_approval_pending"] = test_server_approval_pending(server)
    results["server_dashboard_state"]  = test_server_dashboard_state(server)

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
    parser.add_argument("--server", action="store_true", help="Run against live server")
    args = parser.parse_args()
    main(args.server)
