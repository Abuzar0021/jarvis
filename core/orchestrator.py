"""
Orchestrator — maintains the agent pool and routes tasks to the right agent.
The CEO delegates here; agents do NOT instantiate each other directly.
"""

from __future__ import annotations

import asyncio
import importlib
import importlib.util
import sys
import time
import uuid
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
    # Lead-generation pipeline
    "lead_generation":   "agents.lead_generation_agent.LeadGenerationAgent",
    "contact_discovery": "agents.contact_discovery_agent.ContactDiscoveryAgent",
    "website_audit":     "agents.website_audit_agent.WebsiteAuditAgent",
    "lead_scoring":      "agents.lead_scoring_agent.LeadScoringAgent",
    "proposal":          "agents.proposal_agent.ProposalAgent",
    "crm":               "agents.crm_agent.CrmAgent",
    # Workflow / automation / sales / learning
    "workflow":          "agents.workflow_agent.WorkflowAgent",
    "automation":        "agents.automation_agent.AutomationAgent",
    "sales":             "agents.sales_agent.SalesAgent",
    "learning":          "agents.learning_agent.LearningAgent",
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

    @staticmethod
    def _is_error_result(result: str) -> bool:
        low = result.lower().strip()
        return low.startswith("error") or low.startswith("agent '") or low.startswith("exception")

    async def _run_with_retry(
        self,
        agent_name: str,
        task: str,
        context: Optional[dict],
        task_id: Optional[str],
        subtask_id: Optional[str],
        max_retries: int = 1,
    ) -> str:
        result = await self.run_task(
            agent_name=agent_name, task=task,
            context=context, task_id=task_id, subtask_id=subtask_id,
        )
        for attempt in range(max_retries):
            if not self._is_error_result(result):
                break
            delay = 2 ** attempt  # 1s then 2s
            logger.warning(
                f"[retry {attempt+1}/{max_retries}] {agent_name} failed, retrying in {delay}s. "
                f"Error: {result[:120]}"
            )
            await asyncio.sleep(delay)
            retry_ctx = {**(context or {}), "previous_error": result[:300]}
            result = await self.run_task(
                agent_name=agent_name, task=task,
                context=retry_ctx, task_id=task_id, subtask_id=subtask_id,
            )
        return result

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

        # Broadcast agent starting
        from backend.websocket_manager import manager, EventType
        await manager.broadcast(EventType.AGENT_STATUS, {
            "agent": agent_name, "status": "running",
            "task_title": task[:60], "task_id": task_id or "",
        })
        await manager.broadcast(EventType.TASK_UPDATE, {
            "title": task[:60], "status": "running", "agent": agent_name,
        })

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

            await manager.broadcast(EventType.AGENT_STATUS, {
                "agent": agent_name, "status": "done",
                "task_title": task[:60], "task_id": task_id or "",
            })
            await manager.broadcast(EventType.TASK_UPDATE, {
                "title": task[:60], "status": "done", "agent": agent_name,
            })
            return result

        except Exception as exc:
            err = f"Agent '{agent_name}' error: {exc}"
            logger.error(err, exc_info=True)

            if task_id:
                self.memory.update_task(task_id, "failed", result=err)
            if subtask_id:
                self.memory.update_subtask(subtask_id, "failed", result=err)

            await manager.broadcast(EventType.AGENT_STATUS, {
                "agent": agent_name, "status": "failed",
                "task_title": task[:60], "task_id": task_id or "",
            })
            await manager.broadcast(EventType.TASK_UPDATE, {
                "title": task[:60], "status": "failed", "agent": agent_name,
            })
            return err

    async def run_plan(
        self,
        subtasks: list[dict],
        task_id: Optional[str] = None,
        show_progress: bool = True,
        on_step_start=None,  # Optional[Callable[[int, int, str, str], Awaitable[None]]]
        on_step_complete=None,  # Optional[Callable[[str, str], Awaitable[None]]] — (title, result)
        prior_results: Optional[dict[str, str]] = None,  # already-completed steps (resume)
        should_continue=None,  # Optional[Callable[[], bool]] — return False to pause
    ) -> dict[str, str]:
        """
        Execute subtasks respecting dependencies; independent groups run in parallel.
        Returns mapping of subtask title → result.

        Checkpoint/resume hooks (used by the WorkflowEngine — all optional and
        backward compatible):
          on_step_complete(title, result)  fired after each step finishes (persist).
          prior_results                     results from a previous run; their steps
                                            are treated as already done (resume skips
                                            them and downstream deps see their output).
          should_continue()                 checked before each pass; False → pause
                                            (returns the results gathered so far).
        """
        task_id = task_id or str(uuid.uuid4())
        _t0 = time.monotonic()
        results: dict[str, str] = dict(prior_results or {})
        completed: set[str] = set(results.keys())
        failed_count = 0

        async def _checkpoint(title: str, result: str) -> None:
            if on_step_complete:
                try:
                    await on_step_complete(title, result)
                except Exception:
                    pass

        # Persist only the subtasks that still need to run; skip resumed ones.
        subtask_ids: dict[str, str] = {}
        for st in subtasks:
            if st["title"] in completed:
                continue
            sid = self.memory.add_subtask(task_id, st)
            subtask_ids[st["title"]] = sid

        # On resume, drop already-completed steps from the work list.
        remaining = [st for st in subtasks if st["title"] not in completed]
        max_passes = len(remaining) + 1  # guard against circular deps

        for _ in range(max_passes):
            if should_continue is not None and not should_continue():
                logger.info("[orchestrator] plan paused before next step")
                break
            if not remaining:
                break

            ready = [
                st for st in remaining
                if all(dep in completed for dep in st.get("dependencies", []))
            ]

            if not ready:
                # All remaining tasks have unmet deps — run them anyway to avoid deadlock
                ready = remaining[:1]
                logger.warning(f"Circular/missing dependency, forcing: {ready[0]['title']}")

            ctx = {"previous_results": {k: v[:300] for k, v in results.items()}}

            if len(ready) == 1:
                st = ready[0]
                title = st["title"]
                agent_name = st.get("agent", "coding")
                sid = subtask_ids.get(title)
                step_num = len(completed) + 1
                if show_progress:
                    logger.info(f"[orchestrator] [{agent_name}] {title}")
                if on_step_start:
                    try:
                        await on_step_start(step_num, len(subtasks), title, agent_name)
                    except Exception:
                        pass
                try:
                    result = await self._run_with_retry(
                        agent_name=agent_name,
                        task=f"{title}\n\n{st.get('description', '')}",
                        context=ctx,
                        task_id=task_id,
                        subtask_id=sid,
                    )
                except Exception as exc:
                    result = f"ERROR: {exc}"
                    logger.error(f"Subtask '{title}' raised: {exc}")
                if self._is_error_result(result):
                    failed_count += 1
                results[title] = result
                completed.add(title)
                remaining.remove(st)
                await _checkpoint(title, result)
            else:
                # Parallel execution for independent subtasks
                step_num = len(completed) + 1
                if show_progress:
                    titles = ", ".join(st["title"] for st in ready)
                    logger.info(f"[orchestrator] parallel({len(ready)}): {titles}")
                if on_step_start:
                    group_title = ", ".join(st["title"] for st in ready[:2])
                    try:
                        await on_step_start(step_num, len(subtasks), group_title, "parallel")
                    except Exception:
                        pass

                async def _run_one(st: dict) -> tuple[str, str]:
                    title = st["title"]
                    try:
                        res = await self._run_with_retry(
                            agent_name=st.get("agent", "coding"),
                            task=f"{title}\n\n{st.get('description', '')}",
                            context=ctx,
                            task_id=task_id,
                            subtask_id=subtask_ids.get(title),
                        )
                        return title, res
                    except Exception as exc:
                        return title, f"ERROR: {exc}"

                batch = await asyncio.gather(
                    *[_run_one(st) for st in ready], return_exceptions=True
                )
                for st, outcome in zip(ready, batch):
                    title = st["title"]
                    if isinstance(outcome, Exception):
                        results[title] = f"ERROR: {outcome}"
                        failed_count += 1
                        logger.error(f"Parallel subtask '{title}' raised: {outcome}")
                    else:
                        results[title] = outcome[1]
                        if self._is_error_result(outcome[1]):
                            failed_count += 1
                    completed.add(title)
                    remaining.remove(st)
                    await _checkpoint(title, results[title])

        elapsed = time.monotonic() - _t0
        logger.info(
            f"[orchestrator] plan done: {len(results)} tasks, "
            f"{failed_count} failed, {elapsed:.2f}s"
        )
        return results


_orchestrator: Optional[Orchestrator] = None


def get_orchestrator() -> Orchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = Orchestrator()
    return _orchestrator
