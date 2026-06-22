# Jarvis Architecture Audit — v6 Rebuild

**Author:** Principal Engineer (rebuild owner)
**Branch:** `jarvis-v6-rebuild`
**Date:** 2026-06-22
**Method:** Full read of all 80 Python modules + runtime verification of failure modes.

---

## 1. System Overview

Jarvis is a local "AI operating system": a voice/text command pipeline that
routes natural-language commands to OS automation, browser control, research,
or a multi-agent goal executor, while streaming live state to a web dashboard.

### 1.1 Execution paths (as built)

```
                    ┌────────────────────────────────────────────────┐
   Mic ─► Whisper ─►│                                                │
                    │   VoicePipeline._handle_command(text)          │
   WS "text"  ─────►│                                                │
                    └───────────────────┬────────────────────────────┘
                                        │ IntentRouter.classify()  (no LLM)
              ┌─────────────────┬───────┴────────┬──────────────────┐
              ▼                 ▼                ▼                  ▼
         os/browser         research          goal            conversation
    _execute_tool_direct  ResearchAgent   CEOAgent.execute   CEOAgent.chat
         │ (0 LLM)          │ (LLM)        │ Planner+Orch      │ (LLM + self-review)
         ▼                  ▼              ▼                   ▼
      TOOL_REGISTRY     orchestrator   TaskPlanner→Orchestrator→Agents→Tools
         │                                  │
         └──────────────► WebSocket broadcast ◄──────────────────┘
                                  │
                          Dashboard (HUD)
```

### 1.2 Component map

| Layer | Module | Responsibility |
|-------|--------|----------------|
| Entry | `backend/main.py` | FastAPI app, lifespan, dashboard HTML |
| Voice | `backend/voice/pipeline.py` | State machine: idle→listen→transcribe→handle |
| Voice | `backend/voice/{audio_io,transcriber,speaker,detector}.py` | Mic, Whisper STT, TTS, wake word |
| Routing | `core/intent_router.py` | Keyword/regex classify → Intent (no LLM) |
| Agents | `agents/*.py` | CEO + 12 specialists on `BaseAgent` |
| Orchestration | `core/orchestrator.py`, `core/task_planner.py` | Plan → dispatch → retry |
| Tools | `tools/*.py` + `tools/__init__.py` | Registry of OS/browser/file/search tools |
| State | `core/execution_state.py` | Per-command single source of truth |
| Transport | `backend/websocket_manager.py` | Broadcast events to dashboard |
| LLM | `core/llm_client.py` | OpenRouter async client + fallback chain |
| Memory | `core/memory.py` | SQLite: conversations, tasks, logs, metrics |

---

## 2. Critical Findings (verified at runtime)

### 🔴 CRIT-1 — Server cannot start without audio hardware → "Dashboard stuck on Connecting"

**Root cause (PROVEN):** `backend/main.py` lifespan does `await pipeline.start()`.
`pipeline.start()` calls `await self._mic.start()`, which **raises**
`RuntimeError` when PortAudio/sounddevice is unavailable. The exception
propagates out of the FastAPI lifespan, so **uvicorn never finishes startup and
never serves `/` or the `/api/voice/ws` WebSocket**. The dashboard's
`connect()` loops forever on `● CONNECTING`.

Verified in this environment:
```
PIPELINE START FAILED: RuntimeError: sounddevice is not installed.
==> server never serves -> dashboard stuck CONNECTING
```

This triggers on **every** headless server, container, CI box, cloud VM, or
laptop where the mic is missing or permission-blocked. Voice is treated as a
hard dependency of the entire OS, which is backwards.

**Fix:** Voice is optional. `pipeline.start()` must catch every hardware/model
failure, log it, and degrade to **text-only mode** while the server, dashboard,
and WebSocket stay fully alive.

---

### 🔴 CRIT-2 — "Open Calculator" / "Open Notepad" fail

