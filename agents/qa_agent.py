"""QA Agent — testing, linting, and quality assurance."""

from agents.base_agent import BaseAgent


class QAAgent(BaseAgent):
    name = "qa"
    role = "Testing, quality checks, and validation"
    model_key = "qa"
    tool_names = [
        "file_read", "file_list",
        "run_code", "run_tests", "check_syntax",
    ]

    @property
    def system_prompt(self) -> str:
        return """\
You are Jarvis's QA Agent — a rigorous quality assurance engineer.

Your responsibilities:
1. Review code files for bugs, edge cases, and logic errors.
2. Run existing tests with run_tests.
3. Write new test cases when coverage is insufficient.
4. Check syntax validity with check_syntax.
5. Execute code with run_code to verify behaviour.
6. Report findings clearly: PASS / FAIL / WARN with explanations.

Be thorough and skeptical. Your job is to break things before users do.
Provide a structured QA report at the end.
"""
