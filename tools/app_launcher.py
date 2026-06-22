"""
Application launcher — robust, platform-aware app launching with aliases.

Why this exists (CRIT-2): the old open_app did `subprocess.Popen([name])` and
treated *immediate exit* as failure. On Windows `calc.exe` and every UWP/Store
launcher are stubs that spawn the real app and exit 0 instantly, so a SUCCESSFUL
launch was reported as "ERROR exited immediately (exit code 0)". UWP apps
(Calculator, Settings, Camera) also can't be launched as plain executables at
all — they need a URI (`calculator:`) or `explorer shell:AppsFolder\<AUMID>`.

This module separates three concerns:
  1. normalize_app(phrase) -> canonical app id   (pure, fully testable)
  2. resolve_launch(app_id) -> a LaunchPlan        (platform-specific)
  3. launch(phrase)         -> executes + verifies (async)

Launch semantics: a launcher stub exiting 0 means "the app was handed off and
started" — that is SUCCESS, not failure. Only a non-zero exit, FileNotFound, or
"no candidate found" is a failure.
"""

from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from typing import Optional

from core.logger import get_logger

logger = get_logger("jarvis.app_launcher")

# Filler words stripped from a spoken app phrase before alias lookup.
_FILLER = {"the", "app", "application", "program", "my", "a", "an", "up", "please", "window"}

# Spoken phrase / synonym  ->  canonical app id
_ALIASES: dict[str, str] = {
    # calculator
    "calculator": "calculator", "calc": "calculator",
    # notepad / text editor
    "notepad": "notepad", "text editor": "notepad", "notes": "notepad",
    "notepad++": "notepad",
    # paint
    "paint": "paint", "mspaint": "paint", "ms paint": "paint",
    # file explorer
    "explorer": "explorer", "file explorer": "explorer", "file manager": "explorer",
    "files": "explorer", "finder": "explorer", "nautilus": "explorer",
    # settings
    "settings": "settings", "control panel": "settings", "system settings": "settings",
    "preferences": "settings",
    # task manager
    "task manager": "taskmanager", "taskmgr": "taskmanager", "activity monitor": "taskmanager",
    "system monitor": "taskmanager",
    # shells
    "cmd": "cmd", "command prompt": "cmd", "command line": "cmd",
    "powershell": "powershell", "power shell": "powershell", "ps": "powershell",
    "terminal": "terminal", "console": "terminal", "shell": "terminal", "bash": "terminal",
    # editors / dev
    "vscode": "vscode", "vs code": "vscode", "visual studio code": "vscode", "code": "vscode",
    # browsers
    "chrome": "chrome", "google chrome": "chrome",
    "edge": "edge", "microsoft edge": "edge", "msedge": "edge",
    "firefox": "firefox", "mozilla": "firefox",
    "safari": "safari", "browser": "browser",
    # media / chat
    "spotify": "spotify", "music": "spotify",
    "discord": "discord", "slack": "slack", "zoom": "zoom", "teams": "teams",
}


@dataclass
class LaunchPlan:
    """How to launch one app on the current platform."""
    strategy: str          # "uri" | "appsfolder" | "exec" | "candidates"
    target: object         # str, or list[str] for "candidates"
    label: str = ""


