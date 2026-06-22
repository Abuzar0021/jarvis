"""
Regression tests for the v6 rebuild — locks in every CRIT/HIGH fix so they
can't silently regress.

Covers:
  CRIT-1  server/pipeline resilience in text-only mode
  CRIT-2  app launcher normalization + success semantics
  CRIT-3  "open website" routes to open_url, never the scraping browse()
  CRIT-4  non-blocking speech queue
  HIGH-5  transcript punctuation normalization
  +       capabilities probe, diagnostics, memory search
"""

import asyncio

import pytest


# ── CRIT-2: app launcher ─────────────────────────────────────────────────────────

def test_app_normalization_aliases():
    from tools.app_launcher import normalize_app
    assert normalize_app("calc") == "calculator"
    assert normalize_app("Calculator.") == "calculator"
    assert normalize_app("open the calculator app") == "calculator"
    assert normalize_app("vs code") == "vscode"
    assert normalize_app("task manager") == "taskmanager"
    assert normalize_app("command prompt") == "cmd"
    assert normalize_app("my notepad up please") == "notepad"
    assert normalize_app("flibberwocky") is None


def test_app_launch_plans_cover_required_apps():
    from tools import app_launcher as al
    required = ["calculator", "notepad", "paint", "explorer", "settings",
                "taskmanager", "cmd", "powershell", "vscode", "chrome", "edge",
                "spotify", "discord", "slack"]
    for table in (al._WIN, al._MAC, al._LINUX):
        for app in required:
            assert app in table, f"{app} missing a launch plan"


def test_launch_exit_zero_is_success():
    """A launcher stub exiting 0 (like Windows calc.exe) must be SUCCESS."""
    from tools.app_launcher import _spawn
    ok, _ = _spawn(["true"])
    assert ok is True
    ok, _ = _spawn(["false"])
    assert ok is False


@pytest.mark.asyncio
async def test_launch_missing_app_is_honest_error():
    from tools.app_launcher import launch
    r = await launch("definitely-not-real-binary-zzz")
    assert r.startswith("ERROR")
    assert "not installed" in r or "not found" in r


# ── CRIT-3 + HIGH-5: intent routing ──────────────────────────────────────────────

def test_open_website_uses_open_url_not_browse():
    from core.intent_router import IntentRouter
    for cmd in ["open youtube", "Open YouTube.", "go to github.com", "open x"]:
        i = IntentRouter.classify(cmd)
        assert i.tool == "open_url", f"{cmd!r} -> {i.tool}, must be open_url"
        assert i.tool != "browse"


def test_open_app_routes_to_computer():
    from core.intent_router import IntentRouter
    for cmd in ["open calculator", "open notepad", "Open Calculator."]:
        i = IntentRouter.classify(cmd)
        assert i.type == "os" and i.tool == "open_app"


def test_punctuation_normalization():
    from core.intent_router import normalize_command
    assert normalize_command("Open YouTube.") == "Open YouTube"
    assert normalize_command("  open   notepad  ") == "open notepad"
    assert normalize_command("Take a screenshot!") == "Take a screenshot"


def test_close_distinct_from_open():
    from core.intent_router import IntentRouter
    assert IntentRouter.classify("close youtube").tool == "close_app"


# ── CRIT-1: capabilities + resilience ────────────────────────────────────────────

def test_capabilities_never_raises():
    from core.capabilities import get_capabilities
    caps = get_capabilities(refresh=True)
    # summary must always be serializable and complete
    s = caps.summary()
    for key in ("voice_input", "voice_output", "audio_in", "stt", "platform"):
        assert key in s


@pytest.mark.asyncio
async def test_pipeline_starts_without_audio():
    """The whole point of CRIT-1: start() must not raise without a mic."""
    from backend.voice.pipeline import VoicePipeline
    p = VoicePipeline()
    await p.start()          # must NOT raise even with no PortAudio
    try:
        status = p.get_status()
        assert status["running"] is True
        # in this CI env there is no mic, so it must be text-only
        assert status["mode"] in ("text-only", "voice+text")
    finally:
        await p.stop()


# ── CRIT-4: non-blocking speech queue ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_speech_queue_is_non_blocking():
    from backend.voice.speech_queue import SpeechQueue

    played = []

    class SlowSpeaker:
        NAME = "slow"
        async def speak(self, text):
            await asyncio.sleep(0.2)
            played.append(text)
        def interrupt(self):
            pass

    q = SpeechQueue(SlowSpeaker())
    import time
    t0 = time.monotonic()
    q.say("one"); q.say("two"); q.say("three")
    enqueue_ms = (time.monotonic() - t0) * 1000
    assert enqueue_ms < 50, "say() must return immediately, not block on playback"
    await q.drain()
    assert played == ["one", "two", "three"]   # serialized, in order


@pytest.mark.asyncio
async def test_speech_queue_noop_without_speaker():
    from backend.voice.speech_queue import SpeechQueue
    q = SpeechQueue(None)
    q.say("nothing")          # must be a safe no-op
    assert q.is_speaking is False


# ── Diagnostics + memory search ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_diagnostics_runs():
    from core.diagnostics import run_diagnostics
    rep = await run_diagnostics()
    assert rep["overall"] in ("ok", "warn", "fail")
    names = {c["name"] for c in rep["checks"]}
    for required in ("microphone", "websocket", "dashboard", "memory", "agents", "tools"):
        assert required in names


def test_memory_search():
    from core.memory import get_memory
    m = get_memory()
    tid = m.create_task("Test searchable YouTube task")
    m.update_task(tid, "done", result="done ok")
    hits = m.search("youtube")
    assert any(h["kind"] == "task" for h in hits)
    assert m.search("") == []   # empty query returns nothing
