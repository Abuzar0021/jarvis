# Jarvis Local AI OS — Upgrade & Migration Guide

Jarvis upgrades in place. State lives in one SQLite file (`data/memory.db`) and
all schema changes are **additive and self-applying** — new tables are created on
first use (`CREATE TABLE IF NOT EXISTS`), so pulling new code does not break an
existing database.

## Standard upgrade

```powershell
cd jarvis
git pull
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt      # pick up any new deps
python -m pytest -q                  # confirm 71 passed
python jarvis.py diagnose            # confirm environment health
```

Your `data/memory.db` (memory, CRM, workflows, learnings, usage) is preserved.

## What changed in the unified increment

- **`v2/` removed.** The parallel cloud SaaS stack (Postgres/Redis/K8s/Next.js) was
  deleted — it duplicated the local systems and was never wired into the running
  app. If you had local edits under `v2/`, recover them from git history
  (`git log -- v2/`) before pulling; nothing in the live system imported it.
- **New tables** (auto-created, no migration step):
  `workflows`, `workflow_steps`, `learnings`, plus the prior `leads`,
  `lead_activities`, `model_usage`.
- **`orchestrator.run_plan` gained optional params** (`prior_results`,
  `on_step_complete`, `should_continue`). Existing callers are unaffected —
  all three default to `None`.
- **New agents** auto-register via `orchestrator._BUILTIN_AGENTS`:
  `workflow`, `automation`, `sales`, `learning` (and the prior lead-gen six).
- **New endpoints:** `/api/workflows/*`, `/api/memory/semantic`, `/api/leads/*`.
- **New CLI:** `jarvis workflow`, `jarvis leads`, `jarvis models`.

## Verifying an upgrade

```powershell
python -c "import tools; print(len(tools.TOOL_REGISTRY), 'tools')"     # expect 45
python -c "from core.orchestrator import _BUILTIN_AGENTS; print(len(_BUILTIN_AGENTS), 'agents')"  # expect 24
python jarvis.py workflow list
```

## Rolling back

State is forward-compatible, so a rollback only needs the code:

```powershell
git checkout <previous-tag-or-commit>
pip install -r requirements.txt
```

The extra tables from a newer version are simply ignored by older code — they are
never dropped, so no data is lost on rollback.

## Backups

Back up the single file before a major upgrade:

```powershell
copy data\memory.db data\memory.backup.db
```

To reset completely, delete `data/memory.db`; it is recreated empty on next run.