# ── Windows launch plans ────────────────────────────────────────────────────────
# UWP apps use URIs (reliable on Win10/11). Win32 apps use their .exe (found via
# PATH). Edge/Settings are URI-based. AppsFolder AUMIDs are the fallback for
# Store apps that have no URI.
_WIN: dict[str, LaunchPlan] = {
    "calculator":  LaunchPlan("uri", "calculator:", "Calculator"),
    "settings":    LaunchPlan("uri", "ms-settings:", "Settings"),
    "edge":        LaunchPlan("uri", "microsoft-edge:", "Microsoft Edge"),
    "notepad":     LaunchPlan("exec", "notepad.exe", "Notepad"),
    "paint":       LaunchPlan("exec", "mspaint.exe", "Paint"),
    "explorer":    LaunchPlan("exec", "explorer.exe", "File Explorer"),
    "taskmanager": LaunchPlan("exec", "taskmgr.exe", "Task Manager"),
    "cmd":         LaunchPlan("exec", "cmd.exe", "Command Prompt"),
    "powershell":  LaunchPlan("exec", "powershell.exe", "PowerShell"),
    "terminal":    LaunchPlan("candidates", ["wt.exe", "powershell.exe", "cmd.exe"], "Terminal"),
    "vscode":      LaunchPlan("candidates", ["code.cmd", "code.exe", "code"], "VS Code"),
    "chrome":      LaunchPlan("candidates", ["chrome.exe", "chrome"], "Chrome"),
    "firefox":     LaunchPlan("candidates", ["firefox.exe", "firefox"], "Firefox"),
    "spotify":     LaunchPlan("appsfolder", "Spotify.exe", "Spotify"),
    "discord":     LaunchPlan("candidates", ["Discord.exe", "discord"], "Discord"),
    "slack":       LaunchPlan("candidates", ["slack.exe", "slack"], "Slack"),
    "zoom":        LaunchPlan("candidates", ["Zoom.exe", "zoom"], "Zoom"),
    "teams":       LaunchPlan("candidates", ["Teams.exe", "ms-teams.exe"], "Teams"),
    "browser":     LaunchPlan("candidates", ["msedge.exe", "chrome.exe"], "Browser"),
    "safari":      LaunchPlan("candidates", ["msedge.exe", "chrome.exe"], "Browser"),
}

# ── macOS launch plans (use `open -a`) ──────────────────────────────────────────
_MAC: dict[str, str] = {
    "calculator": "Calculator", "notepad": "TextEdit", "paint": "Preview",
    "explorer": "Finder", "settings": "System Settings", "taskmanager": "Activity Monitor",
    "cmd": "Terminal", "powershell": "Terminal", "terminal": "Terminal",
    "vscode": "Visual Studio Code", "chrome": "Google Chrome", "edge": "Microsoft Edge",
    "firefox": "Firefox", "safari": "Safari", "browser": "Safari",
    "spotify": "Spotify", "discord": "Discord", "slack": "Slack", "zoom": "zoom.us",
    "teams": "Microsoft Teams",
}

# ── Linux launch plans (ordered candidate executables) ──────────────────────────
_LINUX: dict[str, list[str]] = {
    "calculator":  ["gnome-calculator", "kcalc", "galculator", "xcalc", "qalculate-gtk"],
    "notepad":     ["gedit", "kate", "mousepad", "xed", "leafpad", "gnome-text-editor"],
    "paint":       ["kolourpaint", "pinta", "drawing", "gimp"],
    "explorer":    ["nautilus", "dolphin", "thunar", "nemo", "pcmanfm"],
    "settings":    ["gnome-control-center", "systemsettings5", "xfce4-settings-manager"],
    "taskmanager": ["gnome-system-monitor", "ksysguard", "plasma-systemmonitor", "xfce4-taskmanager"],
    "cmd":         ["gnome-terminal", "konsole", "xterm", "xfce4-terminal"],
    "powershell":  ["pwsh", "gnome-terminal", "xterm"],
    "terminal":    ["gnome-terminal", "konsole", "xfce4-terminal", "xterm"],
    "vscode":      ["code", "codium", "code-insiders"],
    "chrome":      ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"],
    "edge":        ["microsoft-edge", "microsoft-edge-stable"],
    "firefox":     ["firefox", "firefox-esr"],
    "browser":     ["xdg-open", "firefox", "google-chrome"],
    "safari":      ["firefox", "google-chrome"],
    "spotify":     ["spotify"],
    "discord":     ["discord"],
    "slack":       ["slack"],
    "zoom":        ["zoom"],
    "teams":       ["teams", "teams-for-linux"],
}


def normalize_app(phrase: str) -> Optional[str]:
    """
    Map a spoken/typed app phrase to a canonical app id, or None if unknown.

    Pure function — strips punctuation and filler words, then looks up aliases.
    Handles "open the calculator app", "Calculator.", "vs code", etc.
    """
    if not phrase:
        return None
    cleaned = "".join(c for c in phrase.lower() if c.isalnum() or c in " +#").strip()
    if cleaned in _ALIASES:                 # exact alias (handles "vs code", "task manager")
        return _ALIASES[cleaned]
    tokens = [t for t in cleaned.split() if t not in _FILLER]
    if not tokens:
        return None
    candidate = " ".join(tokens)
    if candidate in _ALIASES:
        return _ALIASES[candidate]
    for tok in tokens:                      # single significant token (e.g. "calculator")
        if tok in _ALIASES:
            return _ALIASES[tok]
    return None


