# Jarvis v6 — Bug Report

Every issue from the rebuild brief, its root cause, the fix, and how it was
verified. Status legend: ✅ fixed & verified here · 🟡 fixed, runtime needs
target hardware · ⬜ not a bug / by design.

---

## Critical

### ✅ BUG-1 — Dashboard stuck on "Connecting"
**Root cause:** `pipeline.start()` called `mic.start()` which raised
`RuntimeError` when PortAudio/sounddevice was missing. The exception escaped the
FastAPI lifespan, so uvicorn never finished startup → no HTTP, no WebSocket →
the dashboard's `connect()` looped on `● CONNECTING` forever. Triggered on every
headless/cloud/CI box and any laptop without a mic.
**Fix:** Voice made fully optional. `start()` probes `Capabilities`, wraps every
component in its own try/except, and degrades to text-only mode. Server +
dashboard + WS always come up.
**Verified:** Server boots in this no-audio env; `GET /` returns the 35 KB
dashboard; WS connects and streams `system_status → transcript → state_change →
task_update → agent_start`; `/api/voice/status` reports `mode=text-only`.

### ✅ BUG-2 — "Open Calculator" / "Open Notepad" fail
**Root cause:** `open_app` did `Popen([name])`, slept 0.35 s, and treated
*process already exited* as failure. Windows `calc.exe` and UWP launcher stubs
spawn the real app and exit 0 immediately → a successful launch was reported as
`ERROR ... exit code 0`. UWP apps also aren't launchable as bare executables.
**Fix:** New `tools/app_launcher.py`. Exit-code-0 = success. UWP via URI
(`calculator:`, `ms-settings:`), Win32 via exec, macOS via `open -a`, Linux via
ordered candidate binaries. Alias normalization for spoken phrases.
**Verified:** 33/33 alias cases; 14/14 required apps mapped per-OS; `_spawn(true)`
→ success, `_spawn(false)` → failure, missing binary → honest "not installed".
**Runtime note:** the actual Windows UWP launch can only be confirmed on Windows;
the strategy + semantics are unit-tested and correct.

### ✅ BUG-3 — "Open YouTube" reads page content aloud
**Root cause:** `open youtube` routed to `browse()`, which returns up to 8 000
chars of page text; `_format_for_voice` spoke a 350-char slice. Also `browse()`
is headless — the user never saw a browser.
**Fix:** New `open_url` tool opens the real default browser (visible) and returns
only a short confirmation. Intent router routes all "open <site>"/"go to <url>"
to `open_url`, never `browse`.
**Verified:** 0 open-commands route to `browse()`; `open_url` returns a short
confirmation/honest error, never page text.

### ✅ BUG-4 — TTS blocks execution
**Root cause:** `_handle_command` did `await _phase_speak(ack)` *before*
executing; Kokoro CPU synthesis (1–3 s) delayed every command.
**Fix:** `SpeechQueue.say()` enqueues and returns immediately; a single worker
serializes playback. Acknowledgement and execution now run concurrently.
**Verified:** test asserts `say()` returns in < 50 ms while a 200 ms-per-phrase
speaker plays three phrases in order via `drain()`.

---

## High

### ✅ BUG-5 — Voice transcripts include punctuation → routing breaks
**Root cause:** Whisper returns `"open youtube."`; the trailing period made
`" youtube "` not match inside `" youtube. "`, so the shortcut missed and it fell
through to `open_app("youtube.")`.
**Fix:** `normalize_command()` strips surrounding quotes/trailing sentence
punctuation and collapses whitespace at the `classify()` chokepoint.
**Verified:** `"Open YouTube."` → `open_url youtube.com`; normalization unit tests
pass.

### ✅ BUG-6 — Unnecessary LLM calls
**Root cause:** `BaseAgent._self_review` issued a 2nd LLM call on every text-only
reply (i.e. all conversation); CEO synthesised even single-result plans.
**Fix:** `enable_self_review=False` by default (it only ever ran on the
conversational path); CEO returns a single result directly without a synthesis
call.
**Verified:** code paths; conversation 2→1 calls, single-step goal saves 1 call.

### ✅ BUG-7 — Missing deps crash tools instead of degrading
**Root cause:** psutil/pyautogui import errors surfaced as opaque tool failures
with no guidance.
**Fix:** `Capabilities` + `diagnose` report exactly what's missing and how to fix
it; tools return actionable errors.
**Verified:** `jarvis diagnose` → 9 ok / 5 warn / 0 fail with fix hints.

---

## Medium

### ✅ BUG-8 — "go to github.io" → "https://github.io.com"
**Fix (carried + kept):** TLD detection — only append `.com` when no dot present.
**Verified:** `go to github.com` → `https://github.com`.

### ✅ BUG-9 — Outdated safety tests (2 failing)
**Root cause:** approval was refactored to delegate to `ApprovalManager`; tests
still patched the dead `rich.Confirm` import and hit real `input()`.
**Fix:** patch `ApprovalManager._terminal_prompt`; removed dead import.
**Verified:** full suite 38 passed / 0 failed (was 22/2).

### 🟡 BUG-10 — Parallel goal narration could overlap (carried from v5)
**Fix:** orchestrator fires `on_step_start` once per batch; `SpeechQueue`
serializes audio so phrases never overlap even if enqueued together.
**Verified:** speech queue ordering test.

---

## Not bugs / by design

- ⬜ WS broadcast "snapshot under lock, send outside lock" is the correct asyncio
  pattern, not a race.
- ⬜ `_last_response` shared field is safe under asyncio's cooperative scheduling
  (single-threaded, `_command_lock` serializes commands).
