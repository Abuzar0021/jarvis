"""
Tool registry — all tool schemas and handlers live here.
Agents import TOOL_REGISTRY to get their allowed tools.
"""

from __future__ import annotations

import json
from typing import Any, Callable, Awaitable

from core.logger import get_logger

logger = get_logger("jarvis.tools")

# Registry: name → {schema, handler, dangerous}
TOOL_REGISTRY: dict[str, dict] = {}


def register(schema: dict, dangerous: bool = False):
    """Decorator: register an async function as a named tool."""

    def decorator(fn: Callable[..., Awaitable[str]]):
        name = schema["function"]["name"]
        TOOL_REGISTRY[name] = {
            "schema": schema,
            "handler": fn,
            "dangerous": dangerous,
        }
        return fn

    return decorator


def get_schemas(names: list[str]) -> list[dict]:
    """Return the OpenAI tool-schema objects for the given tool names."""
    return [TOOL_REGISTRY[n]["schema"] for n in names if n in TOOL_REGISTRY]


async def call_tool(name: str, memory=None, **kwargs) -> str:
    """Execute a registered tool by name."""
    if name not in TOOL_REGISTRY:
        return f"ERROR: unknown tool '{name}'"
    handler = TOOL_REGISTRY[name]["handler"]
    return await handler(**kwargs)


# Import all tool modules so their @register decorators fire
from tools import file_system, terminal, search, code_runner, browser, email_tool, vision_tools, computer_tools, browser_tools, lead_tools  # noqa: E402, F401
