"""
Intent Router — fast keyword/pattern-based command classifier.

No LLM required. Runs in microseconds, maps natural language commands to
structured action plans that the pipeline dispatches directly to tools.

Priority order: OS action → Browser action → Research → Conversation
"""

from __future__ import annotations

import re
import sys
from typing import Optional
from core.logger import get_logger

logger = get_logger("jarvis.intent")

# ── Platform-aware app name map ────────────────────────────────────────────────

_WIN_APPS: dict[str, str] = {
    "calculator": "calc",
    "calc":       "calc",
    "notepad":    "notepad",
    "paint":      "mspaint",
    "explorer":   "explorer",
    "file manager": "explorer",
    "command prompt": "cmd",
    "cmd":        "cmd",
    "terminal":   "cmd",
    "chrome":     "chrome",
    "browser":    "chrome",
    "firefox":    "firefox",
    "edge":       "msedge",
    "word":       "winword",
    "excel":      "excel",
    "powerpoint": "powerpnt",
    "vscode":     "code",
    "code":       "code",
    "task manager": "taskmgr",
    "settings":   "ms-settings:",
    "spotify":    "spotify",
    "discord":    "discord",
    "slack":      "slack",
    "zoom":       "zoom",
    "clock":      "ms-clock:",
    "mail":       "ms-mail:",
    "camera":     "microsoft.windows.camera:",
    "snipping":   "snippingtool",
    "screenshot": "snippingtool",
}

_LINUX_APPS: dict[str, str] = {
    "calculator":  "gnome-calculator",
    "calc":        "gnome-calculator",
    "notepad":     "gedit",
    "text editor": "gedit",
    "paint":       "gimp",
    "file manager": "nautilus",
    "files":       "nautilus",
    "terminal":    "gnome-terminal",
    "chrome":      "google-chrome",
    "browser":     "firefox",
    "firefox":     "firefox",
    "vscode":      "code",
    "code":        "code",
    "spotify":     "spotify",
    "discord":     "discord",
    "slack":       "slack",
    "zoom":        "zoom",
}

_MAC_APPS: dict[str, str] = {
    "calculator": "Calculator",
    "calc":       "Calculator",
    "notepad":    "TextEdit",
    "text editor": "TextEdit",
    "safari":     "Safari",
    "browser":    "Safari",
    "chrome":     "Google Chrome",
    "firefox":    "Firefox",
    "terminal":   "Terminal",
    "finder":     "Finder",
    "music":      "Music",
    "spotify":    "Spotify",
    "discord":    "Discord",
    "zoom":       "zoom.us",
    "vscode":     "Visual Studio Code",
    "code":       "Visual Studio Code",
}

# Well-known URLs for "open X" commands
_URL_SHORTCUTS: dict[str, str] = {
    "youtube":     "https://youtube.com",
    "google":      "https://google.com",
    "gmail":       "https://mail.google.com",
    "github":      "https://github.com",
    "twitter":     "https://twitter.com",
    "instagram":   "https://instagram.com",
    "facebook":    "https://facebook.com",
    "reddit":      "https://reddit.com",
    "amazon":      "https://amazon.com",
    "netflix":     "https://netflix.com",
    "spotify":     "https://open.spotify.com",
    "stackoverflow": "https://stackoverflow.com",
    "chatgpt":     "https://chat.openai.com",
    "claude":      "https://claude.ai",
    "wikipedia":   "https://wikipedia.org",
    "maps":        "https://maps.google.com",
    "weather":     "https://weather.com",
}


def _platform_app(name: str) -> Optional[str]:
    """Resolve a friendly app name to the OS executable."""
    key = name.lower().strip()
    if sys.platform == "win32":
        return _WIN_APPS.get(key)
    elif sys.platform == "darwin":
        return _MAC_APPS.get(key)
    else:
        return _LINUX_APPS.get(key)


# ── Pattern sets ───────────────────────────────────────────────────────────────

# open_app triggers
_OPEN_PATTERNS = re.compile(
    r"^(?:open|launch|start|run|execute|fire up|bring up|show me)\s+(.+)$",
    re.IGNORECASE,
)

# close_app triggers
_CLOSE_PATTERNS = re.compile(
    r"^(?:close|kill|quit|exit|terminate|stop)\s+(.+)$",
    re.IGNORECASE,
)

