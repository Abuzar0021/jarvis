"""
Lead-generation tools — website audit, contact discovery, lead scoring, CRM.

Design notes:
- The scoring/audit/extraction logic is implemented as PURE functions so it is
  fully deterministic and unit-testable with no network and no API key. The
  registered async tools are thin wrappers that fetch a page and call them.
- Network fetch goes through `_fetch`, which tests monkeypatch. The default
  implementation uses only the standard library (urllib) — no new dependency.
- CRM tools wire straight into the shared LeadStore (one DB for the whole OS).
"""

from __future__ import annotations

import json
import re
import time
import urllib.request
from typing import Optional

from tools import register
from core.logger import get_logger

logger = get_logger("jarvis.lead_tools")

_UA = "Mozilla/5.0 (compatible; JarvisLeadBot/1.0)"
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
_PHONE_RE = re.compile(r"(?:(?:\+?\d{1,3}[\s.\-]?)?(?:\(?\d{2,4}\)?[\s.\-]?){2,4}\d{2,4})")
_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
_META_DESC_RE = re.compile(r'<meta[^>]+name=["\']description["\'][^>]*>', re.IGNORECASE)
_VIEWPORT_RE = re.compile(r'<meta[^>]+name=["\']viewport["\']', re.IGNORECASE)
_H1_RE = re.compile(r"<h1[\s>]", re.IGNORECASE)


# ── Network (monkeypatched in tests) ─────────────────────────────────────────

