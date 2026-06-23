"""Built-in web tools — search, fetch, headless browse."""
from __future__ import annotations

import asyncio
import json
import logging

import httpx

from backend.tools.registry import tool

logger = logging.getLogger(__name__)

_SEARCH_SCHEMA = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Search the web using DuckDuckGo and return top results",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "num_results": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    },
}

_FETCH_SCHEMA = {
    "type": "function",
    "function": {
        "name": "fetch_url",
        "description": "Fetch a URL and return the text content",
        "parameters": {
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "selector": {"type": "string", "default": ""},
            },
            "required": ["url"],
        },
    },
}


@tool(schema=_SEARCH_SCHEMA)
async def web_search(query: str, num_results: int = 5) -> str:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_redirect": 1, "no_html": 1},
            )
            data = resp.json()

        results = []
        for item in (data.get("RelatedTopics") or [])[:num_results]:
            if "Text" in item:
                results.append(f"• {item['Text']}\n  {item.get('FirstURL','')}")

        if not results:
            # Fallback: return a note
            return f"No structured results for '{query}'. Try a more specific query."

        return f"Search results for '{query}':\n" + "\n\n".join(results)

    except Exception as exc:
        return f"ERROR: search failed: {exc}"


@tool(schema=_FETCH_SCHEMA)
async def fetch_url(url: str, selector: str = "") -> str:
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "JarvisV2/2.0"})
            resp.raise_for_status()

        if resp.headers.get("content-type", "").startswith("application/json"):
            data = resp.json()
            return json.dumps(data, indent=2)[:4000]

        # Basic HTML → text extraction (no BeautifulSoup dep required)
        import re
        text = resp.text
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:5000]

    except httpx.HTTPStatusError as exc:
        return f"ERROR: HTTP {exc.response.status_code} for {url}"
    except Exception as exc:
        return f"ERROR: {exc}"
