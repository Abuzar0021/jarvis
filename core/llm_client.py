"""Async LLM client supporting NVIDIA NIM (primary) and OpenRouter (fallback).

Routing logic:
  • Models whose ID starts with "nim/" are sent to NVIDIA NIM
    (https://integrate.api.nvidia.com/v1) with the "nim/" prefix stripped.
  • All other models are sent to OpenRouter.
  • When a NIM call fails with a 401 (no key) or model-unavailable error,
    the client falls through to the next model in the chain automatically.
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any, Optional

from openai import AsyncOpenAI, APIStatusError, APIConnectionError

from config import (
    OPENROUTER_API_KEY, OPENROUTER_BASE_URL,
    NVIDIA_NIM_API_KEY, NVIDIA_NIM_BASE_URL,
    MODELS,
)
from core.logger import get_logger

logger = get_logger("jarvis.llm")

# Ordered fallback chain for OpenRouter — tried when the requested model errors.
_FALLBACK_MODELS: list[str] = [
    "openai/gpt-4o-mini",
    "openai/gpt-4o",
    "mistralai/mistral-large",
    "anthropic/claude-3-haiku",
]

# HTTP status codes that signal "this model doesn't exist" rather than transient errors.
_MODEL_UNAVAILABLE_STATUSES: frozenset[int] = frozenset({400, 404, 422})
_MODEL_UNAVAILABLE_PHRASES: tuple[str, ...] = (
    "no endpoints found",
    "model not found",
    "invalid model",
    "unknown model",
    "model_not_found",
)

_NIM_PREFIX = "nim/"


class LLMClient:
    """Async wrapper supporting NVIDIA NIM and OpenRouter providers."""

    def __init__(self) -> None:
        # OpenRouter client
        self._has_openrouter = bool(OPENROUTER_API_KEY)
        if self._has_openrouter:
            self._or_client = AsyncOpenAI(
                api_key=OPENROUTER_API_KEY,
                base_url=OPENROUTER_BASE_URL,
                default_headers={
                    "HTTP-Referer": "https://github.com/jarvis-ai-os",
                    "X-Title": "Jarvis AI OS",
                },
            )
        else:
            self._or_client = None
            logger.warning("OPENROUTER_API_KEY not set — OpenRouter calls will fail")

        # NVIDIA NIM client
        self._has_nim = bool(NVIDIA_NIM_API_KEY)
        if self._has_nim:
            self._nim_client = AsyncOpenAI(
                api_key=NVIDIA_NIM_API_KEY,
                base_url=NVIDIA_NIM_BASE_URL,
            )
            logger.info("NVIDIA NIM enabled — NIM models are the primary stack")
        else:
            self._nim_client = None
            logger.info("NVIDIA_NIM_API_KEY not set — NIM models skipped, using OpenRouter")

    # ── Internal ───────────────────────────────────────────────────────────

    @staticmethod
    def _is_model_unavailable(exc: APIStatusError) -> bool:
        if exc.status_code not in _MODEL_UNAVAILABLE_STATUSES:
            return False
        msg = str(exc.message).lower()
        return any(phrase in msg for phrase in _MODEL_UNAVAILABLE_PHRASES)

    def _resolve_client_and_id(self, model_id: str):
        """Return (client, actual_model_id) for the given model identifier."""
        if model_id.startswith(_NIM_PREFIX):
            actual = model_id[len(_NIM_PREFIX):]          # strip "nim/" prefix
            if self._nim_client is not None:
                return self._nim_client, actual
            # NIM key absent — skip, will fall through to OpenRouter in the chain
            return None, actual
        client = self._or_client
        return client, model_id

    # ── Public API ─────────────────────────────────────────────────────────

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
        Chat completion with automatic provider routing and fallback.

        • nim/* models → NVIDIA NIM (falls through if key absent).
        • Other models → OpenRouter.
        • Rate-limit (429): retried with exponential backoff on the same model.
        • Model-unavailable (400/404/422): next model in chain is tried.
        """
        resolved = model or MODELS["default"]

        # Build deduplicated fallback chain: requested model first, then OpenRouter fallbacks.
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
            client, actual_id = self._resolve_client_and_id(try_model)

            if client is None:
                # No client available for this model (NIM absent, OR absent)
                logger.debug(f"Skipping {try_model!r} — provider client not configured")
                continue

            provider_name = "NIM" if try_model.startswith(_NIM_PREFIX) else "OpenRouter"

            for attempt in range(max_retries + 1):
                try:
                    logger.debug(
                        f"LLM call provider={provider_name} model={actual_id} "
                        f"msgs={len(messages)} attempt={attempt}"
                    )
                    resp = await client.chat.completions.create(
                        model=actual_id, **kwargs
                    )
                    if try_model != resolved:
                        logger.info(
                            f"LLM fallback succeeded: {resolved!r} → "
                            f"{provider_name}/{actual_id!r}"
                        )
                    return resp

                except APIStatusError as exc:
                    # 401 from NIM = no key / bad key — treat as model-unavailable
                    if exc.status_code == 401 and try_model.startswith(_NIM_PREFIX):
                        logger.warning(
                            f"NIM auth failed for {actual_id!r} — falling back to OpenRouter"
                        )
                        last_exc = exc
                        break  # next model in chain

                    if self._is_model_unavailable(exc):
                        logger.warning(
                            f"Model unavailable: {actual_id!r} ({exc.status_code}) "
                            f"— trying next fallback"
                        )
                        last_exc = exc
                        break  # next model in chain

                    if exc.status_code == 429:
                        wait = 2 ** attempt
                        logger.warning(
                            f"Rate-limited on {actual_id!r}, retrying in {wait}s…"
                        )
                        await asyncio.sleep(wait)
                        last_exc = exc
                        continue  # retry same model

                    # Other API error (500, etc.) — surface immediately
                    logger.error(
                        f"API error {exc.status_code} on {actual_id!r}: {exc.message}"
                    )
                    raise

                except APIConnectionError as exc:
                    wait = 2 ** attempt
                    logger.warning(
                        f"Connection error on {actual_id!r}, retrying in {wait}s…"
                    )
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

    async def timed_simple(
        self,
        prompt: str,
        system: str = "",
        model: Optional[str] = None,
        temperature: float = 0.7,
    ) -> tuple[str, float]:
        """Like simple() but also returns wall-clock latency in milliseconds."""
        t0 = time.monotonic()
        text = await self.simple(prompt, system=system, model=model, temperature=temperature)
        return text, (time.monotonic() - t0) * 1000.0

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
