"""Async OpenRouter LLM client with tool-calling and retry support."""

import asyncio
import json
from typing import Any, Optional

from openai import AsyncOpenAI, APIStatusError, APIConnectionError

from config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL, MODELS
from core.logger import get_logger

logger = get_logger("jarvis.llm")


class LLMClient:
    """Thin async wrapper around OpenRouter (OpenAI-compatible)."""

    def __init__(self) -> None:
        if not OPENROUTER_API_KEY:
            raise EnvironmentError(
                "OPENROUTER_API_KEY is not set. Copy .env.example → .env and add your key."
            )
        self.client = AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
            default_headers={
                "HTTP-Referer": "https://github.com/jarvis-ai-os",
                "X-Title": "Jarvis AI OS",
            },
        )

    async def chat(
        self,
        messages: list[dict],
        tools: Optional[list[dict]] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        max_retries: int = 4,
    ) -> Any:
        """Raw chat completion — returns the full response object."""
        model = model or MODELS["default"]
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        for attempt in range(max_retries):
            try:
                logger.debug(f"LLM call model={model} msgs={len(messages)}")
                resp = await self.client.chat.completions.create(**kwargs)
                logger.debug(f"LLM usage: {resp.usage}")
                return resp
            except APIStatusError as exc:
                if exc.status_code == 429:
                    wait = 2 ** attempt
                    logger.warning(f"Rate-limited, retrying in {wait}s…")
                    await asyncio.sleep(wait)
                else:
                    logger.error(f"API error {exc.status_code}: {exc.message}")
                    if attempt == max_retries - 1:
                        raise
                    await asyncio.sleep(1)
            except APIConnectionError:
                wait = 2 ** attempt
                logger.warning(f"Connection error, retrying in {wait}s…")
                await asyncio.sleep(wait)

        raise RuntimeError("LLM max retries exceeded")

    async def simple(
        self,
        prompt: str,
        system: str = "",
        model: Optional[str] = None,
        temperature: float = 0.7,
    ) -> str:
        """Convenience: string in → string out, no tools."""
        messages: list[dict] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        resp = await self.chat(messages, model=model, temperature=temperature)
        return resp.choices[0].message.content or ""

    async def tool_loop(
        self,
        messages: list[dict],
        tools: list[dict],
        tool_executor,
        model: Optional[str] = None,
        max_iterations: int = 15,
    ) -> tuple[str, list[dict]]:
        """
        Run the full tool-calling loop.

        tool_executor: async callable(tool_name, **kwargs) → str

        Returns (final_text, updated_messages).
        """
        messages = list(messages)  # local copy

        for _ in range(max_iterations):
            resp = await self.chat(messages=messages, tools=tools, model=model)
            msg = resp.choices[0].message

            if not msg.tool_calls:
                # Final answer
                return msg.content or "", messages

            # Append assistant message (with tool_calls)
            messages.append(msg.model_dump(exclude_unset=True))

            # Execute each tool call and append results
            for tc in msg.tool_calls:
                fn_name = tc.function.name
                try:
                    fn_args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    fn_args = {}

                logger.debug(f"Tool call: {fn_name}({fn_args})")
                try:
                    result = await tool_executor(fn_name, **fn_args)
                except Exception as exc:  # noqa: BLE001
                    result = f"ERROR: {exc}"
                    logger.error(f"Tool {fn_name} raised: {exc}")

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": str(result),
                    }
                )

        return "Max iterations reached without a final answer.", messages


_client: Optional[LLMClient] = None


def get_llm() -> LLMClient:
    global _client
    if _client is None:
        _client = LLMClient()
    return _client
