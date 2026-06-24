"""
Workflow engine — persistence, checkpointing, resume, and failure recovery.

This is NOT a second execution engine. It is a thin durable layer around the
existing `orchestrator.run_plan` (the one engine), adding what run_plan alone
can't do: survive a restart and resume where it left off.

- Definitions + per-step state persist to the shared SQLite memory DB
  (no Redis, no Postgres — runs on a laptop).
- Each completed step is checkpointed via run_plan's on_step_complete hook.
- resume()/recover() re-enter run_plan with prior_results so finished steps are
  skipped and their outputs still flow to dependent steps.
- pause() cooperatively stops scheduling at the next step boundary.
"""

from __future__ import annotations

import json
import time
import uuid
from datetime import datetime
from typing import Optional

from core.logger import get_logger, log_action

logger = get_logger("jarvis.workflows")

ACTIVE_STATES = {"pending", "running", "paused"}


class WorkflowEngine:
    def __init__(self, memory=None, orchestrator=None) -> None:
        if memory is None:
            from core.memory import get_memory
            memory = get_memory()
        self.memory = memory
        self._orch = orchestrator  # lazy — real orchestrator pulled on demand
        self._paused: set[str] = set()
        self._init_tables()

    @property
    def orchestrator(self):
        if self._orch is None:
            from core.orchestrator import get_orchestrator
            self._orch = get_orchestrator()
        return self._orch

    def _init_tables(self) -> None:
        self.memory._exec(
            """CREATE TABLE IF NOT EXISTS workflows (
                id         TEXT PRIMARY KEY,
                goal       TEXT NOT NULL,
                status     TEXT NOT NULL DEFAULT 'pending',
                session_id TEXT,
                result     TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )"""
        )
        self.memory._exec(
            """CREATE TABLE IF NOT EXISTS workflow_steps (
                id          TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                idx         INTEGER NOT NULL,
                title       TEXT NOT NULL,
                agent       TEXT NOT NULL,
                description TEXT,
                deps        TEXT,
                status      TEXT NOT NULL DEFAULT 'pending',
                result      TEXT
            )"""
        )

    # ── Create ───────────────────────────────────────────────────────────────

    def create(self, goal: str, subtasks: list[dict], session_id: str = "") -> str:
        wf_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        self.memory._exec(
            "INSERT INTO workflows (id, goal, status, session_id, created_at, updated_at) "
            "VALUES (?,?,?,?,?,?)",
            (wf_id, goal, "pending", session_id, now, now),
        )
        for i, st in enumerate(subtasks):
            self.memory._exec(
                "INSERT INTO workflow_steps (id, workflow_id, idx, title, agent, "
                "description, deps, status, result) VALUES (?,?,?,?,?,?,?,?,?)",
                (
                    str(uuid.uuid4()), wf_id, i, st["title"], st.get("agent", "coding"),
                    st.get("description", ""), json.dumps(st.get("dependencies", [])),
                    "pending", None,
                ),
            )
        log_action("workflows", "CREATE", f"{goal[:50]} ({len(subtasks)} steps)")
        return wf_id

    async def run_goal(self, goal: str, subtasks: Optional[list[dict]] = None,
                       session_id: str = "") -> dict:
        """Plan (if needed), create, and execute a workflow for a goal."""
        if subtasks is None:
            from core.task_planner import TaskPlanner
            subtasks = await TaskPlanner().plan(goal)
        wf_id = self.create(goal, subtasks, session_id)
        return await self.execute(wf_id)

    # ── Execute / resume / recover ───────────────────────────────────────────

    async def execute(self, wf_id: str) -> dict:
        wf = self.get(wf_id)
        if not wf:
            return {"error": f"workflow {wf_id} not found"}

        self._paused.discard(wf_id)
        self._set_status(wf_id, "running")
        await self._emit(wf_id, "running")
        _t0 = time.monotonic()

        steps = wf["steps"]
        subtasks = [self._step_to_subtask(s) for s in steps]
        prior_results = {s["title"]: s["result"] for s in steps
                         if s["status"] == "completed" and s["result"] is not None}

        async def _on_complete(title: str, result: str) -> None:
            status = "failed" if self.orchestrator._is_error_result(result) else "completed"
            self._save_step(wf_id, title, status, result)
            await self._emit(wf_id, "running", step=title, step_status=status)

        results = await self.orchestrator.run_plan(
            subtasks,
            task_id=wf_id,
            show_progress=True,
            on_step_complete=_on_complete,
            prior_results=prior_results,
            should_continue=lambda: wf_id not in self._paused,
        )

        # Determine terminal state
        steps_now = self.get(wf_id)["steps"]
        any_failed = any(s["status"] == "failed" for s in steps_now)
        any_pending = any(s["status"] in ("pending", "running") for s in steps_now)

        if wf_id in self._paused:
            final = "paused"
        elif any_failed or any_pending:
            final = "failed"
        else:
            final = "completed"

        summary = self._summarise(wf["goal"], results)
        self._set_status(wf_id, final, result=summary)
        await self._emit(wf_id, final)
        self.memory.record_metric("workflows", "duration_s", time.monotonic() - _t0)
        log_action("workflows", final.upper(), f"{wf['goal'][:50]}")

        return {"workflow_id": wf_id, "status": final, "results": results, "summary": summary}

    async def resume(self, wf_id: str) -> dict:
        """Resume an interrupted/paused workflow — completed steps are skipped."""
        log_action("workflows", "RESUME", wf_id[:8])
        return await self.execute(wf_id)

    async def recover(self, wf_id: str) -> dict:
        """Recover a failed workflow — reset failed steps to pending and re-run."""
        wf = self.get(wf_id)
        if not wf:
            return {"error": f"workflow {wf_id} not found"}
        for s in wf["steps"]:
            if s["status"] == "failed":
                self._save_step(wf_id, s["title"], "pending", None)
        log_action("workflows", "RECOVER", wf_id[:8])
        return await self.execute(wf_id)

    def pause(self, wf_id: str) -> None:
        self._paused.add(wf_id)
        self._set_status(wf_id, "paused")
        log_action("workflows", "PAUSE", wf_id[:8])

    # ── Read ─────────────────────────────────────────────────────────────────

    def get(self, wf_id: str) -> Optional[dict]:
        row = self.memory._exec("SELECT * FROM workflows WHERE id = ?", (wf_id,)).fetchone()
        if not row:
            return None
        steps = self.memory._exec(
            "SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY idx", (wf_id,)
        ).fetchall()
        wf = dict(row)
        wf["steps"] = [dict(s) for s in steps]
        return wf

    def list_workflows(self, limit: int = 50) -> list[dict]:
        rows = self.memory._exec(
            "SELECT * FROM workflows ORDER BY updated_at DESC LIMIT ?", (limit,)
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            counts = self.memory._exec(
                "SELECT status, COUNT(*) AS n FROM workflow_steps WHERE workflow_id = ? GROUP BY status",
                (d["id"],),
            ).fetchall()
            d["step_counts"] = {c["status"]: c["n"] for c in counts}
            out.append(d)
        return out

    def summary(self) -> dict:
        rows = self.memory._exec(
            "SELECT status, COUNT(*) AS n FROM workflows GROUP BY status"
        ).fetchall()
        by_status = {r["status"]: r["n"] for r in rows}
        total = sum(by_status.values())
        return {
            "total": total,
            "by_status": by_status,
            "active": sum(by_status.get(s, 0) for s in ACTIVE_STATES),
        }

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _step_to_subtask(self, s: dict) -> dict:
        return {
            "title": s["title"],
            "description": s.get("description", ""),
            "agent": s["agent"],
            "dependencies": json.loads(s["deps"]) if s.get("deps") else [],
        }

    def _save_step(self, wf_id: str, title: str, status: str, result: Optional[str]) -> None:
        self.memory._exec(
            "UPDATE workflow_steps SET status = ?, result = ? WHERE workflow_id = ? AND title = ?",
            (status, result, wf_id, title),
        )

    def _set_status(self, wf_id: str, status: str, result: Optional[str] = None) -> None:
        if result is not None:
            self.memory._exec(
                "UPDATE workflows SET status = ?, result = ?, updated_at = ? WHERE id = ?",
                (status, result, datetime.utcnow().isoformat(), wf_id),
            )
        else:
            self.memory._exec(
                "UPDATE workflows SET status = ?, updated_at = ? WHERE id = ?",
                (status, datetime.utcnow().isoformat(), wf_id),
            )

    @staticmethod
    def _summarise(goal: str, results: dict[str, str]) -> str:
        done = len(results)
        ok = sum(1 for v in results.values() if not str(v).startswith("ERROR"))
        lines = [f"Goal: {goal}", f"Steps: {ok}/{done} succeeded", ""]
        for title, res in results.items():
            mark = "✗" if str(res).startswith("ERROR") else "✓"
            lines.append(f"{mark} {title}: {str(res)[:160]}")
        return "\n".join(lines)

    async def _emit(self, wf_id: str, status: str, step: str = "", step_status: str = "") -> None:
        try:
            from backend.websocket_manager import manager, EventType
            await manager.broadcast(EventType.WORKFLOW_UPDATE, {
                "workflow_id": wf_id, "status": status,
                "step": step, "step_status": step_status,
            })
        except Exception:
            pass  # dashboard not running — engine must not depend on it


_engine: Optional[WorkflowEngine] = None


def get_workflow_engine() -> WorkflowEngine:
    global _engine
    if _engine is None:
        _engine = WorkflowEngine()
    return _engine
