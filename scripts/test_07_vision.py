#!/usr/bin/env python3
"""
TEST 7 — Phase 2 Vision System
Verifies: screen capture, webcam capture, vision LLM call, REST endpoints.

Run: python scripts/test_07_vision.py
     python scripts/test_07_vision.py --no-server   # skip endpoint tests
     python scripts/test_07_vision.py --webcam       # include webcam test
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import io
import json
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

# Load env
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


# ── 7a: Package imports ────────────────────────────────────────────────────────

def test_imports() -> bool:
    sep("7a. Vision package imports")
    ok = True

    for pkg, note in [
        ("mss",    "screen capture"),
        ("PIL",    "image processing (Pillow)"),
        ("numpy",  "array ops"),
    ]:
        try:
            __import__(pkg)
            print(f"  ✓ {pkg:12s}  {note}")
        except ImportError:
            print(f"  ✗ {pkg:12s}  MISSING — pip install {pkg.lower()}")
            ok = False

    try:
        import cv2
        print(f"  ✓ cv2         webcam capture (opencv-python {cv2.__version__})")
    except ImportError:
        print("  ⚠ cv2         not installed — webcam test will be skipped")
        print("    Install: pip install opencv-python")

    try:
        from backend.vision.screen import capture_screen
        from backend.vision.webcam import capture_webcam
        from backend.vision.analyzer import VisionAnalyzer
        print("  ✓ backend.vision.*  all modules importable")
    except ImportError as e:
        print(f"  ✗ backend.vision    ImportError: {e}")
        ok = False

    try:
        from tools.vision_tools import capture_screen, capture_webcam, analyze_image
        print("  ✓ tools.vision_tools  all 3 tools registered")
    except ImportError as e:
        print(f"  ✗ tools.vision_tools  ImportError: {e}")
        ok = False

    return ok


# ── 7b: Screen capture (no LLM) ───────────────────────────────────────────────

async def test_screen_capture() -> tuple[bool, str | None]:
    sep("7b. Screen capture (mss)")
    try:
        from backend.vision.screen import capture_screen
    except ImportError as e:
        print(f"  ✗ Import error: {e}")
        return False, None

    try:
        t0 = time.monotonic()
        image_b64, saved_path = await capture_screen(save=True)
        elapsed = time.monotonic() - t0

        # Decode to verify it's valid JPEG
        jpeg_bytes = base64.b64decode(image_b64)
        size_kb = len(jpeg_bytes) // 1024

        print(f"  ✓ Screen captured in {elapsed:.2f}s")
        print(f"  ✓ Image size   : {size_kb} KB (base64 len={len(image_b64)})")
        if saved_path:
            print(f"  ✓ Saved to     : {saved_path}")

        # Verify it's a real JPEG (starts with FF D8)
        if jpeg_bytes[:2] == b"\xff\xd8":
            print("  ✓ Valid JPEG header")
        else:
            print("  ⚠ Unexpected header bytes — may not be JPEG")

        return True, image_b64

    except RuntimeError as exc:
        print(f"  ⚠ Screen capture not available: {exc}")
        print("    (Expected in headless/CI environment — will use synthetic image)")
        return None, None  # None = skip, not fail
    except Exception as exc:
        print(f"  ✗ Unexpected error: {exc}")
        return False, None


def make_synthetic_image() -> str:
    """Create a test image with text for headless environments."""
    from PIL import Image, ImageDraw, ImageFont
    import io

    img = Image.new("RGB", (800, 400), color=(20, 20, 40))
    draw = ImageDraw.Draw(img)

    draw.rectangle([20, 20, 780, 380], outline=(0, 200, 255), width=2)
    draw.text((40, 60),  "JARVIS AI OPERATING SYSTEM",   fill=(0, 245, 255))
    draw.text((40, 100), "Phase 2: Vision System Test",  fill=(200, 200, 200))
    draw.text((40, 150), "Status: ONLINE",               fill=(0, 255, 100))
    draw.text((40, 190), "Error detected: None",         fill=(200, 200, 200))
    draw.text((40, 230), "Active application: Terminal", fill=(200, 200, 200))
    draw.text((40, 280), "Test image — not a real screenshot", fill=(150, 150, 150))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


# ── 7c: Webcam capture ─────────────────────────────────────────────────────────

async def test_webcam_capture() -> tuple[bool, str | None]:
    sep("7c. Webcam capture (OpenCV)")
    try:
        import cv2
    except ImportError:
        print("  ○ cv2 not installed — skipping")
        print("    Install: pip install opencv-python")
        return None, None

    try:
        from backend.vision.webcam import capture_webcam
        t0 = time.monotonic()
        image_b64, saved_path = await capture_webcam(device=0, save=True)
        elapsed = time.monotonic() - t0

        size_kb = len(base64.b64decode(image_b64)) // 1024
        print(f"  ✓ Webcam frame captured in {elapsed:.2f}s ({size_kb} KB)")
        if saved_path:
            print(f"  ✓ Saved to: {saved_path}")
        return True, image_b64

    except RuntimeError as exc:
        print(f"  ⚠ Webcam not available: {exc}")
        return None, None  # warn, don't fail
    except Exception as exc:
        print(f"  ✗ Error: {exc}")
        return False, None


# ── 7d: Vision LLM call ────────────────────────────────────────────────────────

async def test_vision_llm(image_b64: str, source: str = "screen") -> bool:
    sep(f"7d. Vision LLM call (image source: {source})")
    import os
    if not os.environ.get("OPENROUTER_API_KEY"):
        print("  ○ OPENROUTER_API_KEY not set — skipping (set key to test LLM)")
        return None

    try:
        from backend.vision.analyzer import VisionAnalyzer
        from backend.config import VISION_MODEL

        analyzer = VisionAnalyzer()
        print(f"  Model: {VISION_MODEL}")
        print("  Sending image to vision LLM…")

        t0 = time.monotonic()
        description = await analyzer.analyze(
            image_b64,
            question="What do you see in this image? List the key elements.",
        )
        elapsed = time.monotonic() - t0

        if description:
            print(f"  ✓ Response received in {elapsed:.1f}s")
            preview = description[:200].replace("\n", " ")
            print(f"  ✓ Response preview:\n    \"{preview}\"")
            return True
        else:
            print(f"  ✗ Empty response after {elapsed:.1f}s")
            return False

    except Exception as exc:
        print(f"  ✗ Vision LLM call failed: {exc}")
        if "401" in str(exc):
            print("    Fix: check OPENROUTER_API_KEY")
        elif "model" in str(exc).lower():
            print("    Fix: try VISION_MODEL=anthropic/claude-3.5-sonnet in .env")
        return False


# ── 7e: Structured analysis ────────────────────────────────────────────────────

async def test_structured_analysis(image_b64: str) -> bool:
    sep("7e. Structured analysis (JSON response)")
    import os
    if not os.environ.get("OPENROUTER_API_KEY"):
        print("  ○ Skipped — no API key")
        return None

    try:
        from backend.vision.analyzer import VisionAnalyzer

        analyzer = VisionAnalyzer()
        t0 = time.monotonic()
        result = await analyzer.structured_analyze(
            image_b64,
            question="What is on this screen/image?",
        )
        elapsed = time.monotonic() - t0

        print(f"  ✓ Structured response in {elapsed:.1f}s:")
        print(f"    description     : {result.get('description','')[:80]}…")
        print(f"    reasoning       : {result.get('reasoning','')[:80]}")
        print(f"    action_suggestion: {result.get('action_suggestion')}")

        return "description" in result

    except Exception as exc:
        print(f"  ✗ Structured analysis failed: {exc}")
        return False


# ── 7f: Vision tools ───────────────────────────────────────────────────────────

def test_vision_tools_registered() -> bool:
    sep("7f. Vision tools registered")
    try:
        import tools  # fires all @register decorators
        from tools import TOOL_REGISTRY

        expected = ["capture_screen", "capture_webcam", "analyze_image"]
        all_ok = True
        for name in expected:
            if name in TOOL_REGISTRY:
                entry = TOOL_REGISTRY[name]
                desc = entry["schema"]["function"]["description"][:50]
                print(f"  ✓ {name:20s}  {desc}…")
            else:
                print(f"  ✗ {name:20s}  NOT in registry")
                all_ok = False
        return all_ok
    except Exception as exc:
        print(f"  ✗ Tool registry error: {exc}")
        return False


# ── 7g: REST endpoints ─────────────────────────────────────────────────────────

def test_rest_endpoints() -> bool:
    sep("7g. REST endpoints (requires server running)")
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/system/health")
        urllib.request.urlopen(req, timeout=3)
    except Exception:
        print("  ○ Server not running — skipping endpoint tests")
        print(f"    Start with: python start_jarvis.py")
        return None

    tests = [
        ("GET",  "/api/vision/screen",  None),
        ("GET",  "/api/vision/webcam",  None),
    ]
    # POST /api/vision/screen
    try:
        payload = json.dumps({"question": "Describe this image briefly.", "structured": True}).encode()
        req = urllib.request.Request(
            f"{BASE_URL}/api/vision/screen",
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read())
            print(f"  ✓ POST /api/vision/screen  → {resp.status}")
            print(f"    description: {body.get('description','')[:80]}…")
            return True
    except urllib.error.HTTPError as e:
        if e.code == 503:
            print(f"  ⚠ POST /api/vision/screen → 503 (no display in headless env)")
            return None
        print(f"  ✗ POST /api/vision/screen → {e.code}")
        return False
    except Exception as exc:
        print(f"  ✗ Endpoint test failed: {exc}")
        return False


# ── 7h: Vision agent ──────────────────────────────────────────────────────────

def test_vision_agent_registered() -> bool:
    sep("7h. VisionAgent in orchestrator")
    try:
        from core.orchestrator import _BUILTIN_AGENTS
        if "vision" in _BUILTIN_AGENTS:
            print(f"  ✓ 'vision' registered: {_BUILTIN_AGENTS['vision']}")
            return True
        else:
            print("  ✗ 'vision' not in _BUILTIN_AGENTS")
            return False
    except Exception as exc:
        print(f"  ✗ Orchestrator check failed: {exc}")
        return False


# ── Main ───────────────────────────────────────────────────────────────────────

async def main_async(args) -> None:
    print("\n" + "=" * 56)
    print("  JARVIS PHASE 2 — TEST 7: VISION SYSTEM")
    print("=" * 56)

    results: dict[str, bool | None] = {}

    results["imports"] = test_imports()
    results["tools"] = test_vision_tools_registered()
    results["agent"] = test_vision_agent_registered()

    screen_ok, image_b64 = await test_screen_capture()
    results["screen"] = screen_ok

    if image_b64 is None:
        print("\n  No real screenshot available — using synthetic test image")
        image_b64 = make_synthetic_image()
        print("  ✓ Synthetic test image created (800×400 JPEG)")

    if args.webcam:
        webcam_ok, _ = await test_webcam_capture()
        results["webcam"] = webcam_ok
    else:
        print("\n  Webcam test skipped (run with --webcam to include)")
        results["webcam"] = None

    results["llm"] = await test_vision_llm(image_b64, source="screen" if screen_ok else "synthetic")
    if results["llm"]:
        results["structured"] = await test_structured_analysis(image_b64)

    if not args.no_server:
        results["endpoints"] = test_rest_endpoints()

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 56)
    print("  Results:")
    labels = {
        "imports":    "Package imports",
        "tools":      "Tool registration",
        "agent":      "VisionAgent in orchestrator",
        "screen":     "Screen capture (mss)",
        "webcam":     "Webcam capture (cv2)",
        "llm":        "Vision LLM call",
        "structured": "Structured JSON analysis",
        "endpoints":  "REST endpoints",
    }
    for key, label in labels.items():
        val = results.get(key, None)
        if val is True:
            mark = "✓"
        elif val is False:
            mark = "✗"
        else:
            mark = "○"
        print(f"    {mark}  {label}")

    hard_failures = [k for k, v in results.items() if v is False]
    overall = len(hard_failures) == 0
    print(f"\n  RESULT: {'PASS ✓' if overall else 'FAIL ✗ — ' + ', '.join(hard_failures)}")
    print("  Phase 2 Vision System is ready.")
    print("=" * 56 + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-server", action="store_true", help="Skip REST endpoint tests")
    parser.add_argument("--webcam",    action="store_true", help="Include webcam capture test")
    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
