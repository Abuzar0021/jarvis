#!/usr/bin/env python3
"""
TEST 4 — Wake Word Detection
Verifies: Whisper keyword-spotting detector, energy gating, manual trigger.

Run: python scripts/test_04_wake_word.py

Say "Jarvis" several times during the test.
"""

import sys
import time
import asyncio
import numpy as np
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))


def separator(title):
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print('─'*55)


def test_openwakeword():
    separator("4a. OpenWakeWord (optional)")
    try:
        import openwakeword
        from openwakeword.model import Model
        print(f"  ✓ openwakeword {openwakeword.__version__} imported")

        # Try loading a model
        try:
            model = Model(wakeword_models=["jarvis"], inference_framework="onnx")
            print("  ✓ 'jarvis' model loaded")
            return True
        except Exception as e:
            print(f"  ⚠ Could not load 'jarvis' model: {e}")
            print("    System will use Whisper keyword-spotting instead (still works)")
            return None
    except ImportError:
        print("  ○ openwakeword not installed (optional)")
        print("    Install: pip install openwakeword")
        print("    → System uses Whisper keyword-spotting fallback (works fine)")
        return None


async def test_energy_detector():
    separator("4b. Energy-based VAD")
    try:
        from backend.voice.audio_io import MicCapture
    except ImportError as e:
        print(f"  ✗ Import error: {e}")
        return False

    mic = MicCapture(sample_rate=16_000, chunk_ms=100)

    print("  ▶ Monitoring microphone energy for 5 seconds")
    print("  Make noise / speak to see the level rise\n")

    try:
        await mic.start()
    except RuntimeError as e:
        print(f"  ✗ Microphone error: {e}")
        return False

    THRESHOLD = 0.008
    triggered_count = 0
    total_chunks = 0

    deadline = time.monotonic() + 5.0
    while time.monotonic() < deadline:
        chunk = await mic.read(timeout=0.3)
        if chunk is None:
            continue
        rms = float(np.sqrt(np.mean(chunk**2)))
        total_chunks += 1
        bar_len = int(rms * 600)
        bar = '█' * min(bar_len, 45)
        above = " ← SPEECH" if rms > THRESHOLD else ""
        if rms > THRESHOLD:
            triggered_count += 1
        print(f"\r  [{bar:<45}] {rms:.4f}{above}  ", end="", flush=True)

    mic.stop()
    print(f"\n\n  Chunks with speech: {triggered_count}/{total_chunks}")
    if triggered_count == 0:
        print("  ⚠ No speech energy detected — check microphone or lower SILENCE_THRESHOLD")
        print(f"    Current threshold: {THRESHOLD}")
        print(f"    To lower: edit backend/config.py → SILENCE_THRESHOLD = 0.003")
    else:
        print(f"  ✓ VAD working ({triggered_count} speech chunks detected)")
    return triggered_count > 0


async def test_keyword_spotter():
    separator("4c. Whisper keyword spotter — 10 second live test")
    try:
        from backend.voice.transcriber import WhisperTranscriber
        from backend.voice.detector import WhisperWakeDetector
        from backend.voice.audio_io import MicCapture
    except ImportError as e:
        print(f"  ✗ Import error: {e}")
        return False

    print("  Loading Whisper tiny model…")
    try:
        transcriber = WhisperTranscriber(model_size="tiny", device="cpu", compute_type="int8")
    except Exception as e:
        print(f"  ✗ Transcriber error: {e}")
        return False

    detector = WhisperWakeDetector(
        transcriber=transcriber,
        sample_rate=16_000,
        chunk_ms=100,
        wake_word="jarvis",
    )

    mic = MicCapture(sample_rate=16_000, chunk_ms=100)
    try:
        await mic.start()
    except RuntimeError as e:
        print(f"  ✗ Microphone error: {e}")
        return False

    print("\n  ▶ Say 'Jarvis' during the next 10 seconds to trigger detection")
    print("  (Window size: 2s — waits for a full 2s window before checking)\n")

    detected = False
    deadline = time.monotonic() + 10.0
    check_num = 0

    while time.monotonic() < deadline:
        chunk = await mic.read(timeout=0.3)
        if chunk is None:
            continue
        rms = float(np.sqrt(np.mean(chunk**2)))
        remaining = int(deadline - time.monotonic())
        print(f"\r  [{remaining:2d}s] RMS={rms:.4f}  Listening for 'Jarvis'…  ", end="", flush=True)

        result = await detector.check(chunk)
        if result:
            print(f"\n\n  ✓ WAKE WORD DETECTED! (after {10-remaining}s)")
            detected = True
            break

    mic.stop()

    if not detected:
        print("\n\n  ⚠ Wake word not detected in 10s")
        print("  Possible causes:")
        print("    1. Microphone too quiet — check levels in test_01")
        print("    2. Whisper model not downloaded yet")
        print("    3. Try saying 'Jarvis' more clearly/loudly")
        print("    4. Increase window: edit WhisperWakeDetector.WINDOW_S = 3.0")
    return detected


async def test_manual_trigger():
    separator("4d. Manual trigger (push-to-talk fallback)")
    from backend.voice.detector import WakeWordDetector
    from backend.voice.transcriber import WhisperTranscriber

    transcriber = WhisperTranscriber(model_size="tiny")
    detector = WakeWordDetector(transcriber=transcriber, wake_word="jarvis")

    # Trigger manually
    detector.trigger()
    chunk = np.zeros(1600, dtype=np.float32)
    result = await detector.check(chunk)

    if result:
        print("  ✓ Manual trigger works (push-to-talk fallback operational)")
        print("    API endpoint: POST http://localhost:8000/api/voice/trigger")
    else:
        print("  ✗ Manual trigger failed")
    return result


def main():
    print("\n" + "="*55)
    print("  JARVIS PHASE 1 — TEST 4: WAKE WORD DETECTION")
    print("="*55)

    test_openwakeword()

    loop = asyncio.new_event_loop()

    energy_ok = loop.run_until_complete(test_energy_detector())
    manual_ok = loop.run_until_complete(test_manual_trigger())
    keyword_ok = loop.run_until_complete(test_keyword_spotter())

    loop.close()

    print("\n" + "="*55)
    print("  Results:")
    print(f"    Energy VAD        : {'✓' if energy_ok else '⚠'}")
    print(f"    Manual trigger    : {'✓' if manual_ok else '✗'}")
    print(f"    Keyword detection : {'✓' if keyword_ok else '⚠ (try again)'}")
    overall = manual_ok and energy_ok
    print(f"\n  RESULT: {'PASS ✓' if overall else 'PARTIAL ⚠'}")
    print("  Proceed to: python scripts/test_05_server.py")
    print("="*55 + "\n")


if __name__ == "__main__":
    main()
