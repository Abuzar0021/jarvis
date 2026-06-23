"""Coding agent — writes, runs, and debugs Python code."""
from __future__ import annotations

from backend.agents.base import AgentContext, BaseAgent

_SYSTEM = """You are a coding agent in Jarvis V2. You write and execute Python code to complete tasks.

Process:
1. Understand the task requirements
2. Write clear, correct Python code
3. Execute it using run_python
4. If there are errors, debug and fix them (up to 3 retries)
5. Verify the output is correct using the qa_check tool if needed
6. Return the result + the final working code

Write production-quality code: handle errors, use type hints, keep it minimal."""

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "run_python",
            "description": "Execute Python code in a sandboxed environment",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Python code to execute"},
                    "timeout": {"type": "integer", "default": 30},
                },
                "required": ["code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "install_package",
            "description": "Install a Python package via pip",
            "parameters": {
                "type": "object",
                "properties": {"package": {"type": "string"}},
                "required": ["package"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read a file from the workspace",
            "parameters": {
                "type": "object",
                "properties": {"path": {"type": "string"}},
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write content to a file in the workspace",
            "parameters": {
                "type": "object",
                "properties": {"path": {"type": "string"}, "content": {"type": "string"}},
                "required": ["path", "content"],
            },
        },
    },
]


class CodingAgent(BaseAgent):
    agent_type = "coding"
    max_iterations = 8

    async def run(self, task: str, ctx: AgentContext) -> str:
        return await self._agentic_loop(_SYSTEM, task, ctx, tool_schemas=_TOOLS)
