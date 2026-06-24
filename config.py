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

# ── NVIDIA NIM ────────────────────────────────────────────────────────────────
# Key comes from environment only — never hardcoded.
NVIDIA_NIM_API_KEY: str = os.getenv("NVIDIA_NIM_API_KEY", "")
NVIDIA_NIM_BASE_URL: str = "https://integrate.api.nvidia.com/v1"

# ── NIM model IDs (NVIDIA NIM names, prefixed with "nim/" internally) ─────────
# DeepSeek V4 Pro  — planning, CEO, reasoning, proposals
_NIM_PRO   = "nim/deepseek-ai/deepseek-v3-0324"
# DeepSeek V4 Flash — execution, lead gen, CRM enrichment, repetitive tasks
_NIM_FLASH = "nim/deepseek-ai/deepseek-r1-0528"
# Qwen3 235B/22B-active — code generation, tool generation, self-improvement
_NIM_CODE  = "nim/qwen/qwen3-235b-a22b"
# Qwen 2.5-VL 72B  — vision, screenshot analysis, website UI audits
_NIM_VIS   = "nim/qwen/qwen2.5-vl-72b-instruct"

# ── Model assignments ─────────────────────────────────────────────────────────
# NIM models are the primary stack. Each env-var override uses a NIM default.
# When NVIDIA_NIM_API_KEY is absent the router falls back to the OpenRouter chain.
MODELS: dict[str, str] = {
    # Strong reasoning / planning — DeepSeek V4 Pro
    "ceo":        os.getenv("CEO_MODEL",        _NIM_PRO),
    "research":   os.getenv("RESEARCH_MODEL",   _NIM_PRO),
    "debug":      os.getenv("DEBUG_MODEL",      _NIM_PRO),
    "workflow":   os.getenv("WORKFLOW_MODEL",   _NIM_PRO),
    "automation": os.getenv("AUTOMATION_MODEL", _NIM_PRO),
    "proposal":   os.getenv("PROPOSAL_MODEL",   _NIM_PRO),
    # Code / tool generation — Qwen3 coding model
    "coding":     os.getenv("CODING_MODEL",     _NIM_CODE),
    "factory":    os.getenv("FACTORY_MODEL",    _NIM_CODE),
    "computer":   os.getenv("COMPUTER_MODEL",   _NIM_CODE),
    # Vision / UI analysis — Qwen 2.5-VL
    "vision":     os.getenv("VISION_MODEL",     _NIM_VIS),
    # Fast execution / lead-gen / CRM — DeepSeek V4 Flash
    "lead_generation":   os.getenv("LEADGEN_MODEL",  _NIM_FLASH),
    "contact_discovery": os.getenv("CONTACT_MODEL",  _NIM_FLASH),
    "website_audit":     os.getenv("AUDIT_MODEL",    _NIM_FLASH),
    "lead_scoring":      os.getenv("SCORING_MODEL",  _NIM_FLASH),
    "crm":               os.getenv("CRM_MODEL",      _NIM_FLASH),
    "sales":             os.getenv("SALES_MODEL",    _NIM_FLASH),
    "outreach":          os.getenv("OUTREACH_MODEL", _NIM_FLASH),
    "data":              os.getenv("DATA_MODEL",     _NIM_FLASH),
    "marketing":         os.getenv("MARKETING_MODEL",_NIM_FLASH),
    "qa":                os.getenv("QA_MODEL",       _NIM_FLASH),
    "deployment":        os.getenv("DEPLOYMENT_MODEL",_NIM_FLASH),
    "reviewer":          os.getenv("REVIEWER_MODEL", _NIM_FLASH),
    "learning":          os.getenv("LEARNING_MODEL", _NIM_FLASH),
    "browser":           os.getenv("BROWSER_MODEL",  _NIM_FLASH),
    "default":    os.getenv("DEFAULT_MODEL",    _NIM_PRO),
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
