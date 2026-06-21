"""
Orchestrator — maintains the agent pool and routes tasks to the right agent.
The CEO delegates here; agents do NOT instantiate each other directly.
"""

from __future__ import annotations

import asyncio
import importlib
import importlib.util
import sys
from pathlib import Path
from typing import Optional

from config import AGENTS_DIR
from core.logger import get_logger, log_action
from core.memory import get_memory

logger = get_logger("jarvis.orchestrator")

# Mapping of agent name → module path for built-in agents
_BUILTIN_AGENTS = {
    "research":   "agents.research_agent.ResearchAgent",
    "coding":     "agents.coding_agent.CodingAgent",
    "qa":         "agents.qa_agent.QAAgent",
    "debug":      "agents.debug_agent.DebugAgent",
    "deployment": "agents.deployment_agent.DeploymentAgent",
    "marketing":  "agents.marketing_agent.MarketingAgent",
    "outreach":   "agents.outreach_agent.OutreachAgent",
    "data":       "agents.data_agent.DataAgent",
    "factory":    "agents.agent_factory.AgentFactory",
    "vision":     "agents.vision_agent.VisionAgent",
    # Phase 3
    "computer":   "agents.computer_agent.ComputerAgent",
    "browser":    "agents.browser_agent.BrowserAgent",
    "reviewer":   "agents.reviewer_agent.ReviewerAgent",
}


class Orchestrator:
    """Routes tasks to agents and manages the agent pool."""

    def __init__(self) -> None:
        self._pool: dict[str, object] = {}  # name → agent instance
        self.memory = get_memory()

    # ── Agent resolution ───────────────────────────────────────────────────────

    def _load_builtin(self, name: str):
        dotpath = _BUILTIN_AGENTS[name]
        module_path, class_name = dotpath.rsplit(".", 1)
        mod = importlib.import_module(module_path)
        return getattr(mod, class_name)()

    def _load_dynamic(self, name: str):
        """Load an agent from data/agents/<name>.py."""
        file = AGENTS_DIR / f"{name}.py"
        if not file.exists():
            return None
        spec = importlib.util.spec_from_file_location(f"dynamic.{name}", file)
        if spec is None:
            return None
        mod = importlib.util.module_from_spec(spec)
        sys.modules[f"dynamic.{name}"] = mod
        spec.loader.exec_module(mod)
        # Find class ending in 'Agent'
        for attr in dir(mod):
            cls = getattr(mod, attr)
            if isinstance(cls, type) and attr.endswith("Agent") and attr != "BaseAgent":
                return cls()
        return None

    def get_agent(self, name: str):
        """Return (possibly cached) agent instance by name."""
        if name not in self._pool:
            if name in _BUILTIN_AGENTS:
                self._pool[name] = self._load_builtin(name)
            else:
                agent = self._load_dynamic(name)
                if agent is None:
                    raise ValueError(f"Unknown agent: '{name}'")
                self._pool[name] = agent
        return self._pool[name]

    def available_agents(self) -> list[str]:
        return list(_BUILTIN_AGENTS.keys())

    # ── Task routing ───────────────────────────────────────────────────────────

    async def run_task(
        self,
        agent_name: str,
        task: str,
        context: Optional[dict] = None,
        task_id: Optional[str] = None,
        subtask_id: Optional[str] = None,
    ) -> str:
        """Dispatch a task to an agent and return its output."""
        log_action("orchestrator", f"→ {agent_name}", task[:60])

        if task_id:
            self.memory.update_task(task_id, "running", assigned_to=agent_name)
        if subtask_id:
            self.memory.update_subtask(subtask_id, "running")

        try:
            agent = self.get_agent(agent_name)
            result = await agent.run(task, context=context)

            if task_id:
                self.memory.update_task(task_id, "done", result=result[:500])
            if subtask_id:
                self.memory.update_subtask(subtask_id, "done", result=result[:500])

            return result

        except Exception as exc:
            err = f"Agent '{agent_name}' error: {exc}"
            logger.error(err, exc_info=True)

            if task_id:
                self.memory.update_task(task_id, "failed", result=err)
            if subtask_id:
                self.memory.update_subtask(subtask_id, "failed", result=err)

            return err

    async def run_plan(
        self,
        subtasks: list[dict],
        task_id: str,
        show_progress: bool = True,
    ) -> dict[str, str]:
        """
        Execute a list of subtasks sequentially (respecting dependencies).
        Returns a mapping of subtask title → result.
        """
        results: dict[str, str] = {}
        completed: set[str] = set()

        # Persist subtasks
        subtask_ids: dict[str, str] = {}
        for st in subtasks:
            sid = self.memory.add_subtask(task_id, st)
            subtask_ids[st["title"]] = sid

        remaining = list(subtasks)
        max_passes = len(subtasks) + 1  # guard against circular deps

        for _ in range(max_passes):
            if not remaining:
                break

            ready = [
                st for st in remaining
                if all(dep in completed for dep in st.get("dependencies", []))
            ]

            if not ready:
                # All remaining tasks have unmet deps — run them anyway
                ready = remaining[:1]
                logger.warning(f"Circular/missing dependency, forcing: {ready[0]['title']}")

            # Run ready tasks in parallel when there are multiple independent subtasks
            if len(ready) == 1:
                st = ready[0]
                title = st["title"]
                agent_name = st.get("agent", "coding")
                sid = subtask_ids.get(title)
                if show_progress:
                    logger.info(f"[orchestrator] [{agent_name}] {title}")
                result = await self.run_task(
                    agent_name=agent_name,
                    task=f"{title}\n\n{st.get('description', '')}",
                    context={"previous_results": {k: v[:300] for k, v in results.items()}},
                    task_id=task_id,
                    subtask_id=sid,
                )
                results[title] = result
                completed.add(title)
                remaining.remove(st)
            else:
                # Parallel execution for independent subtasks
                ctx = {"previous_results": {k: v[:300] for k, v in results.items()}}
                if show_progress:
                    titles = ", ".join(st["title"] for st in ready)
                    logger.info(f"[orchestrator] parallel: {titles}")

                async def _run_one(st: dict) -> tuple[str, str]:
                    return st["title"], await self.run_task(
                        agent_name=st.get("agent", "coding"),
                        task=f"{st['title']}\n\n{st.get('description', '')}",
                        context=ctx,
                        task_id=task_id,
                        subtask_id=subtask_ids.get(st["title"]),
                    )

                batch = await asyncio.gather(
                    *[_run_one(st) for st in ready], return_exceptions=True
                )
                for st, outcome in zip(ready, batch):
                    title = st["title"]
                    if isinstance(outcome, Exception):
                        results[title] = f"ERROR: {outcome}"
                        logger.error(f"Parallel subtask '{title}' raised: {outcome}")
                    else:
                        results[title] = outcome[1]
                    completed.add(title)
                    remaining.remove(st)

        return results


_orchestrator: Optional[Orchestrator] = None


def get_orchestrator() -> Orchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = Orchestrator()
    return _orchestrator
