# Jarvis V2 — System Architecture

## Overview

Jarvis V2 is a cloud-native, multi-tenant AI operating system. Users submit goals in
natural language. The system decomposes them into plans, dispatches specialized agents,
executes tools (including a real browser), and streams every event to the dashboard
in real time. Results persist to PostgreSQL and feed a self-improving optimization loop.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USERS / CLIENTS                                    │
│                                                                              │
│   Browser Dashboard (Next.js)          API Clients (jv2_ API Keys)          │
│   ┌────────────────────────┐           ┌───────────────────────┐            │
│   │ WorkflowSubmit         │           │ POST /api/workflows   │            │
│   │ AgentGrid  EventFeed   │           │ GET  /api/workflows/  │            │
│   │ BrowserView WorkflowList│          │ WS   /api/ws/{tenant} │            │
│   └──────────┬─────────────┘           └──────────┬────────────┘            │
│              │ WebSocket                           │ REST                    │
└──────────────┼─────────────────────────────────────┼────────────────────────┘
               │                                     │
┌──────────────▼─────────────────────────────────────▼────────────────────────┐
│                         FASTAPI BACKEND (Python 3.12)                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ API Layer                                                            │    │
│  │  /api/auth          /api/workflows       /api/marketplace            │    │
│  │  /api/tools         /api/ws/{tenant_id}                              │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                  │                                           │
│  ┌───────────────────────────────▼──────────────────────────────────────┐   │
│  │ Core Layer                                                            │   │
│  │                                                                       │   │
│  │  WorkflowEngine ──────────────────────────────────────────────────┐  │   │
│  │    │                                                               │  │   │
│  │    │  submit(tenant, goal)                                         │  │   │
│  │    │    ├─ persist to DB (status=pending)                          │  │   │
│  │    │    └─ create_task(_execute)                                   │  │   │
│  │    │                                                               │  │   │
│  │    └─ _execute(workflow_id)                                        │  │   │
│  │         ├─ load memory from DB                                     │  │   │
│  │         ├─ inject memory + browser tools                           │  │   │
│  │         ├─ build AgentContext(bus, tools, memory)                  │  │   │
│  │         └─ CEO.execute(goal, ctx)                                  │  │   │
│  │                                                                    │  │   │
│  │  EventBus (Redis Pub/Sub)  ◄───────────────────────────────────────┘  │   │
│  │    publish(event) ──► Redis channel ──► WS pump ──► all clients       │   │
│  │                  └──► in-memory fan-out (no Redis = still works)       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │ Agent Layer                                                            │   │
│  │                                                                        │   │
│  │  CEOAgent  ──── plans with LLM, dispatches, retries, synthesises      │   │
│  │    │                                                                   │   │
│  │    ├─► ResearchAgent    (web_search, fetch_url, store_memory)          │   │
│  │    ├─► CodingAgent      (run_python, read_file, write_file)            │   │
│  │    ├─► BrowserAgent     (navigate, click, type, screenshot ──► WS)    │   │
│  │    ├─► QAAgent          (run_tests, check_url, run_python)             │   │
│  │    ├─► MemoryAgent      (memory_search, store_memory)                  │   │
│  │    └─► OptimizerAgent   (get_metrics, propose_tuning, generate_tool)   │   │
│  │                                                                        │   │
│  │  Each agent: LLM → tool_call* → LLM → ... → final text (ReAct loop)   │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │ Tool Layer                                                             │   │
│  │                                                                        │   │
│  │  ToolRegistry  ──── schema-validated, tenant-scoped                   │   │
│  │    Built-in:  web_search, fetch_url, run_python, install_package,     │   │
│  │               read_file, write_file, store_memory, memory_search,     │   │
│  │               browser_navigate, browser_click, browser_screenshot...  │   │
│  │    Generated: auto-codegen via LLM → AST validation → register        │   │
│  │               stored in DB + compiled into memory                      │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │ Browser Layer (Playwright)                                             │   │
│  │                                                                        │   │
│  │  BrowserPool ── per-tenant persistent sessions (cookies/login saved)   │   │
│  │    BrowserSession                                                      │   │
│  │      navigate() click() type() extract() wait_for()                   │   │
│  │      _emit_screenshot() ──► EventBus ──► WS ──► BrowserView component │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
               │                          │
