#!/usr/bin/env python3
"""
TEST 3 — Text-to-Speech
Verifies: Kokoro TTS (primary) and pyttsx3 (fallback), audio playback.

Run: python scripts/test_03_tts.py
     python scripts/test_03_tts.py --backend kokoro
     python scripts/test_03_tts.py --backend pyttsx3
"""

import sys
import argparse
import time
import numpy as np


def separator(title):
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print('─'*55)


def test_pyttsx3():
    separator("3a. pyttsx3 (always-available fallback)")
    try:
        import pyttsx3
        engine = pyttsx3.init()
        voices = engine.getProperty('voices')
        rate = engine.getProperty('rate')
        print(f"  ✓ pyttsx3 initialised")
        print(f"  Speech rate: {rate} wpm")
        print(f"  Voices available: {len(voices)}")
        for i, v in enumerate(voices[:3]):
            print(f"    [{i}] {v.name} ({v.languages})")

        print("\n  ▶ Speaking test phrase…")
        engine.setProperty('rate', 185)
        engine.say("Jarvis online. All systems are operational.")
        engine.runAndWait()
        print("  ✓ pyttsx3 speech completed — did you hear it?")
        return True
    except ImportError:
        print("  ✗ pyttsx3 not installed")
        print("    Fix: pip install pyttsx3")
        if sys.platform == "linux":
            print("    Linux also needs: sudo apt-get install espeak espeak-data")
        return False
    except Exception as e:
        print(f"  ✗ pyttsx3 error: {e}")
        if "espeak" in str(e).lower():
            print("    Fix (Linux): sudo apt-get install espeak espeak-ng")
        elif "audio" in str(e).lower() or "device" in str(e).lower():
            print("    Fix: check audio output device in system settings")
        return False


def test_kokoro():
    separator("3b. Kokoro TTS (high-quality neural)")
    try:
        from kokoro import KPipeline
        print("  ✓ kokoro imported")
        print("  Loading pipeline (first run downloads voice models ~100MB)…")
        t0 = time.monotonic()
        pipeline = KPipeline(lang_code='a')  # American English
        print(f"  ✓ Pipeline loaded in {time.monotonic()-t0:.1f}s")

        text = "Good morning. I am Jarvis, your artificial intelligence operating system."
        print(f"\n  Synthesising: \"{text}\"")
        t0 = time.monotonic()
        parts = []
        for _, _, audio in pipeline(text, voice='af_heart', speed=1.0):
            parts.append(audio)
        elapsed = time.monotonic() - t0

        if not parts:
            print("  ✗ Synthesis returned no audio")
            return False

        full = np.concatenate(parts)
        duration = len(full) / 24_000
        rtf = elapsed / duration
        print(f"  ✓ Synthesised {duration:.1f}s of audio in {elapsed:.2f}s (RTF {rtf:.2f}x)")

        # Play it
        try:
            import sounddevice as sd
            print("  ▶ Playing via sounddevice…")
            sd.play(full, samplerate=24_000)
            sd.wait()
            print("  ✓ Playback complete — did you hear it?")
        except ImportError:
            print("  ⚠ sounddevice not available — saving to /tmp/jarvis_test.wav instead")
            import soundfile as sf
            sf.write("/tmp/jarvis_test.wav", full, 24_000)
            print("  ✓ Saved to /tmp/jarvis_test.wav — play it manually to verify")
        return True

    except ImportError:
        print("  ○ kokoro not installed (optional)")
        print("    Install: pip install kokoro soundfile")
        print("    → System will use pyttsx3 fallback instead")
        return None  # None = optional, not a failure
    except Exception as e:
        print(f"  ✗ Kokoro error: {e}")
        return False


def test_speaker_factory():
    separator("3c. Speaker factory (auto-select)")
    sys.path.insert(0, __import__('pathlib').Path(__file__).parent.parent.__str__())
    try:
        from backend.voice.speaker import create_speaker
        speaker = create_speaker(backend="auto")
        print(f"  ✓ Selected backend: {getattr(speaker, 'NAME', type(speaker).__name__)}")
        print(f"  ✓ has .speak()     : {callable(getattr(speaker, 'speak', None))}")
        print(f"  ✓ has .interrupt() : {callable(getattr(speaker, 'interrupt', None))}")
        return True
    except Exception as e:
        print(f"  ✗ Factory error: {e}")
        return False


def test_audio_output():
    separator("3d. Audio output device test")
    try:
        import sounddevice as sd
        devices = sd.query_devices()
        out_idx = sd.default.device[1]
        out_dev = devices[out_idx]
        print(f"  Default output: [{out_idx}] {out_dev['name']}")
        print(f"  Sample rates:   {out_dev['default_samplerate']}Hz default")
        print(f"  Max channels:   {out_dev['max_output_channels']}")

        # Generate 0.5s sine tone at 440Hz as audio test
        sr = 44_100
        t = np.linspace(0, 0.5, int(sr * 0.5))
        tone = (np.sin(2 * np.pi * 440 * t) * 0.3).astype(np.float32)
        print("\n  ▶ Playing 440Hz test tone (0.5s)…")
        sd.play(tone, samplerate=sr)
        sd.wait()
        print("  ✓ Test tone complete — did you hear a beep?")
        return True
    except ImportError:
        print("  ⚠ sounddevice not available — skipping tone test")
        return True
    except Exception as e:
        print(f"  ✗ Output device error: {e}")
        print("    Fix: check audio output device in system sound settings")
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", choices=["kokoro", "pyttsx3", "both"], default="both")
    args = parser.parse_args()

    print("\n" + "="*55)
    print("  JARVIS PHASE 1 — TEST 3: TEXT-TO-SPEECH")
    print("="*55)

    audio_ok = test_audio_output()
    factory_ok = test_speaker_factory()

    pyttsx3_ok = False
    kokoro_ok = None

    if args.backend in ("pyttsx3", "both"):
        pyttsx3_ok = test_pyttsx3()

    if args.backend in ("kokoro", "both"):
        kokoro_ok = test_kokoro()

    print("\n" + "="*55)
    print("  Results:")
    print(f"    Audio output device : {'✓' if audio_ok else '✗'}")
    print(f"    Speaker factory     : {'✓' if factory_ok else '✗'}")
    print(f"    pyttsx3 (fallback)  : {'✓' if pyttsx3_ok else '✗'}")
    print(f"    kokoro (primary)    : {'✓' if kokoro_ok else ('○ not installed' if kokoro_ok is None else '✗')}")

    overall = audio_ok and factory_ok and (pyttsx3_ok or kokoro_ok)
    print(f"\n  RESULT: {'PASS ✓' if overall else 'FAIL ✗ — at minimum pyttsx3 must work'}")
    if overall:
        print("  Proceed to: python scripts/test_04_wake_word.py")
    print("="*55 + "\n")
    sys.exit(0 if overall else 1)


if __name__ == "__main__":
    main()
