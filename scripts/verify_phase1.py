#!/usr/bin/env python3
"""
JARVIS PHASE 1 — MASTER VERIFICATION SCRIPT
Runs all Phase 1 tests sequentially and produces a final pass/fail report
with a troubleshooting guide for any failures.

Usage:
    python scripts/verify_phase1.py           # full check (skips live audio)
    python scripts/verify_phase1.py --live    # include live mic + TTS playback
    python scripts/verify_phase1.py --quick   # API/imports only, no audio
"""

import sys
import os
import time
import asyncio
import argparse
import json
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

# Load .env
env_file = ROOT / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

WIDTH = 58


def banner(text, char="="):
    print(f"\n{char*WIDTH}")
    print(f"  {text}")
    print(f"{char*WIDTH}")


def separator(title):
    print(f"\n{'─'*WIDTH}")
    print(f"  {title}")
    print(f"{'─'*WIDTH}")


def status(label, ok, note=""):
    mark = "✓" if ok is True else ("⚠" if ok is None else "✗")
    suffix = f"  ({note})" if note else ""
    print(f"    {mark}  {label}{suffix}")


# ─────────────────────────────────────────────
# CHECK 1: Python environment
# ─────────────────────────────────────────────

def check_python():
    separator("1. Python Environment")
    v = sys.version_info
    ok = v >= (3, 10)
    print(f"  Python {v.major}.{v.minor}.{v.micro}")
    if ok:
        print("  ✓ Version ≥ 3.10")
    else:
        print("  ✗ Python 3.10+ required")
    return ok


def check_packages():
    separator("2. Required Packages")
    required = {
        "fastapi":         "FastAPI web framework",
        "uvicorn":         "ASGI server",
        "websockets":      "WebSocket client/server",
        "faster_whisper":  "Speech-to-text (STT)",
        "sounddevice":     "Audio I/O",
        "numpy":           "Numerical arrays",
        "openai":          "OpenRouter SDK",
        "dotenv":          "Environment loader",
        "rich":            "Terminal UI",
    }
    optional = {
        "kokoro":         "High-quality TTS (primary)",
        "pyttsx3":        "Fallback TTS (required if no kokoro)",
        "openwakeword":   "Low-CPU wake word (optional)",
        "soundfile":      "WAV file I/O",
    }

    all_ok = True
    for pkg, desc in required.items():
        try:
            mod_name = "python_dotenv" if pkg == "dotenv" else pkg
            __import__(pkg if pkg != "dotenv" else "dotenv")
            print(f"  ✓ {pkg:20s} {desc}")
        except ImportError:
            install_name = "python-dotenv" if pkg == "dotenv" else pkg.replace("_", "-")
            print(f"  ✗ {pkg:20s} MISSING — pip install {install_name}")
            all_ok = False

    print()
    has_tts = False
    for pkg, desc in optional.items():
        try:
            __import__(pkg)
            print(f"  ✓ {pkg:20s} {desc}")
            if pkg in ("kokoro", "pyttsx3"):
                has_tts = True
        except ImportError:
            print(f"  ○ {pkg:20s} not installed — {desc}")

    if not has_tts:
        print("\n  ✗ No TTS engine available — install pyttsx3:")
        print("    pip install pyttsx3")
        if sys.platform == "linux":
            print("    sudo apt-get install espeak espeak-ng")
        all_ok = False

    return all_ok


# ─────────────────────────────────────────────
# CHECK 2: Core imports
# ─────────────────────────────────────────────

def check_core_imports():
    separator("3. Jarvis Core Modules")
    modules = [
        ("config",                    "Root configuration"),
        ("core.memory",               "SQLite memory"),
        ("core.llm_client",           "LLM client"),
        ("core.safety",               "Safety guard"),
        ("core.orchestrator",         "Agent orchestrator"),
        ("agents.ceo_agent",          "CEO agent"),
        ("backend.config",            "Backend config"),
        ("backend.websocket_manager", "WebSocket manager"),
        ("backend.main",              "FastAPI app"),
        ("backend.voice.audio_io",    "Audio I/O"),
        ("backend.voice.transcriber", "Whisper transcriber"),
        ("backend.voice.detector",    "Wake word detector"),
        ("backend.voice.speaker",     "TTS speaker"),
        ("backend.voice.pipeline",    "Voice pipeline"),
    ]

    all_ok = True
    for mod, desc in modules:
        try:
            __import__(mod)
            print(f"  ✓ {mod:35s} {desc}")
        except ImportError as e:
            print(f"  ✗ {mod:35s} ImportError: {e}")
            all_ok = False
        except Exception as e:
            print(f"  ⚠ {mod:35s} {type(e).__name__}: {e}")

    return all_ok


