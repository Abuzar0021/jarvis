"""
Learning tools — store and retrieve learnings; read agent performance.

The Learning agent uses these to analyse successes/failures and record reusable
knowledge. It can record learnings and PROPOSE improvements, but it cannot modify
code or escalate permissions — those remain behind the approval system.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime

from tools import register
from core.logger import get_logger
from core.memory import get_memory

logger = get_logger("jarvis.learning_tools")


def _ensure_table(memory) -> None:
    memory._exec(
        """CREATE TABLE IF NOT EXISTS learnings (
            id         TEXT PRIMARY KEY,
            kind       TEXT NOT NULL,
            content    TEXT NOT NULL,
            context    TEXT,
            created_at TEXT NOT NULL
        )"""
    )


@register(schema={
    "type": "function",
    "function": {
        "name": "record_learning",
        "description": "Store a reusable learning (success pattern, failure cause, or "
                       "improvement idea). Does NOT change code or settings.",
        "parameters": {
            "type": "object",
            "properties": {
                "kind": {"type": "string",
                         "enum": ["success", "failure", "improvement", "insight"]},
                "content": {"type": "string"},
                "context": {"type": "string"},
            },
            "required": ["kind", "content"],
        },
    },
})
async def record_learning(kind: str, content: str, context: str = "") -> str:
    memory = get_memory()
    _ensure_table(memory)
    memory._exec(
        "INSERT INTO learnings (id, kind, content, context, created_at) VALUES (?,?,?,?,?)",
        (str(uuid.uuid4()), kind, content, context, datetime.utcnow().isoformat()),
    )
    return f"✓ Recorded {kind} learning"


@register(schema={
    "type": "function",
    "function": {
        "name": "get_learnings",
        "description": "Retrieve stored learnings, optionally filtered by kind.",
        "parameters": {
            "type": "object",
            "properties": {"kind": {"type": "string"}, "limit": {"type": "integer"}},
        },
    },
})
async def get_learnings(kind: str = "", limit: int = 20) -> str:
    memory = get_memory()
    _ensure_table(memory)
    if kind:
        rows = memory._exec(
            "SELECT * FROM learnings WHERE kind = ? ORDER BY created_at DESC LIMIT ?",
            (kind, limit),
        ).fetchall()
    else:
        rows = memory._exec(
            "SELECT * FROM learnings ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return json.dumps([{"kind": r["kind"], "content": r["content"],
                        "context": r["context"]} for r in rows])


@register(schema={
    "type": "function",
    "function": {
        "name": "get_performance",
        "description": "Read recorded agent performance metrics (durations, latencies, "
                       "success signals) to analyse what is working.",
        "parameters": {
            "type": "object",
            "properties": {"agent": {"type": "string"}, "limit": {"type": "integer"}},
        },
    },
})
async def get_performance(agent: str = "", limit: int = 50) -> str:
    memory = get_memory()
    try:
        if agent:
            rows = memory._exec(
                "SELECT agent_name, metric, AVG(value) AS avg_value, COUNT(*) AS n "
                "FROM performance WHERE agent_name = ? GROUP BY agent_name, metric LIMIT ?",
                (agent, limit),
            ).fetchall()
        else:
            rows = memory._exec(
                "SELECT agent_name, metric, AVG(value) AS avg_value, COUNT(*) AS n "
                "FROM performance GROUP BY agent_name, metric LIMIT ?",
                (limit,),
            ).fetchall()
        return json.dumps([dict(r) for r in rows])
    except Exception as exc:
        return f"ERROR reading performance: {exc}"
