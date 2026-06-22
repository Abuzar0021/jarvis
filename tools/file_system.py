"""File-system tools — read, write, list, delete (delete requires approval)."""

import os
from pathlib import Path

import aiofiles

from tools import register
from core.logger import get_logger

logger = get_logger("jarvis.tools.fs")


# ── file_read ─────────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "file_read",
            "description": "Read the contents of a file on the local filesystem.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Absolute or relative file path"},
                    "max_chars": {
                        "type": "integer",
                        "description": "Maximum characters to return (default 8000)",
                        "default": 8000,
                    },
                },
                "required": ["path"],
            },
        },
    },
    dangerous=False,
)
async def file_read(path: str, max_chars: int = 8000) -> str:
    p = Path(path).expanduser()
    if not p.exists():
        return f"ERROR: file not found: {path}"
    if not p.is_file():
        return f"ERROR: not a file: {path}"
    try:
        async with aiofiles.open(p, "r", encoding="utf-8", errors="replace") as f:
            content = await f.read(max_chars)
        logger.debug(f"file_read {path} ({len(content)} chars)")
        return content
    except Exception as exc:
        return f"ERROR reading {path}: {exc}"


# ── file_write ────────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "file_write",
            "description": "Write content to a file. Creates parent directories if needed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "File path to write to"},
                    "content": {"type": "string", "description": "Content to write"},
                    "mode": {
                        "type": "string",
                        "enum": ["w", "a"],
                        "description": "'w' to overwrite (default), 'a' to append",
                        "default": "w",
                    },
                },
                "required": ["path", "content"],
            },
        },
    },
    dangerous=False,
)
async def file_write(path: str, content: str, mode: str = "w") -> str:
    p = Path(path).expanduser()
    p.parent.mkdir(parents=True, exist_ok=True)
    try:
        async with aiofiles.open(p, mode, encoding="utf-8") as f:
            await f.write(content)
        actual_size = p.stat().st_size
        if content and actual_size == 0:
            return f"ERROR: file_write to {path} produced an empty file (disk full or permission issue)"
        logger.info(f"file_write {path} ({actual_size} bytes, mode={mode})")
        return f"OK: wrote {len(content)} chars to {path} ({actual_size} bytes on disk)"
    except Exception as exc:
        return f"ERROR writing {path}: {exc}"


# ── file_list ─────────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "file_list",
            "description": "List files and directories in a given path.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Directory path to list"},
                    "recursive": {
                        "type": "boolean",
                        "description": "List recursively (default false)",
                        "default": False,
                    },
                },
                "required": ["path"],
            },
        },
    },
    dangerous=False,
)
async def file_list(path: str, recursive: bool = False) -> str:
    p = Path(path).expanduser()
    if not p.exists():
        return f"ERROR: path not found: {path}"
    if not p.is_dir():
        return f"ERROR: not a directory: {path}"
    try:
        if recursive:
            entries = sorted(str(f.relative_to(p)) for f in p.rglob("*"))
        else:
            entries = sorted(f.name + ("/" if f.is_dir() else "") for f in p.iterdir())
        return "\n".join(entries) or "(empty)"
    except Exception as exc:
        return f"ERROR listing {path}: {exc}"


# ── file_delete ───────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "file_delete",
            "description": "Delete a file. DANGEROUS — requires user approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "File path to delete"},
                },
                "required": ["path"],
            },
        },
    },
    dangerous=True,
)
async def file_delete(path: str) -> str:
    p = Path(path).expanduser()
    if not p.exists():
        return f"ERROR: file not found: {path}"
    try:
        p.unlink()
        logger.warning(f"file_delete {path}")
        return f"OK: deleted {path}"
    except Exception as exc:
        return f"ERROR deleting {path}: {exc}"