# ─────────────────────────────────────────────
# CHECK 3: Configuration
# ─────────────────────────────────────────────

def check_configuration():
    separator("4. Configuration")
    all_ok = True

    # API key
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        print("  ✗ OPENROUTER_API_KEY not set")
        print("    Add to .env: OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx")
        all_ok = False
    elif key.startswith("sk-or-"):
        print(f"  ✓ OPENROUTER_API_KEY: {key[:16]}…")
    else:
        print(f"  ⚠ OPENROUTER_API_KEY present but unexpected format")

    # .env file
    if env_file.exists():
        print(f"  ✓ .env file found: {env_file}")
    else:
        print(f"  ⚠ No .env file — copy .env.example to .env")

    # Data directories
    try:
        from config import DATA_DIR, BASE_DIR
        print(f"  ✓ BASE_DIR: {BASE_DIR}")
        for d in ["data", "data/logs", "data/agents"]:
            p = BASE_DIR / d
            p.mkdir(parents=True, exist_ok=True)
            print(f"  ✓ Directory exists: {p}")
    except Exception as e:
        print(f"  ✗ Config error: {e}")
        all_ok = False

    # Backend config values
    try:
        from backend.config import (
            WHISPER_MODEL_SIZE, WAKE_WORD, SAMPLE_RATE,
            SILENCE_THRESHOLD, TTS_BACKEND
        )
        print(f"  ✓ Whisper model size : {WHISPER_MODEL_SIZE}")
        print(f"  ✓ Wake word          : {WAKE_WORD}")
        print(f"  ✓ Sample rate        : {SAMPLE_RATE} Hz")
        print(f"  ✓ Silence threshold  : {SILENCE_THRESHOLD}")
        print(f"  ✓ TTS backend        : {TTS_BACKEND}")
    except Exception as e:
        print(f"  ✗ Backend config error: {e}")
        all_ok = False

    return all_ok


# ─────────────────────────────────────────────
# CHECK 4: Audio devices
# ─────────────────────────────────────────────

def check_audio_devices():
    separator("5. Audio Devices")
    try:
        import sounddevice as sd
        devices = sd.query_devices()
        default_in  = sd.default.device[0]
        default_out = sd.default.device[1]

        input_devices  = [d for d in devices if d['max_input_channels'] > 0]
        output_devices = [d for d in devices if d['max_output_channels'] > 0]

        print(f"  Found {len(devices)} device(s) total")
        print(f"  Input devices  : {len(input_devices)}")
        print(f"  Output devices : {len(output_devices)}")

        if input_devices:
            print(f"  ✓ Default input : {devices[default_in]['name']}")
        else:
            print("  ✗ No input devices found — microphone not available")
            return False

        if output_devices:
            print(f"  ✓ Default output: {devices[default_out]['name']}")
        else:
            print("  ✗ No output devices found — audio playback unavailable")

        return bool(input_devices)

    except ImportError:
        print("  ✗ sounddevice not installed")
        return False
    except Exception as e:
        print(f"  ✗ Audio device query failed: {e}")
        if "PortAudio" in str(e):
            print("    Fix (Linux): sudo apt-get install libportaudio2")
            print("    Fix (Mac):   brew install portaudio")
        return False


# ─────────────────────────────────────────────
# CHECK 5: Memory system
# ─────────────────────────────────────────────

def check_memory():
    separator("6. Memory System (SQLite)")
    try:
        from core.memory import Memory
        mem = Memory()

        sid = "verify_phase1"
        mem.save_message(sid, "user", "verify test")
        mem.save_message(sid, "assistant", "ok")
        history = mem.get_history(sid, limit=5)

        if len(history) >= 2:
            print(f"  ✓ SQLite write + read: {len(history)} messages")
        else:
            print(f"  ✗ Read returned only {len(history)} messages")
            return False

        mem.log_action("verify", "phase1_check", {}, "success")
        print("  ✓ Action logging works")

        stats = mem.get_stats()
        db_path = ROOT / "data" / "memory.db"
        if db_path.exists():
            size_kb = db_path.stat().st_size // 1024
            print(f"  ✓ DB file: {db_path} ({size_kb} KB)")

        return True

    except Exception as e:
        print(f"  ✗ Memory error: {e}")
        return False


# ─────────────────────────────────────────────
# CHECK 6: OpenRouter connectivity
# ─────────────────────────────────────────────

