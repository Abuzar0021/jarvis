"""Code execution and testing tools."""

import asyncio
import sys
import tempfile
import textwrap
from pathlib import Path

from tools import register
from config import CODE_EXEC_TIMEOUT
from core.logger import get_logger

logger = get_logger("jarvis.tools.code")


@register(
    schema={
        "type": "function",
        "function": {
            "name": "run_code",
            "description": (
                "Execute a Python code snippet in an isolated subprocess and return output. "
                "Suitable for testing small scripts, calculations, data processing."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Python source code to execute"},
                    "timeout": {
                        "type": "integer",
                        "description": f"Max execution time in seconds (default {CODE_EXEC_TIMEOUT})",
                        "default": CODE_EXEC_TIMEOUT,
                    },
                },
                "required": ["code"],
            },
        },
    },
    dangerous=False,
)
async def run_code(code: str, timeout: int = CODE_EXEC_TIMEOUT) -> str:
    logger.info(f"run_code ({len(code)} chars)")

    def _run() -> str:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False, encoding="utf-8"
        ) as f:
            f.write(textwrap.dedent(code))
            tmp_path = f.name

        try:
            import subprocess

            result = subprocess.run(
                [sys.executable, tmp_path],
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            out = result.stdout.strip()
            err = result.stderr.strip()
            parts = [f"exit_code: {result.returncode}"]
            if out:
                parts.append(f"stdout:\n{out}")
            if err:
                parts.append(f"stderr:\n{err}")
            return "\n".join(parts)
        except subprocess.TimeoutExpired:
            return f"ERROR: code execution timed out after {timeout}s"
        except Exception as exc:
            return f"ERROR: {exc}"
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    return await asyncio.to_thread(_run)


@register(
    schema={
        "type": "function",
        "function": {
            "name": "run_tests",
            "description": "Run pytest on a file or directory and return the results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "File or directory to run tests on",
                    },
                    "flags": {
                        "type": "string",
                        "description": "Extra pytest flags e.g. '-v -x'",
                        "default": "-v",
                    },
                },
                "required": ["path"],
            },
        },
    },
    dangerous=False,
)
async def run_tests(path: str, flags: str = "-v") -> str:
    logger.info(f"run_tests: {path} {flags}")

    def _run() -> str:
        import subprocess

        cmd = [sys.executable, "-m", "pytest", path] + flags.split()
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            out = result.stdout.strip()
            err = result.stderr.strip()
            parts = [f"exit_code: {result.returncode}"]
            if out:
                parts.append(out)
            if err:
                parts.append(err)
            return "\n".join(parts)
        except subprocess.TimeoutExpired:
            return "ERROR: tests timed out after 120s"
        except Exception as exc:
            return f"ERROR: {exc}"

    return await asyncio.to_thread(_run)


@register(
    schema={
        "type": "function",
        "function": {
            "name": "check_syntax",
            "description": "Check Python syntax of a code string without executing it.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Python source to check"},
                },
                "required": ["code"],
            },
        },
    },
    dangerous=False,
)
async def check_syntax(code: str) -> str:
    import ast

    try:
        ast.parse(code)
        return "OK: syntax is valid"
    except SyntaxError as exc:
        return f"SyntaxError at line {exc.lineno}: {exc.msg}"
