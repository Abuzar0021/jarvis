"""
Self-improving optimizer agent.
Analyzes performance metrics, identifies failure patterns,
and proposes + tests prompt tuning improvements.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from backend.agents.base import AgentContext, BaseAgent
from backend.core.events import Event, EventType

logger = logging.getLogger(__name__)

_SYSTEM = """You are the self-improvement optimizer for Jarvis V2.

Your job is to analyze execution history and improve system performance by:
1. Identifying failure patterns in workflow executions
2. Proposing improved system prompts for underperforming agents
3. Suggesting new tools that would address common failures
4. Testing improvements against historical benchmarks

You have access to performance metrics, failure logs, and agent configurations.
Be conservative — only propose changes with clear evidence of improvement potential.
Always output a structured analysis with specific, actionable recommendations."""

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_performance_metrics",
            "description": "Get performance statistics for agents over a time period",
            "parameters": {
                "type": "object",
                "properties": {
                    "agent_type": {"type": "string"},
                    "days": {"type": "integer", "default": 7},
                    "metric": {"type": "string", "enum": ["success_rate", "duration_ms", "token_usage", "all"]},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_failure_log",
            "description": "Get recent workflow failures with error details",
            "parameters": {
                "type": "object",
                "properties": {
                    "agent_type": {"type": "string", "default": ""},
                    "limit": {"type": "integer", "default": 20},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "propose_prompt_tuning",
            "description": "Propose an improved system prompt for an agent",
            "parameters": {
                "type": "object",
                "properties": {
                    "agent_type": {"type": "string"},
                    "new_prompt": {"type": "string"},
                    "rationale": {"type": "string"},
                    "expected_improvement": {"type": "string"},
                },
                "required": ["agent_type", "new_prompt", "rationale"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_tool",
            "description": "Request auto-generation of a new tool to address a capability gap",
            "parameters": {
                "type": "object",
                "properties": {
                    "tool_name": {"type": "string"},
                    "description": {"type": "string"},
                    "rationale": {"type": "string"},
                    "example_use_cases": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["tool_name", "description", "rationale"],
            },
        },
    },
]


class OptimizerAgent(BaseAgent):
    agent_type = "optimizer"
    max_iterations = 6

    async def run(self, task: str, ctx: AgentContext) -> str:
        result = await self._agentic_loop(_SYSTEM, task, ctx, tool_schemas=_TOOLS)
        # Emit self-improvement event for audit trail
        await ctx.bus.publish(Event(
            type=EventType.SELF_IMPROVEMENT,
            tenant_id=ctx.tenant_id,
            workflow_id=ctx.workflow_id,
            data={"analysis": result[:500]},
        ))
        return result
