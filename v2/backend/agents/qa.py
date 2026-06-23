"""QA agent — verifies outputs, runs tests, checks correctness."""
from __future__ import annotations

from backend.agents.base import AgentContext, BaseAgent

_SYSTEM = """You are a QA verification agent in Jarvis V2.

Your job is to verify that a task was completed correctly:
1. Review the output against the original requirements
2. Run any code or tests that were produced
3. Check for edge cases and errors
4. Return a clear PASS or FAIL verdict with reasoning

Be thorough but honest. A partial pass is a fail. Never claim success on untested code."""

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "run_python",
            "description": "Execute Python code to verify outputs",
            "parameters": {
                "type": "object",
                "properties": {"code": {"type": "string"}, "timeout": {"type": "integer", "default": 30}},
                "required": ["code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_tests",
            "description": "Run a test file and return results",
            "parameters": {
                "type": "object",
                "properties": {"test_file": {"type": "string"}, "flags": {"type": "string", "default": "-v"}},
                "required": ["test_file"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_url",
            "description": "Verify a URL is reachable and returns expected content",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string"},
                    "expected_text": {"type": "string", "default": ""},
                    "expected_status": {"type": "integer", "default": 200},
                },
                "required": ["url"],
            },
        },
    },
]


class QAAgent(BaseAgent):
    agent_type = "qa"
    max_iterations = 5

    async def run(self, task: str, ctx: AgentContext) -> str:
        return await self._agentic_loop(_SYSTEM, task, ctx, tool_schemas=_TOOLS)
