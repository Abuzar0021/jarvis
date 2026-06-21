"""Screen capture using mss.  All heavy work runs in an executor thread."""

from __future__ import annotations

import asyncio
import base64
import io
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple


def _sync_grab(
    region: Optional[dict],
    max_w: int,
    max_h: int,
    quality: int,
) -> bytes:
    """Synchronous grab — intended to be called via run_in_executor."""
    import mss  # lazy: not available in CI/headless
    from PIL import Image

    with mss.mss() as sct:
        monitor = region if region else sct.monitors[0]
        shot = sct.grab(monitor)
        # mss gives BGRA raw bytes
        img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")

    img.thumbnail((max_w, max_h), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


async def capture_screen(
    region: Optional[dict] = None,
    save: bool = True,
) -> Tuple[str, Optional[Path]]:
    """
    Capture the primary screen (or a region).

    Returns:
        (base64_jpeg_string, saved_file_path_or_None)

    Raises:
        RuntimeError if mss or display not available.
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
            None, _sync_grab, region, VISION_MAX_W, VISION_MAX_H, VISION_JPEG_QUALITY
        )
    except Exception as exc:
        raise RuntimeError(f"Screen capture failed: {exc}") from exc

    saved_path: Optional[Path] = None
    if save:
        VISION_CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:22]
        saved_path = VISION_CAPTURE_DIR / f"screen_{ts}.jpg"
        saved_path.write_bytes(jpeg_bytes)

    return base64.b64encode(jpeg_bytes).decode(), saved_path
