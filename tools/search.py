"""Web search tools using DuckDuckGo (no API key required)."""

import asyncio
from typing import Optional

from tools import register
from core.logger import get_logger

logger = get_logger("jarvis.tools.search")


@register(
    schema={
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web using DuckDuckGo. Returns titles, URLs, and snippets.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "num_results": {
                        "type": "integer",
                        "description": "Number of results to return (default 5, max 15)",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    },
    dangerous=False,
)
async def web_search(query: str, num_results: int = 5) -> str:
    num_results = min(num_results, 15)
    logger.info(f"web_search: {query!r} n={num_results}")

    def _search() -> str:
        try:
            from duckduckgo_search import DDGS
        except ImportError:
            return "ERROR: duckduckgo-search not installed. Run: pip install duckduckgo-search"

        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=num_results))
            if not results:
                return "No results found."
            lines = []
            for i, r in enumerate(results, 1):
                lines.append(f"{i}. [{r.get('title', 'No title')}]({r.get('href', '')})")
                lines.append(f"   {r.get('body', '')}\n")
            return "\n".join(lines)
        except Exception as exc:
            return f"Search error: {exc}"

    return await asyncio.to_thread(_search)


@register(
    schema={
        "type": "function",
        "function": {
            "name": "web_fetch",
            "description": "Fetch and return the text content of a web page URL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "The URL to fetch"},
                    "max_chars": {
                        "type": "integer",
                        "description": "Maximum characters to return (default 6000)",
                        "default": 6000,
                    },
                },
                "required": ["url"],
            },
        },
    },
    dangerous=False,
)
async def web_fetch(url: str, max_chars: int = 6000) -> str:
    logger.info(f"web_fetch: {url}")
    try:
        import urllib.request
        import html
        from html.parser import HTMLParser

        class _TextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self._skip = False
                self._parts: list[str] = []

            def handle_starttag(self, tag, attrs):
                if tag in ("script", "style", "nav", "header", "footer"):
                    self._skip = True

            def handle_endtag(self, tag):
                if tag in ("script", "style", "nav", "header", "footer"):
                    self._skip = False

            def handle_data(self, data):
                if not self._skip and data.strip():
                    self._parts.append(data.strip())

            def get_text(self) -> str:
                return " ".join(self._parts)

        def _fetch() -> str:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read(512_000).decode("utf-8", errors="replace")
            extractor = _TextExtractor()
            extractor.feed(raw)
            return extractor.get_text()[:max_chars]

        text = await asyncio.to_thread(_fetch)
        return text or "(no text content)"
    except Exception as exc:
        return f"ERROR fetching {url}: {exc}"
