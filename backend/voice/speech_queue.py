"""
SpeechQueue — non-blocking text-to-speech.

The executor must NEVER wait for audio. Callers enqueue phrases with `say()`
which returns immediately; a single background worker plays them one at a time
(serialized, so phrases never overlap). This is what lets Jarvis acknowledge a
command ("Opening YouTube.") and run it at the same time.

If no speaker is available (text-only mode) every method is a safe no-op.
"""

from __future__ import annotations

import asyncio
from typing import Optional

from core.logger import get_logger

logger = get_logger("jarvis.speech")


class SpeechQueue:
    def __init__(self, speaker) -> None:
        self._speaker = speaker
        self._queue: asyncio.Queue[str] = asyncio.Queue()
        self._worker: Optional[asyncio.Task] = None
        self._speaking = False
        self._broadcast = True

    def _ensure_worker(self) -> None:
        if self._worker is None or self._worker.done():
            self._worker = asyncio.create_task(self._run(), name="speech_queue")

    def say(self, text: str) -> None:
        """Enqueue a phrase and return immediately (non-blocking)."""
        if not text or self._speaker is None:
            return
        self._ensure_worker()
        self._queue.put_nowait(text)

    async def _run(self) -> None:
        from backend.websocket_manager import manager, EventType
        while True:
            text = await self._queue.get()
            try:
                self._speaking = True
                if self._broadcast:
                    await manager.broadcast(EventType.TTS_START, {"text": text})
                await self._speaker.speak(text)
            except Exception as exc:
                logger.warning(f"TTS playback failed: {exc}")
            finally:
                self._speaking = False
                if self._broadcast:
                    await manager.broadcast(EventType.TTS_END, {})
                self._queue.task_done()

    def clear(self) -> None:
        """Drop everything queued and stop any current playback (barge-in)."""
        while not self._queue.empty():
            try:
                self._queue.get_nowait()
                self._queue.task_done()
            except asyncio.QueueEmpty:
                break
        if self._speaker is not None:
            try:
                self._speaker.interrupt()
            except Exception:
                pass

    async def drain(self) -> None:
        """Await until all queued speech has finished playing."""
        if self._speaker is not None:
            await self._queue.join()

    @property
    def is_speaking(self) -> bool:
        return self._speaking or not self._queue.empty()
