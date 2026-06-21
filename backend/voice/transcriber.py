"""
Faster-Whisper STT wrapper.

Two modes:
  - transcribe_short: quick keyword check (wake-word detection)
  - transcribe:       full high-accuracy transcription of a command
"""

from __future__ import annotations

import asyncio
import time
from typing import Optional

import numpy as np
from core.logger import get_logger

logger = get_logger("jarvis.stt")


class WhisperTranscriber:

    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
    ) -> None:
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self._model = None

    def _load(self) -> None:
        """Lazy model load — only happens on first transcription call."""
        if self._model is not None:
            return
        try:
            from faster_whisper import WhisperModel
            logger.info(f"Loading Whisper '{self.model_size}' on {self.device}…")
            t0 = time.monotonic()
            self._model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
            )
            logger.info(f"Whisper loaded in {time.monotonic()-t0:.1f}s")
        except ImportError:
            raise RuntimeError(
                "faster-whisper not installed. Run: pip install faster-whisper"
            )

    def _run_transcribe(self, audio: np.ndarray, language: str = "en", beam_size: int = 3) -> str:
        self._load()
        # Ensure float32 mono normalised to [-1, 1]
        audio = audio.astype(np.float32)
        if audio.max() > 1.0:
            audio = audio / 32768.0

        segments, _ = self._model.transcribe(
            audio,
            language=language,
            beam_size=beam_size,
            vad_filter=True,
            condition_on_previous_text=False,
        )
        return " ".join(s.text for s in segments).strip()

    async def transcribe_short(self, audio: np.ndarray) -> str:
        """Fast transcription for wake-word keyword check."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self._run_transcribe(audio, beam_size=1)
        )

    async def transcribe(self, audio: np.ndarray) -> str:
        """Full-quality transcription for user commands."""
        loop = asyncio.get_event_loop()
        t0 = time.monotonic()
        text = await loop.run_in_executor(
            None, lambda: self._run_transcribe(audio, beam_size=3)
        )
        logger.info(f"Transcribed in {time.monotonic()-t0:.2f}s: {text!r}")
        return text

    @property
    def is_loaded(self) -> bool:
        return self._model is not None
