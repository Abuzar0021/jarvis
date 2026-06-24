"""Workflow tools — build, run, resume, and recover workflows via the one engine."""

from __future__ import annotations

import json

from tools import register
from core.logger import get_logger

logger = get_logger("jarvis.workflow_tools")


@register(schema={
    "type": "function",
    "function": {
        "name": "wf_run",
        "description": "Plan and run a multi-step workflow for a goal. Returns a summary.",
        "parameters": {
            "type": "object",
            "properties": {"goal": {"type": "string"}},
            "required": ["goal"],
        },
    },
})
async def wf_run(goal: str) -> str:
    from core.workflows import get_workflow_engine
    result = await get_workflow_engine().run_goal(goal)
    return json.dumps({"workflow_id": result.get("workflow_id"),
                       "status": result.get("status"),
                       "summary": result.get("summary", "")[:800]})


@register(schema={
    "type": "function",
    "function": {
        "name": "wf_resume",
        "description": "Resume an interrupted or paused workflow; completed steps are skipped.",
        "parameters": {
            "type": "object",
            "properties": {"workflow_id": {"type": "string"}},
            "required": ["workflow_id"],
        },
    },
})
async def wf_resume(workflow_id: str) -> str:
    from core.workflows import get_workflow_engine
    result = await get_workflow_engine().resume(workflow_id)
    return json.dumps({"status": result.get("status"), "summary": result.get("summary", "")[:800]})


@register(schema={
    "type": "function",
    "function": {
        "name": "wf_recover",
        "description": "Recover a failed workflow — reset failed steps and re-run them.",
        "parameters": {
            "type": "object",
            "properties": {"workflow_id": {"type": "string"}},
            "required": ["workflow_id"],
        },
    },
})
async def wf_recover(workflow_id: str) -> str:
    from core.workflows import get_workflow_engine
    result = await get_workflow_engine().recover(workflow_id)
    return json.dumps({"status": result.get("status"), "summary": result.get("summary", "")[:800]})


@register(schema={
    "type": "function",
    "function": {
        "name": "wf_status",
        "description": "Get a workflow's current status and per-step progress.",
        "parameters": {
            "type": "object",
            "properties": {"workflow_id": {"type": "string"}},
            "required": ["workflow_id"],
        },
    },
})
async def wf_status(workflow_id: str) -> str:
    from core.workflows import get_workflow_engine
    wf = get_workflow_engine().get(workflow_id)
    if not wf:
        return f"ERROR: workflow '{workflow_id}' not found"
    return json.dumps({
        "status": wf["status"], "goal": wf["goal"],
        "steps": [{"title": s["title"], "agent": s["agent"], "status": s["status"]}
                  for s in wf["steps"]],
    })


@register(schema={
    "type": "function",
    "function": {
        "name": "wf_list",
        "description": "List recent workflows with their status and step counts.",
        "parameters": {"type": "object", "properties": {"limit": {"type": "integer"}}},
    },
})
async def wf_list(limit: int = 25) -> str:
    from core.workflows import get_workflow_engine
    wfs = get_workflow_engine().list_workflows(limit=limit)
    return json.dumps([
        {"id": w["id"][:8], "goal": w["goal"][:60], "status": w["status"],
         "steps": w.get("step_counts", {})} for w in wfs
    ])
