"""Agent Factory — creates, modifies, and registers new agents dynamically."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

from agents.base_agent import BaseAgent
from config import AGENTS_DIR, MODELS
from core.llm_client import get_llm
from core.memory import get_memory
from core.logger import get_logger, log_action

logger = get_logger("jarvis.factory")

_AGENT_TEMPLATE = '''\
"""Auto-generated agent: {name}"""

from agents.base_agent import BaseAgent


class {class_name}(BaseAgent):
    name = "{name}"
    role = "{role}"
    model_key = "{model_key}"
    tool_names = {tool_names!r}

    @property
    def system_prompt(self) -> str:
        return """{system_prompt}"""
'''

_FACTORY_SYSTEM = """\
You are Jarvis's Agent Factory — an AI systems architect.

Your job is to design new specialist agents that integrate with the Jarvis AI OS.
Each agent needs:
1. A unique name (snake_case, no spaces)
2. A clear role description
3. A list of tools from: file_read, file_write, file_list, file_delete,
   run_code, run_tests, check_syntax, run_terminal, install_package,
   web_search, web_fetch, browse_page, browser_fill_form, send_email
4. A detailed system prompt that guides the agent's behaviour
5. An appropriate model_key: ceo/research/coding/qa/debug/deployment/
   marketing/outreach/data/factory/default

Respond with valid JSON only. No markdown, no explanation.
"""


class AgentFactory(BaseAgent):
    name = "factory"
    role = "Create, modify, and register new AI agents"
    model_key = "factory"
    tool_names = [
        "file_read", "file_write", "file_list",
        "run_code", "check_syntax",
    ]

    @property
    def system_prompt(self) -> str:
        return _FACTORY_SYSTEM

    # ── Public API ─────────────────────────────────────────────────────────────

    async def create_agent(self, description: str) -> dict:
        """
        Generate a new agent from a natural-language description.
        Writes the Python file, registers in memory, returns the agent spec.
        """
        log_action("factory", "create_agent", description[:60])

        spec = await self._generate_spec(description)
        if "error" in spec:
            return spec

        file_path = await self._write_agent_file(spec)
        self._register_agent(spec)

        logger.info(f"[factory] Created agent '{spec['name']}' at {file_path}")
        return {"status": "created", "name": spec["name"], "file": str(file_path), "spec": spec}

    async def modify_agent(self, agent_name: str, changes: str) -> dict:
        """Modify an existing agent's system prompt or tool list."""
        log_action("factory", "modify_agent", f"{agent_name}: {changes[:60]}")

        # Look up existing agent
        agent_file = AGENTS_DIR / f"{agent_name}.py"
        if not agent_file.exists():
            # Check built-in agents dir
            builtin = Path(__file__).parent / f"{agent_name}_agent.py"
            if builtin.exists():
                agent_file = builtin

        if not agent_file.exists():
            return {"error": f"Agent '{agent_name}' not found"}

        current_code = agent_file.read_text(encoding="utf-8")

        prompt = (
            f"Here is an existing Jarvis agent:\n\n{current_code}\n\n"
            f"Apply these changes: {changes}\n\n"
            "Return the COMPLETE updated Python file content only. No markdown."
        )
        updated = await self.llm.simple(prompt, system=_FACTORY_SYSTEM, model=self.model)
        updated = updated.strip()
        if updated.startswith("```"):
            lines = updated.split("\n")
            updated = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

        agent_file.write_text(updated, encoding="utf-8")
        logger.info(f"[factory] Modified agent '{agent_name}'")
        return {"status": "modified", "file": str(agent_file)}

    async def list_agents(self) -> list[dict]:
        """List all built-in and dynamic agents."""
        result = []

        # Built-in agents (in agents/ dir)
        agents_dir = Path(__file__).parent
        for f in sorted(agents_dir.glob("*_agent.py")):
            result.append({"name": f.stem.replace("_agent", ""), "source": "builtin", "file": str(f)})

        # Dynamic agents (in data/agents/)
        for f in sorted(AGENTS_DIR.glob("*.py")):
            result.append({"name": f.stem, "source": "dynamic", "file": str(f)})

        # Memory-registered agents
        memory_agents = get_memory().list_dynamic_agents()
        existing_names = {a["name"] for a in result}
        for a in memory_agents:
            if a["name"] not in existing_names:
                result.append({"name": a["name"], "source": "memory", **a})

        return result

    # ── Internal helpers ───────────────────────────────────────────────────────

    async def _generate_spec(self, description: str) -> dict:
        prompt = (
            f"Design a Jarvis agent for this purpose:\n{description}\n\n"
            "Return JSON with keys: name, role, model_key, tool_names (list), system_prompt"
        )
        raw = await self.llm.simple(prompt, system=_FACTORY_SYSTEM, model=self.model, temperature=0.3)

        import re, json as _json
        raw = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.MULTILINE)
        raw = re.sub(r"```$", "", raw.strip(), flags=re.MULTILINE)
        try:
            return _json.loads(raw.strip())
        except Exception as exc:
            logger.error(f"[factory] Failed to parse spec: {exc}\n{raw[:200]}")
            return {"error": f"JSON parse failed: {exc}"}

    async def _write_agent_file(self, spec: dict) -> Path:
        name = spec["name"].lower().replace(" ", "_")
        class_name = "".join(p.capitalize() for p in name.split("_")) + "Agent"

        code = _AGENT_TEMPLATE.format(
            name=name,
            class_name=class_name,
            role=spec.get("role", ""),
            model_key=spec.get("model_key", "default"),
            tool_names=spec.get("tool_names", []),
            system_prompt=spec.get("system_prompt", ""),
        )

        out = AGENTS_DIR / f"{name}.py"
        out.write_text(code, encoding="utf-8")
        return out

    def _register_agent(self, spec: dict) -> None:
        get_memory().register_agent(
            name=spec["name"],
            role=spec.get("role", ""),
            system_prompt=spec.get("system_prompt", ""),
            tools=spec.get("tool_names", []),
            model=MODELS.get(spec.get("model_key", "default")),
        )
