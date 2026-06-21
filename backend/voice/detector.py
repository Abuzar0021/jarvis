"""
Wake-word detector.

Strategy (in order of preference):
  1. OpenWakeWord (if installed and model exists) — very low CPU
  2. Whisper keyword-spotting on energy-gated windows   — reliable fallback
  3. Manual trigger via API (for testing / push-to-talk)
"""

from __future__ import annotations

import asyncio
import time
from collections import deque
from typing import Optional

import numpy as np
from core.logger import get_logger

logger = get_logger("jarvis.detector")


# ── OpenWakeWord backend ───────────────────────────────────────────────────────

class OWWDetector:
    """OpenWakeWord based wake detector."""

    def __init__(self, wake_word: str = "jarvis") -> None:
        self.wake_word = wake_word.lower()
        self._model = None

    def load(self) -> bool:
        try:
            from openwakeword.model import Model  # noqa: PLC0415
            # Try to find a matching model
            self._model = Model(
                wakeword_models=[self.wake_word],
                inference_framework="onnx",
            )
            logger.info(f"OpenWakeWord loaded model: {self.wake_word}")
            return True
        except Exception as exc:
            logger.warning(f"OpenWakeWord could not load '{self.wake_word}': {exc}")
            return False

    def check(self, chunk: np.ndarray) -> bool:
        if self._model is None:
            return False
        # OWW expects int16 at 16kHz
        if chunk.dtype != np.int16:
            chunk = (chunk * 32767).astype(np.int16)
        self._model.predict(chunk)
        scores = self._model.prediction_buffer.get(self.wake_word, [])
        return bool(scores and scores[-1] > 0.5)


# ── Whisper keyword-spotting backend ──────────────────────────────────────────

class WhisperWakeDetector:
    """
    Energy-gated wake word detection using Whisper tiny.

    Flow:
      - Monitor RMS energy of audio chunks.
      - When energy > threshold, accumulate chunks into a window.
      - Every WINDOW_S seconds of speech, run Whisper tiny.
      - If wake_word appears in transcript → fire.
    """

    WINDOW_S = 2.0         # seconds of audio per Whisper call
    ENERGY_THRESHOLD = 0.006

    def __init__(
        self,
        transcriber,
        sample_rate: int = 16_000,
        chunk_ms: int = 100,
        wake_word: str = "jarvis",
    ) -> None:
        self.transcriber = transcriber
        self.wake_word = wake_word.lower()
        self.sample_rate = sample_rate
        self.chunk_ms = chunk_ms

        chunks_per_window = int(self.WINDOW_S * 1000 / chunk_ms)
        self._buffer: deque[np.ndarray] = deque(maxlen=chunks_per_window)
        self._speech_chunks = 0
        self._required_chunks = chunks_per_window // 2   # 50% speech in window

    async def check(self, chunk: np.ndarray) -> bool:
        rms = float(np.sqrt(np.mean(chunk ** 2)))

        if rms > self.ENERGY_THRESHOLD:
            self._buffer.append(chunk)
            self._speech_chunks += 1
        else:
            self._speech_chunks = max(0, self._speech_chunks - 1)

        # Only run Whisper when buffer is full and has enough speech
        if len(self._buffer) == self._buffer.maxlen and self._speech_chunks >= self._required_chunks:
            audio = np.concatenate(list(self._buffer))
            self._buffer.clear()
            self._speech_chunks = 0

            text = await self.transcriber.transcribe_short(audio)
            if self.wake_word in text.lower():
                logger.info(f"Wake word detected in: {text!r}")
                return True
        return False


# ── Unified detector ───────────────────────────────────────────────────────────

class WakeWordDetector:
    """
    Unified detector that tries OWW first, falls back to Whisper keyword-spotting.
    Also supports a software-trigger for push-to-talk / testing.
    """

    def __init__(
        self,
        transcriber,
        wake_word: str = "jarvis",
        sample_rate: int = 16_000,
        chunk_ms: int = 100,
    ) -> None:
        self.wake_word = wake_word
        self._manual_trigger = asyncio.Event()

        # Try OpenWakeWord first
        oww = OWWDetector(wake_word)
        if oww.load():
            self._oww: Optional[OWWDetector] = oww
            logger.info("Wake detector: OpenWakeWord")
        else:
            self._oww = None

        # Always have Whisper fallback ready
        self._whisper = WhisperWakeDetector(
            transcriber=transcriber,
            sample_rate=sample_rate,
            chunk_ms=chunk_ms,
            wake_word=wake_word,
        )
        if self._oww is None:
            logger.info("Wake detector: Whisper keyword-spotting")

    async def check(self, chunk: np.ndarray) -> bool:
        """Return True if wake word detected in this chunk."""
        if self._manual_trigger.is_set():
            self._manual_trigger.clear()
            logger.info("Wake word triggered manually")
            return True

        if self._oww is not None:
            return self._oww.check(chunk)

        return await self._whisper.check(chunk)

    def trigger(self) -> None:
        """Manually trigger wake word (API / PTT / hotkey)."""
        self._manual_trigger.set()

    @property
    def backend(self) -> str:
        return "openwakeword" if self._oww else "whisper"
