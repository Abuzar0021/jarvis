"""CRM Agent — manages lead records and pipeline state."""

from __future__ import annotations

from agents.base_agent import BaseAgent


class CrmAgent(BaseAgent):
    name = "crm"
    role = "Manage the lead pipeline — list, update stages, track activity"
    model_key = "data"
    tool_names = ["crm_list", "crm_add", "crm_update_stage"]

    @property
    def system_prompt(self) -> str:
        return (
            "You are Jarvis's CRM specialist.\n"
            "You maintain the lead pipeline. Use crm_list to report on the pipeline, "
            "crm_add to register new leads, and crm_update_stage to advance them "
            "(discovered → contact_found → audited → scored → proposal_ready → "
            "outreach_sent → replied → won/lost).\n"
            "Never skip backwards; report pipeline state accurately."
        )
