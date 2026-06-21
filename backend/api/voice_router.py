"""Voice control endpoints + WebSocket real-time stream."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel

from backend.websocket_manager import manager, EventType
from backend.voice.pipeline import get_pipeline
from core.logger import get_logger

logger = get_logger("jarvis.api.voice")
router = APIRouter(prefix="/api/voice", tags=["voice"])


# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws")
async def voice_websocket(websocket: WebSocket):
    """
    Real-time event stream for the Jarvis HUD.

    Events sent → client:
      state_change, wake_detected, transcript, response,
      tts_start, tts_end, agent_start, agent_done, tool_call, error

    Messages received ← client:
      {"action": "trigger"}     — manually trigger wake word
      {"action": "interrupt"}   — interrupt current speech
      {"action": "text", "text": "..."} — send text command directly
    """
    await manager.connect(websocket)
    pipeline = get_pipeline()

    # Send current state on connect
    await manager.send_to(websocket, EventType.SYSTEM_STATUS, pipeline.get_status())

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "trigger":
                pipeline.trigger_wake()
                await manager.send_to(websocket, EventType.WAKE_DETECTED, {"source": "manual"})

            elif action == "interrupt":
                pipeline.interrupt()

            elif action == "text":
                text = data.get("text", "").strip()
                if text:
                    import asyncio
                    asyncio.create_task(pipeline.process_text_command(text))

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as exc:
        logger.error(f"WS error: {exc}")
        await manager.disconnect(websocket)


# ── REST ──────────────────────────────────────────────────────────────────────

@router.get("/status")
async def voice_status():
    """Current voice pipeline state."""
    return get_pipeline().get_status()


@router.post("/trigger")
async def trigger_wake():
    """Manually fire the wake word (push-to-talk / testing)."""
    get_pipeline().trigger_wake()
    return {"triggered": True}


@router.post("/interrupt")
async def interrupt_speech():
    """Interrupt Jarvis while speaking."""
    get_pipeline().interrupt()
    return {"interrupted": True}


class TextCommand(BaseModel):
    text: str
    speak: bool = True


@router.post("/command")
async def send_text_command(cmd: TextCommand):
    """Send a text command to Jarvis (bypasses STT)."""
    if not cmd.text.strip():
        raise HTTPException(400, "text cannot be empty")
    import asyncio
    pipeline = get_pipeline()
    asyncio.create_task(pipeline.process_text_command(cmd.text.strip()))
    return {"queued": True, "text": cmd.text}
