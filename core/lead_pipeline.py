"""
Lead-generation pipeline — the integration spine.

Flows a single lead through every stage of the pipeline, wiring together the
CRM (persistence), the lead tools (deterministic audit/contact/scoring), the
agents (LLM proposal writing), and the dashboard (live events):

    discover → find contacts → audit website → score → write proposal

Design guarantees:
- The audit/contact/scoring stages are 100% deterministic and run WITHOUT an
  API key (real verifiable work in any environment).
- The proposal stage uses the LLM when a key is present and degrades to a
  concrete, audit-driven template when it is not — never a fake/empty result.
- Every transition is persisted to the CRM and broadcast to the dashboard.
"""

from __future__ import annotations

import asyncio
from typing import Optional

from core.crm import LeadStore, get_crm
from core.logger import get_logger, log_action
from tools import lead_tools

logger = get_logger("jarvis.pipeline.leads")


# issue → concrete remedy, used by the deterministic proposal fallback
_REMEDY = {
    "no HTTPS (insecure)": "install an SSL certificate so visitors and Google trust your site",
    "missing meta description (poor SEO)": "write search-optimised page descriptions to lift your ranking",
    "not mobile-friendly (no viewport)": "rebuild the site mobile-first — most customers browse on a phone",
    "no H1 heading": "add clear headings so visitors and search engines understand each page",
    "thin content": "add service pages and persuasive copy that convert visitors into customers",
    "no website / offline": "build a modern, fast, mobile-first website from scratch",
    "site unreachable or returned an error": "stand up a reliable, modern website that is always online",
}


class LeadPipeline:
    def __init__(self, crm: Optional[LeadStore] = None) -> None:
        self.crm = crm or get_crm()

    async def run(
        self,
        business: str,
        url: str = "",
        industry: str = "",
        location: str = "",
        source: str = "pipeline",
        generate_proposal: bool = True,
    ) -> dict:
        """Run the full pipeline for one lead. Returns a structured trace."""
        log_action("lead_pipeline", "RUN", f"{business} {url}".strip())
        trace: dict = {"business": business, "url": url, "stages": []}

        # ── 1. Discover / register ───────────────────────────────────────────
        lead = self.crm.add_lead(business, url, industry, location, source=source)
        await self._emit(lead, "discovered")
        trace["lead_id"] = lead.id
        trace["stages"].append({"stage": "discovered", "ok": True})

        # Single network fetch reused by contact + audit stages.
        status, html, load_ms = await asyncio.to_thread(lead_tools._fetch, url) if url else (0, "", 0.0)

        # ── 2. Contact discovery ─────────────────────────────────────────────
        contacts = lead_tools.extract_contacts(html, url)
        if contacts["found"]:
            lead = self.crm.update(
                lead.id,
                contact_email=contacts["primary_email"],
                phone=contacts["phones"][0] if contacts["phones"] else "",
            )
            self.crm.set_stage(lead.id, "contact_found", f"email={contacts['primary_email']}")
            await self._emit(lead, "contact_found")
        trace["contacts"] = contacts
        trace["stages"].append({"stage": "contact_found", "ok": contacts["found"]})

        # ── 3. Website audit ─────────────────────────────────────────────────
        audit = lead_tools.audit_site(url or business, status, html, load_ms)
        self.crm.update(lead.id, audit=audit)
        lead = self.crm.set_stage(lead.id, "audited", f"opportunity={audit['opportunity']}")
        await self._emit(lead, "audited")
        trace["audit"] = audit
        trace["stages"].append({"stage": "audited", "ok": True})

        # ── 4. Score ─────────────────────────────────────────────────────────
        scoring = lead_tools.score_lead_value(lead.to_dict(), audit)
        lead = self.crm.set_score(lead.id, scoring["score"], f"{len(scoring['reasons'])} signals")
        lead = self.crm.set_stage(lead.id, "scored")
        await self._emit(lead, "scored")
        trace["score"] = scoring
        trace["stages"].append({"stage": "scored", "ok": True, "score": scoring["score"]})

        # ── 5. Proposal ──────────────────────────────────────────────────────
        if generate_proposal:
            proposal = await self._generate_proposal(lead, audit)
            lead = self.crm.update(lead.id, proposal=proposal)
            lead = self.crm.set_stage(lead.id, "proposal_ready")
            await self._emit(lead, "proposal_ready")
            trace["proposal"] = proposal
            trace["stages"].append({"stage": "proposal_ready", "ok": True})

        trace["final_stage"] = lead.stage
        trace["final_score"] = lead.score
        return trace

    async def run_batch(self, leads: list[dict], generate_proposal: bool = True) -> list[dict]:
        results = []
        for spec in leads:
            results.append(await self.run(generate_proposal=generate_proposal, **spec))
        return results

    # ── Proposal generation (LLM when available, deterministic otherwise) ────

    async def _generate_proposal(self, lead, audit: dict) -> str:
        from core.llm_client import get_llm
        llm = get_llm()
        if getattr(llm, "_has_key", False):
            try:
                from agents.proposal_agent import ProposalAgent
                agent = ProposalAgent()
                prompt = (
                    f"Business: {lead.business}\n"
                    f"Website: {lead.url or '(none)'}\n"
                    f"Audit opportunity score: {audit.get('opportunity')}/100\n"
                    f"Issues found: {', '.join(audit.get('issues', [])) or 'none'}\n"
                    "Write the proposal."
                )
                return await agent.run(prompt)
            except Exception as exc:
                logger.warning(f"[pipeline] LLM proposal failed, using template: {exc}")
        return self._template_proposal(lead, audit)

    @staticmethod
    def _template_proposal(lead, audit: dict) -> str:
        issues = audit.get("issues", []) or ["no website / offline"]
        bullets = "\n".join(f"  • {_REMEDY.get(i, i)}" for i in issues)
        opp = audit.get("opportunity", 100)
        return (
            f"Proposal for {lead.business}\n"
            f"{'=' * (13 + len(lead.business))}\n\n"
            f"We reviewed your online presence and found {len(issues)} clear "
            f"opportunities to win more customers (opportunity score {opp}/100):\n\n"
            f"{bullets}\n\n"
            "What you'd get:\n"
            "  • A fast, secure, mobile-first website built to convert\n"
            "  • Search-engine optimisation so local customers find you first\n"
            "  • Clear calls-to-action that turn visitors into enquiries\n\n"
            f"Next step: a free 15-minute call to walk {lead.business} through the plan.\n"
            "Reply to this message and we'll find a time."
        )

    # ── Dashboard events ─────────────────────────────────────────────────────

    async def _emit(self, lead, stage: str) -> None:
        try:
            from backend.websocket_manager import manager, EventType
            await manager.broadcast(EventType.LEAD_UPDATE, {
                "lead_id": lead.id,
                "business": lead.business,
                "stage": stage,
                "score": lead.score,
            })
        except Exception:
            pass  # dashboard not running — pipeline must not depend on it


_pipeline: Optional[LeadPipeline] = None


def get_lead_pipeline() -> LeadPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = LeadPipeline()
    return _pipeline
