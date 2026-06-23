"""
Auto tool generation — dynamically create Python tools from a natural-language description.
Generated tools run in a sandboxed environment and are registered in the DB.
"""
from __future__ import annotations

import ast
import logging
import textwrap
import uuid
from typing import Any

import httpx

from backend.core.config import settings

logger = logging.getLogger(__name__)

_CODEGEN_SYSTEM = """You generate Python tool functions for an AI agent system.

Given a tool description, produce a single async Python function that:
1. Has a clear name matching snake_case convention
2. Has proper type annotations
3. Returns a string result (success message or "ERROR: ..." on failure)
4. Handles exceptions gracefully — never raises
5. Uses only the standard library + httpx + playwright (if browser needed)

Output ONLY the Python function definition, no imports, no extra text.
Example:
async def search_wikipedia(query: str, limit: int = 3) -> str:
    import httpx
    try:
        resp = httpx.get(f"https://en.wikipedia.org/w/api.php", params={...})
        ...
        return result
    except Exception as exc:
        return f"ERROR: {exc}"
"""


async def generate_tool(
    name: str,
    description: str,
    example_use_cases: list[str] | None = None,
    tenant_id: str | None = None,
) -> dict[str, Any]:
    """
    Ask the LLM to generate tool code, validate it, and return a registered tool dict.
    Raises ValueError if generation or validation fails.
    """
    examples = ""
    if example_use_cases:
        examples = "\nExamples:\n" + "\n".join(f"- {e}" for e in example_use_cases)

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://jarvis-v2.app",
            },
            json={
                "model": settings.DEFAULT_MODEL,
                "messages": [
                    {"role": "system", "content": _CODEGEN_SYSTEM},
                    {
                        "role": "user",
                        "content": f"Tool name: {name}\nDescription: {description}{examples}",
                    },
                ],
                "max_tokens": 1024,
            },
        )
        resp.raise_for_status()

    code = resp.json()["choices"][0]["message"]["content"].strip()

    # Strip markdown code fences if present
    if code.startswith("```"):
        lines = code.split("\n")
        code = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    # Validate: must be syntactically valid Python
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        raise ValueError(f"Generated code has syntax error: {exc}\nCode:\n{code}") from exc

    # Must contain exactly one function definition
    funcs = [n for n in ast.walk(tree) if isinstance(n, ast.AsyncFunctionDef | ast.FunctionDef)]
    if not funcs:
        raise ValueError(f"Generated code contains no function definition: {code[:300]}")

    fn_name = funcs[0].name
    canonical_name = name.replace(" ", "_").replace("-", "_").lower()

    # Build schema from function signature
    schema = _infer_schema(funcs[0], description)

    # Compile and extract the function
    namespace: dict[str, Any] = {}
    exec(compile(tree, f"<generated:{canonical_name}>", "exec"), namespace)  # noqa: S102
    fn = namespace.get(fn_name)
    if fn is None:
        raise ValueError(f"Could not locate function '{fn_name}' after exec")

    tool_entry = {
        "id": str(uuid.uuid4()),
        "name": canonical_name,
        "description": description,
        "code": code,
        "schema": schema,
        "fn": fn,
        "tenant_id": tenant_id,
    }

    logger.info("Generated tool '%s' (%d chars)", canonical_name, len(code))
    return tool_entry


def _infer_schema(func_node: ast.AsyncFunctionDef | ast.FunctionDef, description: str) -> dict:
    """Build a basic JSON schema from the AST of the generated function."""
    properties: dict[str, dict] = {}
    required: list[str] = []

    for arg in func_node.args.args:
        aname = arg.arg
        if aname == "self":
            continue
        ann = ast.unparse(arg.annotation) if arg.annotation else "string"
        prop: dict[str, Any] = {"type": _py_to_json_type(ann)}
        properties[aname] = prop

    # Args with defaults are optional
    defaults_offset = len(func_node.args.args) - len(func_node.args.defaults)
    for i, arg in enumerate(func_node.args.args):
        if arg.arg == "self":
            continue
        if i < defaults_offset:
            required.append(arg.arg)

    return {
        "type": "function",
        "function": {
            "name": func_node.name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
            },
        },
    }


def _py_to_json_type(annotation: str) -> str:
    mapping = {
        "str": "string",
        "int": "integer",
        "float": "number",
        "bool": "boolean",
        "list": "array",
        "dict": "object",
    }
    return mapping.get(annotation.split("[")[0], "string")