def _fetch(url: str, timeout: int = 10) -> tuple[int, str, float]:
    """Return (status_code, html, load_ms). Stdlib only; never raises."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    start = time.monotonic()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
            html = resp.read(200_000).decode("utf-8", errors="replace")
            load_ms = (time.monotonic() - start) * 1000
            return resp.status, html, load_ms
    except Exception as exc:  # offline / DNS / TLS / 4xx-5xx
        load_ms = (time.monotonic() - start) * 1000
        logger.debug(f"[lead] fetch failed for {url}: {exc}")
        return 0, "", load_ms


# ── Pure logic (deterministic, unit-tested) ──────────────────────────────────

def audit_site(url: str, status: int, html: str, load_ms: float) -> dict:
    """
    Heuristic website audit. Returns quality + opportunity (0-100) and issues.
    A LOW quality site is a HIGH sales opportunity for a web/marketing agency.
    """
    issues: list[str] = []
    reachable = status and 200 <= status < 400 and bool(html)

    if not reachable:
        return {
            "url": url, "reachable": False, "status": status,
            "quality": 0, "opportunity": 100, "load_ms": round(load_ms),
            "issues": ["site unreachable or returned an error" if status else "no website / offline"],
            "signals": {},
        }

    https = url.startswith("https://")
    title_m = _TITLE_RE.search(html)
    title = (title_m.group(1).strip() if title_m else "")[:120]
    has_title = bool(title)
    has_meta = bool(_META_DESC_RE.search(html))
    mobile = bool(_VIEWPORT_RE.search(html))
    has_h1 = bool(_H1_RE.search(html))
    text = re.sub(r"<[^>]+>", " ", html)
    words = len(text.split())
    fast = load_ms < 2500

    signals = {
        "https": https, "has_title": has_title, "has_meta_description": has_meta,
        "mobile_viewport": mobile, "has_h1": has_h1, "word_count": words,
        "fast_load": fast, "title": title,
    }

    # Quality score (each signal weighted)
    quality = 0
    quality += 20 if https else 0
    quality += 15 if has_title else 0
    quality += 15 if has_meta else 0
    quality += 20 if mobile else 0
    quality += 10 if has_h1 else 0
    quality += 10 if words >= 300 else (5 if words >= 100 else 0)
    quality += 10 if fast else 0

    if not https:   issues.append("no HTTPS (insecure)")
    if not has_meta: issues.append("missing meta description (poor SEO)")
    if not mobile:  issues.append("not mobile-friendly (no viewport)")
    if not has_h1:  issues.append("no H1 heading")
    if words < 300: issues.append("thin content")
    if not fast:    issues.append(f"slow load ({round(load_ms)}ms)")

    return {
        "url": url, "reachable": True, "status": status,
        "quality": quality, "opportunity": 100 - quality,
        "load_ms": round(load_ms), "issues": issues, "signals": signals,
    }


def extract_contacts(html: str, base_url: str = "") -> dict:
    """Extract emails and phone numbers from page HTML. Deterministic."""
    emails = sorted({
        e for e in _EMAIL_RE.findall(html or "")
        if not e.lower().endswith((".png", ".jpg", ".gif", ".webp", ".svg"))
    })
    # mailto: links are the most reliable signal — prioritise them
    mailtos = sorted({m for m in re.findall(r"mailto:([^\"'?>\s]+)", html or "", re.I)})
    primary = (mailtos or emails)
    phones = sorted({
        p.strip() for p in _PHONE_RE.findall(html or "")
        if len(re.sub(r"\D", "", p)) >= 9
    })[:3]
    return {
        "emails": (mailtos + [e for e in emails if e not in mailtos])[:5],
        "primary_email": primary[0] if primary else "",
        "phones": phones,
        "found": bool(primary or phones),
    }


def score_lead_value(lead: dict, audit: Optional[dict] = None) -> dict:
    """
    Transparent weighted lead score (0-100) for an agency selling web/marketing.
    Higher = better prospect. Returns {score, reasons}.
    """
    reasons: list[str] = []
    score = 0.0
    audit = audit or lead.get("audit") or {}

    # Reachability: an existing-but-weak site is the sweet spot.
    if audit:
        if not audit.get("reachable", True):
            score += 30; reasons.append("no working website → high need (+30)")
        else:
            opp = audit.get("opportunity", 0)
            contrib = round(opp * 0.4, 1)
            score += contrib
            reasons.append(f"website opportunity {opp}/100 → +{contrib}")

    # Contactability
    if lead.get("contact_email"):
        score += 25; reasons.append("direct email available (+25)")
    elif lead.get("phone"):
        score += 12; reasons.append("phone available (+12)")
    else:
        reasons.append("no contact found (+0)")

    # Industry fit (high-value verticals for web services)
    industry = (lead.get("industry") or "").lower()
    high_value = {"restaurant", "dental", "legal", "real estate", "fitness",
                  "salon", "contractor", "medical", "retail", "hospitality"}
    if any(h in industry for h in high_value):
        score += 15; reasons.append(f"high-value industry ({industry}) (+15)")

    # Location specified (local SEO angle)
    if lead.get("location"):
        score += 5; reasons.append("location known → local SEO angle (+5)")

    score = max(0.0, min(100.0, score))
    return {"score": round(score, 1), "reasons": reasons}


# ── Registered tools ─────────────────────────────────────────────────────────

@register(schema={
    "type": "function",
    "function": {
        "name": "audit_website",
        "description": "Audit a website for quality/SEO/mobile/speed issues and return "
                       "a structured opportunity score. Works without an API key.",
        "parameters": {
            "type": "object",
            "properties": {"url": {"type": "string", "description": "Website URL or domain"}},
            "required": ["url"],
        },
    },
})
async def audit_website(url: str) -> str:
    import asyncio
    status, html, load_ms = await asyncio.to_thread(_fetch, url)
    result = audit_site(url, status, html, load_ms)
    return json.dumps(result)


@register(schema={
    "type": "function",
    "function": {
        "name": "find_contacts",
        "description": "Discover contact emails and phone numbers from a website. "
                       "Read-only; works without an API key.",
        "parameters": {
            "type": "object",
            "properties": {"url": {"type": "string"}},
            "required": ["url"],
        },
    },
})
async def find_contacts(url: str) -> str:
    import asyncio
    status, html, _ = await asyncio.to_thread(_fetch, url)
    return json.dumps(extract_contacts(html, url))


@register(schema={
    "type": "function",
    "function": {
        "name": "score_lead",
        "description": "Score a lead 0-100 as a sales prospect using a transparent "
                       "weighted heuristic. Returns score + reasons.",
        "parameters": {
            "type": "object",
            "properties": {
                "business": {"type": "string"},
                "industry": {"type": "string"},
                "location": {"type": "string"},
                "contact_email": {"type": "string"},
                "phone": {"type": "string"},
            },
            "required": ["business"],
        },
    },
})
async def score_lead(business: str, industry: str = "", location: str = "",
                     contact_email: str = "", phone: str = "") -> str:
    lead = {"business": business, "industry": industry, "location": location,
            "contact_email": contact_email, "phone": phone}
    return json.dumps(score_lead_value(lead))


@register(schema={
    "type": "function",
    "function": {
        "name": "crm_add",
        "description": "Add a lead to the CRM pipeline.",
        "parameters": {
            "type": "object",
            "properties": {
                "business": {"type": "string"},
                "url": {"type": "string"},
                "industry": {"type": "string"},
                "location": {"type": "string"},
                "source": {"type": "string"},
            },
            "required": ["business"],
        },
    },
})
async def crm_add(business: str, url: str = "", industry: str = "",
                  location: str = "", source: str = "tool") -> str:
    from core.crm import get_crm
    lead = get_crm().add_lead(business, url, industry, location, source=source)
    return json.dumps({"id": lead.id, "business": lead.business, "stage": lead.stage})


@register(schema={
    "type": "function",
    "function": {
        "name": "crm_update_stage",
        "description": "Advance a lead to a new pipeline stage.",
        "parameters": {
            "type": "object",
            "properties": {
                "lead_id": {"type": "string"},
                "stage": {"type": "string",
                          "enum": ["discovered", "contact_found", "audited", "scored",
                                   "proposal_ready", "outreach_sent", "replied", "won", "lost"]},
                "detail": {"type": "string"},
            },
            "required": ["lead_id", "stage"],
        },
    },
})
async def crm_update_stage(lead_id: str, stage: str, detail: str = "") -> str:
    from core.crm import get_crm
    lead = get_crm().set_stage(lead_id, stage, detail)
    if not lead:
        return f"ERROR: lead '{lead_id}' not found"
    return json.dumps({"id": lead.id, "stage": lead.stage})


@register(schema={
    "type": "function",
    "function": {
        "name": "crm_list",
        "description": "List CRM leads, optionally filtered by stage, highest score first.",
        "parameters": {
            "type": "object",
            "properties": {
                "stage": {"type": "string"},
                "limit": {"type": "integer"},
            },
        },
    },
})
async def crm_list(stage: str = "", limit: int = 25) -> str:
    from core.crm import get_crm
    leads = get_crm().list_leads(stage=stage or None, limit=limit)
    return json.dumps([
        {"id": l.id[:8], "business": l.business, "score": l.score, "stage": l.stage,
         "email": l.contact_email} for l in leads
    ])
