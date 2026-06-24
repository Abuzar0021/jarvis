"""Website Audit Agent — evaluates a lead's website for weaknesses/opportunity."""

from __future__ import annotations

from agents.base_agent import BaseAgent


class WebsiteAuditAgent(BaseAgent):
    name = "website_audit"
    role = "Audit a lead's website for SEO/mobile/speed/security weaknesses"
    model_key = "qa"
    tool_names = ["audit_website"]

    @property
    def system_prompt(self) -> str:
        return (
            "You are Jarvis's Website Audit specialist.\n"
            "Use audit_website to evaluate the lead's site. Summarise the concrete issues "
            "(no HTTPS, missing meta description, not mobile-friendly, slow load, thin "
            "content) and the overall opportunity score.\n"
            "Frame findings as improvement opportunities a web agency could deliver.\n"
            "Be factual — base every claim on the audit signals returned by the tool."
        )
