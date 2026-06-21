"""Tests for the memory module."""

import pytest
import tempfile
from pathlib import Path

from core.memory import Memory


@pytest.fixture
def mem(tmp_path):
    return Memory(db_path=tmp_path / "test.db")


def test_add_and_get_messages(mem):
    mem.add_message("s1", "user", "hello")
    mem.add_message("s1", "assistant", "hi there")
    msgs = mem.get_messages("s1")
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["content"] == "hi there"


def test_task_lifecycle(mem):
    tid = mem.create_task("Build something cool")
    task = mem.get_task(tid)
    assert task["status"] == "pending"

    mem.update_task(tid, "done", result="It is built!")
    task = mem.get_task(tid)
    assert task["status"] == "done"
    assert "built" in task["result"]


def test_subtasks(mem):
    tid = mem.create_task("Big goal")
    sid = mem.add_subtask(tid, {
        "title": "Do research",
        "description": "Research the topic",
        "agent": "research",
        "priority": 4,
        "dependencies": [],
    })
    subs = mem.get_subtasks(tid)
    assert len(subs) == 1
    assert subs[0]["agent"] == "research"

    mem.update_subtask(sid, "done", result="Found stuff")
    subs = mem.get_subtasks(tid)
    assert subs[0]["status"] == "done"


def test_agent_knowledge(mem):
    mem.set_knowledge("coding", "preferred_style", "pep8")
    val = mem.get_knowledge("coding", "preferred_style")
    assert val == "pep8"

    all_k = mem.get_knowledge("coding")
    assert "preferred_style" in all_k


def test_action_log(mem):
    mem.log_action("ceo", "plan", {"goal": "build app"}, "created 5 tasks")
    logs = mem.get_recent_logs(limit=10)
    assert len(logs) == 1
    assert logs[0]["agent_name"] == "ceo"
    assert logs[0]["approved"] == 1


def test_dynamic_agents(mem):
    mem.register_agent(
        name="specialist",
        role="Does specialised things",
        system_prompt="You are a specialist.",
        tools=["file_read", "run_code"],
        model="anthropic/claude-3-haiku",
    )
    agent = mem.get_dynamic_agent("specialist")
    assert agent is not None
    assert agent["role"] == "Does specialised things"
    assert "file_read" in agent["tools"]

    all_agents = mem.list_dynamic_agents()
    assert any(a["name"] == "specialist" for a in all_agents)
