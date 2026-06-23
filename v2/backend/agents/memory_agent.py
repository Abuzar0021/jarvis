"""Memory agent — semantic search and knowledge management."""
from __future__ import annotations

import json
import logging

from backend.agents.base import AgentContext, BaseAgent

logger = logging.getLogger(__name__)

_SYSTEM = """You are the memory agent in Jarvis V2. You manage the knowledge base.

You can:
- Search for relevant past knowledge using semantic queries
- Store new insights, facts, and results
- Update or invalidate outdated information
- Summarize knowledge for other agents

Always be precise about what you know vs. don't know."""

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "memory_search",
            "description": "Search the knowledge base for relevant information",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "kind": {"type": "string", "enum": ["fact", "goal", "result", "insight", "all"], "default": "all"},
                    "limit": {"type": "integer", "default": 10},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "store_memory",
            "description": "Store information in the knowledge base",
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {"type": "string"},
                    "kind": {"type": "string", "enum": ["fact", "goal", "result", "insight"]},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "importance": {"type": "number", "minimum": 0, "maximum": 1, "default": 0.5},
                },
                "required": ["content", "kind"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "memory_recent",
            "description": "Get recent activities and stored knowledge",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "default": 20}},
            },
        },
    },
]


class MemoryAgent(BaseAgent):
    agent_type = "memory"
    max_iterations = 4

    async def run(self, task: str, ctx: AgentContext) -> str:
        return await self._agentic_loop(_SYSTEM, task, ctx, tool_schemas=_TOOLS)
