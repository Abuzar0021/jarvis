"""BaseAgent — the foundation every specialist agent inherits from."""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from abc import ABC, abstractmethod
from typing import Optional

from config import MODELS, MAX_AGENT_ITERATIONS
from core.llm_client import get_llm
from core.memory import get_memory
from core.safety import get_safety
from core.logger import get_logger, log_action, log_tool, log_result
import tools as tool_registry

logger = get_logger("jarvis.agent")


class BaseAgent(ABC):
    """
    All Jarvis agents extend this class.

    Subclasses must define:
        name        str   — unique agent identifier
        role        str   — one-liner shown in logs / UI
        tool_names  list  — subset of TOOL_REGISTRY keys this agent may use
        system_prompt str — full system message

    Optionally override:
        model_key   str   — key into MODELS dict
    """

    name: str = "base"
    role: str = "Base agent"
    tool_names: list[str] = []
    model_key: str = "default"

    # Self-review is a SECOND LLM call. It only ever runs on the no-tool path
    # (tool results are already grounded in real system state and skip it), which
    # in practice is just conversation — where a critique pass adds latency and
    # tokens without improving a 1-3 sentence reply. Off by default; agents that
    # genuinely benefit can opt in.
    enable_self_review: bool = False

    @property
    @abstractmethod
    def system_prompt(self) -> str:  # pragma: no cover
        ...

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    def __init__(self) -> None:
        self.llm = get_llm()
        self.memory = get_memory()
        self.safety = get_safety()
        self.model = MODELS.get(self.model_key, MODELS["default"])
        self._session_id: str = str(uuid.uuid4())
        logger.debug(f"Agent '{self.name}' initialised with model={self.model}")

    # ── Tool helpers ───────────────────────────────────────────────────────────

    @property
    def tool_schemas(self) -> list[dict]:
        return tool_registry.get_schemas(self.tool_names)

    async def _execute_tool(self, name: str, **kwargs) -> str:
        """Execute a registered tool, checking safety first."""
        log_tool(self.name, name, kwargs)

        entry = tool_registry.TOOL_REGISTRY.get(name)
        if entry is None:
            return f"ERROR: tool '{name}' not registered"

        if entry["dangerous"]:
            approved = await self.safety.request_approval(self.name, name, kwargs)
            if not approved:
                self.memory.log_action(self.name, name, kwargs, "rejected", approved=False)
                return f"REJECTED: user did not approve '{name}'"

        # Broadcast tool execution start to dashboard
        from backend.websocket_manager import manager as _ws, EventType as _ET
        await _ws.broadcast(_ET.TOOL_START, {"agent": self.name, "tool": name, "args": kwargs})

        start = time.monotonic()
        try:
            result = await entry["handler"](**kwargs)
        except Exception as exc:
            result = f"ERROR in {name}: {exc}"
            logger.error(f"Tool '{name}' raised: {exc}", exc_info=True)
        elapsed = time.monotonic() - start

        self.memory.log_action(self.name, name, kwargs, result[:200], approved=True)
        self.memory.record_metric(self.name, "tool_latency_ms", elapsed * 1000)

        # Broadcast tool execution result to dashboard
        await _ws.broadcast(_ET.TOOL_COMPLETE, {"agent": self.name, "tool": name, "result": result[:300]})
        return result

    # ── Core execution ─────────────────────────────────────────────────────────

    async def run(
        self,
        task: str,
        context: Optional[dict] = None,
        session_id: Optional[str] = None,
    ) -> str:
        """
        Execute a task:
        1. Build messages from history + task
        2. Run tool-calling loop
        3. Self-review the output
        4. Persist result
        """
        session_id = session_id or self._session_id
        log_action(self.name, "START", task[:80])
        start = time.monotonic()

        # Build initial messages
        messages: list[dict] = [{"role": "system", "content": self.system_prompt}]

        # Inject prior conversation
        history = self.memory.get_messages(session_id)
        messages.extend(history)

        # Current task
        user_content = task
        if context:
            user_content += f"\n\n---\nContext:\n{json.dumps(context, indent=2)}"
        messages.append({"role": "user", "content": user_content})

        # Persist user message
        self.memory.add_message(session_id, "user", user_content, self.name)

        # Wrap tool_executor to track which tools were actually called
        _tools_called: list[str] = []

        async def _tracked_executor(name: str, **kw) -> str:
            _tools_called.append(name)
            return await self._execute_tool(name, **kw)

        # Run tool loop
        final_text, messages = await self.llm.tool_loop(
            messages=messages,
            tools=self.tool_schemas,
            tool_executor=_tracked_executor,
            model=self.model,
            max_iterations=MAX_AGENT_ITERATIONS,
        )

        # Warn when a tool-capable agent produced text only — possible fake success
        if self.tool_names and not _tools_called:
            logger.warning(
                f"[{self.name}] 0 tools executed — response may be text-only: "
                f"{final_text[:80]!r}"
            )

        # Skip self-review when tools ran (results already grounded in real system
        # state) OR when self-review is disabled (default). This removes the extra
        # LLM call from the conversational hot path.
        if _tools_called or not self.enable_self_review:
            reviewed = final_text
        else:
            reviewed = await self._self_review(task, final_text)

        # Persist assistant message
        self.memory.add_message(session_id, "assistant", reviewed, self.name)

        elapsed = time.monotonic() - start
        self.memory.record_metric(self.name, "task_duration_s", elapsed)
        log_result(self.name, reviewed)
        log_action(self.name, "DONE", f"{elapsed:.1f}s")

        return reviewed

    # ── Self-review ────────────────────────────────────────────────────────────

    async def _self_review(self, task: str, output: str) -> str:
        """Agent critically reviews its own output and improves if needed."""
        if not output or output.startswith("Max iterations"):
            return output

        review_prompt = (
            f"You just completed this task:\n{task}\n\n"
            f"Your output:\n{output}\n\n"
            "Critically review your output:\n"
            "- Is it complete and accurate?\n"
            "- Are there errors or omissions?\n\n"
            "Reply with EXACTLY one of:\n"
            "APPROVED\n"
            "REVISED: <improved output>\n"
        )
        review = await self.llm.simple(
            prompt=review_prompt,
            system=self.system_prompt,
            model=self.model,
            temperature=0.2,
        )

        if review.startswith("REVISED:"):
            improved = review[len("REVISED:"):].strip()
            logger.info(f"[{self.name}] self-review produced revision")
            return improved
        return output

    # ── Utility ────────────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return f"<Agent name={self.name!r} model={self.model!r}>"