# type_text triggers
_TYPE_PATTERNS = re.compile(
    r"""^(?:type|write|enter|input|paste|say)\s+["']?(.+?)["']?\s*$""",
    re.IGNORECASE,
)

# press_keys triggers
_PRESS_PATTERNS = re.compile(
    r"^(?:press|hit|tap|send key|keyboard)\s+(.+)$",
    re.IGNORECASE,
)

# click triggers
_CLICK_PATTERNS = re.compile(
    r"^(?:click|left.?click|right.?click|double.?click)\s+(?:on\s+)?(?:at\s+)?(.+)$",
    re.IGNORECASE,
)

# screenshot triggers
_SCREENSHOT_PATTERNS = re.compile(
    r"^(?:take|capture|grab|get|make|save)\s+(?:a\s+)?(?:screenshot|screen\s+shot|screen\s+capture).*$",
    re.IGNORECASE,
)

# scroll triggers
_SCROLL_PATTERNS = re.compile(
    r"^scroll\s+(up|down|left|right)(?:\s+(\d+))?",
    re.IGNORECASE,
)

# volume/brightness (mapped to press_keys)
_VOLUME_UP_RE   = re.compile(r"volume\s+up|louder|increase\s+volume",    re.IGNORECASE)
_VOLUME_DOWN_RE = re.compile(r"volume\s+down|quieter|decrease\s+volume", re.IGNORECASE)
_MUTE_RE        = re.compile(r"mute|unmute|toggle\s+mute",               re.IGNORECASE)

# browser / URL
_URL_RE         = re.compile(r"https?://\S+")
_GO_TO_RE       = re.compile(
    r"^(?:go to|navigate to|open|visit|browse to|take me to)\s+(.+)$",
    re.IGNORECASE,
)
_SEARCH_RE      = re.compile(
    r"^(?:search(?:\s+for)?|look up|find|google)\s+(.+)$",
    re.IGNORECASE,
)

# Research (deeper than a quick search)
_RESEARCH_RE    = re.compile(
    r"^(?:research|investigate|analyse|analyze|what is|who is|explain|tell me about|"
    r"summarise|summarize|write a report|find out)\s+(.+)$",
    re.IGNORECASE,
)

# Conversational fall-throughs
_GREET_RE       = re.compile(
    r"^(?:hello|hi|hey|good\s+(?:morning|afternoon|evening|night)|"
    r"how are you|what(?:'s| is) up|yo)\b",
    re.IGNORECASE,
)


class Intent:
    """Structured result from the intent router."""
    __slots__ = ("type", "agent", "tool", "args", "raw")

    def __init__(self, type_: str, agent: str, tool: str, args: dict, raw: str):
        self.type  = type_
        self.agent = agent
        self.tool  = tool
        self.args  = args
        self.raw   = raw

    def __repr__(self) -> str:
        return f"Intent(type={self.type!r}, agent={self.agent!r}, tool={self.tool!r}, args={self.args})"


