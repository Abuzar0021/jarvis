"""
Phase 1 voice system tests.
Tests run without hardware (mocked audio) and without LLM calls.
"""

import asyncio
import sys
from pathlib import Path
import numpy as np
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))


# ── WebSocket Manager ─────────────────────────────────────────────────────────

def test_event_types_defined():
    from backend.websocket_manager import EventType
    assert EventType.STATE_CHANGE == "state_change"
    assert EventType.TRANSCRIPT == "transcript"
    assert EventType.WAKE_DETECTED == "wake_detected"
    assert EventType.TTS_START == "tts_start"
    assert EventType.AGENT_DONE == "agent_done"


def test_manager_singleton():
    from backend.websocket_manager import manager, ConnectionManager
    assert isinstance(manager, ConnectionManager)
    assert manager.count == 0


@pytest.mark.asyncio
async def test_manager_broadcast_no_clients():
    from backend.websocket_manager import manager, EventType
    # Should not raise when no clients connected
    await manager.broadcast(EventType.STATE_CHANGE, {"state": "idle"})


# ── Config ─────────────────────────────────────────────────────────────────────

def test_backend_config():
    from backend.config import (
        HOST, PORT, WAKE_WORD, SAMPLE_RATE, CHUNK_MS,
        SILENCE_THRESHOLD, COMMAND_TIMEOUT_S, WHISPER_MODEL_SIZE,
    )
    assert HOST == "0.0.0.0"
    assert PORT == 8000
    assert WAKE_WORD == "jarvis"
    assert SAMPLE_RATE == 16_000
    assert CHUNK_MS == 100
    assert SILENCE_THRESHOLD > 0
    assert COMMAND_TIMEOUT_S > 0
    assert WHISPER_MODEL_SIZE in ("tiny", "base", "small", "medium", "large")


# ── Audio I/O ─────────────────────────────────────────────────────────────────

def test_audio_player_creates():
    from backend.voice.audio_io import AudioPlayer
    player = AudioPlayer(default_rate=24_000)
    assert not player.is_playing


@pytest.mark.asyncio
async def test_audio_player_interrupt_noop():
    from backend.voice.audio_io import AudioPlayer
    player = AudioPlayer()
    player.interrupt()  # should not raise even when not playing
    assert not player.is_playing


def test_mic_capture_creates():
    from backend.voice.audio_io import MicCapture
    mic = MicCapture(sample_rate=16_000, chunk_ms=100)
    assert mic.sample_rate == 16_000
    assert mic.chunk_size == 1600


# ── Transcriber ───────────────────────────────────────────────────────────────

def test_transcriber_creates():
    from backend.voice.transcriber import WhisperTranscriber
    t = WhisperTranscriber(model_size="tiny", device="cpu")
    assert not t.is_loaded


@pytest.mark.asyncio
async def test_transcriber_lazy_load():
    from backend.voice.transcriber import WhisperTranscriber
    t = WhisperTranscriber(model_size="tiny", device="cpu")
    # Model should not be loaded until first call
    assert not t.is_loaded


@pytest.mark.asyncio
async def test_transcriber_with_silence():
    """Test transcription of silent audio (should return empty string)."""
    from backend.voice.transcriber import WhisperTranscriber
    try:
        t = WhisperTranscriber(model_size="tiny", device="cpu", compute_type="int8")
        silence = np.zeros(16_000 * 2, dtype=np.float32)  # 2 seconds silence
        text = await t.transcribe(silence)
        assert isinstance(text, str)
    except RuntimeError as e:
        if "faster-whisper" in str(e):
            pytest.skip("faster-whisper not installed")
        raise
    except Exception as e:
        # HuggingFace download blocked (CI / offline env) or no HF token
        if "403" in str(e) or "Forbidden" in str(e) or "RepositoryNotFound" in str(e) or "HfHubHTTPError" in str(e):
            pytest.skip("HuggingFace model download not available in this environment")
        raise


# ── Speaker ───────────────────────────────────────────────────────────────────

def test_pyttsx3_speaker_creates():
    try:
        from backend.voice.speaker import Pyttsx3Speaker
        s = Pyttsx3Speaker()
        assert not s.is_playing
    except Exception:
        pytest.skip("pyttsx3 not available")


