"""
Event bus: Redis Pub/Sub + in-memory fallback.
All inter-agent communication flows through here.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, AsyncGenerator, Callable, Optional

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    WORKFLOW_STARTED = "workflow.started"
    WORKFLOW_STEP_STARTED = "workflow.step.started"
    WORKFLOW_STEP_COMPLETED = "workflow.step.completed"
    WORKFLOW_COMPLETED = "workflow.completed"
    WORKFLOW_FAILED = "workflow.failed"
    AGENT_STARTED = "agent.started"
    AGENT_COMPLETED = "agent.completed"
    AGENT_FAILED = "agent.failed"
    AGENT_THINKING = "agent.thinking"
    TOOL_CALLED = "tool.called"
    TOOL_COMPLETED = "tool.completed"
    TOOL_FAILED = "tool.failed"
    BROWSER_SCREENSHOT = "browser.screenshot"
    BROWSER_ACTION = "browser.action"
    METRIC_RECORDED = "metric.recorded"
    APPROVAL_REQUESTED = "approval.requested"
    APPROVAL_RESPONSE = "approval.response"
    MEMORY_STORED = "memory.stored"
    TOOL_GENERATED = "tool.generated"
    SELF_IMPROVEMENT = "self.improvement"


class Event:
    __slots__ = ("id", "type", "tenant_id", "workflow_id", "agent_id", "data", "timestamp")

    def __init__(
        self,
        type: EventType,
        tenant_id: str,
        data: dict[str, Any],
        workflow_id: str | None = None,
        agent_id: str | None = None,
    ) -> None:
        self.id = str(uuid.uuid4())
        self.type = type
        self.tenant_id = tenant_id
        self.workflow_id = workflow_id
        self.agent_id = agent_id
        self.data = data
        self.timestamp = datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type.value,
            "tenant_id": self.tenant_id,
            "workflow_id": self.workflow_id,
            "agent_id": self.agent_id,
            "data": self.data,
            "timestamp": self.timestamp.isoformat(),
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict())

    @classmethod
    def from_dict(cls, d: dict) -> "Event":
        ev = cls.__new__(cls)
        ev.id = d["id"]
        ev.type = EventType(d["type"])
        ev.tenant_id = d["tenant_id"]
        ev.workflow_id = d.get("workflow_id")
        ev.agent_id = d.get("agent_id")
        ev.data = d["data"]
        ev.timestamp = datetime.fromisoformat(d["timestamp"])
        return ev

    @classmethod
    def from_json(cls, raw: str | bytes) -> "Event":
        return cls.from_dict(json.loads(raw))


class EventBus:
    """
    Redis-backed Pub/Sub with in-process fan-out for WebSocket subscribers.
    Falls back to in-memory-only when Redis is unavailable.
    """

    def __init__(self, redis_url: str | None = None) -> None:
        self._redis_url = redis_url
        self._redis: Any = None
        self._local_subs: dict[str, list[asyncio.Queue]] = {}  # channel → queues
        self._running = False

    async def connect(self) -> None:
        if self._redis_url:
            try:
                import redis.asyncio as aioredis
                self._redis = aioredis.from_url(
                    self._redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=3,
                )
                await self._redis.ping()
                logger.info("EventBus: Redis connected at %s", self._redis_url)
            except Exception as exc:
                logger.warning("EventBus: Redis unavailable (%s) — in-memory only", exc)
                self._redis = None
        self._running = True

    async def disconnect(self) -> None:
        self._running = False
        if self._redis:
            await self._redis.aclose()

    async def publish(self, event: Event) -> None:
        payload = event.to_json()
        channel = f"jarvis:{event.tenant_id}:{event.type.value}"

        # Fan out to local in-process subscribers first
        for ch, queues in self._local_subs.items():
            if ch == channel or ch == f"jarvis:{event.tenant_id}:*":
                for q in queues:
                    await q.put(event)

        if self._redis:
            try:
                await self._redis.publish(channel, payload)
            except Exception as exc:
                logger.warning("EventBus publish error: %s", exc)

    async def subscribe(
        self,
        tenant_id: str,
        event_types: list[EventType] | None = None,
    ) -> AsyncGenerator[Event, None]:
        """Yield events for a tenant, optionally filtered by type."""
        queue: asyncio.Queue[Event] = asyncio.Queue(maxsize=512)

        if event_types:
            channels = [f"jarvis:{tenant_id}:{et.value}" for et in event_types]
        else:
            channels = [f"jarvis:{tenant_id}:*"]

        for ch in channels:
            self._local_subs.setdefault(ch, []).append(queue)

        try:
            if self._redis and event_types:
                asyncio.create_task(self._redis_pump(tenant_id, event_types, queue))

            while self._running:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield event
                except asyncio.TimeoutError:
                    continue
        finally:
            for ch in channels:
                subs = self._local_subs.get(ch, [])
                if queue in subs:
                    subs.remove(queue)

    async def _redis_pump(
        self,
        tenant_id: str,
        event_types: list[EventType],
        queue: asyncio.Queue,
    ) -> None:
        try:
            import redis.asyncio as aioredis
            sub_client = aioredis.from_url(
                self._redis_url, encoding="utf-8", decode_responses=True
            )
            async with sub_client.pubsub() as pubsub:
                channels = [f"jarvis:{tenant_id}:{et.value}" for et in event_types]
                await pubsub.subscribe(*channels)
                async for msg in pubsub.listen():
                    if msg["type"] == "message":
                        try:
                            ev = Event.from_json(msg["data"])
                            await queue.put(ev)
                        except Exception:
                            pass
        except Exception as exc:
            logger.warning("Redis pump error: %s", exc)


# Global singleton — initialized by FastAPI lifespan
_bus: EventBus | None = None


def get_bus() -> EventBus:
    if _bus is None:
        raise RuntimeError("EventBus not initialized")
    return _bus


async def init_bus(redis_url: str | None = None) -> EventBus:
    global _bus
    _bus = EventBus(redis_url)
    await _bus.connect()
    return _bus
