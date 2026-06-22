# Jarvis Dashboard Guide

Open `http://localhost:8000/` after starting the backend. The HUD is a live
WebSocket view — everything updates in real time, no polling for events.

## Layout

```
┌── TOPBAR ─────────────────────────────────────────────────────────┐
│ ⬡  JARVIS   [STATE]  🌐EN  [🎙VOICE/⌨TEXT]  intent|exec|total  ●LIVE  clock │
├── (degraded banner — only if a capability is missing) ────────────┤
├── LEFT ──────────┬── CENTER ───────────────┬── RIGHT ─────────────┤
│ AGENTS           │ Core orb + waveform     │ TOOL ACTIVITY        │
│  ● ceo  IDLE     │ current task + progress  │  agent·tool ✓ 312ms  │
│  ● computer …    │ CONVERSATION log         │ TASK QUEUE           │
│ SYSTEM           │                          │ APPROVALS            │
│  CPU / Memory    │                          │                      │
│  Commands/Errors │                          │                      │
├── BOTTOM ─────────────────────────────────────────────────────────┤
│ TIMELINE (scrolling events)        │ > input ___  WAKE  SEND  STOP │
└────────────────────────────────────────────────────────────────────┘
```

## Status indicators

- **WS pill** — `● CONNECTING` (amber) → `● LIVE` (green). If it stays on
  CONNECTING the backend isn't serving; run `python jarvis.py diagnose`.
- **Mode pill** — `🎙 VOICE` (mic available) or `⌨ TEXT-ONLY`. Text-only is
  normal on servers / machines without a mic; type commands in the input bar.
- **Degraded banner** — appears only when something is missing (mic, speaker,
  API key, GUI control) and tells you exactly what and how to fix it.
- **State** — `idle / listening / thinking / speaking / error`; drives the orb
  ring color/speed and the waveform. `speaking` is also shown as an overlay
  whenever the non-blocking speech queue is playing (`tts_start`/`tts_end`).

## Panels

- **Agents (left):** each agent's status dot (idle/running/done/failed) with a
  live ms timer while running.
- **System (left):** CPU and Memory (live, every 3 s), command/error counts,
  uptime, WS client count.
- **Core + Conversation (center):** the animated core reflects state; the
  conversation log shows YOU / JARVIS / EXEC / TOOL / ERROR lines with
  timestamps. Current task + a progress bar for multi-step goals.
- **Tool Activity (right):** every tool call with agent tag, ✓/✗, latency, and a
  result snippet.
- **Task Queue / Approvals (right):** active tasks; dangerous actions show
  Approve/Reject buttons (wired to `/api/approval/{id}/...`).
- **Timeline (bottom):** horizontally scrolling event history (agent · text ·
  status), newest on the right.

## Controls

- **Input bar:** type a goal or command, Enter or **SEND**. Works in any mode.
- **WAKE:** manually trigger the wake word (push-to-talk).
- **STOP:** barge-in — clears queued speech and resets agent states.

## Backing endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /` | the dashboard HTML |
| `WS /api/voice/ws` | live event stream; accepts `{action:trigger\|interrupt\|text}` |
| `GET /api/voice/status` | mode + capabilities (drives mode pill / banner) |
| `GET /api/system/stats` | CPU / memory / WS clients |
| `GET /api/system/diagnose` | full self-diagnostics |
| `GET /api/memory/{search,recent,history}` | memory visibility |
| `GET /api/dashboard/state` | agents, tasks, approvals snapshot |

## Troubleshooting

- **Stuck on CONNECTING** → backend not running or crashed. `python jarvis.py
  diagnose`; check `websocket` and `dashboard` are `ok`.
- **No voice, only text** → expected without a mic. Mode pill shows TEXT-ONLY.
- **Commands do nothing / "API key" errors** → set `OPENROUTER_API_KEY` (only
  needed for research/goals/chat — OS/browser commands work without it).
