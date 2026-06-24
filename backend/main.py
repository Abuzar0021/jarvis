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
from backend.api.memory_router import router as memory_router
from backend.api.leads_router import router as leads_router
from backend.api.workflows_router import router as workflows_router
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
            "[dim]Autonomous Agent OS — Dashboard 3.0[/dim]",
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
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_router)
app.include_router(agent_router)
app.include_router(system_router)
app.include_router(vision_router)
app.include_router(approval_router)
app.include_router(dashboard_router)
app.include_router(memory_router)
app.include_router(leads_router)
app.include_router(workflows_router)


# ── Dashboard 3.0 ─────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def status_page():
    return HTMLResponse(_DASHBOARD_HTML)


_DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>JARVIS · Command Center</title>
<style>
:root{
  --c:#00f5ff;--m:#ff00ff;--g:#00ff88;--y:#ffff00;--r:#ff3333;--o:#ff8800;
  --bg:#020810;--bg2:#04101e;--bg3:#061526;
  --card:rgba(0,245,255,0.035);--card2:rgba(0,245,255,0.07);
  --b:rgba(0,245,255,0.14);--b2:rgba(0,245,255,0.28);
  --dim:rgba(0,245,255,0.38);--text:rgba(255,255,255,0.85);
}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{height:100%;overflow:hidden;}
body{
  background:var(--bg);color:var(--c);
  font-family:'Courier New',monospace;font-size:12px;
  display:grid;grid-template-rows:50px auto 1fr 170px;height:100vh;
}

/* ── TOPBAR ── */
#topbar{
  display:flex;align-items:center;gap:1rem;padding:0 1.2rem;
  border-bottom:1px solid var(--b);background:var(--bg2);flex-shrink:0;
}
#topbar h1{font-size:1.15rem;letter-spacing:.55rem;text-shadow:0 0 18px var(--c);white-space:nowrap;}
.top-sub{font-size:.55rem;letter-spacing:.2rem;color:var(--dim);white-space:nowrap;}
#state-badge{
  font-size:.6rem;letter-spacing:.25rem;padding:.18rem .7rem;border-radius:10px;
  border:1px solid var(--b);transition:all .3s;white-space:nowrap;
}
#state-badge.idle      {border-color:var(--c);color:var(--c);}
#state-badge.listening {border-color:var(--g);color:var(--g);}
#state-badge.thinking  {border-color:var(--m);color:var(--m);}
#state-badge.speaking  {border-color:var(--c);color:var(--c);}
#state-badge.error     {border-color:var(--r);color:var(--r);}
#lang-badge{
  font-size:.6rem;letter-spacing:.2rem;padding:.18rem .7rem;
  border-radius:10px;border:1px solid var(--g);color:var(--g);white-space:nowrap;
}
#mode-pill{
  font-size:.6rem;letter-spacing:.15rem;padding:.18rem .7rem;border-radius:10px;
  border:1px solid var(--b);color:var(--dim);white-space:nowrap;
}
#mode-pill.voice{border-color:var(--g);color:var(--g);}
#mode-pill.text {border-color:var(--o);color:var(--o);}
#cap-banner{
  padding:.3rem 1.2rem;font-size:.62rem;letter-spacing:.08rem;
  background:rgba(255,136,0,.08);border-bottom:1px solid var(--o);color:var(--o);
}
body.speaking-overlay #core-btn{border-color:var(--c);box-shadow:0 0 22px var(--c);}
#timing-display{
  font-size:.6rem;color:var(--dim);letter-spacing:.1rem;white-space:nowrap;
  display:flex;gap:.5rem;align-items:center;
}
.timing-pill{
  padding:.12rem .45rem;border-radius:.5rem;border:1px solid var(--b);
  font-size:.55rem;
}
#ws-pill{
  font-size:.6rem;letter-spacing:.15rem;padding:.18rem .7rem;border-radius:10px;
  border:1px solid var(--b);transition:all .3s;white-space:nowrap;
}
#ws-pill.ok{border-color:var(--g);color:var(--g);}
#ws-pill.err{border-color:var(--r);color:var(--r);}
#clock{font-size:.65rem;color:var(--dim);letter-spacing:.1rem;margin-left:auto;white-space:nowrap;}
#core-btn{
  width:32px;height:32px;border-radius:50%;border:1.5px solid var(--c);
  display:flex;align-items:center;justify-content:center;font-size:.9rem;
  cursor:pointer;flex-shrink:0;animation:btn-pulse 3s ease-in-out infinite;
}
@keyframes btn-pulse{0%,100%{box-shadow:0 0 6px var(--c);}50%{box-shadow:0 0 18px var(--c);}}
#core-btn.listening{border-color:var(--g);animation:none;box-shadow:0 0 14px var(--g);}
#core-btn.thinking {border-color:var(--m);animation:spin .8s linear infinite;}
#core-btn.speaking {border-color:var(--c);animation:glow .4s ease-in-out infinite alternate;}
#core-btn.error    {border-color:var(--r);animation:none;box-shadow:0 0 10px var(--r);}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes glow{from{box-shadow:0 0 6px var(--c);}to{box-shadow:0 0 22px var(--c),0 0 40px rgba(0,245,255,.3);}}

/* ── MAIN GRID ── */
#main{
  display:grid;
  grid-template-columns:220px 1fr 280px;
  gap:5px;padding:5px;overflow:hidden;min-height:0;
}

