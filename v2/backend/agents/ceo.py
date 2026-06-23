"""
CEO / Orchestrator Agent.
Decomposes a high-level goal into a structured plan,
dispatches sub-agents, retries failures, synthesises the result.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from backend.agents.base import AgentContext, BaseAgent
from backend.core.events import Event, EventType

logger = logging.getLogger(__name__)

_PLANNER_SYSTEM = """You are the CEO orchestrator of Jarvis V2, an autonomous AI operating system.

Your job: decompose a user goal into a clear, minimal plan of steps.
Each step has:  agent_type, description, depends_on (list of step indices).

Available agent types:
  research   — web search, fact-finding, summarization
  coding     — write/run/test Python code
  browser    — navigate websites, fill forms, extract data
  qa         — verify outputs, check correctness, run tests
  memory     — store/retrieve knowledge across workflows
  os         — run shell commands, manage files

Rules:
- Prefer fewer, larger steps over many tiny ones.
- Only use browser if research is insufficient.
- Always end with a synthesis step that combines results.
- Output ONLY valid JSON matching this schema:
  {"steps": [{"index": 0, "agent_type": "...", "description": "...", "depends_on": []}]}
"""

_SYNTHESISER_SYSTEM = """You are the final synthesis stage of Jarvis V2.
Given a user goal and the results from each execution step, produce a clear, direct final answer.
Be concise. State what was accomplished. If anything failed, be honest about it."""

_RETRY_SYSTEM = """A step in the execution plan failed. Analyze the error and produce a corrected plan.
Output the same JSON plan format as before. You may simplify, skip, or replace the failed step."""


class CEOAgent(BaseAgent):
    agent_type = "ceo"

    async def run(self, goal: str, ctx: AgentContext) -> str:
        # 1. Plan
        plan = await self._plan(goal, ctx)
        if not plan:
            return "ERROR: Planner produced no steps"

        # 2. Execute in dependency order
        results: dict[int, str] = {}
        for step in self._topological_order(plan["steps"]):
            idx = step["index"]
            dep_context = {str(i): results.get(i, "") for i in step.get("depends_on", [])}

            await ctx.bus.publish(Event(
                type=EventType.WORKFLOW_STEP_STARTED,
                tenant_id=ctx.tenant_id,
                workflow_id=ctx.workflow_id,
                data={"step": idx, "agent_type": step["agent_type"], "description": step["description"]},
            ))

            result = await self._run_step(step, dep_context, ctx)

            if result.startswith("ERROR:"):
                # Attempt one retry with a corrected plan for this step
                logger.warning("Step %d failed: %s — attempting auto-repair", idx, result)
                repaired = await self._repair_step(step, result, goal, ctx)
                if repaired and not repaired.startswith("ERROR:"):
                    result = repaired
                else:
                    logger.error("Repair failed for step %d — continuing with error", idx)

            results[idx] = result

            await ctx.bus.publish(Event(
                type=EventType.WORKFLOW_STEP_COMPLETED,
                tenant_id=ctx.tenant_id,
                workflow_id=ctx.workflow_id,
                data={"step": idx, "result_snippet": result[:200], "failed": result.startswith("ERROR:")},
            ))

        # 3. Synthesise
        if len(results) == 1:
            return next(iter(results.values()))

        return await self._synthesise(goal, plan["steps"], results, ctx)

    async def _plan(self, goal: str, ctx: AgentContext) -> dict | None:
        memory_context = ""
        if ctx.memory:
            items = ctx.memory[:5]
            memory_context = "\n\nRelevant memory:\n" + "\n".join(
                f"- [{m['kind']}] {m['content']}" for m in items
            )

        response = await self._llm(
            [
                {"role": "system", "content": _PLANNER_SYSTEM},
                {"role": "user", "content": f"Goal: {goal}{memory_context}"},
            ],
            ctx,
        )
        raw = response["choices"][0]["message"]["content"].strip()

        # Extract JSON even if the model adds prose
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start == -1 or end == 0:
            logger.error("Planner produced no JSON: %s", raw[:300])
            return {"steps": [{"index": 0, "agent_type": "research", "description": goal, "depends_on": []}]}

        try:
            plan = json.loads(raw[start:end])
            if not plan.get("steps"):
                raise ValueError("Empty steps")
            return plan
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error("Plan parse error: %s — raw: %s", exc, raw[:300])
            return {"steps": [{"index": 0, "agent_type": "research", "description": goal, "depends_on": []}]}

    def _topological_order(self, steps: list[dict]) -> list[dict]:
        """Kahn's algorithm — returns steps in execution order."""
        idx_map = {s["index"]: s for s in steps}
        in_degree: dict[int, int] = {s["index"]: len(s.get("depends_on", [])) for s in steps}
        queue = [s for s in steps if in_degree[s["index"]] == 0]
        result = []

        while queue:
            node = queue.pop(0)
            result.append(node)
            for s in steps:
                if node["index"] in s.get("depends_on", []):
                    in_degree[s["index"]] -= 1
                    if in_degree[s["index"]] == 0:
                        queue.append(s)

        return result if len(result) == len(steps) else steps  # fallback: original order

    async def _run_step(self, step: dict, dep_results: dict, ctx: AgentContext) -> str:
        from backend.agents.registry import get_agent
        agent = get_agent(step["agent_type"])
        if agent is None:
            return f"ERROR: Unknown agent type '{step['agent_type']}'"

        task = step["description"]
        if dep_results:
            task += "\n\nContext from previous steps:\n" + "\n".join(
                f"Step {k}: {v[:500]}" for k, v in dep_results.items()
            )

        return await agent.execute(task, ctx)

    async def _repair_step(self, failed_step: dict, error: str, goal: str, ctx: AgentContext) -> str:
        """Ask the LLM to suggest a corrected single step and run it."""
        response = await self._llm(
            [
                {"role": "system", "content": _RETRY_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Goal: {goal}\n"
                        f"Failed step: {json.dumps(failed_step)}\n"
                        f"Error: {error}\n"
                        "Provide a single corrected step as JSON: "
                        '{"index": N, "agent_type": "...", "description": "...", "depends_on": []}'
                    ),
                },
            ],
            ctx,
        )
        raw = response["choices"][0]["message"]["content"].strip()
        start, end = raw.find("{"), raw.rfind("}") + 1
        if start == -1:
            return error

        try:
            repaired_step = json.loads(raw[start:end])
            repaired_step["index"] = failed_step["index"]
            return await self._run_step(repaired_step, {}, ctx)
        except Exception as exc:
            logger.warning("Repair parse error: %s", exc)
            return error

    async def _synthesise(
        self,
        goal: str,
        steps: list[dict],
        results: dict[int, str],
        ctx: AgentContext,
    ) -> str:
        steps_summary = "\n".join(
            f"Step {s['index']} [{s['agent_type']}] {s['description']}:\n{results.get(s['index'], 'skipped')[:600]}"
            for s in steps
        )
        response = await self._llm(
            [
                {"role": "system", "content": _SYNTHESISER_SYSTEM},
                {
                    "role": "user",
                    "content": f"Goal: {goal}\n\nStep results:\n{steps_summary}",
                },
            ],
            ctx,
        )
        return response["choices"][0]["message"]["content"].strip()
