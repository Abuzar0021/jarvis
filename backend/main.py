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
from backend.api.vision_router import router as vision_router
from backend.api.approval_router import router as approval_router
from backend.api.dashboard_router import router as dashboard_router
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
            "[dim]Autonomous Agent OS — Phase 3[/dim]",
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
app.include_router(vision_router)
app.include_router(approval_router)
app.include_router(dashboard_router)


# ── Phase 3 Dashboard ─────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def status_page():
    """Full Jarvis Phase 3 autonomous agent dashboard."""
    return HTMLResponse(_DASHBOARD_HTML)


# ── Phase 3 Dashboard HTML ─────────────────────────────────────────────────────

_DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Jarvis AI OS — Phase 3</title>
<style>
:root {
  --cyan: #00f5ff;
  --magenta: #ff00ff;
  --green: #00ff88;
  --yellow: #ffff00;
  --red: #ff3333;
  --orange: #ff8800;
  --bg: #030a1a;
  --bg2: #060f20;
  --card: rgba(0,245,255,0.04);
  --card2: rgba(0,245,255,0.08);
  --border: rgba(0,245,255,0.18);
  --border2: rgba(0,245,255,0.35);
  --dim: rgba(0,245,255,0.45);
}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{height:100%;overflow:hidden;}
body{
  background:var(--bg);
  color:var(--cyan);
  font-family:'Courier New',monospace;
  font-size:13px;
  display:grid;
  grid-template-rows:56px 1fr 52px;
  height:100vh;
}

/* ── TOP BAR ── */
#topbar{
  display:flex;align-items:center;gap:1.5rem;
  padding:0 1.5rem;
  border-bottom:1px solid var(--border);
  background:var(--bg2);
}
#topbar h1{font-size:1.3rem;letter-spacing:.5rem;text-shadow:0 0 20px var(--cyan);}
#topbar .sub{font-size:.6rem;letter-spacing:.25rem;color:var(--dim);}
#ws-pill{
  margin-left:auto;font-size:.65rem;letter-spacing:.2rem;
  padding:.2rem .8rem;border-radius:1rem;
  border:1px solid var(--border);transition:all .3s;
}
#ws-pill.ok{border-color:var(--green);color:var(--green);}
#ws-pill.err{border-color:var(--red);color:var(--red);}
#core-orb{
  width:36px;height:36px;border-radius:50%;
  border:2px solid var(--cyan);
  display:flex;align-items:center;justify-content:center;
  font-size:1.1rem;
  animation:pulse 3s ease-in-out infinite;
  cursor:pointer;flex-shrink:0;
}
#core-orb.listening{border-color:var(--green);animation:none;box-shadow:0 0 12px var(--green);}
#core-orb.thinking {border-color:var(--magenta);animation:spin 1s linear infinite;}
#core-orb.speaking {border-color:var(--cyan);animation:glow .3s ease-in-out infinite alternate;}
#core-orb.error    {border-color:var(--red);animation:none;}
#state-badge{font-size:.65rem;letter-spacing:.25rem;color:var(--dim);}
@keyframes pulse{0%,100%{box-shadow:0 0 8px var(--cyan);}50%{box-shadow:0 0 20px var(--cyan);}}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes glow{from{box-shadow:0 0 8px var(--cyan);}to{box-shadow:0 0 28px var(--cyan);}}

/* ── MAIN GRID ── */
#main{
  display:grid;
  grid-template-columns:260px 1fr 300px;
  grid-template-rows:1fr 1fr;
  gap:6px;
  padding:6px;
  overflow:hidden;
  min-height:0;
}

/* ── PANELS ── */
.panel{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:8px;
  display:flex;flex-direction:column;
  overflow:hidden;
  min-height:0;
}
.panel-hdr{
  padding:.4rem .8rem;
  font-size:.6rem;letter-spacing:.25rem;text-transform:uppercase;
  color:var(--dim);
  border-bottom:1px solid var(--border);
  flex-shrink:0;
  display:flex;align-items:center;gap:.5rem;
}
.panel-hdr .dot{width:6px;height:6px;border-radius:50%;background:var(--cyan);flex-shrink:0;}
.panel-body{flex:1;overflow-y:auto;padding:.6rem .8rem;min-height:0;}
.panel-body::-webkit-scrollbar{width:4px;}
.panel-body::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}

