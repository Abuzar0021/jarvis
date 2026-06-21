"""
Vision tools — registered with the tool registry so agents can call them.

All heavy imports (mss, cv2, PIL) are lazy: inside the handler functions.
This means importing this module never fails, even in headless environments.
"""

from __future__ import annotations

from pathlib import Path

from tools import register
from core.logger import get_logger

logger = get_logger("jarvis.tools.vision")


# ── capture_screen ─────────────────────────────────────────────────────────────

@register(
    {
        "type": "function",
        "function": {
            "name": "capture_screen",
            "description": (
                "Capture the current desktop screen and analyze it with the vision model. "
                "Use this to answer questions about what is visible on the user's screen, "
                "read text, identify applications, explain errors, or summarize web pages."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": (
                            "What to look for or ask about the screen. "
                            "Example: 'What application is open?', 'Read the error message', "
                            "'Summarize the content of this page'."
                        ),
                    }
                },
                "required": [],
            },
        },
    }
)
async def capture_screen(
    question: str = "Describe everything visible on this screen in detail.",
) -> str:
    """Capture the desktop screen and return a text description."""
    try:
        from backend.vision.screen import capture_screen as _grab
        from backend.vision.analyzer import get_analyzer

        image_b64, saved_path = await _grab(save=True)
        analyzer = get_analyzer()
        description = await analyzer.analyze(image_b64, question)

        path_note = f"\n[Screenshot saved: {saved_path}]" if saved_path else ""
        logger.info(f"capture_screen: {len(description)} chars, path={saved_path}")
        return description + path_note

    except RuntimeError as exc:
        return f"Screen capture unavailable: {exc}"
    except Exception as exc:
        logger.error(f"capture_screen failed: {exc}", exc_info=True)
        return f"Error capturing screen: {exc}"


# ── capture_webcam ─────────────────────────────────────────────────────────────

@register(
    {
        "type": "function",
        "function": {
            "name": "capture_webcam",
            "description": (
                "Capture a photo from the webcam and analyze it. "
                "Use this to describe the physical environment, identify people or objects, "
                "or answer questions about what the camera can see."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "What to look for in the webcam image.",
                    },
                    "device": {
                        "type": "integer",
                        "description": "Webcam device index (0 = default camera).",
                    },
                },
                "required": [],
            },
        },
    }
)
async def capture_webcam(
    question: str = "Describe what you see in this image.",
    device: int = 0,
) -> str:
    """Capture a single webcam frame and return a text description."""
    try:
        from backend.vision.webcam import capture_webcam as _grab
        from backend.vision.analyzer import get_analyzer

        image_b64, saved_path = await _grab(device=device, save=True)
        analyzer = get_analyzer()
        description = await analyzer.analyze(image_b64, question)

        path_note = f"\n[Webcam photo saved: {saved_path}]" if saved_path else ""
        logger.info(f"capture_webcam: {len(description)} chars, path={saved_path}")
        return description + path_note

    except RuntimeError as exc:
        return f"Webcam capture unavailable: {exc}"
    except Exception as exc:
        logger.error(f"capture_webcam failed: {exc}", exc_info=True)
        return f"Error capturing webcam: {exc}"


# ── analyze_image ──────────────────────────────────────────────────────────────

@register(
    {
        "type": "function",
        "function": {
            "name": "analyze_image",
            "description": (
                "Analyze a saved image file using the vision model. "
                "Accepts an absolute path or a filename inside data/captures/. "
                "Use this to re-analyze a previously captured screenshot or webcam photo."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "image_path": {
                        "type": "string",
                        "description": (
                            "Path to the image file. Can be absolute or just a filename "
                            "if it is in the data/captures/ directory."
                        ),
                    },
                    "question": {
                        "type": "string",
                        "description": "What to ask about the image.",
                    },
                },
                "required": ["image_path"],
            },
        },
    }
)
async def analyze_image(
    image_path: str,
    question: str = "Describe everything you see in this image.",
) -> str:
    """Load an image from disk and analyze it with the vision model."""
    try:
        from backend.vision.analyzer import get_analyzer
        from backend.config import VISION_CAPTURE_DIR

        path = Path(image_path)

        # Try as-is first, then relative to captures dir
        if not path.exists():
            candidate = VISION_CAPTURE_DIR / path.name
            if candidate.exists():
                path = candidate
            else:
                return (
                    f"Image not found: {image_path}\n"
                    f"Checked: {path} and {candidate}"
                )

        analyzer = get_analyzer()
        description = await analyzer.analyze_file(path, question)
        logger.info(f"analyze_image: {path.name} → {len(description)} chars")
        return description

    except Exception as exc:
        logger.error(f"analyze_image failed: {exc}", exc_info=True)
        return f"Error analyzing image: {exc}"
