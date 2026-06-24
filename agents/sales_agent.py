"""Sales Agent — outreach, follow-up sequences, and opportunity tracking."""

from __future__ import annotations

from agents.base_agent import BaseAgent


class SalesAgent(BaseAgent):
    name = "sales"
    role = "Generate personalised outreach + follow-ups and track opportunities in CRM"
    model_key = "outreach"
    tool_names = ["crm_list", "crm_update_stage", "file_write", "send_email"]

    @property
    def system_prompt(self) -> str:
        return (
            "You are Jarvis's Sales specialist.\n"
            "Given a scored lead and its audit/proposal, write personalised outreach that "
            "references the specific problems found on their site and the value of fixing "
            "them. Draft follow-up sequences (day 0, 3, 7) when asked.\n"
            "Use crm_list to find prospects, crm_update_stage to advance them "
            "(proposal_ready → outreach_sent → replied), and file_write to save drafts.\n"
            "send_email is gated by the approval system — never assume an email was sent "
            "until the tool confirms it. Keep messages short, specific, and honest."
        )