class IntentRouter:
    """
    Classify a text command into a structured Intent without an LLM.

    Returned intent types:
      "os"           → ComputerAgent tool
      "browser"      → BrowserAgent tool
      "research"     → ResearchAgent
      "conversation" → CEOAgent chat (LLM fallback)
    """

    @staticmethod
    def classify(text: str) -> Intent:
        raw = text.strip()
        t = raw.lower()

        # ── 1. Screenshot ──────────────────────────────────────────────────────
        if _SCREENSHOT_PATTERNS.match(raw):
            logger.info(f"[intent] SCREENSHOT ← {raw!r}")
            return Intent("os", "computer", "screenshot", {}, raw)

        # ── 2. Volume / media keys ─────────────────────────────────────────────
        if _VOLUME_UP_RE.search(t):
            return Intent("os", "computer", "press_keys", {"keys": "volumeup"}, raw)
        if _VOLUME_DOWN_RE.search(t):
            return Intent("os", "computer", "press_keys", {"keys": "volumedown"}, raw)
        if _MUTE_RE.search(t):
            return Intent("os", "computer", "press_keys", {"keys": "volumemute"}, raw)

        # ── 3. Scroll ──────────────────────────────────────────────────────────
        m = _SCROLL_PATTERNS.match(raw)
        if m:
            direction = m.group(1).lower()
            amount = int(m.group(2) or 3)
            key_map = {"up": "pageup", "down": "pagedown", "left": "left", "right": "right"}
            return Intent("os", "computer", "press_keys", {"keys": key_map.get(direction, "pagedown")}, raw)

        # ── 4. Type text ───────────────────────────────────────────────────────
        m = _TYPE_PATTERNS.match(raw)
        if m:
            content = m.group(1).strip()
            logger.info(f"[intent] TYPE ← {raw!r}")
            return Intent("os", "computer", "type_text", {"text": content}, raw)

        # ── 5. Press keys ──────────────────────────────────────────────────────
        m = _PRESS_PATTERNS.match(raw)
        if m:
            keys = m.group(1).strip().replace(" ", "+")
            logger.info(f"[intent] KEYS ← {raw!r}")
            return Intent("os", "computer", "press_keys", {"keys": keys}, raw)

        # ── 6. Click ──────────────────────────────────────────────────────────
        m = _CLICK_PATTERNS.match(raw)
        if m:
            target = m.group(1).strip()
            # If target looks like "X Y" coordinates
            coord = re.match(r"(\d+)\s*,?\s*(\d+)", target)
            if coord:
                return Intent("os", "computer", "click",
                              {"x": int(coord.group(1)), "y": int(coord.group(2))}, raw)
            # Otherwise can't reliably click without coordinates; treat as conversation
            logger.info(f"[intent] CLICK (no coords) ← {raw!r}")

        # ── 7. Close app ───────────────────────────────────────────────────────
        m = _CLOSE_PATTERNS.match(raw)
        if m:
            app_phrase = m.group(1).strip()
            logger.info(f"[intent] CLOSE ← {app_phrase!r}")
            return Intent("os", "computer", "close_app", {"name": app_phrase}, raw)

        # ── 8. Open app / URL ──────────────────────────────────────────────────
        m = _OPEN_PATTERNS.match(raw)
        if m:
            target = m.group(1).strip()
            tl = target.lower()

            # Check URL shortcuts first
            for keyword, url in _URL_SHORTCUTS.items():
                if keyword in tl:
                    logger.info(f"[intent] BROWSER(url) ← {target!r} → {url}")
                    return Intent("browser", "browser", "browse", {"url": url}, raw)

            # Direct URL in command
            url_m = _URL_RE.search(target)
            if url_m:
                return Intent("browser", "browser", "browse", {"url": url_m.group()}, raw)

            # Resolve to OS app name
            app_cmd = _platform_app(tl) or tl
            logger.info(f"[intent] OPEN_APP ← {target!r} → {app_cmd!r}")
            return Intent("os", "computer", "open_app", {"name": app_cmd}, raw)

        # ── 9. Go to URL / navigate ────────────────────────────────────────────
        m = _GO_TO_RE.match(raw)
        if m:
            target = m.group(1).strip()
            tl = target.lower()

            for keyword, url in _URL_SHORTCUTS.items():
                if keyword in tl:
                    return Intent("browser", "browser", "browse", {"url": url}, raw)

            url_m = _URL_RE.search(target)
            if url_m:
                return Intent("browser", "browser", "browse", {"url": url_m.group()}, raw)

            # Check if it's an app name for "go to" (rare but possible)
            app_cmd = _platform_app(tl)
            if app_cmd:
                return Intent("os", "computer", "open_app", {"name": app_cmd}, raw)

            # Assume it's a website name
            domain = tl.replace(" ", "") + ".com"
            return Intent("browser", "browser", "browse", {"url": f"https://{domain}"}, raw)

        # ── 10. Search / look up ───────────────────────────────────────────────
        m = _SEARCH_RE.match(raw)
        if m:
            query = m.group(1).strip()
            logger.info(f"[intent] SEARCH ← {query!r}")
            return Intent("browser", "browser", "search_google", {"query": query}, raw)

        # ── 11. Deep research ──────────────────────────────────────────────────
        m = _RESEARCH_RE.match(raw)
        if m:
            topic = m.group(1).strip()
            logger.info(f"[intent] RESEARCH ← {topic!r}")
            return Intent("research", "research", "research", {"topic": topic}, raw)

        # ── 12. Conversational fallback ────────────────────────────────────────
        logger.info(f"[intent] CONVERSATION ← {raw!r}")
        return Intent("conversation", "ceo", "chat", {}, raw)
