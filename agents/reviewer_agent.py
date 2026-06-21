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
    tool_names = []

    PASS_THRESHOLD: int = 80
    REVISION_THRESHOLD: int = 60

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
        try:
            raw = await self.llm.simple(
                prompt=prompt,
                system=_REVIEW_SYSTEM,
                model=self.model,
                temperature=0.15,
            )
            result = self._parse(raw)
        except Exception as exc:
            logger.warning(f"[reviewer] LLM unavailable, using heuristic: {exc}")
            result = self._heuristic_review(task, output)
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

    def _heuristic_review(self, task: str, output: str) -> dict:
        """Score output heuristically when the LLM is unavailable."""
        score = 50
        issues = []
        strengths = []

        if len(output) > 50:
            score += 15
            strengths.append("Non-trivial output length")
        else:
            issues.append("Output is very short")

        if any(w in output.lower() for w in ("error", "failed", "exception", "traceback")):
            score -= 20
            issues.append("Output contains error indicators")

        task_words = set(task.lower().split())
        output_words = set(output.lower().split())
        overlap = len(task_words & output_words) / max(len(task_words), 1)
        if overlap > 0.3:
            score += 10
            strengths.append("Output is topically relevant to task")

        score = max(0, min(100, score))
        verdict = (
            "approved" if score >= self.PASS_THRESHOLD
            else "revision_needed" if score >= self.REVISION_THRESHOLD
            else "failed"
        )
        return {
            "score": score,
            "verdict": verdict,
            "issues": issues,
            "strengths": strengths,
            "suggestion": "LLM unavailable — heuristic review only",
        }

    def passed(self, review: dict) -> bool:
        return review.get("score", 0) >= self.PASS_THRESHOLD
