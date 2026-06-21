"""SQLite-backed persistent memory shared across all agents."""

import json
import sqlite3
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from config import MEMORY_DB_PATH, MAX_CONVERSATION_HISTORY


class Memory:
    """Thread-safe SQLite memory store."""

    def __init__(self, db_path: Path = MEMORY_DB_PATH):
        self.db_path = db_path
        self._local = threading.local()
        self._init_db()

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            self._local.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def _exec(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        conn = self._conn()
        cur = conn.execute(sql, params)
        conn.commit()
        return cur

    def _init_db(self) -> None:
        stmts = [
            """CREATE TABLE IF NOT EXISTS conversations (
                id          TEXT PRIMARY KEY,
                session_id  TEXT NOT NULL,
                agent_name  TEXT,
                role        TEXT NOT NULL,
                content     TEXT NOT NULL,
                created_at  TEXT NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS tasks (
                id          TEXT PRIMARY KEY,
                goal        TEXT NOT NULL,
                plan        TEXT,
                status      TEXT NOT NULL DEFAULT 'pending',
                assigned_to TEXT,
                result      TEXT,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS subtasks (
                id          TEXT PRIMARY KEY,
                task_id     TEXT NOT NULL,
                title       TEXT NOT NULL,
                description TEXT NOT NULL,
                agent       TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'pending',
                result      TEXT,
                priority    INTEGER DEFAULT 3,
                depends_on  TEXT DEFAULT '[]',
                created_at  TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(id)
            )""",
            """CREATE TABLE IF NOT EXISTS agent_knowledge (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_name  TEXT NOT NULL,
                key         TEXT NOT NULL,
                value       TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                UNIQUE(agent_name, key)
            )""",
            """CREATE TABLE IF NOT EXISTS action_logs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_name  TEXT NOT NULL,
                action      TEXT NOT NULL,
                details     TEXT,
                result      TEXT,
                approved    INTEGER DEFAULT 1,
                created_at  TEXT NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS performance (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_name  TEXT NOT NULL,
                task_id     TEXT,
                metric      TEXT NOT NULL,
                value       REAL NOT NULL,
                recorded_at TEXT NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS dynamic_agents (
                name        TEXT PRIMARY KEY,
                role        TEXT NOT NULL,
                system_prompt TEXT NOT NULL,
                tools       TEXT NOT NULL DEFAULT '[]',
                model       TEXT,
                created_at  TEXT NOT NULL
            )""",
        ]
        conn = self._conn()
        for s in stmts:
            conn.execute(s)
        conn.commit()

    # ── Conversations ─────────────────────────────────────────────────────────

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        agent_name: Optional[str] = None,
    ) -> str:
        mid = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        self._exec(
            "INSERT INTO conversations VALUES (?,?,?,?,?,?)",
            (mid, session_id, agent_name, role, content, now),
        )
        return mid

    def get_messages(
        self, session_id: str, limit: int = MAX_CONVERSATION_HISTORY
    ) -> list[dict]:
        rows = self._exec(
            "SELECT role, content FROM conversations WHERE session_id=? ORDER BY created_at DESC LIMIT ?",
            (session_id, limit),
        ).fetchall()
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

    # ── Tasks ─────────────────────────────────────────────────────────────────

    def create_task(self, goal: str, plan: Optional[dict] = None) -> str:
        tid = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        self._exec(
            "INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?)",
            (tid, goal, json.dumps(plan) if plan else None, "pending", None, None, now, now),
        )
        return tid

    def update_task(
        self,
        task_id: str,
        status: str,
        result: Optional[str] = None,
        assigned_to: Optional[str] = None,
    ) -> None:
        now = datetime.utcnow().isoformat()
        self._exec(
            "UPDATE tasks SET status=?, result=?, assigned_to=COALESCE(?,assigned_to), updated_at=? WHERE id=?",
            (status, result, assigned_to, now, task_id),
        )

    def get_task(self, task_id: str) -> Optional[dict]:
        row = self._exec("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        return dict(row) if row else None

    def list_tasks(self, status: Optional[str] = None) -> list[dict]:
        if status:
            rows = self._exec("SELECT * FROM tasks WHERE status=? ORDER BY created_at DESC", (status,)).fetchall()
        else:
            rows = self._exec("SELECT * FROM tasks ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]

    # ── Subtasks ──────────────────────────────────────────────────────────────

    def add_subtask(self, task_id: str, subtask: dict) -> str:
        sid = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        self._exec(
            "INSERT INTO subtasks VALUES (?,?,?,?,?,?,?,?,?,?)",
            (
                sid,
                task_id,
                subtask["title"],
                subtask["description"],
                subtask["agent"],
                "pending",
                None,
                subtask.get("priority", 3),
                json.dumps(subtask.get("dependencies", [])),
                now,
            ),
        )
        return sid

    def update_subtask(self, subtask_id: str, status: str, result: Optional[str] = None) -> None:
        self._exec(
            "UPDATE subtasks SET status=?, result=? WHERE id=?",
            (status, result, subtask_id),
        )

    def get_subtasks(self, task_id: str) -> list[dict]:
        rows = self._exec(
            "SELECT * FROM subtasks WHERE task_id=? ORDER BY priority DESC, created_at",
            (task_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    # ── Agent knowledge ───────────────────────────────────────────────────────

    def set_knowledge(self, agent_name: str, key: str, value: Any) -> None:
        now = datetime.utcnow().isoformat()
        self._exec(
            """INSERT INTO agent_knowledge(agent_name,key,value,updated_at) VALUES(?,?,?,?)
               ON CONFLICT(agent_name,key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at""",
            (agent_name, key, json.dumps(value), now),
        )

    def get_knowledge(self, agent_name: str, key: Optional[str] = None) -> Any:
        if key:
            row = self._exec(
                "SELECT value FROM agent_knowledge WHERE agent_name=? AND key=?",
                (agent_name, key),
            ).fetchone()
            return json.loads(row["value"]) if row else None
        rows = self._exec(
            "SELECT key, value FROM agent_knowledge WHERE agent_name=?", (agent_name,)
        ).fetchall()
        return {r["key"]: json.loads(r["value"]) for r in rows}

    # ── Action logs ───────────────────────────────────────────────────────────

    def log_action(
        self,
        agent_name: str,
        action: str,
        details: Optional[Any] = None,
        result: Optional[str] = None,
        approved: bool = True,
    ) -> None:
        now = datetime.utcnow().isoformat()
        self._exec(
            "INSERT INTO action_logs(agent_name,action,details,result,approved,created_at) VALUES(?,?,?,?,?,?)",
            (
                agent_name,
                action,
                json.dumps(details) if details else None,
                result,
                1 if approved else 0,
                now,
            ),
        )

    def get_recent_logs(self, limit: int = 50, agent: Optional[str] = None) -> list[dict]:
        if agent:
            rows = self._exec(
                "SELECT * FROM action_logs WHERE agent_name=? ORDER BY created_at DESC LIMIT ?",
                (agent, limit),
            ).fetchall()
        else:
            rows = self._exec(
                "SELECT * FROM action_logs ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [dict(r) for r in rows]

    # ── Performance ───────────────────────────────────────────────────────────

    def record_metric(self, agent_name: str, metric: str, value: float, task_id: Optional[str] = None) -> None:
        now = datetime.utcnow().isoformat()
        self._exec(
            "INSERT INTO performance(agent_name,task_id,metric,value,recorded_at) VALUES(?,?,?,?,?)",
            (agent_name, task_id, metric, value, now),
        )

    # ── Dynamic agents ────────────────────────────────────────────────────────

    def register_agent(self, name: str, role: str, system_prompt: str, tools: list, model: Optional[str] = None) -> None:
        now = datetime.utcnow().isoformat()
        self._exec(
            """INSERT INTO dynamic_agents VALUES(?,?,?,?,?,?)
               ON CONFLICT(name) DO UPDATE SET role=excluded.role, system_prompt=excluded.system_prompt,
               tools=excluded.tools, model=excluded.model""",
            (name, role, system_prompt, json.dumps(tools), model, now),
        )

    def get_dynamic_agent(self, name: str) -> Optional[dict]:
        row = self._exec("SELECT * FROM dynamic_agents WHERE name=?", (name,)).fetchone()
        if not row:
            return None
        d = dict(row)
        d["tools"] = json.loads(d["tools"])
        return d

    def list_dynamic_agents(self) -> list[dict]:
        rows = self._exec("SELECT * FROM dynamic_agents ORDER BY created_at").fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["tools"] = json.loads(d["tools"])
            result.append(d)
        return result

    # ── Aliases (backward-compat with verify scripts) ─────────────────────────

    def save_message(self, session_id: str, role: str, content: str, agent_name: Optional[str] = None) -> str:
        return self.add_message(session_id, role, content, agent_name)

    def get_history(self, session_id: str, limit: int = MAX_CONVERSATION_HISTORY) -> list[dict]:
        return self.get_messages(session_id, limit)

    def get_stats(self) -> dict:
        counts = {}
        for table in ("conversations", "tasks", "subtasks", "action_logs", "dynamic_agents"):
            row = self._exec(f"SELECT COUNT(*) AS n FROM {table}").fetchone()
            counts[table] = row["n"]
        db_size = Path(self.db_path).stat().st_size if Path(self.db_path).exists() else 0
        return {**counts, "db_size_bytes": db_size}


# Singleton
_memory: Optional[Memory] = None


def get_memory() -> Memory:
    global _memory
    if _memory is None:
        _memory = Memory()
    return _memory
