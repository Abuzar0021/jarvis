"""Browser agent — Playwright automation with streamed screenshots."""
from __future__ import annotations

import asyncio
import base64
import logging
from typing import Any

from backend.agents.base import AgentContext, BaseAgent
from backend.core.events import Event, EventType

logger = logging.getLogger(__name__)

_SYSTEM = """You are a browser automation agent in Jarvis V2. You control a real web browser.

You can navigate, click, type, and extract data from websites. Screenshots are streamed
to the user dashboard in real time so the user can watch you work.

Process:
1. Navigate to the starting URL
2. Take a screenshot to understand the page state
3. Identify and interact with elements
4. Verify your actions succeeded via screenshots
5. Extract the required data or confirm the action completed

Be methodical. Verify before proceeding. If an action fails, take a screenshot and diagnose."""

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "browser_navigate",
            "description": "Navigate to a URL",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string"}},
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_screenshot",
            "description": "Take a screenshot of the current page",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_click",
            "description": "Click an element on the page",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {"type": "string", "description": "CSS selector or descriptive text"},
                    "by_text": {"type": "boolean", "default": False, "description": "Find by visible text"},
                },
                "required": ["selector"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_type",
            "description": "Type text into a focused input",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {"type": "string"},
                    "text": {"type": "string"},
                    "clear_first": {"type": "boolean", "default": True},
                },
                "required": ["selector", "text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_extract",
            "description": "Extract text or structured data from the page",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {"type": "string"},
                    "extract_type": {"type": "string", "enum": ["text", "html", "table", "links"]},
                },
                "required": ["selector", "extract_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_wait",
            "description": "Wait for an element to appear or a condition",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {"type": "string"},
                    "timeout_ms": {"type": "integer", "default": 5000},
                },
                "required": ["selector"],
            },
        },
    },
]


class BrowserAgent(BaseAgent):
    agent_type = "browser"
    max_iterations = 15
    _page: Any = None

    async def run(self, task: str, ctx: AgentContext) -> str:
        # Inject screenshot streaming into the context tools
        ctx.tools["browser_screenshot"] = lambda: self._take_screenshot(ctx)
        return await self._agentic_loop(_SYSTEM, task, ctx, tool_schemas=_TOOLS)

    async def _take_screenshot(self, ctx: AgentContext) -> str:
        """Take a screenshot and stream it to the dashboard via events."""
        if "playwright_page" not in ctx.metadata:
            return "ERROR: Browser not initialized. Call browser_navigate first."
        page = ctx.metadata["playwright_page"]
        try:
            png = await page.screenshot(type="png", full_page=False)
            b64 = base64.b64encode(png).decode()
            await ctx.bus.publish(Event(
                type=EventType.BROWSER_SCREENSHOT,
                tenant_id=ctx.tenant_id,
                workflow_id=ctx.workflow_id,
                data={"image_b64": b64, "url": page.url},
            ))
            return f"Screenshot captured. Current URL: {page.url}"
        except Exception as exc:
            return f"ERROR capturing screenshot: {exc}"
