"""
Vision API endpoints.

POST /api/vision/screen   — capture + analyze the desktop screen
POST /api/vision/webcam   — capture + analyze webcam frame
POST /api/vision/analyze  — analyze a saved file (or uploaded image)
"""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from backend.vision.analyzer import get_analyzer
from core.logger import get_logger

logger = get_logger("jarvis.api.vision")

router = APIRouter(prefix="/api/vision", tags=["vision"])


# ── Request / Response models ──────────────────────────────────────────────────

class VisionRequest(BaseModel):
    question: str = "Describe everything you see."
    structured: bool = True   # return {description, reasoning, action_suggestion}


class WebcamRequest(VisionRequest):
    device: int = 0


class AnalyzeRequest(BaseModel):
    image_path: Optional[str] = None
    question: str = "Describe everything you see."
    structured: bool = True


class VisionResponse(BaseModel):
    source: str                       # "screen" | "webcam" | "file" | "upload"
    description: str
    reasoning: str = ""
    action_suggestion: Optional[str] = None
    saved_path: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/screen", response_model=VisionResponse)
async def vision_screen(req: VisionRequest):
    """Capture the desktop screen and analyze it with the vision model."""
    try:
        from backend.vision.screen import capture_screen
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=f"Screen capture unavailable: {exc}")

    try:
        image_b64, saved_path = await capture_screen(save=True)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    analyzer = get_analyzer()
    if req.structured:
        result = await analyzer.structured_analyze(image_b64, req.question)
    else:
        result = {
            "description": await analyzer.analyze(image_b64, req.question),
            "reasoning": "",
            "action_suggestion": None,
        }

    logger.info(f"POST /api/vision/screen → {len(result['description'])} chars")
    return VisionResponse(
        source="screen",
        saved_path=str(saved_path) if saved_path else None,
        **result,
    )


@router.post("/webcam", response_model=VisionResponse)
async def vision_webcam(req: WebcamRequest):
    """Capture a webcam frame and analyze it with the vision model."""
    try:
        from backend.vision.webcam import capture_webcam
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=f"Webcam capture unavailable: {exc}")

    try:
        image_b64, saved_path = await capture_webcam(device=req.device, save=True)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    analyzer = get_analyzer()
    if req.structured:
        result = await analyzer.structured_analyze(image_b64, req.question)
    else:
        result = {
            "description": await analyzer.analyze(image_b64, req.question),
            "reasoning": "",
            "action_suggestion": None,
        }

    logger.info(f"POST /api/vision/webcam → {len(result['description'])} chars")
    return VisionResponse(
        source="webcam",
        saved_path=str(saved_path) if saved_path else None,
        **result,
    )


@router.post("/analyze", response_model=VisionResponse)
async def vision_analyze(
    image_path: Optional[str] = None,
    question: str = "Describe everything you see.",
    structured: bool = True,
    file: Optional[UploadFile] = File(default=None),
):
    """
    Analyze an image by file path or uploaded file.

    Priority: uploaded file > image_path parameter.
    """
    from backend.config import VISION_CAPTURE_DIR

    analyzer = get_analyzer()
    source = "unknown"

    if file is not None:
        # Uploaded image
        content = await file.read()
        image_b64 = base64.b64encode(content).decode()
        source = f"upload:{file.filename}"

        # Save upload to captures dir
        VISION_CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
        save_name = file.filename or "upload.jpg"
        saved_path = VISION_CAPTURE_DIR / save_name
        saved_path.write_bytes(content)

    elif image_path:
        path = Path(image_path)
        if not path.exists():
            candidate = VISION_CAPTURE_DIR / path.name
            if candidate.exists():
                path = candidate
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"Image not found: {image_path}",
                )
        image_b64 = base64.b64encode(path.read_bytes()).decode()
        saved_path = path
        source = f"file:{path.name}"
    else:
        raise HTTPException(
            status_code=422,
            detail="Provide either 'image_path' (JSON body) or upload a file.",
        )

    if structured:
        result = await analyzer.structured_analyze(image_b64, question)
    else:
        result = {
            "description": await analyzer.analyze(image_b64, question),
            "reasoning": "",
            "action_suggestion": None,
        }

    logger.info(f"POST /api/vision/analyze source={source} → {len(result['description'])} chars")
    return VisionResponse(
        source=source,
        saved_path=str(saved_path),
        **result,
    )
