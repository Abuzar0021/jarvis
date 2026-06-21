#!/usr/bin/env python3
"""
Jarvis AI OS — Startup Script
Checks prerequisites, then launches the FastAPI backend.

Usage:
    python start_jarvis.py              # full server
    python start_jarvis.py --check      # prerequisite check only
    python start_jarvis.py --no-voice   # disable microphone (text-only mode)
"""

import argparse
import os
import sys
import subprocess
from pathlib import Path


ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))


def print_banner():
    print("\033[35m")
    print("     ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗")
    print("     ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝")
    print("     ██║███████║██████╔╝██║   ██║██║███████╗")
    print("██   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║")
    print("╚█████╔╝██║  ██║██║  ██║ ╚████╔╝ ██║███████║")
    print(" ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝")
    print("\033[0m")
    print("  AI Operating System — Phase 1: Voice Online\n")


def check_python():
    major, minor = sys.version_info[:2]
    ok = major == 3 and minor >= 10
    status = "✓" if ok else "✗"
    print(f"  {status} Python {major}.{minor}  (need 3.10+)")
    return ok


def check_env():
    from dotenv import load_dotenv
    load_dotenv()
    key = os.getenv("OPENROUTER_API_KEY", "")
    if key:
        print(f"  ✓ OPENROUTER_API_KEY set ({key[:8]}…)")
        return True
    print("  ✗ OPENROUTER_API_KEY not set → copy .env.example → .env")
    return False


def check_package(import_name: str, pkg_name: str, required: bool = True) -> bool:
    try:
        __import__(import_name)
        print(f"  ✓ {pkg_name}")
        return True
    except ImportError:
        mark = "✗" if required else "○"
        note = "" if required else " (optional)"
        print(f"  {mark} {pkg_name} not installed{note} → pip install {pkg_name}")
        return not required  # optional → non-blocking


def run_checks() -> bool:
    print("── Prerequisites ──────────────────────────────────────")
    ok = True
    ok &= check_python()
    ok &= check_env()
    print()
    print("── Required packages ──────────────────────────────────")
    ok &= check_package("fastapi", "fastapi")
    ok &= check_package("uvicorn", "uvicorn[standard]")
    ok &= check_package("faster_whisper", "faster-whisper")
    ok &= check_package("numpy", "numpy")
    print()
    print("── Optional packages ──────────────────────────────────")
    check_package("sounddevice", "sounddevice", required=False)
    check_package("soundfile", "soundfile", required=False)
    check_package("kokoro", "kokoro", required=False)
    check_package("pyttsx3", "pyttsx3", required=False)
    check_package("openwakeword", "openwakeword", required=False)
    print()
    return ok


def main():
    print_banner()
    parser = argparse.ArgumentParser(description="Jarvis AI OS Launcher")
    parser.add_argument("--check", action="store_true", help="Run prerequisite check only")
    parser.add_argument("--no-voice", action="store_true", help="Disable microphone (text only)")
    parser.add_argument("--port", type=int, default=8000, help="Server port (default 8000)")
    parser.add_argument("--host", default="0.0.0.0", help="Bind host (default 0.0.0.0)")
    args = parser.parse_args()

    ok = run_checks()

    if args.check:
        sys.exit(0 if ok else 1)

    if not ok:
        print("⚠  Some required packages are missing. Run:")
        print("   pip install -r requirements.txt -r requirements-phase1.txt\n")
        sys.exit(1)

    if args.no_voice:
        os.environ["JARVIS_NO_VOICE"] = "1"
        print("ℹ  Voice disabled — text-only mode\n")

    print(f"── Starting Jarvis backend on http://{args.host}:{args.port} ───")
    print(f"   Browser HUD: http://localhost:{args.port}")
    print(f"   API docs:    http://localhost:{args.port}/docs")
    print("   Press Ctrl+C to stop\n")

    try:
        import uvicorn
        uvicorn.run(
            "backend.main:app",
            host=args.host,
            port=args.port,
            reload=False,
            log_level="info",
        )
    except KeyboardInterrupt:
        print("\n\nJarvis offline. Goodbye.\n")


if __name__ == "__main__":
    main()
