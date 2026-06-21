"""
Jarvis FastAPI Backend
Starts the voice pipeline, registers all routers, serves the status page.
"""

from __future__ import annotations

import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path

ROOT = Path(__file__).parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from backend.config import HOST, PORT
from backend.api.voice_router import router as voice_router
from backend.api.agent_router import router as agent_router
from backend.api.system_router import router as system_router
from backend.voice.pipeline import get_pipeline
from core.logger import get_logger, console
from rich.panel import Panel

logger = get_logger("jarvis.server")


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start voice pipeline on boot, shut it down on exit."""
    console.print(
        Panel(
            "[bold magenta]JARVIS AI OPERATING SYSTEM[/bold magenta]\n"
            "[dim]Voice + Agent Backend — Phase 1[/dim]",
            border_style="magenta",
        )
    )

    pipeline = get_pipeline()
    try:
        await pipeline.start()
        logger.info(f"Jarvis backend ready at http://{HOST}:{PORT}")
        yield
    finally:
        await pipeline.stop()
        logger.info("Jarvis backend shut down")


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Jarvis AI OS",
    description="Local Autonomous AI Operating System — Backend",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tightened in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(voice_router)
app.include_router(agent_router)
app.include_router(system_router)


# ── Status Page (Phase 1 HUD — replaced by Next.js in Phase 6) ───────────────

@app.get("/", response_class=HTMLResponse)
async def status_page():
    """Minimal browser HUD for Phase 1 voice testing."""
    return HTMLResponse(_STATUS_HTML)


# ── Inline Phase 1 HUD ────────────────────────────────────────────────────────

_STATUS_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Jarvis AI OS</title>
<style>
  :root {
    --cyan: #00f5ff;
    --magenta: #ff00ff;
    --green: #00ff88;
    --red: #ff3333;
    --bg: #030a1a;
    --card: rgba(0,245,255,0.05);
    --border: rgba(0,245,255,0.2);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--bg);
    color: var(--cyan);
    font-family: 'Courier New', monospace;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
  }
  h1 {
    font-size: 2.5rem;
    letter-spacing: 0.5rem;
    text-transform: uppercase;
    color: var(--cyan);
    text-shadow: 0 0 30px var(--cyan);
    margin-bottom: 0.25rem;
  }
  .subtitle { color: rgba(0,245,255,0.5); font-size: 0.75rem; letter-spacing: 0.3rem; margin-bottom: 2rem; }
  .core {
    width: 180px; height: 180px;
    border-radius: 50%;
    border: 2px solid var(--cyan);
    box-shadow: 0 0 60px var(--cyan), inset 0 0 60px rgba(0,245,255,0.1);
    display: flex; align-items: center; justify-content: center;
    font-size: 3rem;
    margin-bottom: 2rem;
    transition: all 0.3s;
    animation: pulse 3s ease-in-out infinite;
    cursor: pointer;
  }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 40px var(--cyan), inset 0 0 40px rgba(0,245,255,0.1); }
    50%       { box-shadow: 0 0 80px var(--cyan), inset 0 0 80px rgba(0,245,255,0.15); }
  }
  .core.listening { border-color: var(--green); box-shadow: 0 0 80px var(--green); animation: none; }
  .core.thinking  { border-color: var(--magenta); box-shadow: 0 0 80px var(--magenta); animation: spin 1s linear infinite; }
  .core.speaking  { border-color: var(--cyan); animation: glow 0.3s ease-in-out infinite alternate; }
  .core.error     { border-color: var(--red); box-shadow: 0 0 60px var(--red); animation: none; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes glow {
    from { box-shadow: 0 0 40px var(--cyan); }
    to   { box-shadow: 0 0 120px var(--cyan); }
  }
  .state-badge {
    font-size: 0.85rem;
    letter-spacing: 0.3rem;
    text-transform: uppercase;
    padding: 0.4rem 1.2rem;
    border: 1px solid var(--border);
    border-radius: 2rem;
    margin-bottom: 1.5rem;
    transition: all 0.3s;
  }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; max-width: 800px; margin-bottom: 1.5rem; }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
  }
  .card h3 { font-size: 0.65rem; letter-spacing: 0.3rem; text-transform: uppercase; color: rgba(0,245,255,0.5); margin-bottom: 0.5rem; }
  .card p { font-size: 0.9rem; word-break: break-word; line-height: 1.5; min-height: 2rem; }
  .transcript { color: #fff; }
  .response   { color: var(--green); }
  .controls { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
  button {
    background: transparent;
    border: 1px solid var(--cyan);
    color: var(--cyan);
    padding: 0.6rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.8rem;
    letter-spacing: 0.2rem;
    text-transform: uppercase;
    transition: all 0.2s;
  }
  button:hover { background: rgba(0,245,255,0.1); box-shadow: 0 0 20px var(--cyan); }
  button.danger { border-color: var(--red); color: var(--red); }
  button.danger:hover { background: rgba(255,51,51,0.1); }
  .log-panel {
    width: 100%; max-width: 800px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    max-height: 200px;
    overflow-y: auto;
    font-size: 0.75rem;
  }
  .log-entry { padding: 0.2rem 0; border-bottom: 1px solid rgba(0,245,255,0.05); }
  .log-entry .ts { color: rgba(0,245,255,0.4); }
  .log-entry .evt { color: var(--magenta); margin: 0 0.5rem; }
  .cmd-row { display: flex; gap: 0.5rem; width: 100%; max-width: 800px; margin-bottom: 1rem; }
  .cmd-row input {
    flex: 1;
    background: var(--card);
    border: 1px solid var(--border);
    color: var(--cyan);
    padding: 0.6rem 1rem;
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.9rem;
    outline: none;
  }
  .cmd-row input:focus { border-color: var(--cyan); box-shadow: 0 0 10px rgba(0,245,255,0.2); }
  .ws-indicator { font-size: 0.7rem; letter-spacing: 0.2rem; margin-bottom: 1rem; }
  .ws-connected    { color: var(--green); }
  .ws-disconnected { color: var(--red); }
</style>
</head>
<body>

<h1>JARVIS</h1>
<div class="subtitle">AI OPERATING SYSTEM · PHASE 1 · VOICE ONLINE</div>

<div class="core" id="core" onclick="triggerWake()">⬡</div>
<div class="state-badge" id="state-badge">INITIALISING</div>
<div class="ws-indicator" id="ws-status">● CONNECTING…</div>

<div class="controls">
  <button onclick="triggerWake()">⬡ WAKE JARVIS</button>
  <button onclick="interrupt()" class="danger">✕ INTERRUPT</button>
</div>

<div class="cmd-row">
  <input id="text-input" type="text" placeholder="Type a command and press Enter…" onkeydown="if(event.key==='Enter')sendText()">
  <button onclick="sendText()">SEND</button>
</div>

<div class="grid">
  <div class="card">
    <h3>You said</h3>
    <p class="transcript" id="transcript">—</p>
  </div>
  <div class="card">
    <h3>Jarvis replied</h3>
    <p class="response" id="response">—</p>
  </div>
</div>

<div class="log-panel" id="log-panel">
  <div class="log-entry"><span class="ts">SYSTEM</span><span class="evt">INIT</span>Connecting to Jarvis backend…</div>
</div>

<script>
let ws;
let reconnectTimer;

const COLORS = {
  idle: '#00f5ff', listening: '#00ff88',
  transcribing: '#ffff00', thinking: '#ff00ff',
  speaking: '#00f5ff', error: '#ff3333', stopped: '#666'
};

function connect() {
  clearTimeout(reconnectTimer);
  ws = new WebSocket(`ws://${location.host}/api/voice/ws`);

  ws.onopen = () => {
    document.getElementById('ws-status').className = 'ws-indicator ws-connected';
    document.getElementById('ws-status').textContent = '● CONNECTED';
    log('SYSTEM', 'WS', 'Connected to Jarvis backend');
  };

  ws.onclose = () => {
    document.getElementById('ws-status').className = 'ws-indicator ws-disconnected';
    document.getElementById('ws-status').textContent = '● DISCONNECTED — retrying…';
    reconnectTimer = setTimeout(connect, 3000);
  };

  ws.onerror = () => {
    log('SYSTEM', 'ERROR', 'WebSocket error');
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    handleEvent(msg);
  };
}

function handleEvent(msg) {
  const core = document.getElementById('core');
  const badge = document.getElementById('state-badge');

  if (msg.type === 'state_change') {
    const s = msg.state;
    badge.textContent = s.toUpperCase();
    core.className = 'core ' + s;
    core.style.borderColor = COLORS[s] || '#00f5ff';
    log('STATE', '→', s.toUpperCase());
  }
  else if (msg.type === 'wake_detected') {
    log('WAKE', '⬡', 'Wake word detected');
  }
  else if (msg.type === 'transcript') {
    if (msg.is_final) {
      document.getElementById('transcript').textContent = msg.text;
      log('USER', '→', msg.text);
    }
  }
  else if (msg.type === 'agent_done' || msg.type === 'response') {
    const text = msg.result || msg.text || '';
    if (text) {
      document.getElementById('response').textContent = text;
      log('JARVIS', '◈', text.substring(0, 80) + (text.length > 80 ? '…' : ''));
    }
  }
  else if (msg.type === 'agent_error') {
    log('ERROR', '✕', msg.error);
  }
  else if (msg.type === 'system_status') {
    badge.textContent = (msg.state || 'ready').toUpperCase();
    log('SYSTEM', 'STATUS', JSON.stringify({state: msg.state, detector: msg.detector_backend}));
  }
}

function log(source, event, detail) {
  const panel = document.getElementById('log-panel');
  const ts = new Date().toLocaleTimeString();
  const div = document.createElement('div');
  div.className = 'log-entry';
  div.innerHTML = `<span class="ts">${ts}</span><span class="evt">[${source}]</span>${detail}`;
  panel.insertBefore(div, panel.firstChild);
  if (panel.children.length > 80) panel.removeChild(panel.lastChild);
}

function triggerWake() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({action: 'trigger'}));
    log('USER', 'WAKE', 'Manual trigger sent');
  }
}

function interrupt() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({action: 'interrupt'}));
    log('USER', 'INTERRUPT', 'Speech interrupted');
  }
}

function sendText() {
  const input = document.getElementById('text-input');
  const text = input.value.trim();
  if (!text) return;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({action: 'text', text}));
    log('USER', 'TEXT', text);
    input.value = '';
  }
}

connect();
</script>
</body>
</html>"""


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=False, log_level="info")
