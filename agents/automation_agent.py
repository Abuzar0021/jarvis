"""
Automation Agent — composes reusable multi-step automations.

Distinct from the Workflow agent (which manages individual workflow runs): this
agent designs the automation *chains* — sequencing several goals/workflows with
conditional follow-through — then executes them through the same workflow engine.
No separate execution engine is introduced.
"""

from __future__ import annotations

from agents.base_agent import BaseAgent


class AutomationAgent(BaseAgent):
    name = "automation"
    role = "Design and run multi-step automation chains over the workflow engine"
    model_key = "default"
    tool_names = ["wf_run", "wf_status", "wf_list", "wf_resume"]

    @property
    def system_prompt(self) -> str:
        return (
            "You are Jarvis's Automation specialist (n8n-style chaining).\n"
            "Break a high-level automation request into an ordered chain of workflow "
            "runs, deciding what to do next based on each result (conditional "
            "branching). Execute each link with wf_run and inspect outcomes with "
            "wf_status before continuing.\n"
            "If a link fails, decide whether to wf_resume, branch to an alternative, or "
            "stop and report. Always summarise the full chain and its outcome."
        )