/* ── AGENT FLOW (spans col 2, row 1) ── */
#panel-flow{grid-column:2;grid-row:1;}
.flow-row{
  display:flex;align-items:center;gap:8px;
  padding:.35rem 0;
  border-bottom:1px solid rgba(0,245,255,.05);
}
.flow-row:last-child{border-bottom:none;}
.agent-node{
  display:flex;align-items:center;gap:6px;
  padding:.25rem .6rem;border-radius:20px;
  border:1px solid var(--border);
  font-size:.7rem;letter-spacing:.1rem;
  transition:all .25s;white-space:nowrap;
}
.agent-node.running {border-color:var(--magenta);color:var(--magenta);box-shadow:0 0 8px rgba(255,0,255,.4);animation:pulse-mg .8s ease-in-out infinite;}
.agent-node.waiting {border-color:var(--yellow);color:var(--yellow);}
.agent-node.done    {border-color:var(--green);color:var(--green);}
.agent-node.failed  {border-color:var(--red);color:var(--red);}
.agent-node.idle    {border-color:var(--border);color:var(--dim);}
@keyframes pulse-mg{0%,100%{box-shadow:0 0 6px rgba(255,0,255,.3);}50%{box-shadow:0 0 16px rgba(255,0,255,.7);}}
.arrow{color:var(--dim);font-size:.8rem;flex-shrink:0;}
.task-label{flex:1;font-size:.7rem;color:rgba(0,245,255,.7);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.task-badge{
  font-size:.55rem;letter-spacing:.15rem;padding:.15rem .45rem;
  border-radius:.8rem;border:1px solid;flex-shrink:0;
}
.task-badge.running{border-color:var(--magenta);color:var(--magenta);}
.task-badge.waiting{border-color:var(--yellow);color:var(--yellow);}
.task-badge.done   {border-color:var(--green);color:var(--green);}
.task-badge.failed {border-color:var(--red);color:var(--red);}

/* ── LEFT COL ── */
#panel-goal{grid-column:1;grid-row:1;}
#panel-memory{grid-column:1;grid-row:2;}

/* ── CENTER BOTTOM ── */
#panel-conv{grid-column:2;grid-row:2;}
.msg{padding:.3rem 0;border-bottom:1px solid rgba(0,245,255,.05);line-height:1.5;}
.msg:last-child{border-bottom:none;}
.msg .who{font-size:.6rem;letter-spacing:.2rem;margin-bottom:.15rem;}
.msg .who.user{color:var(--cyan);}
.msg .who.jarvis{color:var(--green);}
.msg .who.error{color:var(--red);}
.msg .body{font-size:.8rem;color:rgba(255,255,255,.85);word-break:break-word;}

/* ── RIGHT COL ── */
#panel-tasks{grid-column:3;grid-row:1;}
#panel-approvals{grid-column:3;grid-row:2;}

.task-item{padding:.35rem 0;border-bottom:1px solid rgba(0,245,255,.05);}
.task-item:last-child{border-bottom:none;}
.task-item .t-title{font-size:.75rem;color:#fff;margin-bottom:.15rem;}
.task-item .t-meta{font-size:.6rem;color:var(--dim);}
.task-item.running .t-title{color:var(--magenta);}
.task-item.done .t-title{color:var(--green);}
.task-item.failed .t-title{color:var(--red);}

.approval-card{
  padding:.5rem;border-radius:6px;margin-bottom:.4rem;
  border:1px solid var(--orange);background:rgba(255,136,0,.05);
}
.approval-card .a-agent{font-size:.6rem;color:var(--orange);letter-spacing:.15rem;margin-bottom:.2rem;}
.approval-card .a-action{font-size:.75rem;color:#fff;margin-bottom:.3rem;}
.approval-card .a-btns{display:flex;gap:.4rem;}
.a-btn{
  font-size:.6rem;letter-spacing:.15rem;padding:.2rem .6rem;border-radius:3px;
  cursor:pointer;font-family:inherit;border:1px solid;background:transparent;
  transition:all .2s;
}
.a-btn.approve{border-color:var(--green);color:var(--green);}
.a-btn.approve:hover{background:rgba(0,255,136,.15);}
.a-btn.reject{border-color:var(--red);color:var(--red);}
.a-btn.reject:hover{background:rgba(255,51,51,.15);}

/* ── BOTTOM BAR ── */
#bottombar{
  display:flex;align-items:center;gap:.6rem;
  padding:0 1rem;
  border-top:1px solid var(--border);
  background:var(--bg2);
}
#text-input{
  flex:1;background:transparent;border:none;outline:none;
  color:var(--cyan);font-family:inherit;font-size:.85rem;
}
#text-input::placeholder{color:var(--dim);}
.bar-btn{
  background:transparent;border:1px solid var(--border);color:var(--cyan);
  padding:.3rem .9rem;border-radius:4px;cursor:pointer;
  font-family:inherit;font-size:.65rem;letter-spacing:.15rem;text-transform:uppercase;
  transition:all .2s;
}
.bar-btn:hover{border-color:var(--cyan);box-shadow:0 0 10px rgba(0,245,255,.2);}
.bar-btn.danger{border-color:var(--red);color:var(--red);}
.bar-btn.danger:hover{background:rgba(255,51,51,.1);}

/* ── MEMORY ITEMS ── */
.mem-item{padding:.25rem 0;border-bottom:1px solid rgba(0,245,255,.05);font-size:.72rem;color:rgba(255,255,255,.7);line-height:1.4;}
.mem-item:last-child{border-bottom:none;}
.mem-item .m-role{font-size:.55rem;color:var(--dim);letter-spacing:.15rem;}

/* ── REVIEW BADGE ── */
.review-bar{
  display:flex;align-items:center;gap:.5rem;padding:.4rem .8rem;
  border-top:1px solid var(--border);flex-shrink:0;font-size:.7rem;
}
.score-pill{
  padding:.15rem .5rem;border-radius:10px;font-size:.65rem;letter-spacing:.1rem;border:1px solid;
}
.score-pill.pass{border-color:var(--green);color:var(--green);}
.score-pill.warn{border-color:var(--yellow);color:var(--yellow);}
.score-pill.fail{border-color:var(--red);color:var(--red);}

/* ── RESEARCH PROGRESS ── */
.research-step{padding:.25rem .5rem;border-left:2px solid var(--border);margin:.2rem 0;font-size:.7rem;color:rgba(255,255,255,.7);}
.research-step.active{border-color:var(--magenta);color:#fff;}
.research-step.done{border-color:var(--green);color:var(--dim);}

/* scrollbar global */
*::-webkit-scrollbar{width:4px;}
*::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
</style>
</head>
<body>

<!-- TOP BAR -->
<div id="topbar">
  <div id="core-orb" onclick="triggerWake()" title="Click to wake Jarvis">⬡</div>
  <div>
    <h1>JARVIS</h1>
    <div class="sub">AUTONOMOUS AGENT OS · PHASE 3</div>
  </div>
  <div id="state-badge">INITIALISING</div>
  <div id="ws-pill" class="err">● CONNECTING</div>
</div>

<!-- MAIN GRID -->
<div id="main">

  <!-- LEFT: Goal + Memory -->
  <div class="panel" id="panel-goal">
    <div class="panel-hdr"><div class="dot"></div>CURRENT GOAL</div>
    <div class="panel-body" id="goal-body">
      <div style="color:var(--dim);font-size:.75rem;">Awaiting goal…</div>
    </div>
  </div>

  <!-- CENTER TOP: Agent Flow -->
  <div class="panel" id="panel-flow">
    <div class="panel-hdr"><div class="dot" style="background:var(--magenta)"></div>AGENT FLOW · REAL-TIME</div>
    <div class="panel-body" id="flow-body">
      <div class="flow-row" id="flow-ceo">
        <div class="agent-node idle" id="node-ceo">⊛ CEO</div>
        <div class="arrow">→</div>
        <div class="agent-node idle" id="node-research">⊕ RESEARCH</div>
        <div class="arrow">→</div>
        <div class="agent-node idle" id="node-browser">⊜ BROWSER</div>
        <div class="arrow">→</div>
        <div class="agent-node idle" id="node-reviewer">⊘ REVIEWER</div>
      </div>
      <div class="flow-row" id="flow-extra" style="flex-wrap:wrap;gap:6px;">
        <div class="agent-node idle" id="node-coding">✎ CODING</div>
        <div class="arrow">·</div>
        <div class="agent-node idle" id="node-computer">⌨ COMPUTER</div>
        <div class="arrow">·</div>
        <div class="agent-node idle" id="node-vision">◉ VISION</div>
        <div class="arrow">·</div>
        <div class="agent-node idle" id="node-data">⊞ DATA</div>
      </div>
      <div id="research-progress" style="margin-top:.5rem;display:none;">
        <div style="font-size:.6rem;letter-spacing:.2rem;color:var(--dim);margin-bottom:.3rem;">RESEARCH PROGRESS</div>
        <div class="research-step" id="rp-search">1. SEARCHING SOURCES</div>
        <div class="research-step" id="rp-fetch">2. FETCHING PAGES</div>
        <div class="research-step" id="rp-cross">3. CROSS-REFERENCING</div>
        <div class="research-step" id="rp-write">4. WRITING REPORT</div>
        <div class="research-step" id="rp-save">5. SAVING</div>
      </div>
    </div>
  </div>

  <!-- RIGHT TOP: Tasks -->
  <div class="panel" id="panel-tasks">
    <div class="panel-hdr"><div class="dot" style="background:var(--yellow)"></div>TASK QUEUE</div>
    <div class="panel-body" id="tasks-body">
      <div style="color:var(--dim);font-size:.72rem;">No active tasks</div>
    </div>
  </div>

  <!-- LEFT BOTTOM: Memory -->
  <div class="panel" id="panel-memory">
    <div class="panel-hdr"><div class="dot" style="background:var(--green)"></div>MEMORY</div>
    <div class="panel-body" id="memory-body">
      <div style="color:var(--dim);font-size:.72rem;">No memories yet</div>
    </div>
  </div>

  <!-- CENTER BOTTOM: Conversation -->
  <div class="panel" id="panel-conv">
    <div class="panel-hdr"><div class="dot"></div>CONVERSATION</div>
    <div class="panel-body" id="conv-body">
      <div class="msg"><div class="who jarvis">JARVIS</div><div class="body">Online. How can I help?</div></div>
    </div>
    <div id="review-bar" class="review-bar" style="display:none;">
      <span style="color:var(--dim);">REVIEW</span>
      <span id="review-score-pill" class="score-pill pass">—</span>
      <span id="review-verdict" style="flex:1;color:var(--dim);">—</span>
    </div>
  </div>

  <!-- RIGHT BOTTOM: Approvals -->
  <div class="panel" id="panel-approvals">
    <div class="panel-hdr"><div class="dot" style="background:var(--orange)"></div>APPROVALS</div>
    <div class="panel-body" id="approvals-body">
      <div style="color:var(--dim);font-size:.72rem;">No pending approvals</div>
    </div>
  </div>

</div>

<!-- BOTTOM BAR -->
<div id="bottombar">
  <span style="color:var(--dim);font-size:.75rem;">▶</span>
  <input id="text-input" type="text" placeholder="Type a goal or command and press Enter…"
         onkeydown="if(event.key==='Enter')sendText()">
  <button class="bar-btn" onclick="triggerWake()">⬡ WAKE</button>
  <button class="bar-btn" onclick="sendText()">SEND</button>
  <button class="bar-btn danger" onclick="interrupt()">✕ STOP</button>
</div>

<script>
// ── State ──
let ws, reconnectTimer;
const agentNodes = {};
const taskMap = {};
let approvalMap = {};

const STATE_COLORS = {
  idle:'#00f5ff', listening:'#00ff88', transcribing:'#ffff00',
  thinking:'#ff00ff', speaking:'#00f5ff', error:'#ff3333', stopped:'#666'
};

// ── WebSocket ──
function connect() {
  clearTimeout(reconnectTimer);
  const pill = document.getElementById('ws-pill');
  pill.className = 'err';
  pill.textContent = '● CONNECTING';
  ws = new WebSocket(`ws://${location.host}/api/voice/ws`);

  ws.onopen = () => {
    pill.className = 'ok';
    pill.textContent = '● LIVE';
    sysLog('Connected to Jarvis backend');
    fetchState();
    fetchApprovals();
  };
  ws.onclose = () => {
    pill.className = 'err';
    pill.textContent = '● OFFLINE';
    reconnectTimer = setTimeout(connect, 3000);
  };
  ws.onerror = () => sysLog('WebSocket error — retrying…');
  ws.onmessage = (e) => {
    try { handleEvent(JSON.parse(e.data)); } catch(_) {}
  };
}

// ── Event Router ──
function handleEvent(msg) {
  switch(msg.type) {
    case 'state_change':      onStateChange(msg);      break;
    case 'wake_detected':     sysLog('Wake word detected');  break;
    case 'transcript':        onTranscript(msg);       break;
    case 'agent_done':
    case 'response':          onResponse(msg);         break;
    case 'agent_error':       onAgentError(msg);       break;
    case 'system_status':     onSystemStatus(msg);     break;
    case 'agent_status':      onAgentStatus(msg);      break;
    case 'task_update':       onTaskUpdate(msg);       break;
    case 'approval_request':  onApprovalRequest(msg);  break;
    case 'approval_response': onApprovalResponse(msg); break;
    case 'research_progress': onResearchProgress(msg); break;
    case 'review_result':     onReviewResult(msg);     break;
  }
}

// ── State Change ──
function onStateChange(msg) {
  const s = msg.state || msg.data?.state || 'idle';
  const orb = document.getElementById('core-orb');
  const badge = document.getElementById('state-badge');
  orb.className = s;
  badge.textContent = s.toUpperCase();
  orb.style.borderColor = STATE_COLORS[s] || '#00f5ff';
}

// ── Transcript ──
function onTranscript(msg) {
  const d = msg.data || msg;
  if (!d.is_final) return;
  const text = d.text || '';
  addConvMsg('USER', 'user', text);
  updateGoal(text);
}

// ── Response ──
function onResponse(msg) {
  const d = msg.data || msg;
  const text = d.result || d.text || '';
  if (text) addConvMsg('JARVIS', 'jarvis', text);
}

// ── Agent Error ──
function onAgentError(msg) {
  const d = msg.data || msg;
  addConvMsg('ERROR', 'error', d.error || 'Unknown error');
}

// ── System Status ──
function onSystemStatus(msg) {
  const d = msg.data || msg;
  const s = d.state || 'ready';
  document.getElementById('state-badge').textContent = s.toUpperCase();
}

// ── Agent Status ──
function onAgentStatus(msg) {
  const d = msg.data || msg;
  const name = (d.agent || '').toLowerCase();
  const status = (d.status || 'idle').toLowerCase();
  const nodeId = 'node-' + name;
  const node = document.getElementById(nodeId);
  if (node) {
    node.className = 'agent-node ' + status;
  }
  // Update task queue if task_id given
  if (d.task_title) updateTaskItem(d.task_title, status, name);
}

// ── Task Update ──
function onTaskUpdate(msg) {
  const d = msg.data || msg;
  const title = d.title || d.task_title || '';
  const status = (d.status || 'running').toLowerCase();
  const agent = (d.agent || '').toLowerCase();
  if (!title) return;
  taskMap[title] = {title, status, agent, updated: Date.now()};
  renderTaskQueue();
  if (status === 'running') updateGoal(title);
}

// ── Approval Request ──
function onApprovalRequest(msg) {
  const d = msg.data || msg;
  approvalMap[d.id] = d;
  renderApprovals();
}

// ── Approval Response ──
function onApprovalResponse(msg) {
  const d = msg.data || msg;
  delete approvalMap[d.id];
  renderApprovals();
}

// ── Research Progress ──
function onResearchProgress(msg) {
  const d = msg.data || msg;
  const step = (d.step || '').toLowerCase();
  const box = document.getElementById('research-progress');
  box.style.display = 'block';
  const steps = ['search','fetch','cross','write','save'];
  steps.forEach((s, i) => {
    const el = document.getElementById('rp-' + s);
    if (!el) return;
    if (step === s) el.className = 'research-step active';
    else if (steps.indexOf(step) > i) el.className = 'research-step done';
    else el.className = 'research-step';
  });
  if (step === 'done' || step === 'save') {
    setTimeout(() => { box.style.display = 'none'; }, 4000);
  }
}

// ── Review Result ──
function onReviewResult(msg) {
  const d = msg.data || msg;
  const score = d.score || 0;
  const verdict = (d.verdict || '').replace(/_/g, ' ').toUpperCase();
  const bar = document.getElementById('review-bar');
  const pill = document.getElementById('review-score-pill');
  const vEl  = document.getElementById('review-verdict');
  bar.style.display = 'flex';
  pill.textContent = score + '/100';
  pill.className = 'score-pill ' + (score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail');
  vEl.textContent = verdict;
}

// ── Goal Panel ──
function updateGoal(text) {
  const el = document.getElementById('goal-body');
  el.innerHTML = `<div style="font-size:.8rem;color:#fff;line-height:1.6;">${esc(text)}</div>
    <div style="margin-top:.5rem;font-size:.6rem;color:var(--dim);">${new Date().toLocaleTimeString()}</div>`;
}

// ── Conversation Panel ──
function addConvMsg(who, cls, text) {
  const body = document.getElementById('conv-body');
  const div = document.createElement('div');
  div.className = 'msg';
  div.innerHTML = `<div class="who ${cls}">${esc(who)}</div><div class="body">${esc(text)}</div>`;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  if (body.children.length > 120) body.removeChild(body.firstChild);
}

function sysLog(text) {
  addConvMsg('SYSTEM', 'error', text);
}

// ── Task Queue ──
function renderTaskQueue() {
  const body = document.getElementById('tasks-body');
  const tasks = Object.values(taskMap).sort((a,b) => b.updated - a.updated);
  if (!tasks.length) {
    body.innerHTML = '<div style="color:var(--dim);font-size:.72rem;">No active tasks</div>';
    return;
  }
  body.innerHTML = tasks.slice(0,20).map(t => `
    <div class="task-item ${t.status}">
      <div class="t-title">${esc(t.title)}</div>
      <div class="t-meta">${esc(t.agent || '—')} · ${esc(t.status)}</div>
    </div>`).join('');
}

function updateTaskItem(title, status, agent) {
  taskMap[title] = {...(taskMap[title]||{}), title, status, agent, updated: Date.now()};
  renderTaskQueue();
}

// ── Approvals Panel ──
function renderApprovals() {
  const body = document.getElementById('approvals-body');
  const list = Object.values(approvalMap);
  if (!list.length) {
    body.innerHTML = '<div style="color:var(--dim);font-size:.72rem;">No pending approvals</div>';
    return;
  }
  body.innerHTML = list.map(a => `
    <div class="approval-card">
      <div class="a-agent">${esc(a.agent || '?')} · ${esc(a.action || '?')}</div>
      <div class="a-action">${esc(JSON.stringify(a.details || {})).substring(0,120)}</div>
      <div class="a-btns">
        <button class="a-btn approve" onclick="respond('${esc(a.id)}',true)">APPROVE</button>
        <button class="a-btn reject"  onclick="respond('${esc(a.id)}',false)">REJECT</button>
      </div>
    </div>`).join('');
}

async function respond(id, approved) {
  const url = `/api/approval/${id}/${approved ? 'approve' : 'reject'}`;
  try { await fetch(url, {method:'POST'}); } catch(_) {}
  delete approvalMap[id];
  renderApprovals();
}

// ── REST helpers ──
async function fetchState() {
  try {
    const r = await fetch('/api/dashboard/state');
    if (!r.ok) return;
    const d = await r.json();
    if (d.voice_state) onStateChange({state: d.voice_state});
    // Populate memory
    if (d.recent_messages?.length) renderMemory(d.recent_messages);
  } catch(_) {}
}

async function fetchApprovals() {
  try {
    const r = await fetch('/api/approval/pending');
    if (!r.ok) return;
    const list = await r.json();
    list.forEach(a => { approvalMap[a.id] = a; });
    renderApprovals();
  } catch(_) {}
}

// ── Memory Panel ──
function renderMemory(msgs) {
  const body = document.getElementById('memory-body');
  if (!msgs?.length) return;
  body.innerHTML = msgs.slice(-12).reverse().map(m => `
    <div class="mem-item">
      <div class="m-role">${esc(m.role || '?')}</div>
      ${esc((m.content||'').substring(0,100))}${(m.content||'').length>100?'…':''}
    </div>`).join('');
}

// ── Controls ──
function triggerWake() {
  if (ws?.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify({action:'trigger'}));
}

function interrupt() {
  if (ws?.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify({action:'interrupt'}));
  // reset agent nodes
  document.querySelectorAll('.agent-node').forEach(n => n.className = 'agent-node idle');
}

function sendText() {
  const input = document.getElementById('text-input');
  const text = input.value.trim();
  if (!text) return;
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({action:'text', text}));
    addConvMsg('YOU', 'user', text);
    input.value = '';
  }
}

// ── Util ──
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Boot
connect();
</script>
</body>
</html>"""


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=False, log_level="info")
