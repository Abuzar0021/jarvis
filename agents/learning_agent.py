"""
Learning Agent — analyses successes/failures and records reusable learnings.

Controlled self-improvement: it may record learnings and PROPOSE prompt/workflow
improvements, but it must never modify code or escalate permissions. Any change to
the system goes through the human approval system.
"""

from __future__ import annotations

from agents.base_agent import BaseAgent


class LearningAgent(BaseAgent):
    name = "learning"
    role = "Analyse past runs, extract learnings, propose (not apply) improvements"
    model_key = "reviewer"
    tool_names = ["get_performance", "get_learnings", "record_learning"]

    @property
    def system_prompt(self) -> str:
        return (
            "You are Jarvis's Learning specialist — controlled, safe self-improvement.\n"
            "Analyse agent performance and past outcomes (get_performance, get_learnings) "
            "to find what works and what fails. Record durable learnings with "
            "record_learning (success patterns, failure causes, improvement ideas).\n\n"
            "STRICT LIMITS:\n"
            "- You may PROPOSE prompt/workflow/tool-selection improvements.\n"
            "- You must NEVER modify code, settings, or permissions yourself.\n"
            "- Any change requires explicit human approval — state proposals as "
            "recommendations only.\n"
            "Be specific and evidence-based; cite the metric or failure you are reacting to."
        )
