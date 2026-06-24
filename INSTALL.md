# Jarvis Local AI OS — Installation Guide (Windows)

Jarvis runs entirely on a normal Windows laptop. No Docker, Kubernetes, Redis,
Postgres, or cloud account is required. The only persistent store is a local
SQLite file (`data/memory.db`).

## 1. Prerequisites

- **Windows 10/11**
- **Python 3.10+** — https://www.python.org/downloads/ (check "Add python.exe to PATH")
- **Git** (optional, to clone)
- An **OpenRouter API key** (only needed for LLM-driven agents; OS/lead/workflow
  *mechanics* run without one) — https://openrouter.ai

## 2. Get the code

```powershell
git clone <your-repo-url> jarvis
cd jarvis
```

## 3. Create a virtual environment + install

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Optional extras (voice / browser automation), if you want them:

```powershell
pip install -r requirements-phase1.txt   # voice/vision deps
python -m playwright install chromium     # browser agent
```

## 4. Configure

```powershell
copy .env.example .env
notepad .env
```

Set at least:

```
OPENROUTER_API_KEY=sk-or-v1-...
```

Everything else has sensible defaults. Model overrides (optional) are documented
in `config.py` (e.g. `WORKFLOW_MODEL`, `LEADGEN_MODEL`, `DEFAULT_MODEL`).

## 5. Verify the install (no API key required)

```powershell
python jarvis.py diagnose          # environment self-check
python -m pytest -q                # should report: 71 passed
python jarvis.py models --task code # model routing table + cost report
python jarvis.py leads "Joe's Diner" --url joesdiner.com --industry restaurant
python jarvis.py workflow list      # workflow store
```

The lead pipeline, model router, CRM, workflow engine, and semantic memory all
work offline (deterministic). LLM-driven agents activate once the key is set.

## 6. Run the dashboard

```powershell
python jarvis.py serve              # or: uvicorn backend.main:app --port 8000
```

Open http://localhost:8000 — agents, workflows, leads, memory, model usage, and
the approval queue are served from the one backend (47 endpoints).

## 7. First autonomous run (needs API key)

```powershell
python jarvis.py run "Find me clients for website design and draft proposals"
```

The CEO will plan, delegate to the lead/research/workflow agents, persist
everything to CRM + memory, and present a final report. Dangerous actions
(sending email, terminal, file delete) pause for your approval.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `OPENROUTER_API_KEY not set` warning | expected without a key; OS/lead/workflow mechanics still run |
| Voice input disabled | normal on a machine without a mic; text/CLI works |
| `playwright` errors | run `python -m playwright install chromium`, or skip browser agent |
| Port 8000 in use | `uvicorn backend.main:app --port 8080` |
| Tests fail on first run | ensure `.venv` is active and `pip install -r requirements.txt` completed |

Data lives in `data/` (gitignored). Delete `data/memory.db` to reset all memory,
CRM, workflows, and learnings.
