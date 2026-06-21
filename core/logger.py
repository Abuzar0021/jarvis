"""Structured logger built on Rich — every agent action is recorded."""

import logging
import sys
from datetime import datetime
from pathlib import Path

from rich.console import Console
from rich.logging import RichHandler
from rich.theme import Theme

from config import LOGS_DIR

_THEME = Theme(
    {
        "agent.ceo":        "bold magenta",
        "agent.research":   "bold cyan",
        "agent.coding":     "bold green",
        "agent.qa":         "bold yellow",
        "agent.debug":      "bold red",
        "agent.deployment": "bold blue",
        "agent.marketing":  "bold orange1",
        "agent.outreach":   "bold pink1",
        "agent.data":       "bold purple",
        "agent.factory":    "bold white",
        "info":             "bright_white",
        "success":          "bold green",
        "warning":          "bold yellow",
        "error":            "bold red",
        "danger":           "bold red on white",
        "approval":         "bold yellow on dark_orange3",
    }
)

console = Console(theme=_THEME, highlight=False)


def _log_file() -> Path:
    stamp = datetime.now().strftime("%Y-%m-%d")
    return LOGS_DIR / f"jarvis-{stamp}.log"


def get_logger(name: str) -> logging.Logger:
    """Return a logger that writes to console (Rich) + daily log file."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    # Rich handler → console
    rich_handler = RichHandler(
        console=console,
        show_path=False,
        markup=True,
        rich_tracebacks=True,
    )
    rich_handler.setLevel(logging.INFO)
    logger.addHandler(rich_handler)

    # File handler → daily log
    file_handler = logging.FileHandler(_log_file(), encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s | %(name)s | %(levelname)s | %(message)s")
    )
    logger.addHandler(file_handler)

    return logger


# Module-level helpers used throughout the codebase
def log_action(agent: str, action: str, detail: str = "") -> None:
    logger = get_logger(f"jarvis.{agent}")
    logger.info(f"[bold][{agent.upper()}][/bold] {action}" + (f" — {detail}" if detail else ""))


def log_tool(agent: str, tool: str, args: dict) -> None:
    logger = get_logger(f"jarvis.{agent}")
    logger.debug(f"[{agent}] tool={tool} args={args}")


def log_result(agent: str, result: str) -> None:
    logger = get_logger(f"jarvis.{agent}")
    snippet = (result[:120] + "…") if len(result) > 120 else result
    logger.info(f"[{agent}] result → {snippet}")
