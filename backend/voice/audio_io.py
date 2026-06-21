"""
Audio I/O — captures microphone in real-time and plays TTS audio.

Uses sounddevice for cross-platform audio. Audio callback runs in a
dedicated OS thread; an asyncio.Queue bridges to the async pipeline.
"""

from __future__ import annotations

import asyncio
import threading
import time
from typing import Optional

import numpy as np
from core.logger import get_logger

logger = get_logger("jarvis.audio")

try:
    import sounddevice as sd
    SOUNDDEVICE_AVAILABLE = True
except Exception as exc:
    logger.warning(f"sounddevice not available: {exc}. Voice input disabled.")
    SOUNDDEVICE_AVAILABLE = False

try:
    import soundfile as sf
    SOUNDFILE_AVAILABLE = True
except Exception:
    SOUNDFILE_AVAILABLE = False


class MicCapture:
    """Continuously captures microphone audio and exposes async reads."""

    def __init__(
        self,
        sample_rate: int = 16_000,
        chunk_ms: int = 100,
        channels: int = 1,
    ) -> None:
        self.sample_rate = sample_rate
        self.chunk_size = int(sample_rate * chunk_ms / 1000)
        self.channels = channels

        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._queue: Optional[asyncio.Queue] = None
        self._stream = None
        self._running = False

    def _callback(self, indata: np.ndarray, frames: int, time_info, status) -> None:
        if status:
            logger.debug(f"Audio callback status: {status}")
        if self._loop and self._queue and self._running:
            chunk = indata.copy().flatten().astype(np.float32)

            def _safe_put() -> None:
                try:
                    self._queue.put_nowait(chunk)
                except asyncio.QueueFull:
                    pass  # drop silently — consumer is too slow, skip chunk

            self._loop.call_soon_threadsafe(_safe_put)

    async def start(self) -> None:
        if not SOUNDDEVICE_AVAILABLE:
            raise RuntimeError("sounddevice is not installed. Run: pip install sounddevice")
        self._loop = asyncio.get_running_loop()
        self._queue = asyncio.Queue(maxsize=200)
        self._running = True
        self._stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype="float32",
            blocksize=self.chunk_size,
            callback=self._callback,
        )
        self._stream.start()
        logger.info(f"Microphone started — {self.sample_rate}Hz, {self.chunk_size} samples/chunk")

    async def read(self, timeout: float = 1.0) -> Optional[np.ndarray]:
        """Return next audio chunk or None on timeout."""
        if self._queue is None:
            return None
        try:
            return await asyncio.wait_for(self._queue.get(), timeout=timeout)
        except asyncio.TimeoutError:
            return None

    async def drain(self) -> None:
        """Discard queued audio (used after wake word fires)."""
        if self._queue:
            while not self._queue.empty():
                try:
                    self._queue.get_nowait()
                except asyncio.QueueEmpty:
                    break

    def stop(self) -> None:
        self._running = False
        if self._stream:
            self._stream.stop()
            self._stream.close()
            self._stream = None
        logger.info("Microphone stopped")


class AudioPlayer:
    """Plays audio arrays through the default speaker with interrupt support."""

    def __init__(self, default_rate: int = 24_000) -> None:
        self.default_rate = default_rate
        self._playing = threading.Event()
        self._interrupt = threading.Event()

    async def play(self, audio: np.ndarray, sample_rate: Optional[int] = None) -> None:
        """Play audio, blocking until done or interrupted."""
        if not SOUNDDEVICE_AVAILABLE:
            logger.warning("sounddevice unavailable — cannot play audio")
            return
        sr = sample_rate or self.default_rate
        self._interrupt.clear()
        self._playing.set()

        def _play_sync() -> None:
            try:
                sd.play(audio, samplerate=sr)
                while sd.get_stream().active:
                    if self._interrupt.is_set():
                        sd.stop()
                        return
                    time.sleep(0.02)
                sd.wait()
            except Exception as exc:
                logger.error(f"Playback error: {exc}")
            finally:
                self._playing.clear()

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _play_sync)

    def interrupt(self) -> None:
        """Stop current playback immediately."""
        self._interrupt.set()
        if SOUNDDEVICE_AVAILABLE:
            try:
                sd.stop()
            except Exception:
                pass
        logger.debug("Audio playback interrupted")

    @property
    def is_playing(self) -> bool:
        return self._playing.is_set()

    async def play_file(self, path: str) -> None:
        """Play a WAV/FLAC/OGG file."""
        if not SOUNDFILE_AVAILABLE:
            logger.warning("soundfile not available")
            return
        data, sr = sf.read(path, dtype="float32")
        await self.play(data, sample_rate=sr)
