"""
TTS speaker with automatic backend selection.

Priority: Kokoro → pyttsx3
Each backend has the same async interface: speak(text) → plays audio.
"""

from __future__ import annotations

import asyncio
import io
import time
from typing import Optional

import numpy as np
from core.logger import get_logger
from backend.voice.audio_io import AudioPlayer

logger = get_logger("jarvis.tts")


class KokoroSpeaker:
    """High-quality neural TTS via the kokoro library."""

    NAME = "kokoro"
    SAMPLE_RATE = 24_000

    def __init__(self, voice: str = "af_heart", speed: float = 1.0) -> None:
        self.voice = voice
        self.speed = speed
        self._pipeline = None
        self._lock = asyncio.Lock()
        self.player = AudioPlayer(default_rate=self.SAMPLE_RATE)

    def _load(self) -> None:
        if self._pipeline is not None:
            return
        from kokoro import KPipeline  # noqa: PLC0415
        logger.info("Loading Kokoro TTS…")
        self._pipeline = KPipeline(lang_code="a")  # 'a' = American English
        logger.info("Kokoro TTS ready")

    def _synthesize(self, text: str) -> np.ndarray:
        self._load()
        parts = []
        for _, _, audio in self._pipeline(text, voice=self.voice, speed=self.speed):
            parts.append(audio)
        if not parts:
            return np.zeros(0, dtype=np.float32)
        return np.concatenate(parts).astype(np.float32)

    async def speak(self, text: str) -> None:
        async with self._lock:
            logger.info(f"[TTS-kokoro] {text[:60]!r}")
            loop = asyncio.get_running_loop()
            audio = await loop.run_in_executor(None, self._synthesize, text)
            if audio.size > 0:
                await self.player.play(audio, sample_rate=self.SAMPLE_RATE)

    def interrupt(self) -> None:
        self.player.interrupt()

    @property
    def is_playing(self) -> bool:
        return self.player.is_playing


class Pyttsx3Speaker:
    """Fallback TTS using pyttsx3 (always available, system voices)."""

    NAME = "pyttsx3"

    def __init__(self, rate: int = 185) -> None:
        self._rate = rate
        self._engine = None
        self._lock = asyncio.Lock()
        self._playing = False

    def _load(self) -> None:
        if self._engine is not None:
            return
        import pyttsx3  # noqa: PLC0415
        self._engine = pyttsx3.init()
        self._engine.setProperty("rate", self._rate)
        logger.info("pyttsx3 TTS ready")

    def _speak_sync(self, text: str) -> None:
        self._load()
        self._playing = True
        try:
            self._engine.say(text)
            self._engine.runAndWait()
        finally:
            self._playing = False

    async def speak(self, text: str) -> None:
        logger.info(f"[TTS-pyttsx3] {text[:60]!r}")
        async with self._lock:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, self._speak_sync, text)

    def interrupt(self) -> None:
        if self._engine and self._playing:
            try:
                self._engine.stop()
            except Exception:
                pass
        self._playing = False

    @property
    def is_playing(self) -> bool:
        return self._playing


def create_speaker(backend: str = "auto", **kwargs):
    """
    Factory — returns the best available TTS speaker.
    backend = "auto" | "kokoro" | "pyttsx3"
    """
    if backend in ("auto", "kokoro"):
        try:
            import kokoro  # noqa: F401
            speaker = KokoroSpeaker(**{k: v for k, v in kwargs.items() if k in ("voice", "speed")})
            logger.info("TTS backend: Kokoro")
            return speaker
        except ImportError:
            if backend == "kokoro":
                raise RuntimeError("kokoro not installed. Run: pip install kokoro")
            logger.warning("kokoro not available, falling back to pyttsx3")

    try:
        import pyttsx3  # noqa: F401
        speaker = Pyttsx3Speaker()
        logger.info("TTS backend: pyttsx3")
        return speaker
    except ImportError:
        raise RuntimeError(
            "No TTS backend available. Install: pip install kokoro  OR  pip install pyttsx3"
        )
