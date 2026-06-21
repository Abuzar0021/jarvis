"""Task Planner — uses the LLM to decompose a high-level goal into subtasks."""

import json
import re
from typing import Optional

from core.llm_client import get_llm
from core.logger import get_logger
from config import MODELS, MAX_SUBTASKS

logger = get_logger("jarvis.planner")

_PLANNER_SYSTEM = """\
You are an expert project planner working inside the Jarvis AI operating system.

Available specialist agents and their strengths:
- research:   web search, information gathering, summarising findings, multi-source reports
- coding:     writing, refactoring, and reviewing code
- qa:         running tests, linting, quality checks
- debug:      diagnosing and fixing errors/bugs
- deployment: packaging, deploying, writing Docker/CI/CD config
- marketing:  drafting marketing copy, positioning, campaign ideas
- outreach:   drafting outreach emails or social posts
- data:       data analysis, charts, statistics, pandas/SQL work
- factory:    creating or modifying other AI agents
- computer:   OS automation — opening/closing apps, keyboard, mouse, screenshots
- browser:    headless browser — visiting URLs, form filling, web scraping
- vision:     screen/webcam analysis — reading what is on screen

Break the user's goal into concrete, self-contained subtasks.
Each subtask must be assignable to exactly one agent.

Respond ONLY with a valid JSON array. No markdown fences, no explanation.
Schema per subtask:
{
  "title":        "<short title>",
  "description":  "<detailed what / why / expected output>",
  "agent":        "<one of the agent names above>",
  "priority":     <1-5, 5=highest>,
  "dependencies": ["<title of prerequisite subtask>", ...]
}
"""


class TaskPlanner:
    def __init__(self) -> None:
        self.llm = get_llm()

    async def plan(self, goal: str, context: str = "") -> list[dict]:
        """Return an ordered list of subtask dicts for the given goal."""
        user_msg = f"Goal: {goal}"
        if context:
            user_msg += f"\n\nAdditional context:\n{context}"

        logger.info(f"Planning goal: {goal[:80]}…")

        raw = await self.llm.simple(
            prompt=user_msg,
            system=_PLANNER_SYSTEM,
            model=MODELS["ceo"],
            temperature=0.3,
        )

        subtasks = self._parse_json(raw)

        # Cap number of subtasks
        if len(subtasks) > MAX_SUBTASKS:
            logger.warning(f"Plan has {len(subtasks)} subtasks; capping at {MAX_SUBTASKS}")
            subtasks = subtasks[:MAX_SUBTASKS]

        logger.info(f"Plan ready: {len(subtasks)} subtasks")
        return subtasks

    def _parse_json(self, raw: str) -> list[dict]:
        # Strip markdown fences if present
        raw = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.MULTILINE)
        raw = re.sub(r"```$", "", raw.strip(), flags=re.MULTILINE)
        try:
            data = json.loads(raw.strip())
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "subtasks" in data:
                return data["subtasks"]
        except json.JSONDecodeError as exc:
            logger.error(f"Failed to parse plan JSON: {exc}\nRaw:\n{raw[:300]}")
        return []


_planner: Optional[TaskPlanner] = None


def get_planner() -> TaskPlanner:
    global _planner
    if _planner is None:
        _planner = TaskPlanner()
    return _planner