┌──────────────▼──────────────┐  ┌────────▼───────────────────┐
│  PostgreSQL 16               │  │  Redis 7                    │
│                              │  │                             │
│  tenants     users           │  │  Pub/Sub channels           │
│  api_keys    workflows       │  │  jarvis:{tenant}:{event}    │
│  workflow_steps              │  │                             │
│  workflow_events             │  │  Rate limiting              │
│  agent_configs               │  │  Session cache              │
│  agent_reviews               │  │                             │
│  generated_tools             │  └─────────────────────────────┘
│  performance_metrics         │
│  prompt_tunings              │
│  memories                    │
└──────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  BACKGROUND WORKERS                                                           │
│                                                                              │
│  OptimizerWorker (hourly)                                                    │
│    ├─ load failure metrics from DB                                           │
│    ├─ run OptimizerAgent                                                     │
│    └─ store prompt_tunings → activate best-performing variant                │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
v2/
├── backend/
│   ├── main.py                     # FastAPI app + lifespan
│   ├── __init__.py
│   ├── core/
│   │   ├── config.py               # Pydantic Settings from env
│   │   ├── events.py               # Redis Pub/Sub EventBus
│   │   └── workflow_engine.py      # Orchestrates workflow lifecycle
│   ├── agents/
│   │   ├── base.py                 # BaseAgent (LLM, tools, events, retry)
│   │   ├── registry.py             # agent_type → instance map
│   │   ├── ceo.py                  # Planner + dispatcher + synthesiser
│   │   ├── research.py             # Web search + summarisation
│   │   ├── coding.py               # Python codegen + execution
│   │   ├── browser.py              # Playwright automation
│   │   ├── qa.py                   # Output verification
│   │   ├── memory_agent.py         # Knowledge management
│   │   └── optimizer.py            # Self-improvement loop
│   ├── api/
│   │   ├── auth_router.py          # Register, login, API keys
│   │   ├── workflows.py            # Submit + poll workflows
│   │   ├── websocket.py            # WS stream + command intake
│   │   ├── marketplace.py          # Agent browse/publish/rate
│   │   └── tools_router.py         # List + generate tools
│   ├── tools/
│   │   ├── registry.py             # Schema-validated tool store
│   │   ├── generator.py            # LLM → Python → AST validate → register
│   │   └── builtin/
│   │       ├── web.py              # web_search, fetch_url
│   │       ├── code.py             # run_python, install_package, file ops
│   │       └── memory_tools.py     # store_memory, memory_search stubs
│   ├── browser/
│   │   └── automation.py           # BrowserPool + BrowserSession
│   ├── auth/
│   │   └── middleware.py           # JWT + API key auth
│   ├── db/
│   │   ├── models.py               # SQLAlchemy 2.x models
│   │   ├── session.py              # Async engine + get_db
│   │   └── repositories/
│   │       ├── workflow_repo.py
│   │       └── memory_repo.py
│   └── workers/
│       └── optimizer.py            # Hourly self-improvement worker
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Redirect to /dashboard
│   │   ├── globals.css
│   │   └── dashboard/
│   │       └── page.tsx            # Main dashboard
│   ├── components/
│   │   ├── WorkflowSubmit.tsx      # Goal input + submit
│   │   ├── AgentGrid.tsx           # Live agent status grid
│   │   ├── EventFeed.tsx           # Real-time event log
│   │   ├── BrowserView.tsx         # Streamed browser screenshots
│   │   └── WorkflowList.tsx        # Workflow history + steps
│   ├── lib/
│   │   ├── store.ts                # Zustand global state
│   │   └── ws.ts                   # WS client + auto-reconnect + event router
│   ├── package.json
│   ├── next.config.ts
│   └── tailwind.config.ts
│
├── deploy/
│   ├── docker-compose.yml          # Full stack: postgres + redis + backend + frontend
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── k8s/
│       ├── namespace.yaml
│       ├── backend.yaml            # Deployment + Service + HPA
│       ├── ingress.yaml            # NGINX ingress + WS upgrade headers
│       └── secrets.yaml            # Template (never commit real values)
│
├── requirements.txt
└── ARCHITECTURE.md                 # This file
```

---

## Key Design Decisions

### 1. Event-first, not polling
Every state change — agent start, tool call, screenshot, step completion — is an
`Event` published to Redis Pub/Sub. The WS endpoint subscribes per tenant and fans
events out to all dashboard clients. No polling anywhere.

### 2. Tenant isolation at every layer
- DB: all tables have `tenant_id` FK with cascade delete
- Tools: memory tools are injected with tenant-scoped DB closures, not globals
- Browser: `BrowserPool` keeps one `BrowserSession` per `tenant_id` with its own cookies
- Events: channels are namespaced `jarvis:{tenant_id}:{event_type}`

### 3. Genuine failure reporting
- CEOAgent's `_execute` loop: auto-repair on first failure (one LLM-guided retry)
- `BaseAgent._agentic_loop`: LLM iterations capped at `max_iterations`; returns
  `ERROR: max iterations reached` rather than silently returning empty
- Tools: every tool returns `"ERROR: ..."` strings, never raises (agents see errors as context)
- WorkflowEngine: status field is `failed` with `error` text stored in DB

### 4. Self-improving without breaking things
- `OptimizerAgent` proposes `PromptTuning` records but sets `is_active=False`
- A separate activation step (human review or A/B test threshold) enables them
- Generated tools are sandboxed (subprocess + timeout) before being registered

### 5. Browser automation is visible
- Every `browser_screenshot` call emits a `BROWSER_SCREENSHOT` event with base64 PNG
- The WS pump delivers it to the dashboard's `BrowserView` in <100ms
- `BrowserSession.start_streaming()` also emits screenshots on a 2s interval

---

## Example Workflow Trace

**Goal:** "Find the top 3 Python async libraries in 2025 and write a comparison blog post"

```
T+0ms    POST /api/workflows {"goal": "..."}
         → Workflow created (id: wf-abc123, status: pending)
         → WorkflowEngine.submit() called
         → asyncio.create_task(_execute(...))

