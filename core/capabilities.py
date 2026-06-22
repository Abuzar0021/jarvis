"""
Capabilities — single source of truth for what this Jarvis install can do.

Probes optional hardware/deps ONCE at import and exposes the result. The voice
pipeline, tools, dashboard, and diagnostics all read from here instead of each
re-discovering (and crashing on) missing dependencies.

Design rule: probing a capability must NEVER raise. A missing capability is a
fact to report, not an error to crash on.
"""

from __future__ import annotations

import os
import shutil
import sys
from dataclasses import asdict, dataclass

from core.logger import get_logger

logger = get_logger("jarvis.capabilities")


def _can_import(module: str) -> tuple[bool, str]:
    try:
        __import__(module)
        return True, ""
    except Exception as exc:  # ImportError or OSError (e.g. PortAudio)
        return False, str(exc)[:120]


def _has_display() -> bool:
    return bool(
        os.environ.get("DISPLAY")
        or os.environ.get("WAYLAND_DISPLAY")
        or sys.platform in ("win32", "darwin")
    )


@dataclass(frozen=True)
class Capabilities:
    platform: str
    has_api_key: bool
    has_display: bool
    audio_in: bool          # microphone capture (sounddevice/PortAudio)
    audio_out: bool         # any TTS backend usable
    tts_backend: str        # "kokoro" | "pyttsx3" | "none"
    stt: bool               # faster-whisper importable
    wake_word: bool         # openwakeword available (else whisper fallback)
    process_control: bool   # psutil (close_app)
    gui_control: bool       # pyautogui (click/type/press) — needs display too
    browser_automation: bool  # playwright
    system_browser: bool    # python webbrowser can open a URL
    notes: dict

    @property
    def voice_input(self) -> bool:
        """Full voice-in path requires mic + STT."""
        return self.audio_in and self.stt

    @property
    def voice_output(self) -> bool:
        return self.audio_out

    def summary(self) -> dict:
        d = asdict(self)
        d["voice_input"] = self.voice_input
        d["voice_output"] = self.voice_output
        return d


def _probe() -> Capabilities:
    notes: dict[str, str] = {}

    audio_in, err = _can_import("sounddevice")
    if not audio_in:
        notes["audio_in"] = err

    stt, err = _can_import("faster_whisper")
    if not stt:
        notes["stt"] = err

    # TTS backend selection mirrors speaker.create_speaker() priority.
    tts_backend = "none"
    kokoro_ok, _ = _can_import("kokoro")
    pyttsx3_ok, p_err = _can_import("pyttsx3")
    if kokoro_ok and audio_in:        # kokoro needs sounddevice to play
        tts_backend = "kokoro"
    elif pyttsx3_ok:
        tts_backend = "pyttsx3"        # pyttsx3 drives the OS speech engine itself
    elif not pyttsx3_ok:
        notes["audio_out"] = p_err
    audio_out = tts_backend != "none"

    wake_word, _ = _can_import("openwakeword")
    process_control, perr = _can_import("psutil")
    if not process_control:
        notes["process_control"] = perr
    gui_lib, gerr = _can_import("pyautogui")
    has_display = _has_display()
    gui_control = gui_lib and has_display
    if not gui_lib:
        notes["gui_control"] = gerr
    elif not has_display:
        notes["gui_control"] = "no DISPLAY"
    browser_automation, berr = _can_import("playwright")
    if not browser_automation:
        notes["browser_automation"] = berr

    # webbrowser is stdlib; it can still no-op if no browser exists, but import
    # always succeeds. On a desktop OS we assume a default browser exists.
    system_browser = sys.platform in ("win32", "darwin") or bool(
        shutil.which("xdg-open") or os.environ.get("BROWSER") or has_display
    )

    caps = Capabilities(
        platform=sys.platform,
        has_api_key=bool(os.getenv("OPENROUTER_API_KEY")),
        has_display=has_display,
        audio_in=audio_in,
        audio_out=audio_out,
        tts_backend=tts_backend,
        stt=stt,
        wake_word=wake_word,
        process_control=process_control,
        gui_control=gui_control,
        browser_automation=browser_automation,
        system_browser=system_browser,
        notes=notes,
    )
    logger.info(
        "Capabilities: voice_in=%s voice_out=%s(%s) display=%s api_key=%s "
        "proc=%s gui=%s browser_pw=%s sys_browser=%s",
        caps.voice_input, caps.voice_output, caps.tts_backend, caps.has_display,
        caps.has_api_key, caps.process_control, caps.gui_control,
        caps.browser_automation, caps.system_browser,
    )
    return caps


_caps: Capabilities | None = None


def get_capabilities(refresh: bool = False) -> Capabilities:
    global _caps
    if _caps is None or refresh:
        _caps = _probe()
    return _caps
