"""
Vision LLM analyzer.

Sends base64-encoded JPEG images to a vision-capable model via OpenRouter
using the standard OpenAI multimodal message format.
"""

from __future__ import annotations

import base64
import json
import re
from pathlib import Path
from typing import Optional

from core.llm_client import get_llm
from core.logger import get_logger

logger = get_logger("jarvis.vision")

_SYSTEM_PROMPT = """\
You are Jarvis, an AI with computer vision capabilities.

When analyzing images:
- Describe exactly what you see: applications, windows, text, UI elements, errors
- Be specific about spatial layout (top-left, center, bottom-right, etc.)
- Note any errors, warnings, notifications, or important status indicators
- If asked a specific question, answer it directly first, then add context
- Flag anything unusual, broken, or actionable
- Keep descriptions accurate — do not hallucinate details not visible in the image
"""


class VisionAnalyzer:
    """Wraps the LLM client to send image + text queries to a vision model."""

    def __init__(self) -> None:
        self.llm = get_llm()

    async def analyze(
        self,
        image_b64: str,
        question: str = "Describe everything you see in this image.",
        system: str = _SYSTEM_PROMPT,
        model: Optional[str] = None,
    ) -> str:
        """
        Send a base64 JPEG image to the vision model.

        Args:
            image_b64: base64-encoded JPEG string (no data-URL prefix needed).
            question: natural-language question about the image.
            system: system prompt override.
            model: override the default vision model.

        Returns:
            Plain-text description / answer from the LLM.
        """
        from backend.config import VISION_MODEL

        model = model or VISION_MODEL

        messages: list[dict] = [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": question},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_b64}",
                            "detail": "auto",
                        },
                    },
                ],
            },
        ]

        logger.debug(f"Vision analyze: model={model} question={question[:60]}")
        resp = await self.llm.chat(messages, model=model, temperature=0.2, max_tokens=1024)
        return resp.choices[0].message.content or ""

    async def analyze_file(
        self,
        path: Path,
        question: str = "Describe everything you see in this image.",
    ) -> str:
        """Convenience: load an image file and analyze it."""
        image_b64 = base64.b64encode(path.read_bytes()).decode()
        return await self.analyze(image_b64, question)

    async def structured_analyze(
        self,
        image_b64: str,
        question: str = "What is on this screen?",
    ) -> dict:
        """
        Returns a structured dict:
            {
                "description": str,
                "reasoning": str,
                "action_suggestion": str | null
            }
        """
        structured_question = (
            f"{question}\n\n"
            "Respond with ONLY valid JSON in this exact format:\n"
            "{\n"
            '  "description": "detailed description of what you see",\n'
            '  "reasoning": "why this is relevant / what the user likely wants",\n'
            '  "action_suggestion": "concrete next step or null"\n'
            "}"
        )

        raw = await self.analyze(image_b64, structured_question)

        # Extract JSON block (model may wrap it in markdown)
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        # Fallback: wrap plain text
        return {
            "description": raw,
            "reasoning": "",
            "action_suggestion": None,
        }


_analyzer: Optional[VisionAnalyzer] = None


def get_analyzer() -> VisionAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = VisionAnalyzer()
    return _analyzer
