"""
Tool registry — schema-validated, tenant-scoped.
Supports built-in tools and dynamically generated tools.
"""
from __future__ import annotations

import hashlib
import json
import logging
from typing import Any, Callable

import jsonschema

logger = logging.getLogger(__name__)

# Tool entry: {fn, schema, is_sandbox, call_count}
_GLOBAL_TOOLS: dict[str, dict] = {}


def register(
    fn: Callable,
    schema: dict,
    is_sandbox: bool = False,
) -> None:
    """Register a tool globally (available to all tenants)."""
    name = schema.get("function", {}).get("name") or fn.__name__
    _GLOBAL_TOOLS[name] = {
        "fn": fn,
        "schema": schema,
        "is_sandbox": is_sandbox,
        "call_count": 0,
        "error_count": 0,
    }
    logger.debug("Registered tool: %s", name)


def tool(schema: dict, is_sandbox: bool = False):
    """Decorator version of register."""
    def decorator(fn: Callable) -> Callable:
        register(fn, schema, is_sandbox)
        return fn
    return decorator


def get_tool(name: str, tenant_id: str | None = None) -> Callable | None:
    entry = _GLOBAL_TOOLS.get(name)
    if entry:
        return entry["fn"]
    # TODO: load tenant-specific generated tools from DB
    return None


def get_all_tools(tenant_id: str | None = None) -> dict[str, Callable]:
    return {name: entry["fn"] for name, entry in _GLOBAL_TOOLS.items()}


def get_schemas(tenant_id: str | None = None) -> list[dict]:
    return [entry["schema"] for entry in _GLOBAL_TOOLS.values()]


def validate_call(tool_name: str, arguments: dict) -> None:
    """Raise jsonschema.ValidationError if arguments don't match the schema."""
    entry = _GLOBAL_TOOLS.get(tool_name)
    if not entry:
        raise ValueError(f"Unknown tool: {tool_name}")
    params_schema = entry["schema"].get("function", {}).get("parameters", {})
    if params_schema:
        jsonschema.validate(arguments, params_schema)


def record_call(tool_name: str, success: bool) -> None:
    entry = _GLOBAL_TOOLS.get(tool_name)
    if entry:
        entry["call_count"] += 1
        if not success:
            entry["error_count"] += 1


def stats() -> list[dict]:
    return [
        {
            "name": name,
            "call_count": e["call_count"],
            "error_count": e["error_count"],
            "error_rate": e["error_count"] / max(e["call_count"], 1),
        }
        for name, e in _GLOBAL_TOOLS.items()
    ]