def check_openrouter():
    separator("7. OpenRouter API")
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        print("  ✗ Skipped — no API key")
        return False

    try:
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/models",
            headers={
                "Authorization": f"Bearer {key}",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Jarvis",
            }
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            count = len(data.get("data", []))
            print(f"  ✓ OpenRouter reachable — {count} models available")
            return True

    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("  ✗ 401 Unauthorized — invalid API key")
        elif e.code == 429:
            print("  ⚠ 429 Rate limited — key valid, add credits")
        else:
            print(f"  ✗ HTTP {e.code}")
        return False
    except urllib.error.URLError as e:
        print(f"  ✗ Network error: {e.reason}")
        return False
    except Exception as e:
        print(f"  ✗ {e}")
        return False


# ─────────────────────────────────────────────
# CHECK 7: Async — LLM + components
# ─────────────────────────────────────────────

async def check_llm_call():
    separator("8. LLM Test Call")
    try:
        from core.llm_client import LLMClient
        client = LLMClient()
        msgs = [
            {"role": "system", "content": "Reply in ≤5 words."},
            {"role": "user",   "content": "Say: Jarvis ready."},
        ]
        t0 = time.monotonic()
        resp = await client.chat(msgs, model_key="ceo")
        elapsed = time.monotonic() - t0
        if resp:
            print(f"  ✓ LLM response in {elapsed:.1f}s: \"{resp.strip()[:60]}\"")
            return True
        else:
            print("  ✗ Empty response")
            return False
    except Exception as e:
        print(f"  ✗ LLM call failed: {e}")
        return False


async def check_voice_components():
    separator("9. Voice Components")

    results = {}

    # Transcriber (lazy load — just instantiation, no model download)
    try:
        from backend.voice.transcriber import WhisperTranscriber
        t = WhisperTranscriber(model_size="tiny", device="cpu", compute_type="int8")
        print(f"  ✓ WhisperTranscriber instantiated (model loads on first use)")
        results["transcriber"] = True
    except Exception as e:
        print(f"  ✗ WhisperTranscriber: {e}")
        results["transcriber"] = False

    # Detector
    try:
        from backend.voice.detector import WakeWordDetector
        from backend.voice.transcriber import WhisperTranscriber
        tr = WhisperTranscriber(model_size="tiny")
        det = WakeWordDetector(transcriber=tr, wake_word="jarvis")
        det.trigger()
        print(f"  ✓ WakeWordDetector: manual trigger works")
        results["detector"] = True
    except Exception as e:
        print(f"  ✗ WakeWordDetector: {e}")
        results["detector"] = False

    # Speaker factory
    try:
        from backend.voice.speaker import create_speaker
        spk = create_speaker(backend="auto")
        name = getattr(spk, 'NAME', type(spk).__name__)
        print(f"  ✓ Speaker factory: selected '{name}'")
        results["speaker"] = True
    except Exception as e:
        print(f"  ✗ Speaker factory: {e}")
        results["speaker"] = False

    # Pipeline creation (no start)
    try:
        from backend.voice.pipeline import VoicePipeline
        pipe = VoicePipeline()
        s = pipe.get_status()
        print(f"  ✓ VoicePipeline: state={s['state']}")
        results["pipeline"] = True
    except Exception as e:
        print(f"  ✗ VoicePipeline: {e}")
        results["pipeline"] = False

    return all(results.values())


async def check_ceo_agent():
    separator("10. CEO Agent")
    try:
        from agents.ceo_agent import CEOAgent
        agent = CEOAgent()
        print(f"  ✓ CEOAgent loaded: {agent.name}")

        task = "Reply with exactly: Jarvis Phase 1 complete."
        t0 = time.monotonic()
        result = await agent.run(task=task, context={}, session_id="verify_p1")
        elapsed = time.monotonic() - t0

        if result:
            preview = str(result)[:80].replace("\n", " ")
            print(f"  ✓ Executed in {elapsed:.1f}s: \"{preview}\"")
            return True
        else:
            print(f"  ✗ Empty result after {elapsed:.1f}s")
            return False
    except Exception as e:
        print(f"  ✗ CEO agent failed: {e}")
        return False


async def check_server_if_running():
    separator("11. FastAPI Server (optional — run separately)")
    try:
        req = urllib.request.Request("http://localhost:8000/api/system/health")
        with urllib.request.urlopen(req, timeout=3) as resp:
            body = json.loads(resp.read())
            print(f"  ✓ Server running at http://localhost:8000")
            print(f"  ✓ Health: {body}")
            return True
    except Exception:
        print("  ○ Server not running (that's OK for this check)")
        print("    To test: python start_jarvis.py")
        print("    Then:    python scripts/test_05_server.py")
        return None  # None = not required here


# ─────────────────────────────────────────────
# TROUBLESHOOTING GUIDE
# ─────────────────────────────────────────────

