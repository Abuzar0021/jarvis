"""Tests for task planner (mocks the LLM)."""

import json
import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_plan_parses_valid_json():
    from core.task_planner import TaskPlanner

    mock_response = json.dumps([
        {
            "title": "Research topic",
            "description": "Research the topic online",
            "agent": "research",
            "priority": 4,
            "dependencies": [],
        },
        {
            "title": "Write code",
            "description": "Write the solution",
            "agent": "coding",
            "priority": 3,
            "dependencies": ["Research topic"],
        },
    ])

    with patch("core.task_planner.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.simple = AsyncMock(return_value=mock_response)
        mock_get_llm.return_value = mock_llm

        planner = TaskPlanner()
        subtasks = await planner.plan("Build a web scraper")

    assert len(subtasks) == 2
    assert subtasks[0]["agent"] == "research"
    assert subtasks[1]["agent"] == "coding"
    assert "Research topic" in subtasks[1]["dependencies"]


@pytest.mark.asyncio
async def test_plan_handles_invalid_json():
    from core.task_planner import TaskPlanner

    with patch("core.task_planner.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.simple = AsyncMock(return_value="not valid json at all")
        mock_get_llm.return_value = mock_llm

        planner = TaskPlanner()
        subtasks = await planner.plan("Do something")

    assert subtasks == []


@pytest.mark.asyncio
async def test_plan_caps_subtasks():
    from core.task_planner import TaskPlanner
    import config

    many = [
        {"title": f"task {i}", "description": "desc", "agent": "coding", "priority": 3, "dependencies": []}
        for i in range(20)
    ]

    with patch("core.task_planner.get_llm") as mock_get_llm, \
         patch("core.task_planner.MAX_SUBTASKS", 5):
        mock_llm = AsyncMock()
        mock_llm.simple = AsyncMock(return_value=json.dumps(many))
        mock_get_llm.return_value = mock_llm

        planner = TaskPlanner()
        subtasks = await planner.plan("Huge goal")

    assert len(subtasks) <= 5
