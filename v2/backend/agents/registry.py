"""Agent registry — maps agent_type strings to instances."""
from __future__ import annotations

from typing import Optional

from backend.agents.base import BaseAgent


def _load_all() -> dict[str, BaseAgent]:
    from backend.agents.ceo import CEOAgent
    from backend.agents.research import ResearchAgent
    from backend.agents.coding import CodingAgent
    from backend.agents.browser import BrowserAgent
    from backend.agents.qa import QAAgent
    from backend.agents.memory_agent import MemoryAgent
    from backend.agents.optimizer import OptimizerAgent

    return {
        "ceo": CEOAgent(),
        "research": ResearchAgent(),
        "coding": CodingAgent(),
        "browser": BrowserAgent(),
        "qa": QAAgent(),
        "memory": MemoryAgent(),
        "optimizer": OptimizerAgent(),
    }


_REGISTRY: dict[str, BaseAgent] | None = None


def get_registry() -> dict[str, BaseAgent]:
    global _REGISTRY
    if _REGISTRY is None:
        _REGISTRY = _load_all()
    return _REGISTRY


def get_agent(agent_type: str) -> Optional[BaseAgent]:
    return get_registry().get(agent_type)


def list_agents() -> list[str]:
    return list(get_registry().keys())