def resolve_launch(app_id: str) -> Optional[LaunchPlan]:
    """Return the platform LaunchPlan for a canonical app id, or None."""
    if sys.platform == "win32":
        return _WIN.get(app_id)
    if sys.platform == "darwin":
        name = _MAC.get(app_id)
        return LaunchPlan("mac_open", name, name) if name else None
    cands = _LINUX.get(app_id)
    return LaunchPlan("candidates", cands, app_id) if cands else None


def _first_on_path(candidates: list[str]) -> Optional[str]:
    for c in candidates:
        if shutil.which(c):
            return shutil.which(c)
    return None


def _spawn(argv: list[str], shell: bool = False) -> tuple[bool, str]:
    """
    Start a process. Returns (ok, detail).

    A launcher that exits 0 immediately = success (it handed off to the real app).
    Only non-zero exit / FileNotFound / OSError is failure.
    """
    try:
        proc = subprocess.Popen(
            argv if not shell else " ".join(argv),
            shell=shell,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        return False, f"not found: {argv[0]}"
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"

    time.sleep(0.35)
    rc = proc.poll()
    if rc is None:
        return True, f"running pid={proc.pid}"
    if rc == 0:
        return True, "launched (handed off, stub exited 0)"
    return False, f"exited with code {rc}"


def _launch_sync(app_id: str, plan: LaunchPlan, extra: list[str]) -> str:
    label = plan.label or app_id

    if plan.strategy == "uri":
        # Windows: `cmd /c start "" calculator:` opens the protocol handler.
        ok, detail = _spawn(["cmd", "/c", "start", "", str(plan.target)], shell=False)
        return f"✓ Opened {label}" if ok else f"ERROR: could not open {label} ({detail})"

    if plan.strategy == "appsfolder":
        ok, detail = _spawn(["explorer.exe", f"shell:AppsFolder\\{plan.target}"], shell=False)
        return f"✓ Opened {label}" if ok else f"ERROR: could not open {label} ({detail})"

    if plan.strategy == "mac_open":
        ok, detail = _spawn(["open", "-a", str(plan.target)] + extra, shell=False)
        return f"✓ Opened {label}" if ok else f"ERROR: could not open {label} ({detail})"

    if plan.strategy == "exec":
        exe = shutil.which(str(plan.target)) or str(plan.target)
        ok, detail = _spawn([exe] + extra, shell=False)
        return f"✓ Opened {label}" if ok else f"ERROR: could not open {label} ({detail})"

    if plan.strategy == "candidates":
        found = _first_on_path(list(plan.target))
        if not found:
            return (
                f"ERROR: {label} is not installed (tried: {', '.join(plan.target)})"
            )
        ok, detail = _spawn([found] + extra, shell=False)
        return f"✓ Opened {label} ({os.path.basename(found)})" if ok \
            else f"ERROR: could not open {label} ({detail})"

    return f"ERROR: no launch strategy for {label}"


async def launch(phrase: str, args: Optional[list] = None) -> str:
    """
    Resolve a spoken/typed phrase to an app and launch it.

    Falls back to launching the raw phrase as an executable when it is not a
    known alias (so `open_app('htop')` still works).
    """
    extra = [str(a) for a in (args or [])]
    app_id = normalize_app(phrase)

    if app_id:
        plan = resolve_launch(app_id)
        if plan is None:
            return (
                f"ERROR: '{app_id}' has no launch plan for {sys.platform}. "
                f"Install it or open it manually."
            )
        logger.info(f"launch: {phrase!r} -> {app_id} via {plan.strategy}({plan.target})")
        return await asyncio.to_thread(_launch_sync, app_id, plan, extra)

    # Unknown alias — treat the phrase as a raw executable / path.
    raw = phrase.strip()
    logger.info(f"launch: {phrase!r} -> raw exec fallback")
    plan = LaunchPlan("candidates", [raw], raw)
    return await asyncio.to_thread(_launch_sync, raw, plan, extra)
