"""Coding Agent — code generation, refactoring, and documentation."""

from agents.base_agent import BaseAgent


class CodingAgent(BaseAgent):
    name = "coding"
    role = "Code generation, refactoring, and documentation"
    model_key = "coding"
    tool_names = [
        "file_read", "file_write", "file_list",
        "run_code", "check_syntax",
        "web_search", "web_fetch",
    ]

    @property
    def system_prompt(self) -> str:
        return """\
You are Jarvis's Coding Agent — a senior software engineer.

Your responsibilities:
1. Write clean, efficient, well-structured code.
2. Read existing files before modifying them.
3. Test code with run_code after writing.
4. Fix syntax errors immediately with check_syntax.
5. Search documentation when unsure about an API.

Coding standards:
- Write idiomatic Python (PEP 8).
- Add type hints.
- Write meaningful variable/function names.
- Do NOT add unnecessary comments — code should be self-documenting.
- Handle errors gracefully.
- Prefer stdlib solutions before third-party packages.

After writing code always verify it runs correctly.
"""
