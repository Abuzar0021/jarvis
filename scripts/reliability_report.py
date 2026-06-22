#!/usr/bin/env python3
"""
Reliability audit — scans the Jarvis tool/agent surface and reports
which operations verify their outcomes and which ones may silently succeed.

Run from repo root: python scripts/reliability_report.py
"""
from __future__ import annotations

import ast
import sys
import textwrap
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

ROOT = Path(__file__).resolve().parent.parent

TOOL_FILES = [
    ROOT / "tools" / "computer_tools.py",
    ROOT / "tools" / "browser_tools.py",
    ROOT / "tools" / "file_system.py",
    ROOT / "tools" / "code_runner.py",
    ROOT / "tools" / "terminal.py",
    ROOT / "tools" / "web_tools.py",
]

AGENT_FILES = list((ROOT / "agents").glob("*.py"))

Status = Literal["VERIFIED", "FAKE_SUCCESS", "PARTIAL", "UNKNOWN"]


@dataclass
class ToolReport:
    name: str
    file: str
    status: Status
    notes: str
    lines: list[str] = field(default_factory=list)


def _src(path: Path) -> str:
    try:
        return path.read_text()
    except Exception:
        return ""


def _check_tool(func_name: str, src: str, path: str) -> ToolReport:
    """Heuristically classify a tool function's result-verification quality."""
    # Find the function body
    start = src.find(f"async def {func_name}(")
    if start == -1:
        start = src.find(f"def {func_name}(")
    if start == -1:
        return ToolReport(func_name, path, "UNKNOWN", "function not found")

    # Grab ~50 lines from start
    snippet = src[start:start + 2000]
    lines = snippet.splitlines()[:50]

    low = "\n".join(lines).lower()

    # Positive verification signals
    verifies = any(kw in low for kw in [
        "stat().st_size",   # file size check
        ".poll()",          # process poll
        "response.status",  # http status check
        "returncode",       # exit code check
        "exit_code",
        "pid_exists",       # process existence check
        "p.exists()",       # file exists
        "verified running",
        "st_size == 0",
        "if rc is not none",
        "if response",
        "ast.parse",        # syntax validation by parse attempt
        "compile(",         # compile-time verification
        "syntaxerror",      # catches and reports parse errors
    ])

    # Fake success signals
    fake_signals = any(kw in low for kw in [
        "return f\"ok:",
        "return f'ok:",
        "return \"ok",
        "return 'ok",
        "return f\"filled",
        "return f\"clicked",
        "return f\"typed",
        "return f\"pressed",
        "return f\"mouse moved",
    ])

    # Error propagation signals (good)
    propagates_error = "return f\"error" in low or "return f'error" in low

    if verifies:
        status: Status = "VERIFIED"
        notes = "verifies outcome before returning success"
    elif fake_signals and not propagates_error:
        status = "FAKE_SUCCESS"
        notes = "returns success without verification and swallows errors"
    elif fake_signals:
        status = "PARTIAL"
        notes = "no outcome verification (propagates tool errors but not effect failures)"
    elif propagates_error:
        status = "PARTIAL"
        notes = "propagates exceptions as ERROR strings but doesn't verify success"
    else:
        status = "UNKNOWN"
        notes = "unclear verification behaviour"

    return ToolReport(func_name, path, status, notes)


def _extract_registered_tools(src: str) -> list[str]:
    """Find function names decorated with @register(...)."""
    names = []
    src_lines = src.splitlines()
    for i, line in enumerate(src_lines):
        if line.strip().startswith("@register("):
            # Schema block spans many lines; search up to 40 lines ahead for def
            for offset in range(1, 40):
                idx = i + offset
                if idx >= len(src_lines):
                    break
                candidate = src_lines[idx]
                if "async def " in candidate or (
                    candidate.strip().startswith("def ") and not candidate.strip().startswith("def _")
                ):
                    fname = candidate.strip()
                    fname = fname.split("async def ")[-1].split("def ")[-1].split("(")[0].strip()
                    if fname:
                        names.append(fname)
                    break
    return names


def audit_tools() -> list[ToolReport]:
    reports: list[ToolReport] = []
    for tf in TOOL_FILES:
        if not tf.exists():
            continue
        src = _src(tf)
        for fname in _extract_registered_tools(src):
            r = _check_tool(fname, src, tf.name)
            reports.append(r)
    return reports


