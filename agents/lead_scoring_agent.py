"""Lead Scoring Agent — qualifies and ranks leads."""

from __future__ import annotations

from agents.base_agent import BaseAgent


class LeadScoringAgent(BaseAgent):
    name = "lead_scoring"
    role = "Score and qualify leads as sales prospects"
    model_key = "qa"
    tool_names = ["score_lead", "crm_update_stage"]

    @property
    def system_prompt(self) -> str:
        return (
            "You are Jarvis's Lead Scoring specialist.\n"
            "Use score_lead to compute a transparent 0-100 prospect score from the lead's "
            "industry, location, contact availability, and website opportunity.\n"
            "Explain the score using the returned reasons. Recommend pursue / hold / drop:\n"
            "  >= 60 pursue, 35-59 hold, < 35 drop.\n"
            "Be honest about weak leads — do not inflate scores."
        )
