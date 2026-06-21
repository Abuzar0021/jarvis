"""Tests for the tool layer."""

import asyncio
import pytest
import tempfile
from pathlib import Path


@pytest.fixture(autouse=True)
def _import_tools():
    import tools  # triggers all @register decorators


def test_tool_registry_populated():
    import tools
    assert "file_read" in tools.TOOL_REGISTRY
    assert "file_write" in tools.TOOL_REGISTRY
    assert "web_search" in tools.TOOL_REGISTRY
    assert "run_code" in tools.TOOL_REGISTRY
    assert "file_delete" in tools.TOOL_REGISTRY
    # dangerous flag
    assert tools.TOOL_REGISTRY["file_delete"]["dangerous"] is True
    assert tools.TOOL_REGISTRY["file_read"]["dangerous"] is False


def test_get_schemas():
    import tools
    schemas = tools.get_schemas(["file_read", "run_code"])
    assert len(schemas) == 2
    names = [s["function"]["name"] for s in schemas]
    assert "file_read" in names


@pytest.mark.asyncio
async def test_file_write_and_read(tmp_path):
    from tools.file_system import file_write, file_read
    path = str(tmp_path / "hello.txt")

    result = await file_write(path, "Hello, Jarvis!")
    assert "OK" in result

    content = await file_read(path)
    assert content == "Hello, Jarvis!"


@pytest.mark.asyncio
async def test_file_write_append(tmp_path):
    from tools.file_system import file_write, file_read
    path = str(tmp_path / "append.txt")
    await file_write(path, "line1\n")
    await file_write(path, "line2\n", mode="a")
    content = await file_read(path)
    assert "line1" in content and "line2" in content


@pytest.mark.asyncio
async def test_file_read_missing():
    from tools.file_system import file_read
    result = await file_read("/nonexistent/path/file.txt")
    assert "ERROR" in result


@pytest.mark.asyncio
async def test_file_list(tmp_path):
    from tools.file_system import file_list, file_write
    await file_write(str(tmp_path / "a.py"), "# a")
    await file_write(str(tmp_path / "b.py"), "# b")
    result = await file_list(str(tmp_path))
    assert "a.py" in result and "b.py" in result


@pytest.mark.asyncio
async def test_run_code_basic():
    from tools.code_runner import run_code
    result = await run_code("print('hello world')")
    assert "hello world" in result
    assert "exit_code: 0" in result


@pytest.mark.asyncio
async def test_run_code_error():
    from tools.code_runner import run_code
    result = await run_code("raise ValueError('test error')")
    assert "exit_code: 1" in result
    assert "ValueError" in result


@pytest.mark.asyncio
async def test_check_syntax_valid():
    from tools.code_runner import check_syntax
    result = await check_syntax("x = 1 + 2\nprint(x)")
    assert "OK" in result


@pytest.mark.asyncio
async def test_check_syntax_invalid():
    from tools.code_runner import check_syntax
    result = await check_syntax("def foo(\n    pass")
    assert "SyntaxError" in result
