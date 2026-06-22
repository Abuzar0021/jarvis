"""
Jarvis self-diagnostics.

Probes every subsystem and returns a structured report so a user can answer
"why isn't X working?" without reading logs. Each check returns one of:
  ok    — working
  warn  — degraded but non-fatal (e.g. text-only mode, no API key)
  fail  — broken / unavailable

Used by `python jarvis.py diagnose` and GET /api/system/diagnose.
Every probe is defensive: a check NEVER raises, it reports.
"""

from __future__ import annotations

import asyncio
import shutil
import sys
import time
from dataclasses import dataclass, asdict
from typing import Callable

from core.logger import get_logger

logger = get_logger("jarvis.diagnostics")

OK, WARN, FAIL = "ok", "warn", "fail"


@dataclass
class Check:
    name: str
    status: str
    detail: str
    fix: str = ""

    def dict(self) -> dict:
        return asdict(self)


def _safe(fn: Callable[[], Check]) -> Check:
    try:
        return fn()
    except Exception as exc:  # a diagnostic must never crash
        return Check(fn.__name__, FAIL, f"probe raised: {exc}")


# ── Individual probes ────────────────────────────────────────────────────────────

def _check_python() -> Check:
    v = sys.version_info
    s = OK if v >= (3, 10) else WARN
    return Check("python", s, f"{v.major}.{v.minor}.{v.micro} on {sys.platform}")


def _check_api() -> Check:
    import os
    if not os.getenv("OPENROUTER_API_KEY"):
        return Check("openrouter_api", WARN,
                     "OPENROUTER_API_KEY not set — research/goals/chat unavailable",
                     "Copy .env.example to .env and add your key")
    return Check("openrouter_api", OK, "API key present")


def _check_microphone() -> Check:
    try:
        import sounddevice as sd
    except Exception as exc:
        return Check("microphone", WARN, f"sounddevice unavailable: {str(exc)[:60]}",
                     "pip install sounddevice (+ system PortAudio) — optional, voice input only")
    try:
        ins = [d for d in sd.query_devices() if d.get("max_input_channels", 0) > 0]
        if not ins:
            return Check("microphone", WARN, "no input devices found", "connect a microphone")
        return Check("microphone", OK, f"{len(ins)} input device(s)")
    except Exception as exc:
        return Check("microphone", WARN, f"query failed: {str(exc)[:60]}")


def _check_speaker() -> Check:
    from core.capabilities import get_capabilities
    caps = get_capabilities()
    if caps.tts_backend == "none":
        return Check("speaker_tts", WARN, "no TTS backend",
                     "pip install pyttsx3 (or kokoro) — optional, voice output only")
    return Check("speaker_tts", OK, f"backend={caps.tts_backend}")


def _check_stt() -> Check:
    ok = shutil.which("python") is not None
    try:
        import faster_whisper  # noqa: F401
        return Check("stt_whisper", OK, "faster-whisper available")
    except Exception as exc:
        return Check("stt_whisper", WARN, f"faster-whisper unavailable: {str(exc)[:50]}",
                     "pip install faster-whisper — optional, voice input only")


def _check_websocket() -> Check:
    try:
        from backend.websocket_manager import manager
        return Check("websocket", OK, f"manager live, {manager.count} client(s)")
    except Exception as exc:
        return Check("websocket", FAIL, f"manager import failed: {exc}")


def _check_dashboard() -> Check:
    try:
        from backend.main import _DASHBOARD_HTML
        if "JARVIS" in _DASHBOARD_HTML and "/api/voice/ws" in _DASHBOARD_HTML:
            return Check("dashboard", OK, f"HTML {len(_DASHBOARD_HTML)} bytes, WS wired")
        return Check("dashboard", WARN, "HTML present but WS endpoint reference missing")
    except Exception as exc:
        return Check("dashboard", FAIL, f"dashboard import failed: {exc}")


def _check_memory() -> Check:
    try:
        from core.memory import get_memory
        mem = get_memory()
        stats = mem.get_stats()
        # round-trip write/read to prove the DB is usable
        tid = mem.create_task("__diagnostic_probe__")
        mem.update_task(tid, "done", result="ok")
        return Check("memory", OK,
                     f"sqlite ok — tasks={stats.get('tasks')} logs={stats.get('action_logs')} "
                     f"db={stats.get('db_size_bytes', 0)}B")
    except Exception as exc:
        return Check("memory", FAIL, f"sqlite error: {exc}")


