"""Async OpenRouter LLM client with tool-calling, retry, and model fallback."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Optional

from openai import AsyncOpenAI, APIStatusError, APIConnectionError

from config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL, MODELS
from core.logger import get_logger

logger = get_logger("jarvis.llm")

# Ordered fallback chain — tried in sequence when the requested model is unavailable.
_FALLBACK_MODELS: list[str] = [
    "openai/gpt-4o-mini",
    "openai/gpt-4o",
    "mistralai/mistral-large",
    "anthropic/claude-3-haiku",
]

# HTTP status codes that indicate "this model doesn't exist here" vs transient errors.
_MODEL_UNAVAILABLE_STATUSES: frozenset[int] = frozenset({400, 404, 422})
_MODEL_UNAVAILABLE_PHRASES: tuple[str, ...] = (
    "no endpoints found",
    "model not found",
    "invalid model",
    "unknown model",
    "model_not_found",
)


class LLMClient:
    """Thin async wrapper around OpenRouter (OpenAI-compatible)."""

    def __init__(self) -> None:
        self._has_key = bool(OPENROUTER_API_KEY)
        if self._has_key:
            self.client = AsyncOpenAI(
                api_key=OPENROUTER_API_KEY,
                base_url=OPENROUTER_BASE_URL,
                default_headers={
                    "HTTP-Referer": "https://github.com/jarvis-ai-os",
                    "X-Title": "Jarvis AI OS",
                },
            )
        else:
            self.client = None
            logger.warning("OPENROUTER_API_KEY not set — LLM calls will fail at runtime")

    @staticmethod
    def _is_model_unavailable(exc: APIStatusError) -> bool:
        """Return True when the error means the model itself is not routable."""
        if exc.status_code not in _MODEL_UNAVAILABLE_STATUSES:
            return False
        msg = str(exc.message).lower()
        return any(phrase in msg for phrase in _MODEL_UNAVAILABLE_PHRASES)

    async def chat(
        self,
        messages: list[dict],
        tools: Optional[list[dict]] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        max_retries: int = 2,
    ) -> Any:
        """
        Chat completion with automatic model fallback.

        If the requested model returns a "no endpoints / not found" error,
        the next model in _FALLBACK_MODELS is tried automatically.
        Rate-limit errors (429) are retried with exponential backoff on the same model.
        """
        if not self._has_key:
            raise EnvironmentError(
                "OPENROUTER_API_KEY is not set. Copy .env.example → .env and add your key."
            )
        resolved = model or MODELS["default"]

        # Build a deduplicated fallback sequence: requested model first, then fallbacks.
        chain: list[str] = [resolved] + [m for m in _FALLBACK_MODELS if m != resolved]

        kwargs: dict[str, Any] = {
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        last_exc: Optional[Exception] = None

        for try_model in chain:
            for attempt in range(max_retries + 1):
                try:
                    logger.debug(f"LLM call model={try_model} msgs={len(messages)} attempt={attempt}")
                    resp = await self.client.chat.completions.create(
                        model=try_model, **kwargs
                    )
                    if try_model != resolved:
                        logger.info(f"LLM fallback succeeded: {resolved} → {try_model}")
                    return resp

                except APIStatusError as exc:
                    if self._is_model_unavailable(exc):
                        logger.warning(
                            f"Model unavailable: {try_model!r} ({exc.status_code}: {exc.message!r}) "
                            f"— trying next fallback"
                        )
                        last_exc = exc
                        break  # move to next model in chain

                    if exc.status_code == 429:
                        wait = 2 ** attempt
                        logger.warning(f"Rate-limited on {try_model}, retrying in {wait}s…")
                        await asyncio.sleep(wait)
                        last_exc = exc
                        continue  # retry same model

                    # Other API error (500, auth, etc.) — surface immediately
                    logger.error(f"API error {exc.status_code} on {try_model}: {exc.message}")
                    raise

                except APIConnectionError as exc:
                    wait = 2 ** attempt
                    logger.warning(f"Connection error on {try_model}, retrying in {wait}s…")
                    await asyncio.sleep(wait)
                    last_exc = exc
                    continue

        raise last_exc or RuntimeError("LLM: all models in fallback chain exhausted")

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
        Full tool-calling loop.
        tool_executor: async callable(tool_name, **kwargs) → str
        Returns (final_text, updated_messages).
        """
        messages = list(messages)

        for _ in range(max_iterations):
            resp = await self.chat(messages=messages, tools=tools, model=model)
            msg = resp.choices[0].message

            if not msg.tool_calls:
                return msg.content or "", messages

            messages.append(msg.model_dump(exclude_unset=True))

            for tc in msg.tool_calls:
                fn_name = tc.function.name
                try:
                    fn_args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    fn_args = {}

                logger.debug(f"Tool call: {fn_name}({fn_args})")
                try:
                    result = await tool_executor(fn_name, **fn_args)
                except Exception as exc:
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
