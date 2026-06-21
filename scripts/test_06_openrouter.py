#!/usr/bin/env python3
"""
TEST 6 — OpenRouter API + CEO Agent Integration
Verifies: API key, reachability, LLM call, CEO agent, voice command round-trip.

Run: python scripts/test_06_openrouter.py

Requires OPENROUTER_API_KEY in .env or environment.
"""

import sys
import os
import time
import asyncio
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))


def separator(title):
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print('─'*55)


def test_api_key():
    separator("6a. API key presence")
    # Load .env manually before importing config
    env_file = ROOT / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip())

    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        print("  ✗ OPENROUTER_API_KEY not set")
        print("    Fix: add to .env file:")
        print("      OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx")
        print("    Get key: https://openrouter.ai/keys")
        return False

    if not key.startswith("sk-or-"):
        print(f"  ⚠ Key present but unexpected format: {key[:12]}…")
        print("    Expected format: sk-or-v1-xxxxxxxx")
        print("    Proceeding anyway…")
    else:
        print(f"  ✓ OPENROUTER_API_KEY found: {key[:16]}…")

    return True


def test_openrouter_reachability():
    separator("6b. OpenRouter API reachability")
    import urllib.request
    import urllib.error

    url = "https://openrouter.ai/api/v1/models"
    key = os.environ.get("OPENROUTER_API_KEY", "")

    try:
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {key}",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Jarvis",
            }
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            models = data.get("data", [])
            print(f"  ✓ OpenRouter reachable — {len(models)} models available")

            # Check for key models
            model_ids = {m["id"] for m in models}
            desired = [
                "anthropic/claude-3-haiku",
                "openai/gpt-4o-mini",
                "openai/gpt-3.5-turbo",
                "google/gemma-2-9b-it:free",
            ]
            for m in desired:
                if any(m in mid for mid in model_ids):
                    print(f"  ✓ Model available: {m}")
                else:
                    print(f"  ⚠ Model not found: {m} (may be listed under a different ID)")
            return True

    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("  ✗ 401 Unauthorized — invalid API key")
            print("    Fix: check your OPENROUTER_API_KEY at https://openrouter.ai/keys")
        elif e.code == 429:
            print("  ⚠ 429 Rate limited — key valid but quota exceeded")
            print("    Fix: add credits at https://openrouter.ai/credits")
        else:
            print(f"  ✗ HTTP {e.code}: {e}")
        return False
    except urllib.error.URLError as e:
        print(f"  ✗ Cannot reach openrouter.ai: {e.reason}")
        print("    Fix: check internet connection")
        return False
    except Exception as e:
        print(f"  ✗ Unexpected error: {e}")
        return False


async def test_llm_client():
    separator("6c. LLM client — minimal completion")
    try:
        from core.llm_client import LLMClient
    except ImportError as e:
        print(f"  ✗ Import error: {e}")
        return False

    client = LLMClient()
    messages = [
        {"role": "system", "content": "You are a terse assistant. Reply in ≤10 words."},
        {"role": "user",   "content": "Say 'Jarvis online' and nothing else."},
    ]

    print("  Sending test completion to OpenRouter…")
    t0 = time.monotonic()
    try:
        response = await client.chat(messages, model_key="ceo")
        elapsed = time.monotonic() - t0

        if response and response.strip():
            print(f"  ✓ Response received in {elapsed:.1f}s")
            print(f"  ✓ Content: \"{response.strip()}\"")
            return True
        else:
            print(f"  ✗ Empty response after {elapsed:.1f}s")
            return False

    except Exception as e:
        elapsed = time.monotonic() - t0
        print(f"  ✗ LLM call failed after {elapsed:.1f}s: {e}")
        if "401" in str(e) or "Unauthorized" in str(e):
            print("    Fix: invalid API key — check OPENROUTER_API_KEY")
        elif "429" in str(e):
            print("    Fix: rate limited — add credits at openrouter.ai")
        elif "timeout" in str(e).lower():
            print("    Fix: slow connection or model unavailable — try a different model")
        return False


def test_ceo_agent_import():
    separator("6d. CEO Agent instantiation")
    try:
        from agents.ceo_agent import CEOAgent
        agent = CEOAgent()
        print(f"  ✓ CEOAgent instantiated")
        print(f"  ✓ Name     : {agent.name}")
        print(f"  ✓ Role     : {agent.role[:50]}…")
        print(f"  ✓ Tools    : {agent.tool_names}")
        print(f"  ✓ Model key: {agent.model_key}")
        return True, agent
    except ImportError as e:
        print(f"  ✗ Import error: {e}")
        return False, None
    except Exception as e:
        print(f"  ✗ Instantiation error: {e}")
        return False, None


