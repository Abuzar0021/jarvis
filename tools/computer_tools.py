"""
Computer control tools — keyboard, mouse, window management, applications.

All destructive tools are marked dangerous=True and require approval.
Heavy OS deps (pyautogui, psutil) are imported lazily so this module
loads cleanly in headless/CI environments.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import sys
import time
from typing import Optional

from tools import register
from core.logger import get_logger

logger = get_logger("jarvis.tools.computer")

_HAS_DISPLAY = bool(
    os.environ.get("DISPLAY")
    or os.environ.get("WAYLAND_DISPLAY")
    or sys.platform in ("win32", "darwin")
)


def _require_display(tool: str) -> None:
    if not _HAS_DISPLAY:
        raise RuntimeError(
            f"'{tool}' requires a graphical display — "
            "set $DISPLAY or run on a desktop OS"
        )


def _pag():
    try:
        import pyautogui
        pyautogui.PAUSE = 0.1
        pyautogui.FAILSAFE = True
        return pyautogui
    except ImportError:
        raise RuntimeError("pyautogui not installed. Run: pip install pyautogui")


# ── open_app ──────────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "open_app",
            "description": "Launch an application by command name or full path.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "App command or path (e.g. 'firefox', 'code', '/usr/bin/gedit')",
                    },
                    "args": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional CLI arguments",
                    },
                },
                "required": ["name"],
            },
        },
    },
    dangerous=True,
)
async def open_app(name: str = "", app_name: str = "", args: Optional[list] = None) -> str:
    name = name or app_name  # accept either parameter name
    if not name:
        return "ERROR: open_app requires 'name' or 'app_name'"
    args = args or []
    logger.info(f"open_app: {name!r} args={args}")

    def _launch() -> int:
        proc = subprocess.Popen(
            [name] + args,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return proc.pid

    try:
        pid = await asyncio.to_thread(_launch)
        return f"Launched '{name}' (PID {pid})"
    except FileNotFoundError:
        return f"ERROR: '{name}' not found in PATH. Is it installed?"
    except Exception as exc:
        return f"ERROR launching '{name}': {exc}"


# ── close_app ─────────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "close_app",
            "description": "Terminate a running application by process name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Process name to terminate (e.g. 'firefox', 'gedit')",
                    },
                    "force": {
                        "type": "boolean",
                        "description": "Use SIGKILL instead of SIGTERM (default false)",
                    },
                },
                "required": ["name"],
            },
        },
    },
    dangerous=True,
)
async def close_app(name: str, force: bool = False) -> str:
    logger.info(f"close_app: {name!r} force={force}")

    def _kill() -> list:
        try:
            import psutil
        except ImportError:
            raise RuntimeError("psutil not installed. Run: pip install psutil")
        killed = []
        for proc in psutil.process_iter(["name", "pid"]):
            try:
                pname = proc.info.get("name") or ""
                if name.lower() in pname.lower():
                    proc.kill() if force else proc.terminate()
                    killed.append(proc.info["pid"])
            except Exception:
                pass
        return killed

    try:
        pids = await asyncio.to_thread(_kill)
        if pids:
            return f"Terminated '{name}' (PIDs: {pids})"
        return f"No running process matching '{name}'"
    except Exception as exc:
        return f"ERROR closing '{name}': {exc}"


# ── focus_window ──────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "focus_window",
            "description": "Bring a window to the foreground by its title (partial match).",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Window title substring"},
                },
                "required": ["title"],
            },
        },
    },
    dangerous=False,
)
async def focus_window(title: str) -> str:
    _require_display("focus_window")
    logger.info(f"focus_window: {title!r}")

    def _focus() -> str:
        # Linux: try wmctrl first
        r = subprocess.run(["wmctrl", "-a", title], capture_output=True)
        if r.returncode == 0:
            return f"Focused window containing '{title}'"
        # Try pygetwindow (Win/Mac)
        try:
            import pygetwindow as gw
            wins = gw.getWindowsWithTitle(title)
            if wins:
                wins[0].activate()
                return f"Focused '{wins[0].title}'"
        except ImportError:
            pass
        return f"No window found matching '{title}' (wmctrl: {r.stderr.decode()[:80]})"

    return await asyncio.to_thread(_focus)


# ── click ─────────────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "click",
            "description": "Click the mouse at screen coordinates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "x": {"type": "integer", "description": "X screen coordinate"},
                    "y": {"type": "integer", "description": "Y screen coordinate"},
                    "button": {
                        "type": "string",
                        "enum": ["left", "right", "middle"],
                        "description": "Mouse button (default: left)",
                    },
                    "clicks": {
                        "type": "integer",
                        "description": "1 = single click, 2 = double click",
                    },
                },
                "required": ["x", "y"],
            },
        },
    },
    dangerous=True,
)
async def click(x: int, y: int, button: str = "left", clicks: int = 1) -> str:
    _require_display("click")
    logger.info(f"click: ({x},{y}) btn={button} n={clicks}")

    def _do() -> None:
        _pag().click(x, y, button=button, clicks=clicks, interval=0.1)

    try:
        await asyncio.to_thread(_do)
        return f"Clicked {button}×{clicks} at ({x}, {y})"
    except Exception as exc:
        return f"ERROR clicking ({x},{y}): {exc}"


# ── type_text ─────────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "type_text",
            "description": "Type text at the current cursor position.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to type"},
                    "interval": {
                        "type": "number",
                        "description": "Seconds between keystrokes (default 0.02)",
                    },
                },
                "required": ["text"],
            },
        },
    },
    dangerous=True,
)
async def type_text(text: str, interval: float = 0.02) -> str:
    _require_display("type_text")
    logger.info(f"type_text: {len(text)} chars")

    def _do() -> None:
        _pag().typewrite(text, interval=interval)

    try:
        await asyncio.to_thread(_do)
        return f"Typed {len(text)} characters"
    except Exception as exc:
        return f"ERROR typing: {exc}"


# ── press_keys ────────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "press_keys",
            "description": (
                "Press keyboard keys or shortcuts. "
                "Use '+' for combos (e.g. 'ctrl+c'), ',' to chain ('ctrl+c,ctrl+v')."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "keys": {
                        "type": "string",
                        "description": "Key combo(s): 'ctrl+c', 'alt+tab', 'enter', 'ctrl+c,ctrl+v'",
                    }
                },
                "required": ["keys"],
            },
        },
    },
    dangerous=True,
)
async def press_keys(keys: str) -> str:
    _require_display("press_keys")
    logger.info(f"press_keys: {keys!r}")

    def _do() -> None:
        pag = _pag()
        for combo in keys.split(","):
            parts = [k.strip() for k in combo.strip().split("+")]
            if len(parts) == 1:
                pag.press(parts[0])
            else:
                pag.hotkey(*parts)
            time.sleep(0.05)

    try:
        await asyncio.to_thread(_do)
        return f"Pressed: {keys}"
    except Exception as exc:
        return f"ERROR pressing '{keys}': {exc}"


# ── move_mouse ────────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "move_mouse",
            "description": "Move the mouse cursor to a screen position.",
            "parameters": {
                "type": "object",
                "properties": {
                    "x": {"type": "integer", "description": "X coordinate"},
                    "y": {"type": "integer", "description": "Y coordinate"},
                    "duration": {
                        "type": "number",
                        "description": "Movement duration seconds (default 0.2)",
                    },
                },
                "required": ["x", "y"],
            },
        },
    },
    dangerous=False,
)
async def move_mouse(x: int, y: int, duration: float = 0.2) -> str:
    _require_display("move_mouse")

    def _do() -> None:
        _pag().moveTo(x, y, duration=duration)

    try:
        await asyncio.to_thread(_do)
        return f"Mouse moved to ({x}, {y})"
    except Exception as exc:
        return f"ERROR moving mouse: {exc}"


# ── screenshot ────────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "screenshot",
            "description": (
                "Take a screenshot and describe it using the vision model. "
                "Use before clicking to understand the current screen state."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "What to look for / describe in the screenshot",
                    }
                },
                "required": [],
            },
        },
    },
    dangerous=False,
)
async def screenshot(question: str = "Describe everything visible on this screen.") -> str:
    try:
        from backend.vision.screen import capture_screen
        image_b64, saved_path = await capture_screen(save=True)
        path_note = f"[Screenshot saved: {saved_path}]" if saved_path else "[Screenshot captured]"

        # Attempt LLM analysis only when an API key is available
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
        if api_key:
            try:
                from backend.vision.analyzer import get_analyzer
                analyzer = get_analyzer()
                description = await analyzer.analyze(image_b64, question)
                return f"{description}\n{path_note}"
            except Exception as exc:
                logger.warning(f"Vision analysis skipped: {exc}")

        return path_note
    except RuntimeError as exc:
        return f"Screenshot unavailable: {exc}"
    except Exception as exc:
        logger.error(f"screenshot failed: {exc}", exc_info=True)
        return f"ERROR taking screenshot: {exc}"