T+1ms    EVENT: workflow.started {goal: "..."}
         → WS delivers to dashboard
         → WorkflowList shows "running" indicator

T+50ms   CEOAgent._plan() called
         → LLM produces:
           {"steps": [
             {"index": 0, "agent_type": "research", "description": "Find top async Python libraries 2025 with usage stats"},
             {"index": 1, "agent_type": "research", "description": "Find developer community sentiment for each library"},
             {"index": 2, "agent_type": "coding",   "description": "Structure comparison data as JSON", "depends_on": [0,1]},
             {"index": 3, "agent_type": "coding",   "description": "Write a Markdown blog post from structured data", "depends_on": [2]},
             {"index": 4, "agent_type": "qa",       "description": "Verify the blog post is accurate and well-structured", "depends_on": [3]}
           ]}

T+70ms   EVENT: workflow.step.started {step: 0, agent_type: "research"}
         EVENT: agent.started {agent_type: "research"}
         → AgentGrid: research dot turns blue + pulse

T+200ms  EVENT: tool.called {tool: "web_search", arguments: {query: "top Python async libraries 2025"}}
         EVENT: tool.completed {tool: "web_search", duration_ms: 1240, result_snippet: "asyncio, httpx, trio..."}

T+1.5s   EVENT: tool.called {tool: "web_search", arguments: {query: "httpx vs aiohttp vs trio 2025 benchmarks"}}
         EVENT: tool.completed {tool: "web_search", duration_ms: 890}

