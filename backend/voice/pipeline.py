"""
Voice Pipeline — state machine that orchestrates:
  Idle → [wake] → Listening → Transcribing → Thinking → Speaking → Idle

Each state transition broadcasts a WebSocket event so the HUD updates live.
"""

from __future__ import annotations

import asyncio
import sys
import time
from enum import Enum
from pathlib import Path
from typing import Optional

import numpy as np

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))

from backend.config import (
    SILENCE_THRESHOLD, SILENCE_DURATION_S, COMMAND_TIMEOUT_S,
    WAKE_WORD, WHISPER_MODEL_SIZE, WHISPER_DEVICE, WHISPER_COMPUTE,
    TTS_BACKEND, TTS_VOICE, TTS_SPEED, SAMPLE_RATE, CHUNK_MS,
    JARVIS_GREETING, JARVIS_VOICE_SYSTEM,
)
from backend.websocket_manager import manager, EventType
from backend.voice.audio_io import MicCapture, AudioPlayer
from backend.voice.transcriber import WhisperTranscriber
from backend.voice.detector import WakeWordDetector
from backend.voice.speaker import create_speaker
from core.logger import get_logger
from core.memory import get_memory

logger = get_logger("jarvis.pipeline")


class VoiceState(str, Enum):
    IDLE          = "idle"
    LISTENING     = "listening"
    TRANSCRIBING  = "transcribing"
    THINKING      = "thinking"
    SPEAKING      = "speaking"
    ERROR         = "error"
    STOPPED       = "stopped"