**Root cause:** `tools/computer_tools.open_app` runs
`subprocess.Popen([name])`, sleeps 0.35s, then treats `proc.poll() is not None`
(process already exited) as **failure**:
```python
if rc is not None:
    return f"ERROR: '{name}' exited immediately (exit code {rc})"
```
On Windows, `calc.exe` (and many Store/UWP launchers) are **stubs that spawn the
real app and exit 0 immediately**. So a *successful* launch is reported as
`ERROR ... exit code 0`. Additionally `Popen(["calc"])` without `.exe`/shell can
raise `FileNotFoundError`, and UWP apps (Calculator, Settings, Camera) are not
launchable as plain executables at all — they need a URI (`calculator:`,
`ms-settings:`) or `explorer.exe shell:AppsFolder\<AUMID>`.

**Fix:** A dedicated, platform-aware launcher (`tools/app_launcher.py`) with:
an **alias/normalization** table, a per-app **launch strategy** (uri / appsfolder
/ exec / startfile), and success semantics where **exit code 0 = launched**
(only non-zero or FileNotFound is failure).

---

### 🔴 CRIT-3 — "Open YouTube" reads the page text aloud (and never opens a visible browser)

**Root cause:** IntentRouter maps `open youtube` → `browse(url)`. `browse()`
returns up to **8 000 characters of page body text**, which
`_format_for_voice()` truncates to 350 chars and **speaks**. Worse, `browse()`
drives a **headless** Chromium — the user never sees YouTube open.

There is no separation between *"open a website for the human to look at"* and
*"scrape a website so an agent can read it"*. They are the same tool.

**Fix (Phase 4):** Split the concerns.
- `open_url` — opens the **real system browser** (visible) and returns only a
  short confirmation. This is what "open X" routes to.
- `browse` / `extract_page` — headless scraping, reserved for agent research.
- `search_web` — search, returns ranked results.
"Open YouTube" must **never** scrape or speak page text.

---

### 🔴 CRIT-4 — TTS blocks execution

**Root cause:** `_handle_command()` Phase A does
`await self._phase_speak(ack)` **before** execution. Kokoro on CPU can take
1–3 s to synthesize a sentence, so the acknowledgement fully plays *before* the
command even begins. The result is then also spoken with a blocking `await`.
Speech is on the critical path.

**Fix (Phase 6):** A non-blocking **SpeechQueue**. Acknowledgements are
enqueued and execution starts immediately in parallel. Audio is serialized by
the queue (no overlap) but never blocks the executor.

---

## 3. High-Severity Findings

### 🟠 HIGH-5 — Punctuation from Whisper breaks intent routing
Whisper returns `"open youtube."` (trailing period). `_url_keyword_match`
pads to `" youtube. "`, which does **not** contain `" youtube "`, so the
shortcut misses and it falls through to `open_app("youtube.")` → fail. **Fix:**
normalize transcripts (strip surrounding punctuation, collapse whitespace)
before classification.

### 🟠 HIGH-6 — Unnecessary LLM calls
- `BaseAgent._self_review` issues a **second** LLM call for every text-only
  answer (e.g. all conversation), doubling latency and tokens for greetings.
- `CEOAgent._synthesise` always runs even for a single-subtask plan.
**Fix:** skip self-review for short conversational replies; skip synthesis when
a plan has one result.

### 🟠 HIGH-7 — Missing hardware deps crash tools instead of degrading
`close_app` (psutil), `click/type/press` (pyautogui) raise `RuntimeError` on
import when the dep is missing, surfacing as opaque tool errors. **Fix:** clear,
actionable error strings and a diagnostics command that reports exactly what's
installed.

---

## 4. Medium-Severity Findings

