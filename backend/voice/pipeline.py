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
from core.intent_router import IntentRouter
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

        # Serialise concurrent LLM+TTS work (voice vs text commands)
        self._command_lock = asyncio.Lock()

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

        # Pre-load Whisper and TTS in background to avoid first-command latency
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
                            await self._handle_command(text)
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
            await self._set_state(VoiceState.LISTENING)
            await manager.broadcast(EventType.WAKE_DETECTED, {"wake_word": WAKE_WORD})
            # Earcon spoken synchronously — prevents overlap with mic capture in _phase_listen
            try:
                await asyncio.wait_for(self._speaker.speak("Yes?"), timeout=3.0)
            except asyncio.TimeoutError:
                pass
            await self._mic.drain()  # discard audio accumulated during earcon

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

    async def _handle_command(self, text: str) -> None:
        """
        Two-phase command handler:
          Phase A: classify intent → speak immediate acknowledgment  (<300ms)
          Phase B: execute → speak result
        """
        t_start = time.monotonic()
        async with self._command_lock:
            await self._set_state(VoiceState.THINKING)

            # Instant intent classification (no LLM)
            t0 = time.monotonic()
            intent = IntentRouter.classify(text)
            intent_ms = int((time.monotonic() - t0) * 1000)
            logger.info(f"[pipeline] intent={intent.type}/{intent.tool} ({intent_ms}ms)")

            await manager.broadcast(EventType.TASK_UPDATE, {
                "title": text[:80], "status": "running",
                "agent": intent.agent, "intent_ms": intent_ms,
            })

            # Phase A: speak acknowledgment BEFORE executing
            ack = self._make_ack(intent)
            if ack and self._speaker:
                await self._set_state(VoiceState.SPEAKING)
                await self._phase_speak(ack)
                await self._set_state(VoiceState.THINKING)

            # Phase B: execute
            t_exec = time.monotonic()
            try:
                result = await self._phase_execute_intent(intent, text)
                exec_ms = int((time.monotonic() - t_exec) * 1000)
                total_ms = int((time.monotonic() - t_start) * 1000)

                self._last_response = result
                self.stats["commands_completed"] += 1

                await manager.broadcast(EventType.TASK_UPDATE, {
                    "title": text[:80], "status": "done", "agent": intent.agent,
                    "exec_ms": exec_ms, "total_ms": total_ms,
                })

                voice_out = self._format_for_voice(result, ack)
                if voice_out and self._speaker:
                    await self._set_state(VoiceState.SPEAKING)
                    await self._phase_speak(voice_out)

            except Exception as exc:
                err_msg = f"I encountered an error: {exc}"
                logger.error(f"_handle_command error: {exc}", exc_info=True)
                self.stats["errors"] += 1
                self._last_response = err_msg
                await manager.broadcast(EventType.AGENT_ERROR, {
                    "agent": intent.agent, "error": str(exc),
                })
                await manager.broadcast(EventType.TASK_UPDATE, {
                    "title": text[:80], "status": "failed", "agent": intent.agent,
                })
                if self._speaker:
                    await self._set_state(VoiceState.SPEAKING)
                    await self._phase_speak(err_msg)
            finally:
                await self._set_state(VoiceState.IDLE)

    async def _phase_execute_intent(self, intent, text: str) -> str:
        """Dispatch intent to the right execution handler."""
        if intent.type in ("os", "browser"):
            return await self._execute_tool_direct(intent)
        elif intent.type == "research":
            return await self._execute_research(intent, text)
        elif intent.type == "goal":
            return await self._execute_goal_pipeline(text)
        else:
            return await self._execute_conversation(text)

    def _make_ack(self, intent) -> str:
        """Immediate voice acknowledgment — spoken BEFORE execution starts."""
        tool, args = intent.tool, intent.args
        if tool == "open_app":
            name = args.get("name", "")
            friendly = name.replace("-", " ").replace("_", " ").split(".")[0].title()
            return f"Opening {friendly}."
        if tool == "close_app":
            return f"Closing {args.get('name', 'application')}."
        if tool == "browse":
            url = args.get("url", "")
            site = url.replace("https://", "").replace("http://", "").replace("www.", "")
            site = site.split("/")[0].split(".")[0].capitalize()
            return f"Opening {site}."
        if tool == "search_google":
            q = args.get("query", "")[:40]
            return f"Searching for {q}."
        if tool == "screenshot":
            return "Taking a screenshot."
        if tool == "type_text":
            return "Typing."
        if tool == "press_keys":
            return f"Pressing {args.get('keys', '')}."
        if tool == "click":
            return f"Clicking at {args.get('x', 0)}, {args.get('y', 0)}."
        if intent.type == "goal":
            return "Understood. Working on it."
        if intent.type == "research":
            return "Researching now."
        return ""  # No ack for conversation — respond naturally

    def _format_for_voice(self, result: str, ack: str = "") -> str:
        """Convert a tool result string into a concise voice phrase."""
        if not result:
            return ""
        low = result.lower().strip()
        # Error → surface it
        if low.startswith("error"):
            err = result.split(":", 1)[-1].strip() if ":" in result else result
            return f"I hit an error. {err[:120]}"
        # Verification success
        if result.startswith("✓"):
            return "Done." if ack else result.split("—")[0].replace("✓", "").strip()[:100]
        # OK: prefix
        if low.startswith("ok:"):
            inner = result[3:].strip()
            return "Done." if (ack and len(inner) < 80) else inner[:120]
        # Long research/goal results → truncate
        if len(result) > 400:
            return result[:350].rsplit(" ", 1)[0] + "..."
        # Short tool success already covered by ack
        if ack and len(result) < 120 and not any(w in low for w in ("error", "fail", "exception")):
            return "Done."
        return result[:250]

    async def _execute_tool_direct(self, intent) -> str:
        """
        Execute a tool directly — no LLM, no approval gate.
        The user explicitly issued this command, so it is pre-authorised.
        """
        import tools as tool_registry
        from core.execution_state import new_execution

        tool_name  = intent.tool
        args       = intent.args
        agent_name = intent.agent

        # Create ExecutionState — single source of truth for this command
        state = new_execution(intent.raw)
        state.start(agent_name, tool_name)

        logger.info(f"[pipeline] DIRECT EXECUTE {tool_name}({args})")

        await manager.broadcast(EventType.AGENT_STATUS, {
            "agent": agent_name, "status": "running", "task_title": tool_name
        })
        await manager.broadcast(EventType.TOOL_START, {
            "agent": agent_name, "tool": tool_name, "args": args
        })
        await manager.broadcast(EventType.EXECUTION_STATE, state.to_ws())

        entry = tool_registry.TOOL_REGISTRY.get(tool_name)
        if entry is None:
            result = f"ERROR: tool '{tool_name}' is not registered"
            logger.error(result)
        else:
            try:
                result = await entry["handler"](**args)
                logger.info(f"[pipeline] {tool_name} → {result[:120]}")
            except Exception as exc:
                result = f"ERROR in {tool_name}: {exc}"
                logger.error(result, exc_info=True)

        # Record tool result and finalise state
        state.record_tool(agent_name, tool_name, args, result)
        state.finish(result)

        await manager.broadcast(EventType.TOOL_COMPLETE, {
            "agent": agent_name, "tool": tool_name, "result": result
        })
        await manager.broadcast(EventType.AGENT_STATUS, {
            "agent": agent_name,
            "status": "done" if state.status == "done" else "failed",
            "task_title": tool_name,
        })
        await manager.broadcast(EventType.AGENT_DONE, {
            "agent": agent_name, "result": result
        })
        await manager.broadcast(EventType.EXECUTION_STATE, state.to_ws())
        return result

    async def _execute_research(self, intent, original_text: str) -> str:
        """Route to ResearchAgent via orchestrator."""
        topic = intent.args.get("topic", original_text)
        await manager.broadcast(EventType.AGENT_STATUS, {"agent": "research", "status": "running"})
        try:
            from core.orchestrator import get_orchestrator
            orch = get_orchestrator()
            result = await orch.run_task(
                agent_name="research",
                task=f"Research: {topic}",
                context=None,
            )
        except Exception as exc:
            result = f"Research failed: {exc}"
        await manager.broadcast(EventType.AGENT_STATUS, {"agent": "research", "status": "done"})
        await manager.broadcast(EventType.AGENT_DONE, {"agent": "research", "result": result[:200]})
        return result

    async def _execute_goal_pipeline(self, text: str) -> str:
        """
        Full execution pipeline for complex multi-step goals.
        CEO → TaskPlanner → Orchestrator → Agents → Tools → Result
        """
        await manager.broadcast(EventType.AGENT_START, {"agent": "ceo", "task": text})
        await manager.broadcast(EventType.AGENT_STATUS, {
            "agent": "ceo", "status": "running", "task_title": text[:60]
        })
        try:
            ceo = self._get_ceo()

            async def _speak_progress(phrase: str) -> None:
                """Emit TTS progress during goal execution without touching pipeline state."""
                await self._phase_speak(phrase)

            response = await ceo.execute_goal(
                text, session_id="voice_session", speak=_speak_progress,
            )
            await manager.broadcast(EventType.AGENT_DONE, {"agent": "ceo", "result": response[:200]})
            await manager.broadcast(EventType.AGENT_STATUS, {
                "agent": "ceo", "status": "done", "task_title": text[:60]
            })
            return response
        except Exception as exc:
            err = f"Goal execution failed: {exc}"
            logger.error(f"_execute_goal_pipeline error: {exc}", exc_info=True)
            self.stats["errors"] += 1
            await manager.broadcast(EventType.AGENT_ERROR, {"agent": "ceo", "error": str(exc)})
            await manager.broadcast(EventType.AGENT_STATUS, {
                "agent": "ceo", "status": "failed", "task_title": text[:60]
            })
            return err

    async def _execute_conversation(self, text: str) -> str:
        """Pure conversational response via CEOAgent (greetings / small-talk only)."""
        await manager.broadcast(EventType.AGENT_START, {"agent": "ceo", "task": text})
        try:
            ceo = self._get_ceo()
            voice_text = (
                "[Voice command — respond concisely in 1-3 sentences, Jarvis style. "
                "ALWAYS reply in English only.]\n\n" + text
            )
            response = await ceo.chat(voice_text, session_id="voice_session")
            await manager.broadcast(EventType.AGENT_DONE, {"agent": "ceo", "result": response})
            return response
        except Exception as exc:
            err = f"I encountered an issue: {exc}"
            logger.error(f"CEO chat error: {exc}", exc_info=True)
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

    async def process_text_command(self, text: str) -> str:
        """Process a text command from the API/WS (same two-phase flow as voice)."""
        if not text.strip():
            return ""
        await manager.broadcast(EventType.TRANSCRIPT, {"text": text, "is_final": True, "source": "text"})
        await self._handle_command(text)
        return self._last_response

    async def _preload_models(self) -> None:
        """Pre-warm Whisper and TTS in background to reduce first-command latency."""
        try:
            dummy = np.zeros(SAMPLE_RATE, dtype=np.float32)
            await self._transcriber.transcribe_short(dummy)
            logger.info("Whisper model pre-warmed")
        except Exception as exc:
            logger.warning(f"Whisper pre-warm failed: {exc}")
        try:
            # Force TTS model load without producing audible output
            if hasattr(self._speaker, "_load"):
                import asyncio as _asyncio
                loop = _asyncio.get_running_loop()
                await loop.run_in_executor(None, self._speaker._load)
                logger.info("TTS model pre-warmed")
        except Exception as exc:
            logger.warning(f"TTS pre-warm failed: {exc}")

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