T+3.2s   EVENT: agent.completed {agent_type: "research", duration_ms: 3150, tool_calls: 4}
         EVENT: workflow.step.completed {step: 0, result_snippet: "asyncio: built-in..."}
         → AgentGrid: research dot turns green

T+3.3s   EVENT: workflow.step.started {step: 1, agent_type: "research"}
         → Research agent starts step 1 in parallel (CEOAgent dispatches concurrently for independent deps)

T+6.8s   Both research steps complete.

T+6.9ms  EVENT: workflow.step.started {step: 2, agent_type: "coding"}
         EVENT: agent.started {agent_type: "coding"}

T+8s     EVENT: tool.called {tool: "run_python", arguments: {code: "..."}}
         EVENT: tool.completed {duration_ms: 340, result_snippet: "[{'name':'httpx',...}]"}
         EVENT: agent.completed {agent_type: "coding", duration_ms: 1100}

T+9.1s   EVENT: workflow.step.started {step: 3, agent_type: "coding"}
         [Blog post written by LLM, structured Markdown returned]
         EVENT: agent.completed {duration_ms: 4200}

T+13.5s  EVENT: workflow.step.started {step: 4, agent_type: "qa"}
         EVENT: tool.called {tool: "run_python", arguments: {code: "assert 'httpx' in blog..."}}
         EVENT: tool.completed {result_snippet: "Tests passed: 3/3"}
         EVENT: agent.completed {duration_ms: 800}

T+14.5s  CEOAgent._synthesise() → single-step result returned directly (no extra LLM call)
         EVENT: workflow.completed {result: "# Top 3 Python Async Libraries in 2025...", duration_ms: 14500}
         → Workflow status → completed
         → WorkflowList shows green checkmark
         → Result stored in memories table
```

**Result:** 14.5 seconds end-to-end. 5 agent executions, 12 tool calls, 0 silent failures.

---

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env: set OPENROUTER_API_KEY, SECRET_KEY, etc.

# 2. Start the full stack
cd deploy
docker-compose up -d

# 3. Open the dashboard
open http://localhost:3000

# 4. Register your first tenant
curl -X POST http://localhost:8000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"secure","tenant_name":"My Company","tenant_slug":"my-company"}'

# 5. Submit a workflow
curl -X POST http://localhost:8000/api/workflows \
  -H "Authorization: Bearer <token_from_step_4>" \
  -H "Content-Type: application/json" \
  -d '{"goal": "Research the latest AI news and summarize in 5 bullet points"}'
```

---

## API Summary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create tenant + owner user |
| POST | `/api/auth/login` | Get JWT |
| POST | `/api/auth/api-keys` | Create API key (jv2_ prefix) |
| POST | `/api/workflows` | Submit a goal |
| GET | `/api/workflows` | List workflows |
| GET | `/api/workflows/{id}` | Workflow detail + steps |
| WS | `/api/ws/{tenant_id}` | Real-time event stream |
| GET | `/api/marketplace` | Browse public agents |
| POST | `/api/marketplace` | Publish an agent |
| POST | `/api/marketplace/{id}/rate` | Rate an agent |
| GET | `/api/tools` | List registered tools |
| POST | `/api/tools/generate` | Auto-generate a tool |
| GET | `/health` | Health check |

---

## Scaling Notes

- **Horizontal**: backend pods are stateless (session state in Redis, data in PG).
  HPA scales 2→10 pods on CPU>70%.
- **Browser isolation**: each tenant gets its own Playwright context. At scale,
  move browser sessions to a dedicated `browser-worker` pool behind an internal queue.
- **LLM concurrency**: each agent makes its own httpx calls. Rate limiting is per
  OpenRouter key — consider per-tenant key pooling at high scale.
- **Event ordering**: Redis Pub/Sub does not guarantee ordering across channels.
  The workflow step `index` field is the source of truth for ordering; events are
  informational only.
