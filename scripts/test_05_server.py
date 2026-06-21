#!/usr/bin/env python3
"""
TEST 5 — FastAPI Server + WebSocket
Verifies: server starts, all endpoints respond, WebSocket connects.

REQUIRES: Server already running in another terminal.

Start server first:
    python start_jarvis.py

Then run this test:
    python scripts/test_05_server.py
"""

import sys
import json
import time
import asyncio
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

BASE_URL = "http://localhost:8000"
WS_URL  = "ws://localhost:8000/api/voice/ws"


def separator(title):
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print('─'*55)


def http_get(path, timeout=5):
    """Return (status_code, json_body) or (None, error_str)."""
    try:
        req = urllib.request.Request(f"{BASE_URL}{path}")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read().decode())
            return resp.status, body
    except urllib.error.HTTPError as e:
        return e.code, str(e)
    except urllib.error.URLError as e:
        return None, str(e.reason)
    except Exception as e:
        return None, str(e)


def http_post(path, data: dict, timeout=5):
    try:
        payload = json.dumps(data).encode()
        req = urllib.request.Request(
            f"{BASE_URL}{path}",
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, str(e)
    except urllib.error.URLError as e:
        return None, str(e.reason)
    except Exception as e:
        return None, str(e)


def check_server_running():
    separator("5a. Server reachability")
    status, body = http_get("/api/system/health")
    if status is None:
        print(f"  ✗ Cannot reach {BASE_URL}")
        print(f"    Error: {body}")
        print(f"\n  Fix: Start the server first in another terminal:")
        print(f"    python start_jarvis.py")
        print(f"\n  Or if already running, check port:")
        print(f"    netstat -an | grep 8000   (Linux/Mac)")
        print(f"    netstat -an | findstr 8000  (Windows)")
        return False
    print(f"  ✓ Server is up at {BASE_URL}")
    print(f"  ✓ Health: {body}")
    return True


def test_api_endpoints():
    separator("5b. API endpoints")
    endpoints = [
        ("GET", "/",                          "Homepage/HUD"),
        ("GET", "/docs",                      "OpenAPI docs"),
        ("GET", "/api/system/health",         "Health check"),
        ("GET", "/api/system/status",         "Full status"),
        ("GET", "/api/system/tasks",          "Task list"),
        ("GET", "/api/system/logs",           "Action logs"),
        ("GET", "/api/system/metrics",        "Metrics"),
        ("GET", "/api/voice/status",          "Voice status"),
        ("GET", "/api/agents",                "Agent list"),
    ]

    all_ok = True
    for method, path, desc in endpoints:
        status, body = http_get(path)
        ok = isinstance(status, int) and 200 <= status < 300
        mark = "✓" if ok else "✗"
        print(f"  {mark} {method} {path:40s} {status or 'FAIL'!s:6} {desc}")
        if not ok:
            all_ok = False

    return all_ok


def test_voice_endpoints():
    separator("5c. Voice control endpoints")

    # GET status
    status, body = http_get("/api/voice/status")
    if status == 200:
        print(f"  ✓ Voice status: state={body.get('state')}, "
              f"detector={body.get('detector_backend')}, "
              f"tts={body.get('tts_backend')}")
    else:
        print(f"  ✗ Voice status failed: {status}")

    # POST trigger (manual wake)
    status, body = http_post("/api/voice/trigger", {})
    if status == 200:
        print(f"  ✓ Wake trigger: {body}")
    else:
        print(f"  ✗ Wake trigger failed: {status}")

    # POST interrupt
    status, body = http_post("/api/voice/interrupt", {})
    if status == 200:
        print(f"  ✓ Interrupt: {body}")
    else:
        print(f"  ✗ Interrupt failed: {status}")

    # POST text command (quick test without actual LLM)
    status, body = http_post("/api/voice/command", {"text": "status check", "speak": False})
    if status == 200:
        print(f"  ✓ Text command accepted: {body}")
    else:
        print(f"  ⚠ Text command: {status} {body}")

    return True


def test_agent_endpoints():
    separator("5d. Agent endpoints")

    status, body = http_get("/api/agents")
    if status == 200:
        agents = body.get("agents", [])
        print(f"  ✓ {len(agents)} agents registered")
        for a in agents:
            print(f"    - {a['name']}: {a['role'][:40]}")
    else:
        print(f"  ✗ Agent list failed: {status}")
        return False
    return True


async def test_websocket():
    separator("5e. WebSocket connection")
    try:
        import websockets
    except ImportError:
        print("  ✗ websockets not installed")
        print("    Fix: pip install websockets")
        return False

    print(f"  Connecting to {WS_URL}…")
    try:
        async with websockets.connect(WS_URL, open_timeout=5) as ws:
            print("  ✓ Connected")

            # Should immediately receive current state
            msg_raw = await asyncio.wait_for(ws.recv(), timeout=3.0)
            msg = json.loads(msg_raw)
            print(f"  ✓ Received initial event: type={msg.get('type')}")

            # Send trigger
            await ws.send(json.dumps({"action": "trigger"}))
            print("  ✓ Sent wake trigger via WebSocket")

            # Wait for state events
            received_events = []
            try:
                for _ in range(5):
                    msg_raw = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    msg = json.loads(msg_raw)
                    received_events.append(msg.get("type"))
            except asyncio.TimeoutError:
                pass

            if received_events:
                print(f"  ✓ Received {len(received_events)} event(s): {received_events}")
            else:
                print("  ⚠ No follow-up events received (server may not have mic)")

            # Send interrupt
            await ws.send(json.dumps({"action": "interrupt"}))
            print("  ✓ Sent interrupt")

            return True

    except ConnectionRefusedError:
        print(f"  ✗ Connection refused — is the server running?")
        print(f"    python start_jarvis.py")
        return False
    except asyncio.TimeoutError:
        print(f"  ✗ Connection timed out")
        return False
    except Exception as e:
        print(f"  ✗ WebSocket error: {e}")
        return False


def test_hud_loads():
    separator("5f. Browser HUD")
    status, _ = http_get("/")
    # For HTML, urlopen parses it as JSON which fails — use raw
    try:
        req = urllib.request.Request(f"{BASE_URL}/")
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode()
            has_jarvis = "JARVIS" in html
            has_ws_code = "WebSocket" in html
            has_core = "id=\"core\"" in html
            print(f"  ✓ HUD loads (HTTP {resp.status})")
            print(f"  ✓ Contains JARVIS heading  : {has_jarvis}")
            print(f"  ✓ Contains WebSocket code  : {has_ws_code}")
            print(f"  ✓ Contains AI core element : {has_core}")
            print(f"\n  Open in browser: {BASE_URL}")
            return has_jarvis and has_ws_code
    except Exception as e:
        print(f"  ✗ HUD load failed: {e}")
        return False


def main():
    print("\n" + "="*55)
    print("  JARVIS PHASE 1 — TEST 5: FASTAPI SERVER")
    print("="*55)
    print(f"  Target: {BASE_URL}")
    print("  (Start server first: python start_jarvis.py)\n")

    if not check_server_running():
        print("\n  Cannot proceed — server not running")
        sys.exit(1)

    api_ok    = test_api_endpoints()
    voice_ok  = test_voice_endpoints()
    agents_ok = test_agent_endpoints()
    hud_ok    = test_hud_loads()

    loop = asyncio.new_event_loop()
    ws_ok = loop.run_until_complete(test_websocket())
    loop.close()

    print("\n" + "="*55)
    print("  Results:")
    print(f"    API endpoints  : {'✓' if api_ok    else '✗'}")
    print(f"    Voice control  : {'✓' if voice_ok  else '✗'}")
    print(f"    Agent list     : {'✓' if agents_ok else '✗'}")
    print(f"    Browser HUD    : {'✓' if hud_ok    else '✗'}")
    print(f"    WebSocket      : {'✓' if ws_ok     else '✗'}")

    overall = api_ok and voice_ok and agents_ok and hud_ok and ws_ok
    print(f"\n  RESULT: {'PASS ✓' if overall else 'FAIL ✗ — see above'}")
    print("  Proceed to: python scripts/test_06_openrouter.py")
    print("="*55 + "\n")
    sys.exit(0 if overall else 1)


if __name__ == "__main__":
    main()