class VoicePipeline:
    """
    The core voice processing pipeline.

    Usage:
        pipeline = VoicePipeline()
        await pipeline.start()        # begins background loop
        await pipeline.stop()
    """

    def __init__(self) -> None:
        self.state = VoiceState.IDLE
        self._running = False
        self._task: Optional[asyncio.Task] = None

        # Components (lazy-initialised)
        self._mic: Optional[MicCapture] = None
        self._transcriber: Optional[WhisperTranscriber] = None
        self._detector: Optional[WakeWordDetector] = None
        self._speaker = None

        # Runtime state
        self._ceo = None           # lazy-loaded CEOAgent
        self._last_transcript = ""
        self._last_response = ""
        self.stats = {
            "commands_received": 0,
            "commands_completed": 0,
            "errors": 0,
            "uptime_start": None,
        }

    # ── Public API ─────────────────────────────────────────────────────────────

    async def start(self) -> None:
        """Initialise components and start the pipeline loop."""
        logger.info("Voice pipeline starting…")
        self.stats["uptime_start"] = time.time()

        # Build components
        self._transcriber = WhisperTranscriber(
            model_size=WHISPER_MODEL_SIZE,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE,
        )
        self._speaker = create_speaker(backend=TTS_BACKEND, voice=TTS_VOICE, speed=TTS_SPEED)
        self._mic = MicCapture(sample_rate=SAMPLE_RATE, chunk_ms=CHUNK_MS)
        self._detector = WakeWordDetector(
            transcriber=self._transcriber,
            wake_word=WAKE_WORD,
            sample_rate=SAMPLE_RATE,
            chunk_ms=CHUNK_MS,
        )

        await self._mic.start()
        self._running = True
        self._task = asyncio.create_task(self._loop(), name="voice_pipeline")

        # Pre-load Whisper model in background to avoid first-command latency
        asyncio.create_task(self._preload_models())

        await self._set_state(VoiceState.IDLE)
        logger.info(f"Voice pipeline running — wake word: '{WAKE_WORD}'")

    async def stop(self) -> None:
        self._running = False
        if self._speaker:
            self._speaker.interrupt()
        if self._mic:
            self._mic.stop()
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        await self._set_state(VoiceState.STOPPED)
        logger.info("Voice pipeline stopped")

    def trigger_wake(self) -> None:
        """Manually activate listening (push-to-talk / API)."""
        if self._detector:
            self._detector.trigger()

    def interrupt(self) -> None:
        """Interrupt Jarvis while speaking."""
        if self._speaker:
            self._speaker.interrupt()
        asyncio.create_task(manager.broadcast(EventType.INTERRUPT))

    # ── Pipeline loop ──────────────────────────────────────────────────────────

    async def _loop(self) -> None:
        while self._running:
            try:
                if self.state in (VoiceState.IDLE,):
                    await self._phase_idle()

                elif self.state == VoiceState.LISTENING:
                    audio = await self._phase_listen()
                    if audio is not None:
                        await self._set_state(VoiceState.TRANSCRIBING)
                        text = await self._phase_transcribe(audio)
                        if text:
                            await self._set_state(VoiceState.THINKING)
                            response = await self._phase_think(text)
                            await self._set_state(VoiceState.SPEAKING)
                            await self._phase_speak(response)
                    await self._set_state(VoiceState.IDLE)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(f"Pipeline error: {exc}", exc_info=True)
                self.stats["errors"] += 1
                await self._set_state(VoiceState.ERROR)
                await asyncio.sleep(1)
                await self._set_state(VoiceState.IDLE)

    # ── Phases ─────────────────────────────────────────────────────────────────

    async def _phase_idle(self) -> None:
        """Listen continuously for the wake word."""
        chunk = await self._mic.read(timeout=0.5)
        if chunk is None:
            return
        detected = await self._detector.check(chunk)
        if detected:
            await self._mic.drain()  # clear buffered audio
            await self._set_state(VoiceState.LISTENING)
            await manager.broadcast(EventType.WAKE_DETECTED, {"wake_word": WAKE_WORD})
            # Earcon: short beep-like acknowledgement via TTS
            asyncio.create_task(self._speaker.speak("Yes?"))

    async def _phase_listen(self) -> Optional[np.ndarray]:
        """
        Capture audio until silence or timeout.
        Returns captured audio array, or None on timeout.
        """
        chunks: list[np.ndarray] = []
        silence_chunks = 0
        max_silence = int(SILENCE_DURATION_S * 1000 / CHUNK_MS)
        deadline = time.monotonic() + COMMAND_TIMEOUT_S

        logger.info("Listening for command…")
        while time.monotonic() < deadline:
            chunk = await self._mic.read(timeout=0.3)
            if chunk is None:
                continue

            rms = float(np.sqrt(np.mean(chunk ** 2)))

            if rms > SILENCE_THRESHOLD:
                chunks.append(chunk)
                silence_chunks = 0
            elif chunks:
                # Only count silence after we've heard something
                silence_chunks += 1
                chunks.append(chunk)
                if silence_chunks >= max_silence:
                    break   # End of speech

        if not chunks:
            logger.info("No speech detected — returning to idle")
            return None

        audio = np.concatenate(chunks)
        logger.info(f"Captured {len(audio)/SAMPLE_RATE:.1f}s of audio")
        return audio

    async def _phase_transcribe(self, audio: np.ndarray) -> str:
        await manager.broadcast(EventType.TRANSCRIPT, {"text": "…", "is_final": False})
        text = await self._transcriber.transcribe(audio)
        self._last_transcript = text
        self.stats["commands_received"] += 1
        await manager.broadcast(EventType.TRANSCRIPT, {"text": text, "is_final": True})
        logger.info(f"Transcript: {text!r}")
        return text

    async def _phase_think(self, text: str) -> str:
        """Send transcript to CEO agent and get response."""
        await manager.broadcast(EventType.AGENT_START, {"agent": "ceo", "task": text})
        try:
            ceo = self._get_ceo()
            # Voice-optimised prompt
            voice_text = f"[Voice command — respond concisely in 1-3 sentences, Jarvis style]\n\n{text}"
            response = await ceo.chat(voice_text, session_id="voice_session")
            self._last_response = response
            self.stats["commands_completed"] += 1
            await manager.broadcast(EventType.AGENT_DONE, {"agent": "ceo", "result": response})
            return response
        except Exception as exc:
            err = f"I encountered an issue processing that request. {exc}"
            logger.error(f"CEO agent error: {exc}", exc_info=True)
            await manager.broadcast(EventType.AGENT_ERROR, {"agent": "ceo", "error": str(exc)})
            return err

    async def _phase_speak(self, text: str) -> None:
        await manager.broadcast(EventType.TTS_START, {"text": text})
        try:
            await self._speaker.speak(text)
        finally:
            await manager.broadcast(EventType.TTS_END, {})

    # ── Helpers ────────────────────────────────────────────────────────────────

    async def _set_state(self, state: VoiceState) -> None:
        self.state = state
        await manager.broadcast(EventType.STATE_CHANGE, {"state": state.value})
        logger.debug(f"Voice state → {state.value}")

    def _get_ceo(self):
        if self._ceo is None:
            from agents.ceo_agent import CEOAgent  # noqa: PLC0415
            self._ceo = CEOAgent()
        return self._ceo

    async def _preload_models(self) -> None:
        """Pre-warm Whisper in background to reduce first-command latency."""
        try:
            dummy = np.zeros(SAMPLE_RATE, dtype=np.float32)
            await self._transcriber.transcribe_short(dummy)
            logger.info("Whisper model pre-warmed")
        except Exception as exc:
            logger.warning(f"Pre-warm failed: {exc}")

    def get_status(self) -> dict:
        uptime = 0
        if self.stats["uptime_start"]:
            uptime = int(time.time() - self.stats["uptime_start"])
        return {
            "state": self.state.value,
            "running": self._running,
            "wake_word": WAKE_WORD,
            "detector_backend": self._detector.backend if self._detector else None,
            "tts_backend": getattr(self._speaker, "NAME", "unknown"),
            "whisper_model": WHISPER_MODEL_SIZE,
            "last_transcript": self._last_transcript,
            "last_response": self._last_response,
            "uptime_seconds": uptime,
            **self.stats,
        }


# ── Singleton ──────────────────────────────────────────────────────────────────

_pipeline: Optional[VoicePipeline] = None


def get_pipeline() -> VoicePipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = VoicePipeline()
    return _pipeline
