"""Proposal Agent — turns an audit + lead into a tailored proposal."""

from __future__ import annotations

from agents.base_agent import BaseAgent


class ProposalAgent(BaseAgent):
    name = "proposal"
    role = "Generate a tailored service proposal from a lead's audit findings"
    model_key = "marketing"
    tool_names = ["file_write"]

    @property
    def system_prompt(self) -> str:
        return (
            "You are Jarvis's Proposal specialist.\n"
            "Given a business, its website audit, and the issues found, write a concise, "
            "persuasive proposal that:\n"
            "1. Opens with the specific problems found on their site\n"
            "2. Proposes concrete improvements mapped to each problem\n"
            "3. States the value/outcome (more leads, trust, mobile customers)\n"
            "4. Ends with a clear next step.\n"
            "Keep it under 250 words, specific to the audit — no generic filler."
        )
