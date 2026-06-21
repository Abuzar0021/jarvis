"""CEO Agent — receives goals, plans, delegates, reviews, and synthesises."""

from __future__ import annotations

import time
import uuid
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from agents.base_agent import BaseAgent
from config import MODELS
from core.llm_client import get_llm
from core.memory import get_memory
from core.orchestrator import get_orchestrator
from core.task_planner import get_planner
from core.logger import get_logger, log_action

logger = get_logger("jarvis.ceo")
console = Console()

_CEO_SYSTEM = """\
You are Jarvis, an autonomous AI operating system CEO.

You receive high-level goals from the user and coordinate a team of specialist agents:
- research:   web research and information gathering (10-20 sources, structured reports)
- coding:     code writing and refactoring
- qa:         testing and quality assurance
- debug:      error diagnosis and bug fixing
- deployment: packaging and deployment
- marketing:  marketing copy and strategy
- outreach:   email and social media outreach
- data:       data analysis and visualisation
- factory:    creating and modifying other agents
- computer:   OS automation — opens apps, controls keyboard/mouse, reads screen
- browser:    headless web browser — visits URLs, fills forms, scrapes pages
- vision:     computer vision — reads screen and webcam feed
- reviewer:   quality review — scores any output 0-100, flags issues

Your role:
1. Understand the goal thoroughly.
2. Ask for clarification if the goal is ambiguous.
3. Break the goal into clear subtasks.
4. Assign each subtask to the best agent.
5. Review all results critically.
6. Synthesise a final, coherent deliverable.
7. Report what was done and what remains.

You are decisive, strategic, and quality-focused.
"""


class CEOAgent(BaseAgent):
    name = "ceo"
    role = "Goal decomposition, agent delegation, and synthesis"
    model_key = "ceo"
    tool_names = []  # CEO delegates; it doesn't use tools directly

    @property
    def system_prompt(self) -> str:
        return _CEO_SYSTEM

    # ── Main entry point ───────────────────────────────────────────────────────

    async def execute_goal(
        self,
        goal: str,
        context: str = "",
        session_id: Optional[str] = None,
    ) -> str:
        """
        Full autonomous goal execution pipeline:
        plan → assign → execute → review → synthesise
        """
        session_id = session_id or str(uuid.uuid4())
        task_id = self.memory.create_task(goal)
        start = time.monotonic()

        console.print(
            Panel(
                f"[bold magenta]GOAL:[/bold magenta] {goal}",
                title="[bold]Jarvis CEO[/bold]",
                border_style="magenta",
            )
        )

        # ── 1. Plan ────────────────────────────────────────────────────────────
        log_action("ceo", "PLAN", goal[:60])
        planner = get_planner()
        subtasks = await planner.plan(goal, context=context)

        if not subtasks:
            logger.error("[ceo] Planner returned empty plan")
            return "Could not create a plan for this goal. Please be more specific."

        self._show_plan(subtasks)
        self.memory.update_task(task_id, "planning", assigned_to="ceo")

        # ── 2. Execute subtasks via Orchestrator ───────────────────────────────
        log_action("ceo", "EXECUTE", f"{len(subtasks)} subtasks")
        self.memory.update_task(task_id, "running")

        orchestrator = get_orchestrator()
        results = await orchestrator.run_plan(subtasks, task_id=task_id, show_progress=True)

        # ── 3. Review results ──────────────────────────────────────────────────
        log_action("ceo", "REVIEW")
        reviewed = await self._review_results(goal, subtasks, results)

        # ── 4. Synthesise final output ─────────────────────────────────────────
        log_action("ceo", "SYNTHESISE")
        synthesis = await self._synthesise(goal, reviewed)

        elapsed = time.monotonic() - start
        self.memory.update_task(task_id, "done", result=synthesis[:500])
        self.memory.record_metric("ceo", "goal_duration_s", elapsed, task_id=task_id)

        console.print(
            Panel(
                synthesis,
                title=f"[bold green]Jarvis — Done ({elapsed:.1f}s)[/bold green]",
                border_style="green",
            )
        )
        return synthesis

    # ── Interactive chat ───────────────────────────────────────────────────────

    async def chat(self, message: str, session_id: str) -> str:
        """Single-turn chat with CEO (no task planning — conversational)."""
        return await self.run(message, session_id=session_id)

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _show_plan(self, subtasks: list[dict]) -> None:
        table = Table(title="Execution Plan", border_style="magenta", show_lines=True)
        table.add_column("#", style="dim", width=3)
        table.add_column("Task", style="cyan")
        table.add_column("Agent", style="green")
        table.add_column("Priority", justify="center")
        for i, st in enumerate(subtasks, 1):
            table.add_row(
                str(i),
                st.get("title", ""),
                st.get("agent", "?"),
                str(st.get("priority", "-")),
            )
        console.print(table)

    async def _review_results(
        self, goal: str, subtasks: list[dict], results: dict[str, str]
    ) -> dict[str, str]:
        """Ask the LLM to critique each result and flag issues."""
        llm = get_llm()
        reviewed: dict[str, str] = {}

        for st in subtasks:
            title = st["title"]
            result = results.get(title, "No result")
            prompt = (
                f"Original goal: {goal}\n\n"
                f"Subtask: {title}\nDescription: {st.get('description', '')}\n\n"
                f"Agent output:\n{result[:1500]}\n\n"
                "Is this output satisfactory and complete for the subtask? "
                "Reply 'OK' if yes, or 'ISSUE: <brief explanation>' if not."
            )
            verdict = await llm.simple(prompt, system=_CEO_SYSTEM, model=self.model, temperature=0.2)
            if verdict.startswith("ISSUE"):
                logger.warning(f"[ceo] review flagged '{title}': {verdict}")
            reviewed[title] = result  # keep original result; flag is logged
        return reviewed

    async def _synthesise(self, goal: str, results: dict[str, str]) -> str:
        """Combine all subtask results into a coherent final deliverable."""
        llm = get_llm()
        results_text = "\n\n".join(
            f"### {title}\n{result[:800]}" for title, result in results.items()
        )
        prompt = (
            f"Original goal: {goal}\n\n"
            f"Subtask results:\n{results_text}\n\n"
            "Synthesise these results into a clear, structured final response that directly addresses "
            "the original goal. Include what was accomplished, key outputs, and any next steps."
        )
        return await llm.simple(prompt, system=_CEO_SYSTEM, model=self.model, temperature=0.4)
