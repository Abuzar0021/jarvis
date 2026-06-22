# Jarvis Roadmap

Where v6 landed and what to build next, in priority order
(reliability → speed → visibility → usability, matching the project brief).

## Shipped in v6 (this rebuild)

- ✅ Server starts without audio hardware (text-only fallback) — dashboard always
  connects.
- ✅ Robust per-OS app launcher with alias normalization; Windows UWP/Win32 fixed.
- ✅ `open_url` (visible browser) separated from `browse` (headless scrape).
- ✅ Non-blocking speech queue; acknowledge + execute concurrently.
- ✅ Transcript normalization (punctuation no longer breaks routing).
- ✅ Fewer LLM calls (self-review off by default; single-result synthesis skipped).
- ✅ `jarvis diagnose` + `/api/system/diagnose`.
- ✅ Searchable memory + `/api/memory/*` + dashboard memory data.
- ✅ Dashboard V6: capability banner, CPU/MEM, speaking overlay.
- ✅ 38 tests passing (16 new regression tests, 0 failures).

## Next — High priority

1. **Real GUI-effect verification.** `click/type/press` verify the call, not the
   effect. Add an optional post-action vision check (screenshot → "did X happen?")
   for high-stakes automation. Closes the last PARTIAL reliability gap.
2. **Persistent browser sessions.** A keep-alive Playwright context with cookies/
   login persistence so multi-step web tasks don't re-auth each call.
3. **Streaming LLM + partial TTS.** Speak the first sentence of a long answer as
   it streams instead of after the full completion — cuts perceived latency.
4. **STT latency.** Ship a `tiny`/GPU option and partial/streaming transcription
   to get sub-second voice turnaround.

## Next — Medium

5. **Execution history persistence.** ExecutionState registry is in-memory; persist
   completed executions to SQLite and expose a searchable history view.
6. **WS heartbeat / resume.** Ping-pong keepalive + last-event replay so a dropped
   socket recovers state instead of starting blank.
7. **Capability-aware intent routing.** If `gui_control` is unavailable, route
   "click/type" commands to a helpful message instead of a tool error.
8. **App launcher coverage.** Data-drive the alias/launch tables from a config
   file so users can add their own apps without code.

## Next — Lower

9. **Vision-guided computer use** (find-and-click by description).
10. **Multi-turn goal memory** (resume an interrupted goal).
11. **Pluggable TTS voices / wake words** via config.
12. **Packaging:** one-command installer per OS that runs `diagnose` and reports
    what to install for full voice + GUI.

## Known limitations (carried)

- Windows UWP launch and live mic/Kokoro audio are verified by logic/tests here,
  not on target hardware — confirm on a Windows desktop.
- Research/goals/chat require `OPENROUTER_API_KEY`; OS/browser commands don't.
- `search_google` depends on DuckDuckGo/Google availability and may rate-limit.
