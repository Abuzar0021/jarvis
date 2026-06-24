# Jarvis Local AI OS — Build & Audit Report

This report is written in the **Technical Auditor** voice the directive asked for.
It is honest about what is implemented, integrated, and *verified here* versus what
is blocked by environment (no API key / headless hardware) or out of scope for this
increment. No fake metrics, no fake completeness.

**Environment of record:** headless Linux container, **no `OPENROUTER_API_KEY`**,
no audio/display. Anything LLM-dependent therefore cannot be exercised live here and
is marked accordingly.

---

## 0. What this increment delivered

The directive's repository-first rule was followed literally: the existing **local**
Python codebase (root) was scanned first and treated as the foundation. It already
provides the directive's mandatory shared systems and 14 agents, so this was an
**integration + gap-fill** job, not a rebuild.

The single largest concrete gap — a **closed-loop Lead Generation system** — was built
and wired into the existing shared infrastructure, plus two cross-cutting capabilities
(**intelligent model routing + cost tracking**, **CRM/lead persistence**). The
deterministic parts run and are tested **without an API key**; the LLM parts degrade
gracefully to deterministic output rather than failing or faking.

New, integrated, tested:
- `core/model_router.py` — cost-tiered routing (free → DeepSeek → Kimi → Claude → GPT)
- `core/crm.py` — lead CRM + pipeline state machine over the shared SQLite DB
- `core/lead_pipeline.py` — the end-to-end pipeline spine
- `tools/lead_tools.py` — 6 tools (audit/contacts/scoring/CRM) in the shared registry
- 6 agents (lead_generation, contact_discovery, website_audit, lead_scoring, proposal, crm)
- `backend/api/leads_router.py` — 5 real dashboard endpoints
- `jarvis leads` + `jarvis models` CLI commands
- `tests/test_model_router.py`, `tests/test_lead_pipeline.py` — 23 tests

---

## 1. Architecture Report

The system is one local ecosystem on shared infrastructure. The lead-gen subsystem
plugs into every shared system rather than standing alone:

```
                         ┌──────────────────────────────┐
  CLI  ──── jarvis ──────►        Orchestrator           │
  Dashboard ── FastAPI ──►  (agent registry + routing)   │
                         └──────────────┬───────────────┘
                                        │ delegates
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                ▼               ▼                ▼               ▼
   Research/Coding   Lead-gen agents  CRM agent      QA/Reviewer     Vision/Computer
   /Browser/...      (6 new)          │              (existing)      (existing)
        │                │            │
        └────────┬───────┴─────┬──────┘
                 ▼             ▼
           Tool Registry   LeadPipeline ──► CRM (LeadStore) ─┐
           (37 tools)       (spine)                          │
                 │             │                             ▼
                 ▼             ▼                      SQLite memory.db
            Model Router   WebSocket Event Bus  ◄──── (one DB: memory,
            (+cost track)  (LEAD_UPDATE events)        tasks, leads, usage)
```