def test_create_speaker_auto():
    from backend.voice.speaker import create_speaker
    try:
        s = create_speaker(backend="auto")
        assert s is not None
        assert hasattr(s, "speak")
        assert hasattr(s, "interrupt")
    except RuntimeError:
        pytest.skip("No TTS backend available")


# ── Wake Word Detector ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_detector_manual_trigger():
    """Manual trigger via .trigger() should fire on next check()."""
    from backend.voice.detector import WakeWordDetector

    mock_transcriber = AsyncMock()
    mock_transcriber.transcribe_short = AsyncMock(return_value="")

    with patch("backend.voice.detector.OWWDetector.load", return_value=False):
        detector = WakeWordDetector(transcriber=mock_transcriber, wake_word="jarvis")
        detector.trigger()
        chunk = np.zeros(1600, dtype=np.float32)
        result = await detector.check(chunk)
        assert result is True


@pytest.mark.asyncio
async def test_whisper_detector_detects_keyword():
    """WhisperWakeDetector should fire when transcript contains wake word."""
    from backend.voice.detector import WhisperWakeDetector

    mock_transcriber = AsyncMock()
    mock_transcriber.transcribe_short = AsyncMock(return_value="hey jarvis are you there")

    detector = WhisperWakeDetector(
        transcriber=mock_transcriber,
        sample_rate=16_000,
        chunk_ms=100,
        wake_word="jarvis",
    )

    # Fill the buffer with fake speech chunks
    chunk = np.ones(1600, dtype=np.float32) * 0.05  # above energy threshold
    result = False
    for _ in range(detector._buffer.maxlen):
        result = await detector.check(chunk)
        if result:
            break

    assert result is True
    mock_transcriber.transcribe_short.assert_called()


@pytest.mark.asyncio
async def test_whisper_detector_ignores_silence():
    """Silent audio should never trigger the wake word."""
    from backend.voice.detector import WhisperWakeDetector

    mock_transcriber = AsyncMock()
    mock_transcriber.transcribe_short = AsyncMock(return_value="nothing here")

    detector = WhisperWakeDetector(
        transcriber=mock_transcriber,
        sample_rate=16_000,
        chunk_ms=100,
        wake_word="jarvis",
    )

    chunk = np.zeros(1600, dtype=np.float32)  # silence
    for _ in range(detector._buffer.maxlen * 2):
        result = await detector.check(chunk)
        assert result is False  # never fires on silence


# ── Pipeline ──────────────────────────────────────────────────────────────────

def test_pipeline_creates():
    """Pipeline should be creatable without starting."""
    # Reset singleton
    import backend.voice.pipeline as vp
    vp._pipeline = None

    from backend.voice.pipeline import VoicePipeline, VoiceState
    p = VoicePipeline()
    assert p.state == VoiceState.IDLE
    assert not p._running


def test_pipeline_get_status_before_start():
    import backend.voice.pipeline as vp
    vp._pipeline = None

    from backend.voice.pipeline import VoicePipeline
    p = VoicePipeline()
    status = p.get_status()
    assert "state" in status
    assert "running" in status
    assert "wake_word" in status
    assert status["state"] == "idle"
    assert status["running"] is False


# ── FastAPI App ───────────────────────────────────────────────────────────────

def test_app_creates():
    """FastAPI app should import correctly and have routers registered."""
    from backend.main import app
    from backend.api.voice_router import router as vr
    from backend.api.system_router import router as sr

    # Verify routers have the expected route prefixes
    voice_paths = [r.path for r in vr.routes]
    system_paths = [r.path for r in sr.routes]

    assert any("/status" in p or "/ws" in p or "/trigger" in p for p in voice_paths), \
        f"Voice router missing expected routes: {voice_paths}"
    assert any("/health" in p or "/status" in p for p in system_paths), \
        f"System router missing expected routes: {system_paths}"
    assert app.title == "Jarvis AI OS"


@pytest.mark.asyncio
async def test_system_health_endpoint():
    from httpx import AsyncClient, ASGITransport
    # Import app without starting lifespan
    from backend.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Manually skip lifespan by calling route directly
        # Health endpoint doesn't need pipeline
        from backend.api.system_router import health
        result = await health()
        assert result["status"] == "ok"
        assert "uptime_seconds" in result
