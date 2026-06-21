"""Central configuration — loaded once at import time."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = DATA_DIR / "logs"
AGENTS_DIR = DATA_DIR / "agents"
WORKFLOWS_DIR = DATA_DIR / "workflows"

for _d in [DATA_DIR, LOGS_DIR, AGENTS_DIR, WORKFLOWS_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

# ── OpenRouter ────────────────────────────────────────────────────────────────
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

# ── Model assignments ─────────────────────────────────────────────────────────
MODELS: dict[str, str] = {
    "ceo":        os.getenv("CEO_MODEL",        "anthropic/claude-3.5-sonnet"),
    "research":   os.getenv("RESEARCH_MODEL",   "anthropic/claude-3.5-sonnet"),
    "coding":     os.getenv("CODING_MODEL",     "anthropic/claude-3.5-sonnet"),
    "qa":         os.getenv("QA_MODEL",         "anthropic/claude-3-haiku"),
    "debug":      os.getenv("DEBUG_MODEL",      "anthropic/claude-3.5-sonnet"),
    "deployment": os.getenv("DEPLOYMENT_MODEL", "anthropic/claude-3-haiku"),
    "marketing":  os.getenv("MARKETING_MODEL",  "anthropic/claude-3-haiku"),
    "outreach":   os.getenv("OUTREACH_MODEL",   "anthropic/claude-3-haiku"),
    "data":       os.getenv("DATA_MODEL",       "anthropic/claude-3.5-sonnet"),
    "factory":    os.getenv("FACTORY_MODEL",    "anthropic/claude-3.5-sonnet"),
    "vision":     os.getenv("VISION_MODEL",     "openai/gpt-4o"),
    "computer":   os.getenv("COMPUTER_MODEL",   "anthropic/claude-3.5-sonnet"),
    "browser":    os.getenv("BROWSER_MODEL",    "anthropic/claude-3.5-sonnet"),
    "reviewer":   os.getenv("REVIEWER_MODEL",   "anthropic/claude-3-haiku"),
    "default":    os.getenv("DEFAULT_MODEL",    "anthropic/claude-3.5-sonnet"),
}

# ── Safety ────────────────────────────────────────────────────────────────────
REQUIRE_APPROVAL: bool = os.getenv("REQUIRE_APPROVAL", "true").lower() == "true"

# Actions that always require approval regardless of context
DANGEROUS_ACTIONS: set[str] = {
    # File system (destructive)
    "file_delete",
    "install_package",
    # Terminal (arbitrary code execution)
    "run_terminal",
    # Communication (sends data externally)
    "send_email",
    # Browser form submission (could submit data)
    "fill_form",
}

# Actions that require approval only when triggered by autonomous agents,
# NOT when triggered directly by a user voice/text command.
AGENT_DANGEROUS_ACTIONS: set[str] = {
    "open_app",
    "close_app",
    "click",
    "type_text",
    "press_keys",
    "click_element",
}

# VOICE_TRUST: when True, voice/text pipeline executes OS actions without approval
VOICE_TRUST: bool = os.getenv("VOICE_TRUST", "true").lower() == "true"

# ── Database ─────────────────────────────────────────────────────────────────
MEMORY_DB_PATH = DATA_DIR / "memory.db"

# ── Runtime limits ────────────────────────────────────────────────────────────
MAX_CONVERSATION_HISTORY: int = int(os.getenv("MAX_HISTORY", "50"))
MAX_SUBTASKS: int = int(os.getenv("MAX_SUBTASKS", "10"))
MAX_AGENT_ITERATIONS: int = int(os.getenv("MAX_ITERATIONS", "15"))
CODE_EXEC_TIMEOUT: int = 30  # seconds
