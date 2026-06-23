"""Research agent — web search, summarization, fact extraction."""
from __future__ import annotations

from backend.agents.base import AgentContext, BaseAgent

_SYSTEM = """You are a research agent in Jarvis V2. Your job is to find accurate, up-to-date information.

When given a research task:
1. Break it into specific search queries
2. Use the search and fetch tools to gather data
3. Cross-reference multiple sources
4. Return a structured, factual summary

Be precise. Cite sources. Flag uncertainty clearly."""

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for current information",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "num_results": {"type": "integer", "default": 5},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_url",
            "description": "Fetch and extract text content from a URL",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string"}, "selector": {"type": "string", "default": "body"}},
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "store_memory",
            "description": "Store an important finding in persistent memory",
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {"type": "string"},
                    "kind": {"type": "string", "enum": ["fact", "insight", "result"]},
                    "tags": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["content", "kind"],
            },
        },
    },
]


class ResearchAgent(BaseAgent):
    agent_type = "research"
    max_iterations = 6

    async def run(self, task: str, ctx: AgentContext) -> str:
        return await self._agentic_loop(_SYSTEM, task, ctx, tool_schemas=_TOOLS)