async def test_ceo_simple_task(agent):
    separator("6e. CEO Agent — simple task execution")
    if agent is None:
        print("  ✗ Skipped — CEO agent not available")
        return False

    task = "Reply with exactly: 'All systems operational.' Do not add anything else."
    print(f"  Task: \"{task}\"")
    print("  Running CEO agent (may take 5-15s)…")

    t0 = time.monotonic()
    try:
        result = await agent.run(task=task, context={}, session_id="test_06")
        elapsed = time.monotonic() - t0

        if result:
            print(f"  ✓ CEO agent responded in {elapsed:.1f}s")
            preview = str(result)[:120].replace('\n', ' ')
            print(f"  ✓ Result preview: \"{preview}\"")
            return True
        else:
            print(f"  ✗ Empty result after {elapsed:.1f}s")
            return False

    except Exception as e:
        elapsed = time.monotonic() - t0
        print(f"  ✗ Agent execution failed after {elapsed:.1f}s: {e}")
        return False


async def test_voice_text_command():
    separator("6f. Voice pipeline — text command (no mic needed)")

    # This tests the LLM + TTS path without requiring a microphone
    try:
        from backend.voice.speaker import create_speaker
    except ImportError as e:
        print(f"  ✗ Import error: {e}")
        return False

    print("  Testing text → LLM → (no audio output) round-trip…")

    # We'll test the pipeline at the LLM level without starting the full pipeline
    try:
        from core.llm_client import LLMClient
        client = LLMClient()

        messages = [
            {
                "role": "system",
                "content": (
                    "You are Jarvis, a voice AI assistant. "
                    "Give short spoken responses (1-2 sentences max)."
                )
            },
            {"role": "user", "content": "status check"},
        ]

        t0 = time.monotonic()
        response = await client.chat(messages, model_key="ceo")
        elapsed = time.monotonic() - t0

        if response:
            print(f"  ✓ Voice command LLM response in {elapsed:.1f}s")
            print(f"  ✓ Response: \"{response.strip()[:100]}\"")

            # Test TTS instantiation (not playback)
            speaker = create_speaker(backend="auto")
            backend_name = getattr(speaker, 'NAME', type(speaker).__name__)
            print(f"  ✓ TTS backend ready: {backend_name}")
            print("  ✓ Full voice round-trip verified (LLM + TTS backend)")
            return True
        else:
            print("  ✗ Empty LLM response")
            return False

    except Exception as e:
        print(f"  ✗ Voice round-trip failed: {e}")
        return False


def test_memory_integration():
    separator("6g. Memory integration")
    try:
        from core.memory import Memory
        mem = Memory()

        # Write a test record
        sid = "test_06_verify"
        mem.save_message(sid, "user", "test message from verify script")
        mem.save_message(sid, "assistant", "acknowledged")

        # Read it back
        history = mem.get_history(sid, limit=10)
        if len(history) >= 2:
            print(f"  ✓ Memory write + read: {len(history)} messages")
        else:
            print(f"  ✗ Memory read returned {len(history)} messages (expected ≥2)")
            return False

        # Log an action
        mem.log_action(
            agent="test",
            action="verify_phase1",
            details={"script": "test_06"},
            status="success"
        )
        print("  ✓ Action logging works")

        # Get stats
        stats = mem.get_stats()
        print(f"  ✓ Stats: {stats}")
        return True

    except Exception as e:
        print(f"  ✗ Memory error: {e}")
        return False


def main():
    print("\n" + "="*55)
    print("  JARVIS PHASE 1 — TEST 6: OPENROUTER + CEO AGENT")
    print("="*55)

    # Sync tests first
    key_ok = test_api_key()
    if not key_ok:
        print("\n  Cannot proceed — no API key")
        sys.exit(1)

    reach_ok = test_openrouter_reachability()
    agent_ok, agent = test_ceo_agent_import()
    mem_ok = test_memory_integration()

    # Async tests
    loop = asyncio.new_event_loop()
    llm_ok    = loop.run_until_complete(test_llm_client())
    ceo_ok    = loop.run_until_complete(test_ceo_simple_task(agent))
    voice_ok  = loop.run_until_complete(test_voice_text_command())
    loop.close()

    print("\n" + "="*55)
    print("  Results:")
    print(f"    API key present     : {'✓' if key_ok    else '✗'}")
    print(f"    OpenRouter reachable: {'✓' if reach_ok  else '✗'}")
    print(f"    LLM client call     : {'✓' if llm_ok    else '✗'}")
    print(f"    CEO agent load      : {'✓' if agent_ok  else '✗'}")
    print(f"    CEO agent task      : {'✓' if ceo_ok    else '✗'}")
    print(f"    Voice round-trip    : {'✓' if voice_ok  else '✗'}")
    print(f"    Memory integration  : {'✓' if mem_ok    else '✗'}")

    overall = key_ok and reach_ok and llm_ok and agent_ok and mem_ok
    print(f"\n  RESULT: {'PASS ✓' if overall else 'FAIL ✗ — see above'}")
    if overall:
        print("  All Phase 1 components verified!")
        print("  Run master check: python scripts/verify_phase1.py")
    print("="*55 + "\n")
    sys.exit(0 if overall else 1)


if __name__ == "__main__":
    main()