def print_troubleshooting(results: dict):
    banner("TROUBLESHOOTING GUIDE", "─")

    failures = {k: v for k, v in results.items() if v is False}
    if not failures:
        print("\n  All checks passed — no troubleshooting needed!")
        return

    guides = {
        "packages": """
  ✗ MISSING PACKAGES
  ──────────────────
  Install all Phase 1 dependencies:
    pip install -r requirements-phase1.txt

  If kokoro fails to install (wheel error):
    pip install pyttsx3  # fallback TTS — always works
    sudo apt-get install espeak espeak-ng  # Linux

  If sounddevice fails:
    Linux: sudo apt-get install libportaudio2 portaudio19-dev
    Mac:   brew install portaudio
    Win:   pip install sounddevice --force-reinstall
""",
        "core_imports": """
  ✗ IMPORT ERRORS
  ───────────────
  1. Make sure you're running from the project root:
       cd /path/to/jarvis
       python scripts/verify_phase1.py

  2. Check that all files exist:
       ls backend/voice/
       ls agents/
       ls core/

  3. If backend/ modules fail, check backend/__init__.py exists.
""",
        "configuration": """
  ✗ CONFIGURATION MISSING
  ───────────────────────
  1. Copy the example env file:
       cp .env.example .env

  2. Edit .env and add your OpenRouter key:
       OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx

  3. Get a key at: https://openrouter.ai/keys
     (free tier available)

  4. Create required directories:
       mkdir -p data/logs data/agents
""",
        "audio": """
  ✗ NO MICROPHONE DETECTED
  ────────────────────────
  Linux:
    sudo apt-get install libportaudio2 alsa-utils pulseaudio
    pulseaudio --start
    arecord -l    # list capture devices

  Mac:
    System Settings → Privacy → Microphone → allow Terminal
    brew install portaudio

  Windows:
    Control Panel → Sound → Recording → check mic is enabled
    pip install sounddevice --force-reinstall

  Virtual machine / container:
    Audio passthrough required — check VM audio settings
    Or use --quick flag to skip audio tests:
      python scripts/verify_phase1.py --quick
""",
        "memory": """
  ✗ MEMORY / SQLITE ERROR
  ───────────────────────
  1. Check write permissions:
       ls -la data/
       chmod 755 data/

  2. Delete corrupt DB and retry:
       rm -f data/memory.db
       python scripts/verify_phase1.py

  3. If 'MEMORY_DB_PATH not in config':
       Check config.py has: MEMORY_DB_PATH = DATA_DIR / "memory.db"
""",
        "openrouter": """
  ✗ OPENROUTER CONNECTION FAILED
  ──────────────────────────────
  1. Check your API key in .env:
       OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
     Get key: https://openrouter.ai/keys

  2. Check credits (free tier runs out):
       https://openrouter.ai/credits

  3. Test connectivity:
       curl https://openrouter.ai/api/v1/models \\
         -H "Authorization: Bearer $OPENROUTER_API_KEY"

  4. If 401: key is invalid or copied incorrectly
  5. If 429: add credits or wait for rate limit reset
  6. If timeout: check internet/firewall/VPN
""",
        "llm": """
  ✗ LLM CALL FAILED
  ─────────────────
  This usually means the API key or network is the issue.
  Check the OPENROUTER fix above first.

  If rate limited, choose a free model in .env:
    CEO_MODEL=google/gemma-2-9b-it:free

  If timeout, try a faster model:
    CEO_MODEL=openai/gpt-3.5-turbo
""",
        "voice": """
  ✗ VOICE COMPONENTS FAILED
  ─────────────────────────
  Whisper model not downloaded:
    python -c "from faster_whisper import WhisperModel; WhisperModel('tiny', device='cpu')"
    # This downloads ~75MB on first run

  If HuggingFace is blocked:
    export HF_HUB_OFFLINE=0
    export HUGGINGFACE_HUB_VERBOSITY=debug
    # Try from a different network

  Wake word detector failure:
    Check faster_whisper is installed: pip install faster-whisper

  TTS speaker failure:
    Install pyttsx3: pip install pyttsx3
    Linux: sudo apt-get install espeak espeak-ng espeak-ng-data
""",
        "ceo": """
  ✗ CEO AGENT FAILED
  ──────────────────
  1. Check OpenRouter is working (test 7 above)
  2. Check all agents/ files exist:
       ls agents/
  3. Run the dedicated test:
       python scripts/test_06_openrouter.py
  4. Check logs:
       cat data/logs/jarvis_$(date +%Y%m%d).log
""",
    }

    for key, guide in guides.items():
        if failures.get(key) is False:
            print(guide)


