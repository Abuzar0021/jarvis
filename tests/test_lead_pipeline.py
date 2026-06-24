"""
Tests for the lead-generation pipeline, CRM, and lead tools.

Everything here runs WITHOUT an API key or network — the audit/contact/scoring
logic is deterministic and the network fetch is monkeypatched.
"""

import pytest

from core.memory import Memory
from core.crm import LeadStore, can_transition, STAGES
from core.lead_pipeline import LeadPipeline
from tools import lead_tools


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def store(tmp_path):
    return LeadStore(memory=Memory(db_path=tmp_path / "crm.db"))


GOOD_HTML = (
    '<html><head><title>Acme Dental</title>'
    '<meta name="description" content="Best dentist in town">'
    '<meta name="viewport" content="width=device-width"></head>'
    '<body><h1>Welcome</h1>' + ("word " * 400) + "</body></html>"
)
WEAK_HTML = (
    '<html><body><a href="mailto:joe@joepizza.com">email us</a> '
    "tiny site, call 415-555-1234</body></html>"
)


# ── Pure audit logic ─────────────────────────────────────────────────────────

def test_audit_good_site_high_quality():
    audit = lead_tools.audit_site("https://acme.com", 200, GOOD_HTML, 800)
    assert audit["reachable"] is True
    assert audit["quality"] >= 90
    assert audit["opportunity"] <= 10
    assert audit["issues"] == []


def test_audit_weak_site_high_opportunity():
    audit = lead_tools.audit_site("http://weak.com", 200, "<html><body>hi</body></html>", 4000)
    assert audit["quality"] <= 10
    assert audit["opportunity"] >= 90
    # Concrete, honest issues — not a vague placeholder
    assert "no HTTPS (insecure)" in audit["issues"]
    assert "not mobile-friendly (no viewport)" in audit["issues"]


def test_audit_unreachable_site():
    audit = lead_tools.audit_site("http://offline.com", 0, "", 5000)
    assert audit["reachable"] is False
    assert audit["opportunity"] == 100


# ── Contact extraction ───────────────────────────────────────────────────────

def test_extract_contacts_prefers_mailto():
    html = 'a@spam.png ignored <a href="mailto:info@acme.com">x</a> sales@acme.com 415-555-1234'
    c = lead_tools.extract_contacts(html)
    assert c["found"] is True
    assert c["primary_email"] == "info@acme.com"
    assert "415-555-1234" in c["phones"]


def test_extract_contacts_none():
    c = lead_tools.extract_contacts("<html><body>no contacts here</body></html>")
    assert c["found"] is False
    assert c["primary_email"] == ""


# ── Scoring ──────────────────────────────────────────────────────────────────

def test_score_no_website_high_need():
    lead = {"business": "X", "industry": "dental", "location": "SF",
            "contact_email": "a@b.com"}
    audit = {"reachable": False, "opportunity": 100}
    result = lead_tools.score_lead_value(lead, audit)
    # 30 (no site) + 25 (email) + 15 (dental) + 5 (location) = 75
    assert result["score"] == pytest.approx(75.0)
    assert len(result["reasons"]) == 4


def test_score_monotonic_with_contactability():
    base = {"business": "X", "industry": "", "location": ""}
    audit = {"reachable": True, "opportunity": 50}
    with_email = lead_tools.score_lead_value({**base, "contact_email": "a@b.com"}, audit)
    no_contact = lead_tools.score_lead_value(base, audit)
    assert with_email["score"] > no_contact["score"]


# ── CRM state machine ────────────────────────────────────────────────────────

def test_can_transition_forward_only():
    assert can_transition("discovered", "audited") is True
    assert can_transition("audited", "discovered") is False
    assert can_transition("scored", "lost") is True       # jump to terminal ok
    assert can_transition("won", "scored") is False        # terminal is final


def test_crm_add_get_dedupe(store):
    a = store.add_lead("Joe Pizza", "https://joepizza.com", "restaurant", "Chicago")
    assert a.stage == "discovered"
    again = store.add_lead("Joe Pizza", "https://joepizza.com")
    assert again.id == a.id  # de-duped, not a second row
    assert len(store.list_leads()) == 1


def test_crm_stage_transitions_and_activities(store):
    lead = store.add_lead("Acme", "https://acme.com")
    store.set_stage(lead.id, "audited")
    assert store.get_lead(lead.id).stage == "audited"
    # Illegal backward transition is ignored, not applied
    store.set_stage(lead.id, "discovered")
    assert store.get_lead(lead.id).stage == "audited"
    # Activity log records the real transition
    kinds = [a["kind"] for a in store.activities(lead.id)]
    assert "stage" in kinds


def test_crm_pipeline_summary(store):
    store.add_lead("A", "https://a.com")
    b = store.add_lead("B", "https://b.com")
    store.set_stage(b.id, "won")
    summary = store.pipeline_summary()
    assert summary["total"] == 2
    assert summary["by_stage"]["won"]["count"] == 1


# ── Full pipeline (no key, monkeypatched network) ────────────────────────────

async def test_full_pipeline_reaches_proposal(store, monkeypatch):
    monkeypatch.setattr(lead_tools, "_fetch", lambda url, timeout=10: (200, WEAK_HTML, 3000.0))
    pipe = LeadPipeline(crm=store)

    trace = await pipe.run("Joe Pizza", "http://joepizza.com", "restaurant", "Chicago")

    assert trace["final_stage"] == "proposal_ready"
    assert trace["contacts"]["primary_email"] == "joe@joepizza.com"
    assert trace["audit"]["opportunity"] >= 50
    assert trace["final_score"] > 0
    # Proposal is real and specific — names the business, never empty
    assert trace["proposal"]
    assert "Joe Pizza" in trace["proposal"]

    # Persisted to CRM with full activity trail
    lead = store.get_lead(trace["lead_id"])
    assert lead.stage == "proposal_ready"
    assert lead.contact_email == "joe@joepizza.com"
    assert lead.score > 0
    assert any(a["kind"] == "stage" for a in store.activities(lead.id))


async def test_pipeline_handles_offline_site(store, monkeypatch):
    monkeypatch.setattr(lead_tools, "_fetch", lambda url, timeout=10: (0, "", 5000.0))
    pipe = LeadPipeline(crm=store)

    trace = await pipe.run("Ghost Cafe", "http://ghost.example", "restaurant", "NYC")

    assert trace["audit"]["reachable"] is False
    assert trace["audit"]["opportunity"] == 100
    assert trace["final_stage"] == "proposal_ready"
    # Template proposal proposes building a website for an offline lead
    assert "website" in trace["proposal"].lower()


async def test_pipeline_degrades_without_api_key(store, monkeypatch):
    """With no API key the proposal must still be produced (template path)."""
    monkeypatch.setattr(lead_tools, "_fetch", lambda url, timeout=10: (200, WEAK_HTML, 1500.0))
    from core import llm_client
    # Force the no-key path regardless of environment
    monkeypatch.setattr(llm_client.get_llm(), "_has_key", False, raising=False)

    pipe = LeadPipeline(crm=store)
    trace = await pipe.run("No Key LLC", "http://nokey.example")
    assert trace["proposal"]  # never empty / fake
    assert "No Key LLC" in trace["proposal"]
