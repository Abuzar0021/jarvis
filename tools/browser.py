"""Browser automation tool using Playwright (optional dependency)."""

import asyncio
from typing import Optional

from tools import register
from core.logger import get_logger

logger = get_logger("jarvis.tools.browser")


def _playwright_available() -> bool:
    try:
        import playwright  # noqa: F401
        return True
    except ImportError:
        return False


@register(
    schema={
        "type": "function",
        "function": {
            "name": "browse_page",
            "description": (
                "Open a URL in a headless browser, optionally click elements or fill forms, "
                "and return the page text. Requires Playwright: `playwright install chromium`."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL to navigate to"},
                    "action": {
                        "type": "string",
                        "enum": ["read", "click", "fill", "screenshot"],
                        "description": "What to do on the page (default: read)",
                        "default": "read",
                    },
                    "selector": {
                        "type": "string",
                        "description": "CSS selector for click/fill actions",
                    },
                    "value": {
                        "type": "string",
                        "description": "Text to type when action=fill",
                    },
                    "screenshot_path": {
                        "type": "string",
                        "description": "File path to save screenshot when action=screenshot",
                    },
                    "wait_ms": {
                        "type": "integer",
                        "description": "Milliseconds to wait after navigation (default 1000)",
                        "default": 1000,
                    },
                },
                "required": ["url"],
            },
        },
    },
    dangerous=False,
)
async def browse_page(
    url: str,
    action: str = "read",
    selector: Optional[str] = None,
    value: Optional[str] = None,
    screenshot_path: Optional[str] = None,
    wait_ms: int = 1000,
) -> str:
    if not _playwright_available():
        return (
            "Playwright not installed. Run: pip install playwright && playwright install chromium\n"
            "Falling back to web_fetch instead."
        )

    logger.info(f"browse_page: {url} action={action}")

    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, timeout=30_000)
            await page.wait_for_timeout(wait_ms)

            result = ""

            if action == "click" and selector:
                await page.click(selector)
                await page.wait_for_timeout(500)
                result = f"Clicked: {selector}"

            elif action == "fill" and selector and value:
                await page.fill(selector, value)
                result = f"Filled {selector} with text"

            elif action == "screenshot":
                path = screenshot_path or "screenshot.png"
                await page.screenshot(path=path, full_page=True)
                result = f"Screenshot saved to {path}"

            else:  # read
                text = await page.inner_text("body")
                result = text[:6000]

            await browser.close()
            return result

    except Exception as exc:
        return f"Browser error: {exc}"


@register(
    schema={
        "type": "function",
        "function": {
            "name": "browser_fill_form",
            "description": "Fill and submit a web form using Playwright.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string"},
                    "fields": {
                        "type": "object",
                        "description": "Mapping of CSS selector → value to fill",
                        "additionalProperties": {"type": "string"},
                    },
                    "submit_selector": {
                        "type": "string",
                        "description": "CSS selector of the submit button",
                    },
                },
                "required": ["url", "fields"],
            },
        },
    },
    dangerous=False,
)
async def browser_fill_form(url: str, fields: dict, submit_selector: Optional[str] = None) -> str:
    if not _playwright_available():
        return "Playwright not installed."

    logger.info(f"browser_fill_form: {url} fields={list(fields.keys())}")

    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, timeout=30_000)

            for sel, val in fields.items():
                await page.fill(sel, val)

            if submit_selector:
                await page.click(submit_selector)
                await page.wait_for_timeout(2000)

            result_text = await page.inner_text("body")
            await browser.close()
            return result_text[:4000]
    except Exception as exc:
        return f"Form error: {exc}"