/* ── PANELS ── */
.panel{
  background:var(--card);border:1px solid var(--b);border-radius:7px;
  display:flex;flex-direction:column;overflow:hidden;min-height:0;
}
.ph{
  padding:.35rem .75rem;font-size:.55rem;letter-spacing:.22rem;
  text-transform:uppercase;color:var(--dim);
  border-bottom:1px solid var(--b);flex-shrink:0;
  display:flex;align-items:center;gap:.4rem;
}
.ph .dot{width:5px;height:5px;border-radius:50%;background:var(--c);flex-shrink:0;animation:dot-blink 2s ease-in-out infinite;}
@keyframes dot-blink{0%,100%{opacity:.4;}50%{opacity:1;}}
.pb{flex:1;overflow-y:auto;padding:.5rem .75rem;min-height:0;}
.pb::-webkit-scrollbar{width:3px;}
.pb::-webkit-scrollbar-thumb{background:var(--b2);border-radius:2px;}

/* ── LEFT: AGENTS ── */
.agent-row{
  display:flex;align-items:center;gap:.5rem;padding:.28rem 0;
  border-bottom:1px solid rgba(0,245,255,.05);transition:all .2s;
}
.agent-row:last-child{border-bottom:none;}
.adot{
  width:7px;height:7px;border-radius:50%;flex-shrink:0;
  border:1px solid var(--dim);transition:all .25s;
}
.adot.running{background:var(--m);border-color:var(--m);box-shadow:0 0 6px var(--m);animation:dot-run .6s ease-in-out infinite;}
.adot.done   {background:var(--g);border-color:var(--g);}
.adot.failed {background:var(--r);border-color:var(--r);}
.adot.idle   {background:transparent;border-color:var(--dim);}
@keyframes dot-run{0%,100%{opacity:.6;}50%{opacity:1;box-shadow:0 0 10px var(--m);}}
.aname{font-size:.68rem;letter-spacing:.12rem;flex:1;text-transform:uppercase;}
.astat{font-size:.55rem;letter-spacing:.1rem;color:var(--dim);}
.atimer{font-size:.5rem;color:var(--o);letter-spacing:.05rem;min-width:2.5rem;text-align:right;}

.sys-row{display:flex;justify-content:space-between;padding:.25rem 0;font-size:.6rem;color:var(--dim);}
.sys-val{color:var(--c);}

/* ── CENTER: CORE ── */
#center-panel{display:flex;flex-direction:column;overflow:hidden;min-height:0;}

#core-display{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:.75rem;flex:0 0 auto;gap:.5rem;background:var(--bg2);
  border-bottom:1px solid var(--b);
}

/* SVG Core Orb */
#core-svg{width:160px;height:160px;overflow:visible;}
#ring1{
  transform-origin:100px 100px;
  animation:cw 10s linear infinite;
}
#ring2{
  transform-origin:100px 100px;
  animation:ccw 6s linear infinite;
}
#ring3{
  transform-origin:100px 100px;
  animation:cw 4s linear infinite;
}
#hex{transition:all .4s;}
#core-dot{animation:core-pulse 2s ease-in-out infinite;}
@keyframes cw{to{transform:rotate(360deg);}}
@keyframes ccw{to{transform:rotate(-360deg);}}
@keyframes core-pulse{0%,100%{r:7;opacity:.7;}50%{r:10;opacity:1;}}

/* State-dependent ring colors */
body.idle     #ring1{stroke:var(--c);}
body.idle     #ring2{stroke:var(--c);}
body.idle     #ring3{stroke:var(--c);}
body.listening #ring1,body.listening #ring2,body.listening #ring3{stroke:var(--g);}
body.thinking  #ring1,body.thinking  #ring2,body.thinking  #ring3{stroke:var(--m);}
body.speaking  #ring1,body.speaking  #ring2,body.speaking  #ring3{stroke:var(--c);}
body.thinking  #ring1{animation-duration:2s;}
body.thinking  #ring2{animation-duration:1.5s;}
body.thinking  #ring3{animation-duration:1s;}

/* Waveform canvas */
#waveform{
  width:320px;height:42px;display:block;
  border-radius:4px;border:1px solid var(--b);
  background:rgba(0,0,0,.3);
}

/* Execution info below core */
#exec-info{
  display:flex;flex-direction:column;gap:.3rem;
  padding:.5rem .75rem;flex-shrink:0;
  border-bottom:1px solid var(--b);
  background:rgba(0,0,0,.2);
}
#current-task{
  font-size:.8rem;color:#fff;font-weight:bold;line-height:1.4;
  max-height:2.4rem;overflow:hidden;text-overflow:ellipsis;
}
#exec-meta{display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;}
.exec-badge{
  font-size:.55rem;letter-spacing:.12rem;padding:.12rem .45rem;
  border-radius:.5rem;border:1px solid var(--b);color:var(--dim);
}
.exec-badge.running{border-color:var(--m);color:var(--m);}
.exec-badge.done   {border-color:var(--g);color:var(--g);}
.exec-badge.failed {border-color:var(--r);color:var(--r);}
#progress-bar-wrap{width:100%;height:3px;background:var(--b);border-radius:2px;display:none;}
#progress-bar{height:100%;background:var(--m);border-radius:2px;width:0%;transition:width .4s;}

