"""Built-in code execution tools — sandboxed Python runner."""
from __future__ import annotations

import asyncio
import io
import logging
import subprocess
import sys
import tempfile
import traceback
from pathlib import Path

from backend.core.config import settings
from backend.tools.registry import tool

logger = logging.getLogger(__name__)

_RUN_SCHEMA = {
    "type": "function",
    "function": {
        "name": "run_python",
        "description": "Execute Python code in a sandboxed environment. Returns stdout + stderr + exit code.",
        "parameters": {
            "type": "object",
            "properties": {
                "code": {"type": "string"},
                "timeout": {"type": "integer", "default": 30},
            },
            "required": ["code"],
        },
    },
}

_INSTALL_SCHEMA = {
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
}

_FILE_READ_SCHEMA = {
    "type": "function",
    "function": {
        "name": "read_file",
        "description": "Read a file from the workspace",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "max_chars": {"type": "integer", "default": 10000},
            },
            "required": ["path"],
        },
    },
}

_FILE_WRITE_SCHEMA = {
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
}


@tool(schema=_RUN_SCHEMA, is_sandbox=True)
async def run_python(code: str, timeout: int = 30) -> str:
    """Run Python code in a subprocess with timeout + output capture."""
    timeout = min(timeout, settings.SANDBOX_TIMEOUT_SECONDS)

    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(code)
        tmp = f.name

    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, tmp,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return f"ERROR: execution timed out after {timeout}s"

        out = stdout.decode(errors="replace")
        err = stderr.decode(errors="replace")
        rc = proc.returncode

        if rc != 0:
            return f"Exit {rc}\nSTDOUT:\n{out[:2000]}\nSTDERR:\n{err[:2000]}"
        return out[:5000] or "(no output)"

    finally:
        Path(tmp).unlink(missing_ok=True)


@tool(schema=_INSTALL_SCHEMA)
async def install_package(package: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        sys.executable, "-m", "pip", "install", "--quiet", package,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
    if proc.returncode == 0:
        return f"✓ Installed {package}"
    return f"ERROR installing {package}: {stderr.decode(errors='replace')[:500]}"


@tool(schema=_FILE_READ_SCHEMA)
async def read_file(path: str, max_chars: int = 10000) -> str:
    p = Path(path)
    if not p.exists():
        return f"ERROR: file not found: {path}"
    if not p.is_file():
        return f"ERROR: not a file: {path}"
    try:
        return p.read_text(errors="replace")[:max_chars]
    except Exception as exc:
        return f"ERROR: {exc}"


@tool(schema=_FILE_WRITE_SCHEMA)
async def write_file(path: str, content: str) -> str:
    try:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content)
        return f"✓ Written {len(content)} chars to {path}"
    except Exception as exc:
        return f"ERROR: {exc}"
