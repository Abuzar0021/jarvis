"""Webcam capture using OpenCV.  Single-frame on-demand — no continuous stream."""

from __future__ import annotations

import asyncio
import base64
import io
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple


def _sync_grab(device: int, max_w: int, max_h: int, quality: int) -> bytes:
    """Synchronous webcam grab — intended to be called via run_in_executor."""
    try:
        import cv2
    except ImportError:
        raise RuntimeError(
            "opencv-python is not installed. Run: pip install opencv-python"
        )
    from PIL import Image

    cap = cv2.VideoCapture(device)
    if not cap.isOpened():
        raise RuntimeError(
            f"Cannot open webcam device {device}. "
            "Check that a camera is connected and not in use by another application."
        )
    try:
        # Warm up: discard first frame (some cameras return a dark/blank first frame)
        cap.read()
        ret, frame = cap.read()
        if not ret or frame is None:
            raise RuntimeError("Webcam read returned empty frame.")

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(frame_rgb)
        img.thumbnail((max_w, max_h), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality)
        return buf.getvalue()
    finally:
        cap.release()


async def capture_webcam(
    device: int = 0,
    save: bool = True,
) -> Tuple[str, Optional[Path]]:
    """
    Capture a single frame from the webcam.

    Args:
        device: OpenCV device index (0 = default webcam).
        save: whether to persist the JPEG to data/captures/.

    Returns:
        (base64_jpeg_string, saved_file_path_or_None)

    Raises:
        RuntimeError if cv2 not installed or no webcam found.
    """
    from backend.config import (
        VISION_CAPTURE_DIR,
        VISION_MAX_W,
        VISION_MAX_H,
        VISION_JPEG_QUALITY,
    )

    loop = asyncio.get_running_loop()
    try:
        jpeg_bytes = await loop.run_in_executor(
            None, _sync_grab, device, VISION_MAX_W, VISION_MAX_H, VISION_JPEG_QUALITY
        )
    except Exception as exc:
        raise RuntimeError(f"Webcam capture failed: {exc}") from exc

    saved_path: Optional[Path] = None
    if save:
        VISION_CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:22]
        saved_path = VISION_CAPTURE_DIR / f"webcam_{ts}.jpg"
        saved_path.write_bytes(jpeg_bytes)

    return base64.b64encode(jpeg_bytes).decode(), saved_path
