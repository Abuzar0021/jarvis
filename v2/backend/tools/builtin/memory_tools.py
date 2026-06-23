"""Memory tools — store/search the knowledge base."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from backend.tools.registry import tool

logger = logging.getLogger(__name__)

_STORE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "store_memory",
        "description": "Store information in the persistent knowledge base",
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
}

_SEARCH_SCHEMA = {
    "type": "function",
    "function": {
        "name": "memory_search",
        "description": "Search the knowledge base for relevant information",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "kind": {"type": "string", "default": "all"},
                "limit": {"type": "integer", "default": 10},
            },
            "required": ["query"],
        },
    },
}

_RECENT_SCHEMA = {
    "type": "function",
    "function": {
        "name": "memory_recent",
        "description": "Get recent stored memories",
        "parameters": {
            "type": "object",
            "properties": {"limit": {"type": "integer", "default": 20}},
        },
    },
}

# These are thin wrappers — actual DB access is injected by the workflow engine
# via ctx.tools so tenant isolation is maintained.

@tool(schema=_STORE_SCHEMA)
async def store_memory(content: str, kind: str = "fact", tags: list | None = None, importance: float = 0.5) -> str:
    return f"✓ Stored memory [{kind}]: {content[:80]}..."


@tool(schema=_SEARCH_SCHEMA)
async def memory_search(query: str, kind: str = "all", limit: int = 10) -> str:
    return f"Memory search for '{query}' — results injected by workflow engine"


@tool(schema=_RECENT_SCHEMA)
async def memory_recent(limit: int = 20) -> str:
    return "Recent memories — results injected by workflow engine"