Shared-system integration (directive's mandatory list):

| Shared system   | Provided by (existing)              | Lead-gen integration |
|-----------------|-------------------------------------|----------------------|
| Event Bus       | `backend/websocket_manager.py`      | new `LEAD_UPDATE` event per stage |
| Workflow Engine | `core/orchestrator.py`, `task_planner` | 6 agents registered in `_BUILTIN_AGENTS` |
| Memory          | `core/memory.py` (SQLite)           | CRM + usage tables in the same DB |
| Tool Registry   | `tools/__init__.py`                 | 6 tools via `@register` |
| Dashboard       | `backend/main.py` + routers         | `/api/leads/*` (5 routes) |
| Agent Registry  | `orchestrator` + `agent_factory`    | new agents resolvable by name |
| Auth/Approval   | `core/approval.py`, `core/safety.py`| reused (no new dangerous tools added) |
| Logging         | `core/logger.py`                    | `log_action` on every pipeline run |
| Metrics         | `core/memory.record_metric`, `diagnostics` | `model_usage` cost table |

---

## 2. Security Report

Implemented / reused (verified):
- **Read-only by default:** the 6 new lead tools are non-destructive (audit, scrape
  public contact info, local DB writes). None were added to `DANGEROUS_ACTIONS`.
- **Approval gating preserved:** outbound email (`send_email`) and form submission
  remain in `DANGEROUS_ACTIONS` → human approval required before any outreach is sent.
  The autonomous pipeline deliberately **stops at `proposal_ready`** and does not send.
- **No secrets in code/repo:** keys come from `.env` (gitignored); `data/memory.db`
  is gitignored so scraped data is never committed.
- **Network fetch is hardened:** `lead_tools._fetch` is stdlib-only, time-bounded,
  size-capped (200 KB), and never raises (offline/DNS/TLS/4xx all degrade to "no site").
- **Input-bounded scoring/audit:** pure functions, no `eval`, no shell, regex-bounded.

Honest gaps (not done this increment):
- No formal SAST run (bandit/semgrep) on the new modules yet.
- No rate-limiting on the new `/api/leads/run` endpoint (it can launch network fetches).
- Email-validation on scraped addresses is regex-level, not MX-verified.

Recommended next: add bandit to CI, rate-limit `/api/leads/run`, and require approval
config before enabling any automated outreach send.

---

## 3. Test Report

```
python -m pytest -q   →   61 passed, 1 warning   (was 38 before this increment)
```

- **+23 new tests**, all passing **without an API key or network**:
  - `test_model_router.py` (9): cheapest-capable-first, escalation order, tool
    filtering, cost math, usage persistence/summary, never-empty routing.
  - `test_lead_pipeline.py` (14): audit (good/weak/offline), contact extraction,
    transparent scoring, CRM state machine (forward-only + terminal), dedupe,
    pipeline funnel, **full end-to-end pipeline**, and **graceful no-key degradation**.
- **0 regressions** in the pre-existing 38 tests.
- The 1 warning is pre-existing (`app_launcher.py` docstring escape), unrelated.

Runtime verification (beyond unit tests):
- All 6 lead agents instantiate via the real orchestrator registry; every tool they
  declare exists in `TOOL_REGISTRY`.
- `jarvis leads "Mario's Pizzeria" …` ran the full pipeline offline and produced a
  real audit, score-with-reasons, and proposal; `jarvis leads` read the persisted
  lead back from the funnel.
- `jarvis models --task code` selected the free capable model.

---

## 4. Integration Report

A discovered lead flows automatically through the entire pipeline and is persisted at
each step (verified end-to-end, offline):

```
discovered → contact_found → audited → scored → proposal_ready
   CRM         find_contacts   audit_site  score_lead_value   proposal (LLM|template)
   row         (mailto/email)  (https/seo/ (transparent       persisted + stage set
   created                     mobile/spd) weighted 0-100)
```

Each transition: persists to CRM, appends an activity row, and broadcasts a
`LEAD_UPDATE` event to the dashboard. The proposal stage calls the `ProposalAgent`
(LLM) when a key is present and falls back to an audit-driven template otherwise —
**the same trace shape either way**, so nothing downstream sees a "fake completed".

No duplicate infrastructure was introduced: one DB, one tool registry, one event bus,
one orchestrator.

---

## 5. Performance Report

Measured here (deterministic path, no network):
- Full pipeline run for one lead (offline fetch): **~1 s** wall, dominated by the
  bounded network attempt; pure audit/score/contact logic is sub-millisecond.
- Router selection: O(n) over a 10-model catalogue — microseconds.

Not measurable here (no API key): live LLM proposal latency. By design the LLM is on
the **last** stage only; the qualifying stages (audit/contact/score) never wait on it,
so a no-key or rate-limited environment still produces a fully scored pipeline.

---

## 6. Cost Report

Cost tracking is real and persisted, not estimated theatre:
- `ModelRouter.estimate_cost(model, in, out)` uses a per-model USD/1K table.
- `record_usage(...)` writes a row to `model_usage` (shared DB).
- `usage_summary()` aggregates total cost, calls, and per-model breakdown; surfaced at
  `GET /api/leads/system/cost` and in `jarvis models`.

Routing minimises spend by construction — **free OpenRouter models are tried first**,
escalating only when capability/tools require it:

```
task=code → deepseek-chat-v3:free → deepseek-chat → deepseek-r1 → kimi-k2 → claude-3.5 → gpt-4o
```

Cost to date in this environment: **$0.0000 over 0 calls** (no key, so no live calls —
an honest zero, not a fabricated number).

---

## 7. Capability Report (what works now)

| Capability | Status | Verified how |
|------------|--------|--------------|
| Lead discovery → CRM | ✅ integrated | agent + `crm_add`; funnel shows real rows |
| Contact discovery | ✅ deterministic | `extract_contacts` unit + e2e tests |
| Website audit (SEO/mobile/speed/HTTPS) | ✅ deterministic | unit tests good/weak/offline |
| Lead scoring (transparent 0-100) | ✅ deterministic | unit tests + reasons shown |
| Proposal generation | ✅ (LLM or template) | e2e test asserts non-empty, specific |
| CRM pipeline state machine | ✅ | forward-only + terminal transitions tested |
| Model routing + cost tracking | ✅ | 9 router tests + CLI |
| Dashboard lead endpoints | ✅ wired | router exposes 5 routes; imports clean |
| Existing OS (voice/agents/tools/dashboard) | ✅ unchanged | 38 prior tests still green |

## 8. Missing-Capability Report (honest)

Built this increment = the lead-gen vertical + routing + CRM. The following directive
items are **not** done here and are explicitly *not* claimed as complete:

| Capability | Status | Blocker / reason |
|------------|--------|------------------|
| Live multi-agent LLM execution (research/coding/proposal *live*) | ⛔ unverifiable here | no `OPENROUTER_API_KEY` in this env |
| Website **builder** agent (generate + preview a site) | ❌ not built | scope; large sub-project |
| Visual **workflow automation** (n8n-style canvas) | ❌ not built | scope; UI sub-project |
| **App builder** (full app from prompt) | ❌ not built | scope |
| **Vector / semantic search + knowledge graph** | ❌ not built | memory is keyword/SQL today; needs embeddings store |
| Auto **tool generation** wired into this local OS | ⚠️ exists in `v2/`, not yet ported to root | duplication to consolidate |
| Self-improvement optimizer **acting** on metrics | ⚠️ metrics persisted; optimizer loop not wired | needs a worker + approval gate |
| Outreach **send** + reply tracking | ⚠️ gated off | requires email creds + approval policy |
| Security scans (bandit/semgrep), rate limiting | ❌ not run | follow-up |
| Browser/integration/e2e UI test suites | ⚠️ partial | unit + runtime checks only |

### Note on `v2/`
The `v2/` directory (committed earlier) is a **cloud multi-tenant SaaS** design
(Postgres/Redis/K8s). It conflicts with this directive's *local Windows, no cloud*
requirement and now duplicates agents/tools/memory. Recommendation: keep `v2/` as a
reference design, and continue building the local OS on the **root** codebase (done
here). Consolidating the two should be a deliberate, separate decision — not a silent
overwrite.

---

## How to use what shipped

```bash
# Routing + live cost report
python jarvis.py models --task code

# Run the full lead pipeline on a business (works offline; proposal degrades w/o key)
python jarvis.py leads "Joe's Diner" --url joesdiner.com --industry restaurant --location Austin

# See the pipeline funnel + top leads (real CRM data)
python jarvis.py leads

# Dashboard endpoints (when backend is running)
GET /api/leads/pipeline     # funnel
GET /api/leads              # leads, highest score first
POST /api/leads/run         # run pipeline for one business
GET /api/leads/system/cost  # model cost report
```

With `OPENROUTER_API_KEY` set, the proposal stage and all other agents use the routed
LLM automatically — no code change required.
