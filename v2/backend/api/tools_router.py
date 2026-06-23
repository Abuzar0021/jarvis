"""Tool registry API — list, generate, and manage tools."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.auth.middleware import AuthContext, get_auth_context
from backend.tools.registry import get_schemas, stats

router = APIRouter(prefix="/api/tools", tags=["tools"])


class GenerateToolRequest(BaseModel):
    name: str
    description: str
    example_use_cases: list[str] = []


@router.get("")
async def list_tools(auth: AuthContext = Depends(get_auth_context)):
    schemas = get_schemas(auth.tenant_id)
    tool_stats = {s["name"]: s for s in stats()}
    return [
        {
            "name": s["function"]["name"],
            "description": s["function"]["description"],
            "parameters": s["function"]["parameters"],
            "call_count": tool_stats.get(s["function"]["name"], {}).get("call_count", 0),
            "error_rate": tool_stats.get(s["function"]["name"], {}).get("error_rate", 0),
        }
        for s in schemas
    ]


@router.post("/generate")
async def generate_tool(
    body: GenerateToolRequest,
    auth: AuthContext = Depends(get_auth_context),
):
    if not body.name or not body.description:
        raise HTTPException(status_code=400, detail="name and description required")

    try:
        from backend.tools.generator import generate_tool as gen_fn
        from backend.tools.registry import register

        tool_entry = await gen_fn(
            name=body.name,
            description=body.description,
            example_use_cases=body.example_use_cases,
            tenant_id=auth.tenant_id,
        )
        # Register in-memory for immediate use
        register(tool_entry["fn"], tool_entry["schema"])
        return {
            "id": tool_entry["id"],
            "name": tool_entry["name"],
            "description": tool_entry["description"],
            "schema": tool_entry["schema"],
        }
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/stats")
async def tool_stats(auth: AuthContext = Depends(get_auth_context)):
    return stats()