def _check_agents() -> Check:
    try:
        from core.orchestrator import get_orchestrator
        orch = get_orchestrator()
        names = orch.available_agents()
        return Check("agents", OK, f"{len(names)} agents: {', '.join(names[:6])}…")
    except Exception as exc:
        return Check("agents", FAIL, f"orchestrator error: {exc}")


def _check_tools() -> Check:
    try:
        import tools as t
        n = len(t.TOOL_REGISTRY)
        have = {"open_app", "open_url", "close_app", "screenshot", "search_google"}
        missing = [x for x in have if x not in t.TOOL_REGISTRY]
        if missing:
            return Check("tools", WARN, f"{n} tools, missing core: {missing}")
        return Check("tools", OK, f"{n} tools registered (open_app, open_url, …)")
    except Exception as exc:
        return Check("tools", FAIL, f"registry error: {exc}")


def _check_browser_automation() -> Check:
    try:
        import playwright  # noqa: F401
        return Check("browser_automation", OK, "playwright available")
    except Exception as exc:
        return Check("browser_automation", WARN, f"playwright unavailable: {str(exc)[:50]}",
                     "pip install playwright && playwright install chromium — optional, research only")


def _check_system_browser() -> Check:
    from core.capabilities import get_capabilities
    caps = get_capabilities()
    if caps.system_browser:
        return Check("system_browser", OK, "default browser available (open_url works)")
    return Check("system_browser", WARN, "no system browser detected",
                 "on a server, open_url can't show a window — use search/browse")


def _check_process_control() -> Check:
    try:
        import psutil  # noqa: F401
        return Check("process_control", OK, "psutil available (close_app verifiable)")
    except Exception as exc:
        return Check("process_control", WARN, f"psutil unavailable: {str(exc)[:40]}",
                     "pip install psutil — needed for close_app")


def _check_gui_control() -> Check:
    from core.capabilities import get_capabilities
    caps = get_capabilities()
    if caps.gui_control:
        return Check("gui_control", OK, "pyautogui + display (click/type/press work)")
    reason = caps.notes.get("gui_control", "unavailable")
    return Check("gui_control", WARN, f"GUI control off: {reason}",
                 "needs pyautogui + a graphical display")


_PROBES = [
    _check_python, _check_api, _check_microphone, _check_speaker, _check_stt,
    _check_websocket, _check_dashboard, _check_memory, _check_agents, _check_tools,
    _check_browser_automation, _check_system_browser, _check_process_control,
    _check_gui_control,
]


async def run_diagnostics() -> dict:
    """Run every probe and return a structured report."""
    t0 = time.monotonic()
    checks = [_safe(p) for p in _PROBES]
    counts = {OK: 0, WARN: 0, FAIL: 0}
    for c in checks:
        counts[c.status] = counts.get(c.status, 0) + 1
    overall = FAIL if counts[FAIL] else (WARN if counts[WARN] else OK)
    return {
        "overall": overall,
        "summary": {"ok": counts[OK], "warn": counts[WARN], "fail": counts[FAIL]},
        "elapsed_ms": int((time.monotonic() - t0) * 1000),
        "checks": [c.dict() for c in checks],
    }


def render_report(report: dict) -> str:
    """Plain-text rendering for the CLI."""
    icon = {OK: "✓", WARN: "!", FAIL: "✗"}
    lines = [
        "JARVIS DIAGNOSTICS",
        "=" * 60,
        f"Overall: {report['overall'].upper()}   "
        f"(ok={report['summary']['ok']} warn={report['summary']['warn']} "
        f"fail={report['summary']['fail']}, {report['elapsed_ms']}ms)",
        "-" * 60,
    ]
    for c in report["checks"]:
        lines.append(f" {icon.get(c['status'], '?')} {c['name']:<20} {c['detail']}")
        if c.get("fix") and c["status"] != OK:
            lines.append(f"     ↳ fix: {c['fix']}")
    return "\n".join(lines)
