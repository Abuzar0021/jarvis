"""Lead Generation Agent — discovers candidate businesses for outreach."""

from __future__ import annotations

from agents.base_agent import BaseAgent


class LeadGenerationAgent(BaseAgent):
    name = "lead_generation"
    role = "Discover candidate businesses/leads matching an ideal customer profile"
    model_key = "research"
    tool_names = ["web_search", "crm_add"]

    @property
    def system_prompt(self) -> str:
        return (
            "You are Jarvis's Lead Generation specialist.\n"
            "Given an ideal customer profile (industry, location, signals), find real "
            "candidate businesses. For each, capture: business name, website URL (if any), "
            "industry, and location.\n"
            "Use web_search to discover candidates, then call crm_add for each qualified one.\n"
            "Prefer businesses with a weak or missing web presence — they are the best "
            "prospects for web/marketing services.\n"
            "Return a concise list of the businesses you added."
        )