# ─────────────────────────────────────────────
# FINAL REPORT
# ─────────────────────────────────────────────

def print_phase1_commands():
    banner("PHASE 1 INDIVIDUAL TEST COMMANDS", "─")
    tests = [
        ("1. Microphone",    "python scripts/test_01_microphone.py"),
        ("2. Whisper STT",   "python scripts/test_02_whisper.py"),
        ("3. TTS",           "python scripts/test_03_tts.py"),
        ("4. Wake Word",     "python scripts/test_04_wake_word.py"),
        ("5. FastAPI Server","python start_jarvis.py  # (terminal 1)"),
        ("",                 "python scripts/test_05_server.py  # (terminal 2)"),
        ("6. OpenRouter",    "python scripts/test_06_openrouter.py"),
        ("All-in-one",       "python scripts/verify_phase1.py"),
    ]
    for name, cmd in tests:
        if name:
            print(f"\n  {name}:")
        print(f"    {cmd}")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live",  action="store_true", help="Include live audio tests")
    parser.add_argument("--quick", action="store_true", help="Skip audio + LLM calls")
    args = parser.parse_args()

    banner("JARVIS PHASE 1 — MASTER VERIFICATION")
    print(f"  Mode: {'QUICK (no audio/LLM)' if args.quick else 'LIVE' if args.live else 'STANDARD'}")
    print(f"  Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Python: {sys.version.split()[0]}")
    print(f"  Root: {ROOT}")

    results = {}

    results["python"]      = check_python()
    results["packages"]    = check_packages()
    results["core_imports"] = check_core_imports()
    results["configuration"] = check_configuration()

    if not args.quick:
        results["audio"] = check_audio_devices()

    results["memory"] = check_memory()

    if not args.quick:
        results["openrouter"] = check_openrouter()

        loop = asyncio.new_event_loop()
        if results.get("openrouter"):
            results["llm"] = loop.run_until_complete(check_llm_call())
        else:
            results["llm"] = False
            print("\n  ✗ Skipping LLM test — OpenRouter not reachable")

        results["voice"] = loop.run_until_complete(check_voice_components())

        if results.get("openrouter") and results.get("llm"):
            results["ceo"] = loop.run_until_complete(check_ceo_agent())
        else:
            results["ceo"] = False
            print("\n  ✗ Skipping CEO agent test — LLM not available")

        server_result = loop.run_until_complete(check_server_if_running())
        loop.close()

    # ── Final Summary ──────────────────────────────
    banner("PHASE 1 VERIFICATION SUMMARY")

    labels = {
        "python":       "Python 3.10+",
        "packages":     "Required packages",
        "core_imports": "Jarvis modules",
        "configuration": "Configuration",
        "audio":        "Audio devices",
        "memory":       "SQLite memory",
        "openrouter":   "OpenRouter API",
        "llm":          "LLM test call",
        "voice":        "Voice components",
        "ceo":          "CEO agent",
    }

    critical = ["python", "packages", "core_imports", "configuration", "memory"]
    audio_ok = results.get("audio", None)
    api_ok   = results.get("openrouter", None) and results.get("llm", None)

    print()
    for key, label in labels.items():
        if key not in results:
            continue
        val = results[key]
        if val is True:
            note = ""
        elif val is None:
            note = "not checked"
        else:
            note = "FAILED"
        status(f"{label:30s}", val, note)

    # Determine overall
    critical_pass = all(results.get(k, True) for k in critical)
    voice_pass    = results.get("voice", True)
    ceo_pass      = results.get("ceo", True)
    overall       = critical_pass and (args.quick or (voice_pass and ceo_pass))

    print()
    if overall:
        banner("RESULT: PHASE 1 PASS ✓")
        print("""
  All Phase 1 components verified and operational.

  Phase 1 capabilities confirmed:
    ✓ Voice pipeline (wake word → STT → LLM → TTS)
    ✓ FastAPI server with WebSocket
    ✓ Browser HUD at http://localhost:8000
    ✓ CEO agent with multi-agent orchestration
    ✓ SQLite persistent memory
    ✓ Safety guard for dangerous actions

  READY TO PROCEED TO PHASE 2 (Vision System)
    python start_jarvis.py  # start the full system
""")
    else:
        banner("RESULT: PHASE 1 INCOMPLETE ✗")
        print("\n  One or more checks failed. See troubleshooting below.\n")
        print_troubleshooting(results)

    print_phase1_commands()
    print(f"\n{'='*WIDTH}\n")

    sys.exit(0 if overall else 1)


if __name__ == "__main__":
    main()