/* Conversation log */
#conv-panel{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0;}
.msg{padding:.28rem 0;border-bottom:1px solid rgba(0,245,255,.04);line-height:1.45;}
.msg:last-child{border-bottom:none;}
.msg .who{font-size:.55rem;letter-spacing:.18rem;margin-bottom:.1rem;}
.who.user  {color:var(--c);}
.who.jarvis{color:var(--g);}
.who.exec  {color:var(--m);}
.who.tool  {color:var(--o);}
.who.error {color:var(--r);}
.who.sys   {color:var(--dim);}
.msg .body {font-size:.75rem;color:var(--text);word-break:break-word;}

/* ── RIGHT: TOOLS + APPROVALS ── */
.tool-entry{
  padding:.3rem 0;border-bottom:1px solid rgba(0,245,255,.05);
  display:flex;flex-direction:column;gap:.1rem;
}
.tool-entry:last-child{border-bottom:none;}
.tool-hdr{display:flex;align-items:center;gap:.4rem;}
.tool-name{font-size:.7rem;letter-spacing:.1rem;color:#fff;}
.tool-ok{font-size:.7rem;color:var(--g);}
.tool-err{font-size:.7rem;color:var(--r);}
.tool-ms{font-size:.55rem;color:var(--o);margin-left:auto;}
.tool-result{font-size:.65rem;color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.tool-agent-tag{font-size:.5rem;letter-spacing:.1rem;padding:.08rem .3rem;border-radius:.3rem;border:1px solid var(--b);color:var(--dim);}

.task-item{padding:.3rem 0;border-bottom:1px solid rgba(0,245,255,.04);}
.task-item:last-child{border-bottom:none;}
.t-title{font-size:.72rem;color:#fff;margin-bottom:.1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.t-meta{font-size:.56rem;color:var(--dim);}
.task-item.running .t-title{color:var(--m);}
.task-item.done    .t-title{color:var(--g);}
.task-item.failed  .t-title{color:var(--r);}

.apv-card{
  padding:.45rem;border-radius:5px;margin-bottom:.35rem;
  border:1px solid var(--o);background:rgba(255,136,0,.05);
}
.apv-agent{font-size:.55rem;color:var(--o);letter-spacing:.12rem;margin-bottom:.15rem;}
.apv-action{font-size:.72rem;color:#fff;margin-bottom:.25rem;word-break:break-word;}
.apv-btns{display:flex;gap:.35rem;}
.apv-btn{
  font-size:.55rem;letter-spacing:.12rem;padding:.18rem .55rem;border-radius:3px;
  cursor:pointer;font-family:inherit;border:1px solid;background:transparent;transition:all .2s;
}
.apv-btn.ok {border-color:var(--g);color:var(--g);}
.apv-btn.ok:hover{background:rgba(0,255,136,.12);}
.apv-btn.no {border-color:var(--r);color:var(--r);}
.apv-btn.no:hover{background:rgba(255,51,51,.1);}

/* ── BOTTOM ── */
#bottom{display:flex;flex-direction:column;border-top:1px solid var(--b);flex-shrink:0;}

/* Timeline */
#timeline{
  flex:1;display:flex;align-items:center;gap:0;
  overflow-x:auto;overflow-y:hidden;
  padding:.3rem .75rem;background:var(--bg2);
  border-bottom:1px solid var(--b);
  scrollbar-width:thin;scrollbar-color:var(--b) transparent;
}
#timeline::-webkit-scrollbar{height:3px;}
#timeline::-webkit-scrollbar-thumb{background:var(--b);border-radius:2px;}
#tl-track{display:flex;align-items:center;gap:0;flex-shrink:0;}
.tl-evt{
  display:flex;flex-direction:column;align-items:center;
  padding:0 .6rem;border-right:1px solid var(--b);flex-shrink:0;
  min-width:80px;cursor:default;
}
.tl-evt:last-child{border-right:none;}
.tl-time{font-size:.5rem;color:var(--dim);letter-spacing:.05rem;}
.tl-agent{font-size:.52rem;letter-spacing:.08rem;margin:.06rem 0;}
.tl-txt{font-size:.58rem;color:#fff;text-align:center;max-width:75px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.tl-evt.done   .tl-agent{color:var(--g);}
.tl-evt.failed .tl-agent{color:var(--r);}
.tl-evt.running .tl-agent{color:var(--m);}
.tl-dot{width:5px;height:5px;border-radius:50%;margin:.08rem auto;background:var(--dim);}
.tl-evt.done   .tl-dot{background:var(--g);}
.tl-evt.failed .tl-dot{background:var(--r);}
.tl-evt.running .tl-dot{background:var(--m);animation:dot-run .6s ease-in-out infinite;}

/* Input bar */
#inputbar{
  display:flex;align-items:center;gap:.5rem;padding:.35rem 1rem;height:40px;
}
#text-input{
  flex:1;background:transparent;border:none;outline:none;
  color:var(--c);font-family:inherit;font-size:.85rem;
}
#text-input::placeholder{color:var(--dim);}
.bar-btn{
  background:transparent;border:1px solid var(--b);color:var(--c);
  padding:.25rem .8rem;border-radius:4px;cursor:pointer;
  font-family:inherit;font-size:.6rem;letter-spacing:.12rem;
  text-transform:uppercase;transition:all .2s;white-space:nowrap;
}
.bar-btn:hover{border-color:var(--c);box-shadow:0 0 8px rgba(0,245,255,.2);}
.bar-btn.danger{border-color:var(--r);color:var(--r);}
.bar-btn.danger:hover{background:rgba(255,51,51,.08);}
</style>
</head>
<body class="idle">

<!-- ── TOPBAR ── -->
<div id="topbar">
  <div id="core-btn" onclick="triggerWake()" title="Click to wake Jarvis">⬡</div>
  <div>
    <h1>JARVIS</h1>
    <div class="top-sub">COMMAND CENTER · v3.0</div>
  </div>
  <div id="state-badge" class="idle">INITIALISING</div>
  <div id="lang-badge">🌐 EN</div>
  <div id="timing-display">
    <span class="timing-pill" id="t-intent">intent —</span>
    <span class="timing-pill" id="t-exec">exec —</span>
    <span class="timing-pill" id="t-total">total —</span>
  </div>
  <div id="mode-pill" title="Voice/text capability">…</div>
  <div id="ws-pill" class="err">● CONNECTING</div>
  <div id="clock">—</div>
</div>

<!-- Degraded-mode banner: shown only when a capability is missing -->
<div id="cap-banner" style="display:none;"></div>

<!-- ── MAIN GRID ── -->
<div id="main">

  <!-- LEFT: Agents + System -->
  <div style="display:flex;flex-direction:column;gap:5px;overflow:hidden;min-height:0;">

    <div class="panel" style="flex:1;min-height:0;">
      <div class="ph"><div class="dot"></div>AGENTS</div>
      <div class="pb" id="agents-list">
        <!-- populated by JS -->
      </div>
    </div>

    <div class="panel" style="flex:0 0 auto;">
      <div class="ph"><div class="dot" style="background:var(--g)"></div>SYSTEM</div>
      <div class="pb" style="padding:.35rem .75rem;">
        <div class="sys-row"><span>CPU</span><span class="sys-val" id="sys-cpu">—</span></div>
        <div class="sys-row"><span>Memory</span><span class="sys-val" id="sys-mem">—</span></div>
        <div class="sys-row"><span>Commands</span><span class="sys-val" id="sys-cmds">0</span></div>
        <div class="sys-row"><span>Errors</span><span class="sys-val" id="sys-errs">0</span></div>
        <div class="sys-row"><span>Uptime</span><span class="sys-val" id="sys-uptime">—</span></div>
        <div class="sys-row"><span>WS clients</span><span class="sys-val" id="sys-ws">1</span></div>
      </div>
    </div>

  </div>

  <!-- CENTER: Core + Conversation -->
  <div id="center-panel" class="panel">

    <!-- Core orb + waveform + exec info -->
    <div id="core-display">
      <svg id="core-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <!-- Outer ring -->
        <circle id="ring1" cx="100" cy="100" r="88" fill="none"
                stroke="#00f5ff" stroke-width="1" stroke-dasharray="18 9" opacity=".25"/>
        <!-- Middle ring -->
        <circle id="ring2" cx="100" cy="100" r="70" fill="none"
                stroke="#00f5ff" stroke-width="1" stroke-dasharray="6 14" opacity=".35"/>
        <!-- Inner ring -->
        <circle id="ring3" cx="100" cy="100" r="54" fill="none"
                stroke="#00f5ff" stroke-width="1.5" stroke-dasharray="3 5" opacity=".5"/>
        <!-- Hexagon -->
        <polygon id="hex"
                 points="100,64 131,82 131,118 100,136 69,118 69,82"
                 fill="rgba(0,245,255,0.05)" stroke="#00f5ff" stroke-width="1.5" opacity=".8"/>
        <!-- Center dot -->
        <circle id="core-dot" cx="100" cy="100" r="7" fill="#00f5ff" opacity=".85"/>
        <!-- State text -->
        <text id="core-text" x="100" y="158" text-anchor="middle"
              fill="rgba(0,245,255,0.5)" font-family="Courier New" font-size="7"
              letter-spacing="4">IDLE</text>
      </svg>
      <canvas id="waveform" width="320" height="42"></canvas>
    </div>

    <!-- Execution state info -->
    <div id="exec-info">
      <div id="current-task" style="color:var(--dim);font-size:.75rem;">Awaiting command…</div>
      <div id="exec-meta">
        <span class="exec-badge" id="exec-status">IDLE</span>
        <span class="exec-badge" id="exec-agent" style="display:none;"></span>
        <span class="exec-badge" id="exec-step"  style="display:none;"></span>
        <span class="exec-badge" id="exec-elapsed" style="display:none;"></span>
      </div>
      <div id="progress-bar-wrap"><div id="progress-bar"></div></div>
    </div>

    <!-- Conversation log -->
    <div id="conv-panel">
      <div class="ph"><div class="dot" style="background:var(--g)"></div>CONVERSATION</div>
      <div class="pb" id="conv-body">
        <div class="msg">
          <div class="who jarvis">JARVIS</div>
          <div class="body">Online. Dashboard 3.0 active. How can I help?</div>
        </div>
      </div>
    </div>

  </div>

  <!-- RIGHT: Tools + Tasks + Approvals -->
  <div style="display:flex;flex-direction:column;gap:5px;overflow:hidden;min-height:0;">

    <div class="panel" style="flex:1;min-height:0;">
      <div class="ph"><div class="dot" style="background:var(--o)"></div>TOOL ACTIVITY</div>
      <div class="pb" id="tool-log">
        <div style="color:var(--dim);font-size:.7rem;">No tool calls yet</div>
      </div>
    </div>

    <div class="panel" style="flex:0 0 110px;min-height:0;">
      <div class="ph"><div class="dot" style="background:var(--y)"></div>TASK QUEUE</div>
      <div class="pb" id="tasks-body">
        <div style="color:var(--dim);font-size:.7rem;">No active tasks</div>
      </div>
    </div>

    <div class="panel" style="flex:0 0 auto;">
      <div class="ph"><div class="dot" style="background:var(--r)"></div>APPROVALS</div>
      <div class="pb" id="approvals-body">
        <div style="color:var(--dim);font-size:.7rem;">No pending approvals</div>
      </div>
    </div>

  </div>

</div>

<!-- ── BOTTOM ── -->
<div id="bottom">
  <div id="timeline">
    <div id="tl-track"></div>
  </div>
  <div id="inputbar">
    <span style="color:var(--dim);font-size:.75rem;">▶</span>
    <input id="text-input" type="text"
           placeholder="Type a goal or command and press Enter…"
           onkeydown="if(event.key==='Enter')sendText()">
    <button class="bar-btn" onclick="triggerWake()">⬡ WAKE</button>
    <button class="bar-btn" onclick="sendText()">SEND</button>
    <button class="bar-btn danger" onclick="interrupt()">✕ STOP</button>
  </div>
</div>

<script>
// ══════════════════════════════════════════════════════
//  JARVIS DASHBOARD 3.0 — Client JS
// ══════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────
let ws, reconnTimer;
let currentState = 'idle';
let taskMap = {}, approvalMap = {}, toolLog = [];
let sysStats = {cmds:0, errs:0, start: Date.now()};
let wavePhase = 0, animFrame;

const AGENTS = [
  {id:'ceo',      icon:'⊛', name:'CEO'},
  {id:'computer', icon:'⌨', name:'COMPUTER'},
  {id:'browser',  icon:'⊜', name:'BROWSER'},
  {id:'research', icon:'⊕', name:'RESEARCH'},
  {id:'coding',   icon:'✎', name:'CODING'},
  {id:'qa',       icon:'⊙', name:'QA'},
  {id:'debug',    icon:'⊘', name:'DEBUG'},
  {id:'vision',   icon:'◉', name:'VISION'},
  {id:'data',     icon:'⊞', name:'DATA'},
  {id:'reviewer', icon:'⊗', name:'REVIEWER'},
];
let agentState = {}; // name → {status, timer, t0}
AGENTS.forEach(a => agentState[a.id] = {status:'idle', timer:null, t0:0});

// ── Boot ───────────────────────────────────────────────
buildAgentList();
startClock();
startWaveform();
connect();
refreshCapabilities();
startSysStats();

// ── WebSocket ──────────────────────────────────────────
function connect() {
  clearTimeout(reconnTimer);
  const pill = el('ws-pill');
  pill.className = 'err'; pill.textContent = '● CONNECTING';
  ws = new WebSocket(`ws://${location.host}/api/voice/ws`);
  ws.onopen = () => {
    pill.className = 'ok'; pill.textContent = '● LIVE';
    log('sys','SYSTEM','Connected to Jarvis');
    fetchDash();
    refreshCapabilities();
  };
  ws.onclose = () => {
    pill.className = 'err'; pill.textContent = '● OFFLINE';
    reconnTimer = setTimeout(connect, 3000);
  };
  ws.onerror = () => log('sys','SYSTEM','WebSocket error — retrying…');
  ws.onmessage = e => { try { dispatch(JSON.parse(e.data)); } catch(_){} };
}

// ── Event Dispatcher ───────────────────────────────────
function dispatch(msg) {
  switch(msg.type) {
    case 'state_change':      onState(msg);        break;
    case 'transcript':        onTranscript(msg);   break;
    case 'agent_done':
    case 'response':          onResponse(msg);     break;
    case 'agent_error':       onError(msg);        break;
    case 'agent_status':      onAgentStatus(msg);  break;
    case 'task_update':       onTaskUpdate(msg);   break;
    case 'tool_start':        onToolStart(msg);    break;
    case 'tool_complete':     onToolDone(msg);     break;
    case 'execution_state':   onExecState(msg);    break;
    case 'approval_request':  onApvRequest(msg);   break;
    case 'approval_response': onApvResponse(msg);  break;
    case 'research_progress': onResearch(msg);     break;
    case 'tts_start':         onTtsStart(msg);     break;
    case 'tts_end':           onTtsEnd(msg);       break;
  }
}

// ── TTS speaking overlay (non-blocking speech) ─────────
function onTtsStart(msg){
  document.body.classList.add('speaking-overlay');
  const t = (msg.text||'').trim();
  if (t) log('jarvis','SPEAKING', t);
}
function onTtsEnd(){ document.body.classList.remove('speaking-overlay'); }

// ── State Change ───────────────────────────────────────
function onState(msg) {
  const s = msg.state || msg.data?.state || 'idle';
  currentState = s;
  document.body.className = s;

  const badge = el('state-badge');
  badge.className = s;
  badge.textContent = s.toUpperCase();

  const btn = el('core-btn');
  btn.className = s;

  // Update SVG core text
  el('core-text').textContent = s.toUpperCase();

  // Waveform color
  const colors = {idle:'rgba(0,245,255,0.3)', listening:'#00ff88',
                  thinking:'#ff00ff', speaking:'#00f5ff', error:'#ff3333'};
  window._waveColor = colors[s] || 'rgba(0,245,255,0.3)';
}

// ── Transcript ─────────────────────────────────────────
function onTranscript(msg) {
  const d = msg.data || msg;
  if (!d.is_final) return;
  const text = d.text || '';
  log('user','YOU', text);
  setTask(text, 'running', '');
}

// ── Response ───────────────────────────────────────────
function onResponse(msg) {
  const d = msg.data || msg;
  const text = d.result || d.text || '';
  if (text) log('jarvis','JARVIS', text);
}

// ── Agent Error ────────────────────────────────────────
function onError(msg) {
  const d = msg.data || msg;
  log('error','ERROR', d.error || 'Unknown error');
  sysStats.errs++;
  el('sys-errs').textContent = sysStats.errs;
}

// ── Agent Status ───────────────────────────────────────
function onAgentStatus(msg) {
  const d = msg.data || msg;
  const name = (d.agent||'').toLowerCase();
  const status = (d.status||'idle').toLowerCase();
  if (!agentState[name]) agentState[name] = {};
  const prev = agentState[name];

  if (status === 'running' && prev.status !== 'running') {
    prev.t0 = Date.now();
    prev.timer = setInterval(() => updateAgentTimer(name), 100);
  } else if (status !== 'running') {
    clearInterval(prev.timer);
    prev.timer = null;
  }
  prev.status = status;
  renderAgent(name);

  if (d.task_title) updateTask(d.task_title, status, name);
}

function updateAgentTimer(name) {
  const row = el('arow-' + name);
  if (!row) return;
  const t = el('atimer-' + name);
  if (t && agentState[name].t0) {
    const ms = Date.now() - agentState[name].t0;
    t.textContent = ms < 1000 ? ms + 'ms' : (ms/1000).toFixed(1) + 's';
  }
}

// ── Task Update ────────────────────────────────────────
function onTaskUpdate(msg) {
  const d = msg.data || msg;
  const title = d.title || d.task_title || '';
  const status = (d.status||'').toLowerCase();
  const agent = (d.agent||'').toLowerCase();
  if (!title) return;

  updateTask(title, status, agent);

  // Update timing pills
  if (d.intent_ms !== undefined) el('t-intent').textContent = 'intent ' + d.intent_ms + 'ms';
  if (d.exec_ms !== undefined)   el('t-exec').textContent   = 'exec '   + d.exec_ms   + 'ms';
  if (d.total_ms !== undefined)  el('t-total').textContent  = 'total '  + d.total_ms  + 'ms';

  if (status === 'running') setTask(title, 'running', agent);
  else if (status === 'done') {
    sysStats.cmds++;
    el('sys-cmds').textContent = sysStats.cmds;
    setTask(title, 'done', agent);
    tlAdd(agent||'sys', title.substring(0,22), 'done');
  } else if (status === 'failed') {
    setTask(title, 'failed', agent);
    tlAdd(agent||'sys', title.substring(0,22), 'failed');
  }
}

// ── Tool Start ─────────────────────────────────────────
function onToolStart(msg) {
  const d = msg.data || msg;
  const tool  = d.tool  || '?';
  const agent = d.agent || '?';
  const args  = d.args  || {};
  toolLog.unshift({tool, agent, args, status:'running', t0: Date.now(), result:''});
  if (toolLog.length > 30) toolLog.pop();
  renderToolLog();
  log('tool','EXEC', `[${agent.toUpperCase()}] ${tool}(${fmtArgs(args)})`);
  setAgentStatus(agent, 'running');
}

// ── Tool Done ──────────────────────────────────────────
function onToolDone(msg) {
  const d = msg.data || msg;
  const tool   = d.tool   || '?';
  const agent  = d.agent  || '?';
  const result = d.result || '';
  const ok = !result.toLowerCase().startsWith('error');

  const entry = toolLog.find(t => t.tool === tool && t.agent === agent && t.status === 'running');
  if (entry) {
    entry.status = ok ? 'done' : 'failed';
    entry.result = result;
    entry.ms = Date.now() - entry.t0;
  }
  renderToolLog();
  log(ok ? 'jarvis' : 'error', ok ? 'DONE' : 'ERROR',
    `[${tool}] ${result.substring(0,120)}${result.length>120?'…':''}`);
  setAgentStatus(agent, ok ? 'done' : 'failed');
  tlAdd(agent, tool, ok ? 'done' : 'failed');
}

// ── Execution State ────────────────────────────────────
function onExecState(msg) {
  const d = msg.data || msg;
  const {task_id,goal,status,agent,step,tools_done,plan_size,result,error,elapsed_ms} = d;

  if (goal) setTask(goal.substring(0,60), status, agent);

  // Update exec-info bar
  const badge = el('exec-status');
  badge.textContent = status.toUpperCase();
  badge.className = 'exec-badge ' + (status==='running'?'running':status==='done'?'done':status==='failed'?'failed':'');

  if (agent) { el('exec-agent').textContent = agent.toUpperCase(); el('exec-agent').style.display=''; }
  if (step)  { el('exec-step').textContent  = step;                el('exec-step').style.display='';  }
  if (elapsed_ms) { el('exec-elapsed').textContent = elapsed_ms+'ms'; el('exec-elapsed').style.display=''; }

  // Progress bar
  if (plan_size > 0) {
    const pw = el('progress-bar-wrap');
    pw.style.display = 'block';
    el('progress-bar').style.width = Math.round((tools_done/plan_size)*100)+'%';
    el('progress-bar').style.background = status==='failed'?'var(--r)':'var(--m)';
  }

  if (status === 'done' && result) {
    el('progress-bar').style.background = 'var(--g)';
    el('progress-bar').style.width = '100%';
    log('jarvis','RESULT', `[${task_id}] ${result.substring(0,200)}`);
  } else if (status === 'failed') {
    const m = error || result || 'execution failed';
    log('error','FAILED', `[${task_id}] ${m.substring(0,200)}`);
  } else if (status === 'running' && step) {
    log('exec','EXEC', `[${agent||'?'}] ${step}${plan_size?' ('+tools_done+'/'+plan_size+')':''} +${elapsed_ms}ms`);
  }
}

// ── Approval ───────────────────────────────────────────
function onApvRequest(msg) {
  const d = msg.data||msg; approvalMap[d.id]=d; renderApprovals();
}
function onApvResponse(msg) {
  const d = msg.data||msg; delete approvalMap[d.id]; renderApprovals();
}

// ── Research ───────────────────────────────────────────
function onResearch(msg) {
  const d = msg.data||msg;
  log('exec','RESEARCH', d.step || JSON.stringify(d).substring(0,80));
}

// ── Agent List ─────────────────────────────────────────
function buildAgentList() {
  const list = el('agents-list');
  list.innerHTML = AGENTS.map(a => `
    <div class="agent-row" id="arow-${a.id}">
      <div class="adot idle" id="adot-${a.id}"></div>
      <span class="aname">${a.icon} ${a.name}</span>
      <span class="astat" id="astat-${a.id}">IDLE</span>
      <span class="atimer" id="atimer-${a.id}"></span>
    </div>`).join('');
}

function renderAgent(name) {
  const s = (agentState[name]||{}).status || 'idle';
  const dot  = el('adot-' + name);
  const stat = el('astat-' + name);
  if (dot)  dot.className  = 'adot ' + s;
  if (stat) stat.textContent = s.toUpperCase();
  if (s !== 'running') {
    const t = el('atimer-' + name);
    if (t) t.textContent = '';
  }
}

function setAgentStatus(name, status) {
  if (!agentState[name]) agentState[name] = {};
  agentState[name].status = status;
  if (status === 'running') agentState[name].t0 = Date.now();
  renderAgent(name);
}

// ── Tool Log ───────────────────────────────────────────
function renderToolLog() {
  const body = el('tool-log');
  if (!toolLog.length) {
    body.innerHTML = '<div style="color:var(--dim);font-size:.7rem;">No tool calls yet</div>';
    return;
  }
  body.innerHTML = toolLog.slice(0,15).map(t => {
    const ok = t.status === 'done';
    const fail = t.status === 'failed';
    const icon = ok ? '<span class="tool-ok">✓</span>' : fail ? '<span class="tool-err">✗</span>' : '<span style="color:var(--m)">…</span>';
    return `
    <div class="tool-entry">
      <div class="tool-hdr">
        <span class="tool-agent-tag">${esc(t.agent)}</span>
        <span class="tool-name">${esc(t.tool)}</span>
        ${icon}
        <span class="tool-ms">${t.ms ? t.ms+'ms' : ''}</span>
      </div>
      <div class="tool-result">${esc(t.result.substring(0,80))}</div>
    </div>`;
  }).join('');
}

// ── Task Queue ─────────────────────────────────────────
function updateTask(title, status, agent) {
  taskMap[title] = {...(taskMap[title]||{}), title, status, agent, ts: Date.now()};
  renderTasks();
}

function renderTasks() {
  const body = el('tasks-body');
  const tasks = Object.values(taskMap).sort((a,b)=>b.ts-a.ts);
  if (!tasks.length) { body.innerHTML='<div style="color:var(--dim);font-size:.7rem;">No active tasks</div>'; return; }
  body.innerHTML = tasks.slice(0,8).map(t=>`
    <div class="task-item ${t.status}">
      <div class="t-title">${esc(t.title)}</div>
      <div class="t-meta">${esc(t.agent||'—')} · ${esc(t.status)}</div>
    </div>`).join('');
}

// ── Approvals ──────────────────────────────────────────
function renderApprovals() {
  const body = el('approvals-body');
  const list = Object.values(approvalMap);
  if (!list.length) { body.innerHTML='<div style="color:var(--dim);font-size:.7rem;">No pending approvals</div>'; return; }
  body.innerHTML = list.map(a=>`
    <div class="apv-card">
      <div class="apv-agent">${esc(a.agent||'?')} · ${esc(a.action||'?')}</div>
      <div class="apv-action">${esc(JSON.stringify(a.details||{}).substring(0,100))}</div>
      <div class="apv-btns">
        <button class="apv-btn ok" onclick="apvRespond('${esc(a.id)}',true)">APPROVE</button>
        <button class="apv-btn no" onclick="apvRespond('${esc(a.id)}',false)">REJECT</button>
      </div>
    </div>`).join('');
}

async function apvRespond(id, ok) {
  try { await fetch(`/api/approval/${id}/${ok?'approve':'reject'}`, {method:'POST'}); } catch(_){}
  delete approvalMap[id]; renderApprovals();
}

// ── Current Task / Goal Display ────────────────────────
function setTask(title, status, agent) {
  const t = el('current-task');
  t.textContent = title;
  t.style.color = status==='running'?'#fff':status==='done'?'var(--g)':status==='failed'?'var(--r)':'var(--dim)';
}

// ── Timeline ───────────────────────────────────────────
function tlAdd(agent, text, status) {
  const track = el('tl-track');
  const now = new Date().toLocaleTimeString('en-GB',{hour12:false});
  const div = document.createElement('div');
  div.className = 'tl-evt ' + status;
  div.innerHTML = `
    <span class="tl-time">${now}</span>
    <div class="tl-dot"></div>
    <span class="tl-agent">${esc(agent.toUpperCase())}</span>
    <span class="tl-txt">${esc(text)}</span>`;
  track.appendChild(div);
  // Auto-scroll right
  const tl = el('timeline');
  tl.scrollLeft = tl.scrollWidth;
  // Trim
  while (track.children.length > 50) track.removeChild(track.firstChild);
}

// ── Conversation Log ───────────────────────────────────
function log(cls, who, text) {
  const body = el('conv-body');
  const div  = document.createElement('div');
  div.className = 'msg';
  const ts = new Date().toLocaleTimeString('en-GB',{hour12:false});
  div.innerHTML = `<div class="who ${cls}">${esc(who)} <span style="font-size:.45rem;color:var(--dim)">${ts}</span></div><div class="body">${esc(text)}</div>`;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  if (body.children.length > 150) body.removeChild(body.firstChild);
}

// ── Waveform Canvas ────────────────────────────────────
window._waveColor = 'rgba(0,245,255,0.3)';

function startWaveform() {
  const canvas = el('waveform');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function draw() {
    ctx.clearRect(0,0,W,H);
    const color = window._waveColor;
    const state = currentState;
    let amp = 2, freq = 0.08, speed = 0.04;
    if (state === 'listening')  { amp = 16; freq = 0.25; speed = 0.12; }
    else if (state === 'thinking') { amp = 8;  freq = 0.18; speed = 0.18; }
    else if (state === 'speaking') { amp = 10; freq = 0.20; speed = 0.10; }

    ctx.strokeStyle = color;
    ctx.lineWidth = state === 'idle' ? 1 : 1.5;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      const noise = state === 'listening' ? (Math.random()-0.5)*amp*0.4 : 0;
      const y = H/2 + Math.sin(x*freq + wavePhase)*amp + Math.sin(x*freq*2.1 + wavePhase*1.3)*(amp*0.4) + noise;
      x === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();
    wavePhase += speed;
    animFrame = requestAnimationFrame(draw);
  }
  draw();
}

// ── Clock ──────────────────────────────────────────────
function startClock() {
  function tick() {
    el('clock').textContent = new Date().toLocaleTimeString('en-GB',{hour12:false});
    el('sys-uptime').textContent = fmtUptime(Date.now() - sysStats.start);
  }
  tick();
  setInterval(tick, 1000);
}

function fmtUptime(ms) {
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
  return h ? h+'h '+String(m%60).padStart(2,'0')+'m' : m ? m+'m '+String(s%60).padStart(2,'0')+'s' : s+'s';
}

// ── Capabilities banner + voice mode ───────────────────
async function refreshCapabilities() {
  try {
    const r = await fetch('/api/voice/status');
    if (!r.ok) return;
    const s = await r.json();
    const pill = el('mode-pill');
    if (s.voice_input) { pill.className='voice'; pill.textContent='🎙 VOICE'; }
    else { pill.className='text'; pill.textContent='⌨ TEXT-ONLY'; }

    const caps = s.capabilities || {};
    const missing = [];
    if (!s.voice_input)  missing.push('microphone');
    if (!s.voice_output) missing.push('speaker');
    if (caps.has_api_key === false) missing.push('OPENROUTER_API_KEY (research/goals/chat)');
    if (caps.gui_control === false) missing.push('GUI control');
    const banner = el('cap-banner');
    if (missing.length) {
      banner.style.display = 'block';
      banner.textContent = '⚠ Running degraded — unavailable: ' + missing.join(' · ') +
        '   (run: python jarvis.py diagnose)';
    } else {
      banner.style.display = 'none';
    }
  } catch(_){}
}

// ── System stats (CPU / memory) ────────────────────────
function startSysStats() {
  async function poll() {
    try {
      const r = await fetch('/api/system/stats');
      if (r.ok) {
        const s = await r.json();
        el('sys-cpu').textContent = s.cpu_pct != null ? s.cpu_pct + '%' : 'n/a';
        el('sys-mem').textContent = s.mem_pct != null
          ? s.mem_pct + '% (' + s.mem_used_gb + '/' + s.mem_total_gb + 'G)'
          : (s.have_psutil ? '—' : 'n/a');
        if (s.ws_clients != null) el('sys-ws').textContent = s.ws_clients;
      }
    } catch(_){}
  }
  poll();
  setInterval(poll, 3000);
}

// ── REST helpers ───────────────────────────────────────
async function fetchDash() {
  try {
    const r = await fetch('/api/dashboard/state');
    if (!r.ok) return;
    const d = await r.json();
    if (d.pending_approvals?.length) d.pending_approvals.forEach(a => { approvalMap[a.id]=a; });
    renderApprovals();
  } catch(_){}
}

// ── Controls ───────────────────────────────────────────
function triggerWake() {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({action:'trigger'}));
}
function interrupt() {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({action:'interrupt'}));
  AGENTS.forEach(a => { agentState[a.id].status='idle'; renderAgent(a.id); });
  el('exec-status').textContent = 'STOPPED';
  el('exec-status').className = 'exec-badge';
}
function sendText() {
  const input = el('text-input');
  const text = input.value.trim();
  if (!text) return;
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({action:'text', text}));
    log('user','YOU', text);
    input.value = '';
  }
}

// ── Util ───────────────────────────────────────────────
const el = id => document.getElementById(id);
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtArgs(args) {
  const s = JSON.stringify(args);
  return s.length > 50 ? s.substring(0,48)+'…' : s;
}
</script>
</body>
</html>"""


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=False, log_level="info")
