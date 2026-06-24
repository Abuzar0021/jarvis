"""
CRM + lead persistence — the system of record for the lead-generation pipeline.

Built on the existing shared SQLite memory DB (one database for the whole OS,
no new infrastructure). A discovered lead flows through an explicit pipeline
state machine; every transition is logged as an activity so the dashboard shows
real history, not placeholders.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any, Optional

from core.logger import get_logger
from core.memory import get_memory

logger = get_logger("jarvis.crm")


# ── Pipeline state machine ───────────────────────────────────────────────────
# Ordered stages a lead advances through. `won`/`lost` are terminal and
# reachable from any active stage.
STAGES: list[str] = [
    "discovered",        # found via lead discovery
    "contact_found",     # contact details discovered
    "audited",           # website audited
    "scored",            # lead scored / qualified
    "proposal_ready",    # proposal generated
    "outreach_sent",     # outreach delivered
    "replied",           # prospect replied
    "won",               # closed-won (terminal)
    "lost",              # closed-lost (terminal)
]
_STAGE_INDEX = {s: i for i, s in enumerate(STAGES)}
_TERMINAL = {"won", "lost"}
_ACTIVE = [s for s in STAGES if s not in _TERMINAL]


def can_transition(current: str, target: str) -> bool:
    """Forward progress only, plus jump-to-terminal from any active stage."""
    if current == target:
        return True
    if target in _TERMINAL:
        return current not in _TERMINAL
    if current in _TERMINAL:
        return False
    return _STAGE_INDEX.get(target, -1) >= _STAGE_INDEX.get(current, 0)


@dataclass
class Lead:
    id: str
    business: str
    url: str = ""
    industry: str = ""
    location: str = ""
    contact_name: str = ""
    contact_email: str = ""
    phone: str = ""
    score: float = 0.0
    stage: str = "discovered"
    source: str = ""
    audit: Optional[dict] = None
    proposal: str = ""
    notes: str = ""
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        return d


class LeadStore:
    """Persistent CRM over the shared memory DB."""

    def __init__(self, memory=None) -> None:
        self.memory = memory or get_memory()
        self._init_tables()

    def _init_tables(self) -> None:
        self.memory._exec(
            """CREATE TABLE IF NOT EXISTS leads (
                id            TEXT PRIMARY KEY,
                business      TEXT NOT NULL,
                url           TEXT,
                industry      TEXT,
                location      TEXT,
                contact_name  TEXT,
                contact_email TEXT,
                phone         TEXT,
                score         REAL NOT NULL DEFAULT 0,
                stage         TEXT NOT NULL DEFAULT 'discovered',
                source        TEXT,
                audit         TEXT,
                proposal      TEXT,
                notes         TEXT,
                created_at    TEXT NOT NULL,
                updated_at    TEXT NOT NULL
            )"""
        )
        self.memory._exec(
            """CREATE TABLE IF NOT EXISTS lead_activities (
                id         TEXT PRIMARY KEY,
                lead_id    TEXT NOT NULL,
                kind       TEXT NOT NULL,
                detail     TEXT,
                created_at TEXT NOT NULL
            )"""
        )

    # ── Create / read ────────────────────────────────────────────────────────

    def add_lead(
        self,
        business: str,
        url: str = "",
        industry: str = "",
        location: str = "",
        source: str = "",
        **extra: Any,
    ) -> Lead:
        # De-dupe by URL/domain or business name.
        existing = self.find(url=url, business=business)
        if existing:
            return existing

        now = datetime.utcnow().isoformat()
        lead = Lead(
            id=str(uuid.uuid4()),
            business=business.strip(),
            url=url.strip(),
            industry=industry,
            location=location,
            source=source,
            created_at=now,
            updated_at=now,
            **{k: v for k, v in extra.items() if k in Lead.__annotations__},
        )
        self.memory._exec(
            "INSERT INTO leads (id, business, url, industry, location, contact_name, "
            "contact_email, phone, score, stage, source, audit, proposal, notes, "
            "created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                lead.id, lead.business, lead.url, lead.industry, lead.location,
                lead.contact_name, lead.contact_email, lead.phone, lead.score,
                lead.stage, lead.source,
                json.dumps(lead.audit) if lead.audit else None,
                lead.proposal, lead.notes, lead.created_at, lead.updated_at,
            ),
        )
        self.log_activity(lead.id, "created", f"source={source or 'manual'}")
        logger.info(f"[crm] lead added: {business} ({lead.id[:8]})")
        return lead

    def get_lead(self, lead_id: str) -> Optional[Lead]:
        cur = self.memory._exec("SELECT * FROM leads WHERE id = ?", (lead_id,))
        row = cur.fetchone()
        return self._row_to_lead(row) if row else None

    def find(self, url: str = "", business: str = "") -> Optional[Lead]:
        if url:
            dom = _domain(url)
            cur = self.memory._exec(
                "SELECT * FROM leads WHERE url LIKE ? LIMIT 1", (f"%{dom}%",)
            )
            row = cur.fetchone()
            if row:
                return self._row_to_lead(row)
        if business:
            cur = self.memory._exec(
                "SELECT * FROM leads WHERE lower(business) = ? LIMIT 1",
                (business.strip().lower(),),
            )
            row = cur.fetchone()
            if row:
                return self._row_to_lead(row)
        return None

    def list_leads(
        self, stage: Optional[str] = None, limit: int = 100, min_score: float = 0.0
    ) -> list[Lead]:
        sql = "SELECT * FROM leads WHERE score >= ?"
        params: list[Any] = [min_score]
        if stage:
            sql += " AND stage = ?"
            params.append(stage)
        sql += " ORDER BY score DESC, updated_at DESC LIMIT ?"
        params.append(limit)
        cur = self.memory._exec(sql, tuple(params))
        return [self._row_to_lead(r) for r in cur.fetchall()]

    # ── Update ───────────────────────────────────────────────────────────────

    def update(self, lead_id: str, **fields: Any) -> Optional[Lead]:
        lead = self.get_lead(lead_id)
        if not lead:
            return None
        allowed = {k: v for k, v in fields.items() if k in Lead.__annotations__ and k != "id"}
        if not allowed:
            return lead
        allowed["updated_at"] = datetime.utcnow().isoformat()
        sets = ", ".join(f"{k} = ?" for k in allowed)
        vals = [
            json.dumps(v) if k == "audit" and isinstance(v, dict) else v
            for k, v in allowed.items()
        ]
        self.memory._exec(
            f"UPDATE leads SET {sets} WHERE id = ?", tuple(vals) + (lead_id,)
        )
        return self.get_lead(lead_id)

    def set_stage(self, lead_id: str, stage: str, detail: str = "") -> Optional[Lead]:
        lead = self.get_lead(lead_id)
        if not lead:
            return None
        if stage not in _STAGE_INDEX:
            raise ValueError(f"unknown stage: {stage}")
        if not can_transition(lead.stage, stage):
            logger.warning(f"[crm] illegal transition {lead.stage}→{stage} for {lead_id[:8]}")
            return lead
        self.update(lead_id, stage=stage)
        self.log_activity(lead_id, "stage", f"{lead.stage} → {stage} {detail}".strip())
        return self.get_lead(lead_id)

    def set_score(self, lead_id: str, score: float, detail: str = "") -> Optional[Lead]:
        self.log_activity(lead_id, "score", f"{score:.0f} {detail}".strip())
        return self.update(lead_id, score=round(float(score), 2))

    # ── Activities ───────────────────────────────────────────────────────────

    def log_activity(self, lead_id: str, kind: str, detail: str = "") -> None:
        self.memory._exec(
            "INSERT INTO lead_activities (id, lead_id, kind, detail, created_at) "
            "VALUES (?,?,?,?,?)",
            (str(uuid.uuid4()), lead_id, kind, detail, datetime.utcnow().isoformat()),
        )

    def activities(self, lead_id: str, limit: int = 50) -> list[dict]:
        cur = self.memory._exec(
            "SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC LIMIT ?",
            (lead_id, limit),
        )
        return [dict(r) for r in cur.fetchall()]

    # ── Aggregates (dashboard) ───────────────────────────────────────────────

    def pipeline_summary(self) -> dict:
        cur = self.memory._exec("SELECT stage, COUNT(*) AS n, AVG(score) AS avg_score FROM leads GROUP BY stage")
        by_stage = {r["stage"]: {"count": r["n"], "avg_score": round(r["avg_score"] or 0, 1)}
                    for r in cur.fetchall()}
        total = self.memory._exec("SELECT COUNT(*) AS n FROM leads").fetchone()["n"]
        won = by_stage.get("won", {}).get("count", 0)
        closed = won + by_stage.get("lost", {}).get("count", 0)
        return {
            "total": total,
            "by_stage": {s: by_stage.get(s, {"count": 0, "avg_score": 0}) for s in STAGES},
            "conversion_rate": round(won / closed, 3) if closed else 0.0,
            "active": sum(by_stage.get(s, {}).get("count", 0) for s in _ACTIVE),
        }

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _row_to_lead(self, row) -> Lead:
        d = dict(row)
        if d.get("audit"):
            try:
                d["audit"] = json.loads(d["audit"])
            except (json.JSONDecodeError, TypeError):
                d["audit"] = None
        return Lead(**{k: d.get(k) for k in Lead.__annotations__})


def _domain(url: str) -> str:
    u = url.lower().replace("https://", "").replace("http://", "").replace("www.", "")
    return u.split("/")[0].strip()


_store: Optional[LeadStore] = None


def get_crm() -> LeadStore:
    global _store
    if _store is None:
        _store = LeadStore()
    return _store
