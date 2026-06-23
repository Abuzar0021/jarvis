"""
BaseAgent — every agent in the system inherits from this.
Handles: LLM calls, tool dispatch, event emission, metrics, retry logic.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from abc import ABC, abstractmethod
from typing import Any, Optional

import httpx

from backend.core.config import settings
from backend.core.events import Event, EventBus, EventType

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAYS = [1.0, 2.0, 4.0]


class ToolCall:
    __slots__ = ("id", "name", "arguments", "result", "error", "duration_ms")

    def __init__(self, name: str, arguments: dict) -> None:
        self.id = str(uuid.uuid4())[:8]
        self.name = name
        self.arguments = arguments
        self.result: Any = None
        self.error: str | None = None
        self.duration_ms: int = 0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "arguments": self.arguments,
            "result": self.result,
            "error": self.error,
            "duration_ms": self.duration_ms,
        }


class AgentContext:
    """Carries the execution context through the agent call chain."""

    def __init__(
        self,
        tenant_id: str,
        workflow_id: str,
        goal: str,
        bus: EventBus,
        tools: dict[str, Any],
        memory: list[dict] | None = None,
        metadata: dict | None = None,
    ) -> None:
        self.tenant_id = tenant_id
        self.workflow_id = workflow_id
        self.goal = goal
        self.bus = bus
        self.tools = tools
        self.memory = memory or []
        self.metadata = metadata or {}
        self.tool_calls: list[ToolCall] = []
        self.messages: list[dict] = []


class BaseAgent(ABC):
    agent_type: str = "base"
    default_model: str | None = None
    max_iterations: int = 10

    def __init__(self, model: str | None = None) -> None:
        self._model = model or self.default_model or settings.DEFAULT_MODEL
        self._http: httpx.AsyncClient | None = None

    @property
    def http(self) -> httpx.AsyncClient:
        if self._http is None:
            self._http = httpx.AsyncClient(timeout=120.0)
        return self._http

    @abstractmethod
    async def run(self, task: str, ctx: AgentContext) -> str:
        """Execute the agent's task. Must return a string result."""

    async def execute(self, task: str, ctx: AgentContext) -> str:
        """Public entry point — wraps run() with events + metrics."""
        agent_id = f"{self.agent_type}-{str(uuid.uuid4())[:8]}"
        start = time.monotonic()

        await ctx.bus.publish(Event(
            type=EventType.AGENT_STARTED,
            tenant_id=ctx.tenant_id,
            workflow_id=ctx.workflow_id,
            agent_id=agent_id,
            data={"agent_type": self.agent_type, "task": task[:200]},
        ))

        try:
            result = await self.run(task, ctx)
            duration_ms = int((time.monotonic() - start) * 1000)

            await ctx.bus.publish(Event(
                type=EventType.AGENT_COMPLETED,
                tenant_id=ctx.tenant_id,
                workflow_id=ctx.workflow_id,
                agent_id=agent_id,
                data={
                    "agent_type": self.agent_type,
                    "duration_ms": duration_ms,
                    "result_length": len(result),
                    "tool_calls": len(ctx.tool_calls),
                },
            ))
            return result

        except Exception as exc:
            duration_ms = int((time.monotonic() - start) * 1000)
            logger.exception("Agent %s failed: %s", self.agent_type, exc)
            await ctx.bus.publish(Event(
                type=EventType.AGENT_FAILED,
                tenant_id=ctx.tenant_id,
                workflow_id=ctx.workflow_id,
                agent_id=agent_id,
                data={"agent_type": self.agent_type, "error": str(exc), "duration_ms": duration_ms},
            ))
            raise

    async def _llm(
        self,
        messages: list[dict],
        ctx: AgentContext,
        tools: list[dict] | None = None,
        model: str | None = None,
    ) -> dict:
        """Call the LLM via OpenRouter with automatic retry."""
        model = model or self._model
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "HTTP-Referer": "https://jarvis-v2.app",
            "X-Title": "Jarvis V2",
        }
        body: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": settings.MAX_TOKENS,
        }
        if tools:
            body["tools"] = tools
            body["tool_choice"] = "auto"

        for attempt, delay in enumerate([0] + RETRY_DELAYS):
            if delay:
                await asyncio.sleep(delay)
            try:
                resp = await self.http.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=body,
                )
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 429 and attempt < MAX_RETRIES - 1:
                    continue
                raise
            except httpx.TimeoutException:
                if attempt < MAX_RETRIES - 1:
                    continue
                raise

        raise RuntimeError("LLM call failed after retries")

    async def _call_tool(self, tool_name: str, arguments: dict, ctx: AgentContext) -> str:
        """Look up and execute a tool, emitting events."""
        tc = ToolCall(tool_name, arguments)
        ctx.tool_calls.append(tc)
        start = time.monotonic()

        await ctx.bus.publish(Event(
            type=EventType.TOOL_CALLED,
            tenant_id=ctx.tenant_id,
            workflow_id=ctx.workflow_id,
            data={"tool": tool_name, "arguments": arguments},
        ))

        tool_fn = ctx.tools.get(tool_name)
        if tool_fn is None:
            tc.error = f"Tool '{tool_name}' not found"
            await ctx.bus.publish(Event(
                type=EventType.TOOL_FAILED,
                tenant_id=ctx.tenant_id,
                workflow_id=ctx.workflow_id,
                data={"tool": tool_name, "error": tc.error},
            ))
            return f"ERROR: {tc.error}"

        try:
            if asyncio.iscoroutinefunction(tool_fn):
                result = await tool_fn(**arguments)
            else:
                result = await asyncio.to_thread(tool_fn, **arguments)
            tc.result = result
            tc.duration_ms = int((time.monotonic() - start) * 1000)

            await ctx.bus.publish(Event(
                type=EventType.TOOL_COMPLETED,
                tenant_id=ctx.tenant_id,
                workflow_id=ctx.workflow_id,
                data={
                    "tool": tool_name,
                    "duration_ms": tc.duration_ms,
                    "result_snippet": str(result)[:200],
                },
            ))
            return str(result)

        except Exception as exc:
            tc.error = str(exc)
            tc.duration_ms = int((time.monotonic() - start) * 1000)
            await ctx.bus.publish(Event(
                type=EventType.TOOL_FAILED,
                tenant_id=ctx.tenant_id,
                workflow_id=ctx.workflow_id,
                data={"tool": tool_name, "error": str(exc)},
            ))
            return f"ERROR: {exc}"

    async def _agentic_loop(
        self,
        system: str,
        user: str,
        ctx: AgentContext,
        tool_schemas: list[dict] | None = None,
    ) -> str:
        """
        Standard ReAct loop: call LLM → if tool_use → call tool → repeat.
        Returns the final text response.
        """
        messages: list[dict] = [{"role": "user", "content": user}]

        for _ in range(self.max_iterations):
            response = await self._llm(
                [{"role": "system", "content": system}] + messages,
                ctx,
                tools=tool_schemas,
            )
            choice = response["choices"][0]
            msg = choice["message"]
            finish_reason = choice.get("finish_reason", "stop")

            messages.append(msg)

            if finish_reason == "tool_calls":
                tool_results = []
                for tc in msg.get("tool_calls", []):
                    fn = tc["function"]
                    args = json.loads(fn.get("arguments", "{}"))
                    result = await self._call_tool(fn["name"], args, ctx)
                    tool_results.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": result,
                    })
                messages.extend(tool_results)
                continue

            content = msg.get("content") or ""
            return content.strip()

        return "ERROR: max iterations reached without a final answer"

    async def close(self) -> None:
        if self._http:
            await self._http.aclose()