def audit_retry() -> dict:
    """Check if orchestrator has retry logic."""
    orch_src = _src(ROOT / "core" / "orchestrator.py")
    has_retry = "_run_with_retry" in orch_src or "max_retries" in orch_src
    has_backoff = "2 ** attempt" in orch_src or "exponential" in orch_src.lower()
    return {"retry_loop": has_retry, "exponential_backoff": has_backoff}


def audit_error_detection() -> dict:
    """Check execution_state error detection quality."""
    es_src = _src(ROOT / "core" / "execution_state.py")
    broad = "_is_error" in es_src
    only_prefix = es_src.count(".upper().startswith") > 0 and not broad
    return {
        "broad_error_detection": broad,
        "only_prefix_check": only_prefix,
    }


def audit_agents() -> dict:
    """Count agents and check if they have verification in their prompts."""
    results = {}
    for af in AGENT_FILES:
        if af.name == "__init__.py":
            continue
        src = _src(af)
        low = src.lower()
        results[af.stem] = {
            "has_verify_in_prompt": "verify" in low or "check" in low,
            "has_retry_in_code": "retry" in low,
            "uses_llm": "llm" in low or "chat_completion" in low,
        }
    return results


def _status_icon(s: Status) -> str:
    return {"VERIFIED": "✓", "FAKE_SUCCESS": "✗", "PARTIAL": "~", "UNKNOWN": "?"}[s]


def print_report() -> int:
    print("\n" + "=" * 70)
    print("  JARVIS RELIABILITY AUDIT REPORT")
    print("=" * 70)

    # Tools
    tool_reports = audit_tools()
    counts: dict[Status, int] = {"VERIFIED": 0, "FAKE_SUCCESS": 0, "PARTIAL": 0, "UNKNOWN": 0}
    for r in tool_reports:
        counts[r.status] += 1

    print(f"\n{'TOOL VERIFICATION ANALYSIS':}")
    print(f"  {'Tool':<22} {'File':<22} {'Status':<14} Notes")
    print(f"  {'-'*22} {'-'*22} {'-'*14} {'-'*30}")
    for r in sorted(tool_reports, key=lambda x: x.status):
        icon = _status_icon(r.status)
        print(f"  {icon} {r.name:<21} {r.file:<22} {r.status:<14} {r.notes}")

    print(f"\n  Summary: {counts['VERIFIED']} verified, {counts['FAKE_SUCCESS']} fake-success, "
          f"{counts['PARTIAL']} partial, {counts['UNKNOWN']} unknown")

    # Retry
    retry = audit_retry()
    print(f"\n{'RETRY / RESILIENCE':}")
    print(f"  Orchestrator retry loop:     {'YES' if retry['retry_loop'] else 'NO  ← MISSING'}")
    print(f"  Exponential backoff:         {'YES' if retry['exponential_backoff'] else 'NO  ← MISSING'}")

    # Error detection
    err = audit_error_detection()
    print(f"\n{'ERROR DETECTION':}")
    broad_label = "YES" if err["broad_error_detection"] else "NO  <- only checks ERROR prefix"
    prefix_label = "YES -- limited" if err["only_prefix_check"] else "NO (good)"
    print(f"  Broad error classification:  {broad_label}")
    print(f"  Prefix-only detection:       {prefix_label}")

    # Agent audit
    agent_audit = audit_agents()
    verified_agents = sum(1 for v in agent_audit.values() if v["has_verify_in_prompt"])
    print(f"\n{'AGENT VERIFICATION':}")
    print(f"  Total agents:                {len(agent_audit)}")
    print(f"  Agents with verify prompts:  {verified_agents}")

    # Critical gaps summary
    gaps: list[str] = []
    if counts["FAKE_SUCCESS"] > 0:
        fake = [r.name for r in tool_reports if r.status == "FAKE_SUCCESS"]
        gaps.append(f"FAKE SUCCESS tools ({len(fake)}): {', '.join(fake)}")
    if not retry["retry_loop"]:
        gaps.append("Orchestrator has NO retry logic — first failure is permanent")
    if not err["broad_error_detection"]:
        gaps.append("ExecutionState only checks 'ERROR' prefix — misses lowercase/partial errors")

    print(f"\n{'CRITICAL GAPS':}")
    if gaps:
        for g in gaps:
            print(f"  ✗ {g}")
    else:
        print("  All critical reliability checks pass.")

    print("\n" + "=" * 70 + "\n")

    return counts["FAKE_SUCCESS"]


if __name__ == "__main__":
    fake_count = print_report()
    sys.exit(1 if fake_count > 0 else 0)
