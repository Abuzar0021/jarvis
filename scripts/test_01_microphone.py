#!/usr/bin/env python3
"""
TEST 1 — Microphone Capture
Verifies: sounddevice installation, device enumeration, live audio capture.

Run: python scripts/test_01_microphone.py
"""

import sys
import time
import numpy as np


def separator(title):
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print('─'*55)


def test_sounddevice_import():
    separator("1a. sounddevice import")
    try:
        import sounddevice as sd
        print(f"  ✓ sounddevice {sd.__version__} imported")
        return sd
    except ImportError:
        print("  ✗ sounddevice not installed")
        print("    Fix: pip install sounddevice")
        return None
    except Exception as e:
        print(f"  ✗ Import error: {e}")
        print("    Fix (Linux): sudo apt-get install libportaudio2")
        print("    Fix (Mac):   brew install portaudio")
        return None


def list_devices(sd):
    separator("1b. Audio device list")
    try:
        devices = sd.query_devices()
        print(f"  Found {len(devices)} audio device(s):\n")

        default_in = sd.default.device[0]
        default_out = sd.default.device[1]

        for i, d in enumerate(devices):
            in_mark  = "▶ IN " if d['max_input_channels'] > 0 else "     "
            out_mark = "◀ OUT" if d['max_output_channels'] > 0 else "     "
            default_mark = " ← DEFAULT" if i == default_in and d['max_input_channels'] > 0 else ""
            print(f"  [{i:2d}] {in_mark} {out_mark}  {d['name']}{default_mark}")

        print(f"\n  Default input  device: [{default_in}] {devices[default_in]['name']}")
        print(f"  Default output device: [{default_out}] {devices[default_out]['name']}")
        return True
    except Exception as e:
        print(f"  ✗ Device query error: {e}")
        return False


def test_capture(sd, duration=3, sample_rate=16000):
    separator(f"1c. Live microphone capture ({duration}s)")
    print("  ▶ Recording... speak something now!\n")

    chunks = []
    peak_rms = 0.0

    def callback(indata, frames, time_info, status):
        nonlocal peak_rms
        chunk = indata.copy().flatten()
        chunks.append(chunk)
        rms = float(np.sqrt(np.mean(chunk ** 2)))
        peak_rms = max(peak_rms, rms)
        bar_len = int(rms * 500)
        bar = '█' * min(bar_len, 40)
        print(f"\r  Level: [{bar:<40}] {rms:.4f}", end="", flush=True)

    try:
        with sd.InputStream(
            samplerate=sample_rate,
            channels=1,
            dtype='float32',
            blocksize=int(sample_rate * 0.1),
            callback=callback,
        ):
            time.sleep(duration)

        print(f"\n\n  Peak RMS: {peak_rms:.4f}")

        if peak_rms < 0.001:
            print("  ⚠  Very low signal — microphone may be muted or wrong device selected")
            print("     Fix: check system audio settings / microphone permissions")
        elif peak_rms < 0.01:
            print("  ⚠  Low signal — mic is working but quiet. Try speaking louder.")
            print(f"     Current SILENCE_THRESHOLD in backend/config.py = 0.008")
            print(f"     Your mic level = {peak_rms:.4f} — consider lowering threshold")
        else:
            print(f"  ✓ Microphone working (RMS {peak_rms:.4f} > threshold 0.008)")

        total = np.concatenate(chunks)
        print(f"  ✓ Captured {len(total)} samples = {len(total)/sample_rate:.1f}s @ {sample_rate}Hz")
        return True, total

    except sd.PortAudioError as e:
        print(f"\n  ✗ PortAudio error: {e}")
        print("    Fix (Linux): sudo apt-get install libportaudio2 portaudio19-dev")
        print("    Fix (Mac):   brew install portaudio")
        print("    Fix (Win):   reinstall sounddevice: pip install sounddevice --force-reinstall")
        return False, None
    except Exception as e:
        print(f"\n  ✗ Capture error: {e}")
        return False, None


def main():
    print("\n" + "="*55)
    print("  JARVIS PHASE 1 — TEST 1: MICROPHONE CAPTURE")
    print("="*55)

    sd = test_sounddevice_import()
    if sd is None:
        sys.exit(1)

    list_devices(sd)

    ok, audio = test_capture(sd)

    print("\n" + "="*55)
    if ok:
        print("  RESULT: PASS ✓")
        print("  Proceed to: python scripts/test_02_whisper.py")
    else:
        print("  RESULT: FAIL ✗  See fixes above")
    print("="*55 + "\n")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
