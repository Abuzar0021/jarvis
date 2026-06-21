"""
Browser automation tools using Playwright (headless Chromium).

A singleton browser context is shared across all calls within a process.
All tools degrade gracefully if playwright is not installed.
"""

from __future__ import annotations

import asyncio
from typing import Optional

from tools import register
from core.logger import get_logger

logger = get_logger("jarvis.tools.browser_pw")

# ── Singleton browser context ─────────────────────────────────────────────────

_pw_instance = None
_browser = None
_context = None
_ctx_lock = asyncio.Lock()


async def _get_ctx():
    """Return (or create) the shared Playwright browser context."""
    global _pw_instance, _browser, _context
    async with _ctx_lock:
        if _context is not None:
            return _context
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            raise RuntimeError(
                "playwright not installed.\n"
                "Run: pip install playwright && playwright install chromium"
            )
        _pw_instance = await async_playwright().__aenter__()
        _browser = await _pw_instance.chromium.launch(headless=True, args=["--no-sandbox"])
        _context = await _browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 720},
        )
    return _context


async def _page_text(page) -> str:
    """Strip boilerplate and return body text (max 8 000 chars)."""
    text = await page.evaluate("""() => {
        ['script','style','nav','header','footer','aside','noscript']
            .forEach(t => document.querySelectorAll(t).forEach(e => e.remove()));
        return (document.body && document.body.innerText || '').trim();
    }""")
    return text[:8000] if text else "(no readable text)"


# ── browse ────────────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "browse",
            "description": "Visit a URL with a real browser and return the page text content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Full URL to visit"},
                    "wait_for": {
                        "type": "string",
                        "description": "CSS selector to wait for before reading (optional)",
                    },
                },
                "required": ["url"],
            },
        },
    },
    dangerous=False,
)
async def browse(url: str, wait_for: Optional[str] = None) -> str:
    logger.info(f"browse: {url}")
    try:
        ctx = await _get_ctx()
        page = await ctx.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=25_000)
            if wait_for:
                await page.wait_for_selector(wait_for, timeout=10_000)
            await asyncio.sleep(0.4)
            return await _page_text(page)
        finally:
            await page.close()
    except Exception as exc:
        return f"ERROR browsing {url}: {exc}"


# ── search_google ─────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "search_google",
            "description": "Search Google and return titles, URLs, and snippets of organic results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "num_results": {
                        "type": "integer",
                        "description": "Number of results (default 8, max 15)",
                    },
                },
                "required": ["query"],
            },
        },
    },
    dangerous=False,
)
async def search_google(query: str, num_results: int = 8) -> str:
    num_results = min(num_results, 15)
    logger.info(f"search_google: {query!r} n={num_results}")

    # Primary: DuckDuckGo (reliable, no bot detection)
    result = await _ddg_fallback(query, num_results)
    if result and not result.startswith("DDG"):
        return result

    # Secondary: Playwright Google search
    try:
        ctx = await _get_ctx()
        page = await ctx.new_page()
        try:
            esc = query.replace(" ", "+")
            await page.goto(
                f"https://www.google.com/search?q={esc}&num=20&hl=en",
                wait_until="domcontentloaded",
                timeout=20_000,
            )
            await asyncio.sleep(0.6)
            items = await page.evaluate("""(n) => {
                const out = [];
                document.querySelectorAll('div.g, div[data-hveid]').forEach(el => {
                    const a = el.querySelector('a[href^="http"]');
                    const h = el.querySelector('h3');
                    const s = el.querySelector('.VwiC3b, .IsZvec');
                    if (a && h && out.length < n)
                        out.push({title: h.innerText, url: a.href, snippet: s ? s.innerText : ''});
                });
                return out;
            }""", num_results)
            if items:
                return "\n\n".join(
                    f"{i+1}. {r['title']}\n   {r['url']}\n   {r.get('snippet','')}"
                    for i, r in enumerate(items)
                )
        finally:
            await page.close()
    except Exception as exc:
        logger.warning(f"Google search failed: {exc}")

    return result  # DDG result


async def _ddg_fallback(query: str, n: int) -> str:
    def _search():
        try:
            from duckduckgo_search import DDGS
            with DDGS() as d:
                results = list(d.text(query, max_results=n))
            if not results:
                return "No results found."
            return "\n\n".join(
                f"{i+1}. {r['title']}\n   {r['href']}\n   {r['body']}"
                for i, r in enumerate(results)
            )
        except Exception as e:
            return f"DDG search error: {e}"
    return await asyncio.to_thread(_search)


# ── extract_page ──────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "extract_page",
            "description": "Visit a URL and extract text from specific CSS-selected elements.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL to visit"},
                    "selector": {
                        "type": "string",
                        "description": "CSS selector (e.g. 'article', 'h1', '.price'). Default: body",
                    },
                },
                "required": ["url"],
            },
        },
    },
    dangerous=False,
)
async def extract_page(url: str, selector: str = "body") -> str:
    logger.info(f"extract_page: {url} sel={selector!r}")
    try:
        ctx = await _get_ctx()
        page = await ctx.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=25_000)
            await asyncio.sleep(0.4)
            texts = await page.locator(selector).all_inner_texts()
            combined = "\n".join(texts)
            return combined[:8000] if combined else f"No elements matching '{selector}' on {url}"
        finally:
            await page.close()
    except Exception as exc:
        return f"ERROR extracting from {url}: {exc}"


# ── click_element ─────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "click_element",
            "description": "Navigate to a URL and click an element by CSS selector or visible text.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Page URL to visit"},
                    "selector": {
                        "type": "string",
                        "description": "CSS selector or 'text=Button Label' to click",
                    },
                },
                "required": ["url", "selector"],
            },
        },
    },
    dangerous=True,
)
async def click_element(url: str, selector: str) -> str:
    logger.info(f"click_element: {url} -> {selector!r}")
    try:
        ctx = await _get_ctx()
        page = await ctx.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=25_000)
            await page.locator(selector).first.click(timeout=10_000)
            await asyncio.sleep(0.6)
            title = await page.title()
            url_after = page.url
            return f"Clicked '{selector}' — now on: {title} ({url_after})"
        finally:
            await page.close()
    except Exception as exc:
        return f"ERROR clicking '{selector}' on {url}: {exc}"


# ── fill_form ─────────────────────────────────────────────────────────────────

@register(
    schema={
        "type": "function",
        "function": {
            "name": "fill_form",
            "description": "Visit a URL, fill an input field, and optionally submit.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Page URL"},
                    "selector": {
                        "type": "string",
                        "description": "CSS selector of the input field",
                    },
                    "value": {
                        "type": "string",
                        "description": "Value to type into the field",
                    },
                    "submit": {
                        "type": "boolean",
                        "description": "Press Enter after filling (default false)",
                    },
                },
                "required": ["url", "selector", "value"],
            },
        },
    },
    dangerous=True,
)
async def fill_form(url: str, selector: str, value: str, submit: bool = False) -> str:
    logger.info(f"fill_form: {url} {selector!r}={value[:20]!r} submit={submit}")
    try:
        ctx = await _get_ctx()
        page = await ctx.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=25_000)
            field = page.locator(selector).first
            await field.fill(value, timeout=10_000)
            if submit:
                await page.keyboard.press("Enter")
                await asyncio.sleep(1.2)
                title = await page.title()
                return f"Filled and submitted — now on: {title}"
            return f"Filled '{selector}' with {len(value)} characters"
        finally:
            await page.close()
    except Exception as exc:
        return f"ERROR filling form on {url}: {exc}"