| ID | Finding | Fix |
|----|---------|-----|
| MED-8 | No WS heartbeat; idle sockets can drop behind proxies with no recovery signal | Add ping/keepalive + `connected` confirmation event |
| MED-9 | `process_text_command` fired via untracked `asyncio.create_task` — exceptions swallowed | Wrap with logging guard |
| MED-10 | ExecutionState registry is in-memory only; execution history lost on restart; no search | Persist + add `search` |
| MED-11 | No diagnostics surface (mic/speaker/WS/API/tools) | Build `core/diagnostics.py` + `/api/system/diagnose` + CLI |
| MED-12 | No memory search / dashboard memory visibility | Add `memory.search()` + `/api/memory/*` |
| MED-13 | Language drift possible in free-form LLM replies | English enforced in all system prompts (carried from v5) |

---

## 5. Architectural Weaknesses

1. **Voice coupled to server lifecycle** (CRIT-1) — the worst structural flaw.
2. **Tool result polymorphism** — a tool's string return is used for the
   dashboard, the voice output, *and* error detection. "Open a site" and "read a
   site" returning the same shape is what causes CRIT-3.
3. **No capability gating** — the pipeline assumes mic + speaker + display +
   API key all exist. There's no single source of truth for "what can this
   install actually do right now". Diagnostics + a `Capabilities` probe fix this.
4. **Blocking audio on the executor path** (CRIT-4).

---

## 6. What Already Works Well (keep)

- `IntentRouter` fast-path design (0 LLM for OS/browser) — correct and fast.
- `ExecutionState` as a single source of truth per command — good model.
- `LLMClient` fallback chain + retry — solid.
- Tool verification work from v5 (HTTP status, pid_exists, st_size, field
  readback) — genuinely verified results, keep and extend.
- WS broadcast snapshot-under-lock pattern — correct.

---

## 7. Implementation Plan (this rebuild)

| Phase | Change | Files | Verifiable here? |
|-------|--------|-------|------------------|
| 1 | **Server resilience** — voice optional, never crash startup | `pipeline.py`, `main.py`, `capabilities.py` (new) | ✅ Yes |
| 2 | **Non-blocking speech queue** | `speech_queue.py` (new), `pipeline.py` | ✅ Yes |
| 3 | **Windows app launcher** + aliases | `app_launcher.py` (new), `computer_tools.py`, `intent_router.py` | ✅ Linux path + normalization |
| 4 | **Browser split** — `open_url` vs scrape | `app_launcher.py`/`browser_tools.py`, `intent_router.py`, `pipeline.py` | ✅ Yes |
| 5 | **Transcript normalization** | `intent_router.py`, `transcriber.py` | ✅ Yes |
| 6 | **LLM reduction** — skip self-review/synthesis | `base_agent.py`, `ceo_agent.py` | ✅ Yes |
| 7 | **Diagnostics** — `jarvis diagnose` + endpoint | `diagnostics.py` (new), `system_router.py`, `jarvis.py` | ✅ Yes |
| 8 | **Memory search + visibility** | `memory.py`, `memory_router.py` (new), dashboard | ✅ Yes |
| 9 | **Dashboard V6** — capability-aware, degraded-mode banner | `main.py` | ✅ Yes (static) |
| 10 | **Tests + docs** | `tests/*`, `*.md` | ✅ Yes |

Every change is verified by running it in this environment where possible.
Hardware-bound paths (real Windows launch, live mic, Kokoro audio) are
structurally correct and unit-tested at the logic level; their runtime
verification is explicitly called out in `PERFORMANCE_REPORT.md` and
`TOOL_RELIABILITY_REPORT.md`.

---

## 8. Runtime Environment Probe (this machine)

```
Python 3.11.15 · platform=linux · DISPLAY=<none> · OPENROUTER_API_KEY=unset
present : fastapi uvicorn openai faster_whisper playwright duckduckgo_search pyttsx3 numpy
missing : sounddevice(PortAudio) kokoro psutil pyautogui openwakeword
```
This is exactly the "headless, no audio, no key" profile under which the
current build is 100% non-functional (server won't start). After Phase 1 the
server starts cleanly here and the dashboard connects; commands that need
missing hardware return clear, honest errors instead of crashing the process.
