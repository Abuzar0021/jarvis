"""Backend configuration — extends root config.py with voice/server settings."""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import *  # noqa: F401,F403

# ── Server ────────────────────────────────────────────────────────────────────
HOST = "0.0.0.0"
PORT = 8000

# ── Voice / STT ───────────────────────────────────────────────────────────────
WHISPER_MODEL_SIZE = "base"    # tiny | base | small  (base = best latency/accuracy balance)
WHISPER_DEVICE = "cpu"
WHISPER_COMPUTE = "int8"       # int8 | float16 | float32

WAKE_WORD = "jarvis"
SAMPLE_RATE = 16_000           # Hz — Whisper native
CHUNK_MS = 100                 # ms per audio chunk
SILENCE_THRESHOLD = 0.008      # RMS below this = silence
SILENCE_DURATION_S = 1.5       # seconds of silence → end of command
COMMAND_TIMEOUT_S = 10.0       # max seconds to wait for a command
WAKE_WINDOW_S = 2.0            # seconds of audio fed to wake-word Whisper

# ── TTS ───────────────────────────────────────────────────────────────────────
TTS_BACKEND = "auto"           # auto | kokoro | pyttsx3
TTS_VOICE = "af_heart"        # Kokoro voice id
TTS_SPEED = 1.0
TTS_SAMPLE_RATE = 24_000       # Kokoro output rate

# ── Push-to-talk fallback ─────────────────────────────────────────────────────
PTT_KEY = "ctrl+shift+j"

# ── Personality ───────────────────────────────────────────────────────────────
# ── Vision (Phase 2) ──────────────────────────────────────────────────────────
VISION_MODEL = MODELS.get("vision", "openai/gpt-4o")
VISION_MAX_W = int(os.getenv("VISION_MAX_W", "1280"))   # max image width sent to LLM
VISION_MAX_H = int(os.getenv("VISION_MAX_H", "720"))    # max image height
VISION_JPEG_QUALITY = int(os.getenv("VISION_JPEG_QUALITY", "85"))
VISION_CAPTURE_DIR = DATA_DIR / "captures"              # DATA_DIR from config.*

# ── Personality ───────────────────────────────────────────────────────────────
JARVIS_GREETING = "Jarvis online. How can I assist you?"

# Language enforcement — never change unless user explicitly requests it
VOICE_LANGUAGE: str = os.getenv("VOICE_LANGUAGE", "en")

JARVIS_VOICE_SYSTEM = """\
You are Jarvis, the AI operating system. You respond to voice commands.

LANGUAGE: ALWAYS respond in English only. Never switch to another language regardless of \
the user's input language. If the user speaks another language, reply in English.

Rules for voice responses:
- Be concise (1-3 sentences maximum unless detail is specifically requested)
- Sound natural and conversational, not robotic
- Use Jarvis personality: professional, witty, intelligent
- Acknowledge the command, then report action or result
- Never say "I am an AI" or similar disclaimers
- Examples:
  "Certainly. Initiating search now."
  "Done. I've compiled the results."
  "Of course. The task has been queued."
"""
