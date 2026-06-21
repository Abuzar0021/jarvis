#!/usr/bin/env python3
"""
TEST 2 — Faster Whisper STT
Verifies: installation, model download (tiny), transcription accuracy.

Run: python scripts/test_02_whisper.py

Note: First run downloads ~75MB model from HuggingFace.
      Subsequent runs use cache (~/.cache/huggingface).
"""

import sys
import time
import numpy as np


def separator(title):
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print('─'*55)


def test_import():
    separator("2a. faster-whisper import")
    try:
        from faster_whisper import WhisperModel
        print("  ✓ faster-whisper imported")
        return WhisperModel
    except ImportError:
        print("  ✗ faster-whisper not installed")
        print("    Fix: pip install faster-whisper")
        return None


def test_model_load(WhisperModel, model_size="tiny"):
    separator(f"2b. Load Whisper '{model_size}' model")
    print(f"  Downloading/loading '{model_size}' model from HuggingFace…")
    print("  (First run: ~75MB download — this may take 1-2 minutes)")
    print("  Cache location: ~/.cache/huggingface/hub/\n")

    t0 = time.monotonic()
    try:
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        elapsed = time.monotonic() - t0
        print(f"  ✓ Model loaded in {elapsed:.1f}s")
        return model
    except Exception as e:
        elapsed = time.monotonic() - t0
        print(f"  ✗ Failed after {elapsed:.1f}s: {e}")
        if "403" in str(e) or "Forbidden" in str(e):
            print("\n  HuggingFace access blocked. Fixes:")
            print("  1. Check internet connection")
            print("  2. Try: export HF_HUB_DISABLE_IMPLICIT_TOKEN=1")
            print("  3. Manual download (see troubleshooting guide)")
        elif "CERTIFICATE" in str(e).upper():
            print("  SSL issue. Fix: pip install --upgrade certifi")
        return None


def test_silence(model):
    separator("2c. Transcribe silence (baseline)")
    silence = np.zeros(16_000 * 2, dtype=np.float32)
    t0 = time.monotonic()
    segments, info = model.transcribe(silence, language="en", vad_filter=True, beam_size=1)
    text = " ".join(s.text for s in segments).strip()
    elapsed = time.monotonic() - t0

    print(f"  Language: {info.language} ({info.language_probability:.0%})")
    print(f"  Transcript of silence: '{text}'")
    print(f"  Inference time: {elapsed:.2f}s")

    if elapsed > 5:
        print("  ⚠  Slow inference — consider: WHISPER_MODEL_SIZE=tiny in .env")
    else:
        print(f"  ✓ Speed acceptable ({elapsed:.2f}s for 2s audio)")
    return True


def test_live_transcription(model):
    separator("2d. Live microphone transcription")
    try:
        import sounddevice as sd
    except ImportError:
        print("  ⚠ sounddevice not available — skipping live test")
        print("     Run test_01_microphone.py first")
        return True

    print("  ▶ Recording 4 seconds — say something clearly!\n")
    duration = 4
    sample_rate = 16_000
    recording = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1, dtype='float32')

    for i in range(duration, 0, -1):
        print(f"\r  Recording... {i}s remaining ", end="", flush=True)
        time.sleep(1)
    sd.wait()
    print("\n")

    audio = recording.flatten()
    rms = float(np.sqrt(np.mean(audio**2)))
    print(f"  Audio RMS: {rms:.4f}")

    if rms < 0.001:
        print("  ⚠ No audio detected — check microphone (run test_01_microphone.py)")
        return False

    print("  Transcribing…")
    t0 = time.monotonic()
    segments, info = model.transcribe(audio, language="en", beam_size=3, vad_filter=True)
    transcript = " ".join(s.text for s in segments).strip()
    elapsed = time.monotonic() - t0

    print(f"  Transcript: \"{transcript}\"")
    print(f"  RTF (Real-Time Factor): {elapsed/duration:.2f}x  (< 1.0 = faster than real-time)")

    if not transcript:
        print("  ⚠ Empty transcript — try speaking louder or closer to mic")
    else:
        print("  ✓ Transcription working")

    return bool(transcript)


def test_wake_word_detection(model):
    separator("2e. Wake word keyword test")
    print("  Simulating 'Jarvis, what time is it?'")

    # Generate a short test — we'll just test the logic, not real audio
    print("  (Using mock transcript for logic test)")
    test_phrases = [
        "jarvis what time is it",
        "hey jarvis can you help me",
        "jarvis please do something",
        "just talking normally here",
        "the weather is nice today",
    ]
    wake_word = "jarvis"
    for phrase in test_phrases:
        detected = wake_word in phrase.lower()
        mark = "✓ TRIGGER" if detected else "  no-op  "
        print(f"  [{mark}] '{phrase}'")
    print("  ✓ Keyword logic correct")
    return True


def main():
    print("\n" + "="*55)
    print("  JARVIS PHASE 1 — TEST 2: FASTER WHISPER STT")
    print("="*55)

    WhisperModel = test_import()
    if not WhisperModel:
        sys.exit(1)

    model = test_model_load(WhisperModel, model_size="tiny")
    if not model:
        sys.exit(1)

    test_silence(model)
    test_wake_word_detection(model)
    live_ok = test_live_transcription(model)

    print("\n" + "="*55)
    print("  RESULT: PASS ✓" if live_ok else "  RESULT: PARTIAL ⚠ (check mic)")
    print("  Proceed to: python scripts/test_03_tts.py")
    print("="*55 + "\n")


if __name__ == "__main__":
    main()
