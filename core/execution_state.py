"""
ExecutionState — single source of truth for a task's runtime state.

One state is created per user command/goal. Agents and tools update it;
the dashboard reads it via WS snapshots and the REST /execution endpoint.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Optional


def _is_error(result: str) -> bool:
    """Detect error results more broadly than a simple uppercase prefix check."""
    low = result.lower().strip()
    return (
        low.startswith("error")          # ERROR:, error:, Error:
        or low.startswith("agent '")     # "Agent 'X' error: ..." from orchestrator
        or low.startswith("exception")   # raw exception strings
        or (not low and result == "")    # empty result = silent failure
    )


@dataclass
class ToolRecord:
    agent:  str
    tool:   str
    args:   dict
    result: str
    ok:     bool
    ms:     int


@dataclass
class ExecutionState:
    task_id: str
    goal:    str
    status:  str = "pending"   # pending | planning | running | done | failed
    agent:   str = ""
    step:    str = ""
    tools:   list = field(default_factory=list)   # list[ToolRecord]
    plan:    list = field(default_factory=list)    # raw subtask dicts
    result:  str  = ""
    error:   str  = ""
    _t0:     float = field(default_factory=time.monotonic, repr=False)

    # ── Mutation helpers ────────────────────────────────────────────────────────

    def start(self, agent: str, step: str = "") -> None:
        self.status = "running"
        self.agent  = agent
        self.step   = step

    def record_tool(self, agent: str, tool: str, args: dict, result: str) -> None:
        ok = not _is_error(result)
        ms = int((time.monotonic() - self._t0) * 1000)
        self.tools.append(ToolRecord(agent=agent, tool=tool, args=args,
                                     result=result, ok=ok, ms=ms))

    def finish(self, result: str) -> None:
        self.result = result
        self.status = "failed" if _is_error(result) else "done"

    def fail(self, error: str) -> None:
        self.error  = error
        self.status = "failed"

    # ── Serialisation ───────────────────────────────────────────────────────────

    def to_ws(self) -> dict:
        return {
            "task_id":    self.task_id,
            "goal":       self.goal[:100],
            "status":     self.status,
            "agent":      self.agent,
            "step":       self.step,
            "tools_done": len(self.tools),
            "plan_size":  len(self.plan),
            "result":     self.result[:200],
            "error":      (self.error or "")[:200],
            "elapsed_ms": int((time.monotonic() - self._t0) * 1000),
            "tools": [
                {"tool": t.tool, "agent": t.agent,
                 "ok": t.ok, "ms": t.ms,
                 "result": t.result[:120]}
                for t in self.tools
            ],
        }


# ── Global registry ─────────────────────────────────────────────────────────────

_registry: dict[str, ExecutionState] = {}


def new_execution(goal: str) -> ExecutionState:
    """Create and register a new ExecutionState for a goal/command."""
    state = ExecutionState(task_id=str(uuid.uuid4())[:8], goal=goal)
    _registry[state.task_id] = state
    return state


def get_execution(task_id: str) -> Optional[ExecutionState]:
    return _registry.get(task_id)


def active_executions() -> list[ExecutionState]:
    return [s for s in _registry.values() if s.status not in ("done", "failed")]


def all_executions(limit: int = 30) -> list[dict]:
    recents = sorted(_registry.values(), key=lambda s: s._t0, reverse=True)
    return [s.to_ws() for s in recents[:limit]]
