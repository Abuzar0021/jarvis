"""Terminal execution tool — runs shell commands (requires approval)."""

import asyncio
import shlex
from typing import Optional

from tools import register
from core.logger import get_logger

logger = get_logger("jarvis.tools.terminal")

_BLOCKED = {
    "rm -rf /", "rm -rf ~", "mkfs", "dd if=/dev/zero",
    ":(){ :|:& };:", "shutdown", "reboot", "halt",
}


def _is_blocked(cmd: str) -> bool:
    lower = cmd.lower()
    return any(b in lower for b in _BLOCKED)


@register(
    schema={
        "type": "function",
        "function": {
            "name": "run_terminal",
            "description": (
                "Execute a shell command and return stdout/stderr. "
                "DANGEROUS — requires user approval. Do not use for destructive operations."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Shell command to run"},
                    "cwd": {
                        "type": "string",
                        "description": "Working directory (optional)",
                        "default": None,
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "Timeout in seconds (default 60)",
                        "default": 60,
                    },
                },
                "required": ["command"],
            },
        },
    },
    dangerous=True,
)
async def run_terminal(command: str, cwd: Optional[str] = None, timeout: int = 60) -> str:
    if _is_blocked(command):
        return f"ERROR: command blocked by safety policy: {command}"

    logger.info(f"run_terminal: {command!r} cwd={cwd}")
    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return f"ERROR: command timed out after {timeout}s"

        out = stdout.decode("utf-8", errors="replace").strip()
        err = stderr.decode("utf-8", errors="replace").strip()
        rc = proc.returncode

        parts = [f"exit_code: {rc}"]
        if out:
            parts.append(f"stdout:\n{out}")
        if err:
            parts.append(f"stderr:\n{err}")
        return "\n".join(parts)
    except Exception as exc:
        return f"ERROR: {exc}"


@register(
    schema={
        "type": "function",
        "function": {
            "name": "install_package",
            "description": "Install a Python package via pip. DANGEROUS — requires user approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "package": {"type": "string", "description": "Package name (optionally with version)"},
                },
                "required": ["package"],
            },
        },
    },
    dangerous=True,
)
async def install_package(package: str) -> str:
    safe_name = shlex.quote(package)
    return await run_terminal(f"pip install {safe_name}")
