"""Agent management and direct task execution endpoints."""

import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.orchestrator import get_orchestrator
from core.memory import get_memory
from core.logger import get_logger
from backend.websocket_manager import manager, EventType

logger = get_logger("jarvis.api.agents")
router = APIRouter(prefix="/api/agents", tags=["agents"])

BUILTIN_AGENTS = {
    "ceo":        "Goal decomposition, delegation, and synthesis",
    "research":   "Web research and information gathering",
    "coding":     "Code generation and refactoring",
    "qa":         "Testing and quality assurance",
    "debug":      "Error diagnosis and bug fixing",
    "deployment": "Packaging and deployment",
    "marketing":  "Marketing copy and strategy",
    "outreach":   "Personalised email and social outreach",
    "data":       "Data analysis and visualisation",
    "factory":    "Create and modify agents",
}


@router.get("")
async def list_agents():
    """List all available agents (builtin + dynamic)."""
    mem = get_memory()
    dynamic = mem.list_dynamic_agents()
    agents = [
        {"name": k, "role": v, "type": "builtin"} for k, v in BUILTIN_AGENTS.items()
    ] + [
        {"name": a["name"], "role": a["role"], "type": "dynamic"} for a in dynamic
    ]
    return {"agents": agents, "count": len(agents)}


@router.get("/{agent_name}/status")
async def agent_status(agent_name: str):
    """Get recent task stats for an agent."""
    if agent_name not in BUILTIN_AGENTS:
        mem = get_memory()
        if not mem.get_dynamic_agent(agent_name):
            raise HTTPException(404, f"Agent '{agent_name}' not found")

    mem = get_memory()
    recent = mem.get_recent_logs(limit=10, agent=agent_name)
    return {"agent": agent_name, "recent_actions": recent}


class RunTaskRequest(BaseModel):
    task: str
    context: Optional[dict] = None
    speak_result: bool = False


@router.post("/{agent_name}/run")
async def run_agent_task(agent_name: str, req: RunTaskRequest):
    """Dispatch a task to a specific agent and return the result."""
    orch = get_orchestrator()
    await manager.broadcast(EventType.AGENT_START, {"agent": agent_name, "task": req.task})
    try:
        result = await orch.run_task(agent_name, req.task, context=req.context)
        await manager.broadcast(EventType.AGENT_DONE, {"agent": agent_name, "result": result[:300]})
        return {"agent": agent_name, "result": result}
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except Exception as exc:
        await manager.broadcast(EventType.AGENT_ERROR, {"agent": agent_name, "error": str(exc)})
        raise HTTPException(500, str(exc))


class CreateAgentRequest(BaseModel):
    description: str


@router.post("/factory/create")
async def create_agent(req: CreateAgentRequest):
    """Use the Agent Factory to create a new agent from a description."""
    from agents.agent_factory import AgentFactory  # noqa: PLC0415
    factory = AgentFactory()
    result = await factory.create_agent(req.description)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await manager.broadcast(
        EventType.SYSTEM_STATUS, {"event": "agent_created", "name": result["name"]}
    )
    return result
