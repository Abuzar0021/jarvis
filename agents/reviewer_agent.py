"""
ReviewerAgent — peer-reviews any agent output and scores it 0-100.

Used by the orchestrator after each task to gate quality.
If score < PASS_THRESHOLD, the output is flagged for revision.
"""

from __future__ import annotations

import json
import re
from typing import Optional

from agents.base_agent import BaseAgent
from core.logger import get_logger

logger = get_logger("jarvis.reviewer")

PASS_THRESHOLD = 80  # scores below this trigger a revision request

_REVIEW_SYSTEM = """\
You are Jarvis Reviewer — a senior quality assurance agent.

Your job: critically evaluate another agent's output against the original task.

## Evaluation criteria
1. **Completeness** — does the output fully address every part of the task?
2. **Accuracy** — are all stated facts correct and sourced where needed?
3. **Clarity** — is the output well-structured and easy to understand?
4. **Hallucinations** — are there unsupported claims or invented details?
5. **Missing steps** — are there obvious gaps, assumptions, or unaddressed edge cases?
6. **Actionability** — if the task required a deliverable, is it usable as-is?

## Scoring
- 90-100: Excellent — ship it
- 80-89:  Good — minor issues, acceptable
- 70-79:  Acceptable — notable gaps, revision recommended
- 50-69:  Poor — significant problems, revision required
- 0-49:   Failed — must be completely redone

## Response format
Respond with ONLY valid JSON (no markdown fences):
{
  "score": <integer 0-100>,
  "verdict": "approved" | "revision_needed" | "failed",
  "issues": ["<specific issue 1>", "<specific issue 2>"],
  "strengths": ["<strength 1>", "<strength 2>"],
  "suggestion": "<concrete improvement instruction if revision_needed or failed>"
}
"""


class ReviewerAgent(BaseAgent):
    name = "reviewer"
    role = "Quality assurance — scores agent outputs and flags revisions"
    model_key = "default"
    tool_names = []  # Reviewer works only with LLM reasoning

    @property
    def system_prompt(self) -> str:
        return _REVIEW_SYSTEM

    async def review(
        self,
        task: str,
        output: str,
        agent_name: str = "unknown",
    ) -> dict:
        """
        Review agent output against the original task.

        Returns:
            {score, verdict, issues, strengths, suggestion}
        """
        prompt = (
            f"## Original task\n{task}\n\n"
            f"## Produced by agent: {agent_name}\n\n"
            f"## Output to review\n{output[:3000]}"
        )
        raw = await self.llm.simple(
            prompt=prompt,
            system=_REVIEW_SYSTEM,
            model=self.model,
            temperature=0.15,
        )
        result = self._parse(raw)
        logger.info(
            f"[reviewer] {agent_name} → score={result['score']} verdict={result['verdict']}"
        )
        return result

    def _parse(self, raw: str) -> dict:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
                # Ensure required fields
                data.setdefault("score", 50)
                data.setdefault("verdict", "revision_needed")
                data.setdefault("issues", [])
                data.setdefault("strengths", [])
                data.setdefault("suggestion", "")
                return data
            except json.JSONDecodeError:
                pass
        return {
            "score": 50,
            "verdict": "revision_needed",
            "issues": ["Could not parse reviewer output"],
            "strengths": [],
            "suggestion": raw[:400],
        }

    def passed(self, review: dict) -> bool:
        return review.get("score", 0) >= PASS_THRESHOLD
