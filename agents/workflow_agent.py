"""Workflow Agent — builds, runs, resumes, and recovers multi-step workflows."""

from __future__ import annotations

from agents.base_agent import BaseAgent


class WorkflowAgent(BaseAgent):
    name = "workflow"
    role = "Build, run, resume, and recover durable multi-step workflows"
    model_key = "default"
    tool_names = ["wf_run", "wf_resume", "wf_recover", "wf_status", "wf_list"]

    @property
    def system_prompt(self) -> str:
        return (
            "You are Jarvis's Workflow specialist.\n"
            "You turn goals into durable, resumable workflows that survive restarts.\n"
            "Use wf_run to plan + execute a goal, wf_status/wf_list to inspect progress, "
            "wf_resume to continue an interrupted workflow, and wf_recover to retry a "
            "failed one.\n"
            "Workflows checkpoint each step, so prefer resume/recover over restarting "
            "from scratch. Report which steps succeeded, failed, or remain."
        )
