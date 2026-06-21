#!/usr/bin/env python3
"""
Jarvis — Local Autonomous AI Operating System
Entry point: python jarvis.py [command] [options]
"""

from __future__ import annotations

import asyncio
import sys
import uuid
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table
from rich.text import Text

console = Console()

BANNER = """\
[bold magenta]
     ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗
     ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝
     ██║███████║██████╔╝██║   ██║██║███████╗
██   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║
╚█████╔╝██║  ██║██║  ██║ ╚████╔╝ ██║███████║
 ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝
[/bold magenta]
[dim]Local Autonomous AI Operating System[/dim]
"""


def _check_env() -> bool:
    """Warn if OPENROUTER_API_KEY is missing."""
    import os
    from dotenv import load_dotenv
    load_dotenv()
    if not os.getenv("OPENROUTER_API_KEY"):
        console.print(
            "[bold red]⚠  OPENROUTER_API_KEY not set.[/bold red]\n"
            "Copy [cyan].env.example[/cyan] → [cyan].env[/cyan] and add your key.\n"
            "Get one at [link=https://openrouter.ai]openrouter.ai[/link]"
        )
        return False
    return True


# ── CLI group ─────────────────────────────────────────────────────────────────

@click.group(invoke_without_command=True)
@click.version_option("1.0.0", prog_name="Jarvis")
@click.pass_context
def cli(ctx):
    """Jarvis — Local Autonomous AI Operating System"""
    if ctx.invoked_subcommand is None:
        console.print(BANNER)
        console.print("Run [bold cyan]jarvis --help[/bold cyan] for usage.\n")


# ── jarvis run ────────────────────────────────────────────────────────────────

@cli.command()
@click.argument("goal", nargs=-1, required=True)
@click.option("--context", "-c", default="", help="Additional context for the goal")
@click.option("--session", "-s", default=None, help="Session ID (for memory continuity)")
def run(goal: tuple, context: str, session: str | None):
    """Execute a goal autonomously using the full multi-agent pipeline."""
    if not _check_env():
        sys.exit(1)

    goal_str = " ".join(goal)
    session_id = session or str(uuid.uuid4())

    async def _run():
        from agents.ceo_agent import CEOAgent
        ceo = CEOAgent()
        await ceo.execute_goal(goal_str, context=context, session_id=session_id)

    asyncio.run(_run())


# ── jarvis chat ───────────────────────────────────────────────────────────────

@cli.command()
@click.option("--session", "-s", default=None, help="Session ID (for persistent memory)")
def chat(session: str | None):
    """Interactive chat with Jarvis CEO (memory-aware REPL)."""
    if not _check_env():
        sys.exit(1)

    session_id = session or str(uuid.uuid4())
    console.print(BANNER)
    console.print(
        Panel(
            f"Session: [dim]{session_id}[/dim]\n"
            "Type your goal or question. "
            "[bold]'exit'[/bold] to quit, "
            "[bold]'run: <goal>'[/bold] for full autonomous mode.",
            title="[bold magenta]Jarvis Chat[/bold magenta]",
            border_style="magenta",
        )
    )

    async def _chat_loop():
        from agents.ceo_agent import CEOAgent
        ceo = CEOAgent()

        while True:
            try:
                user_input = Prompt.ask("\n[bold cyan]You[/bold cyan]").strip()
            except (KeyboardInterrupt, EOFError):
                console.print("\n[dim]Goodbye.[/dim]")
                break

            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit", "bye"):
                console.print("[dim]Goodbye.[/dim]")
                break

            if user_input.lower().startswith("run:"):
                goal_str = user_input[4:].strip()
                await ceo.execute_goal(goal_str, session_id=session_id)
            else:
                response = await ceo.chat(user_input, session_id=session_id)
                console.print(f"\n[bold magenta]Jarvis[/bold magenta]: {response}")

    asyncio.run(_chat_loop())


# ── jarvis status ─────────────────────────────────────────────────────────────

@cli.command()
def status():
    """Show system status, registered agents, and recent tasks."""
    from core.memory import get_memory
    from core.orchestrator import get_orchestrator

    mem = get_memory()

    # Agents table
    orch = get_orchestrator()
    agents_table = Table(title="Registered Agents", border_style="magenta")
    agents_table.add_column("Name", style="cyan")
    agents_table.add_column("Role")
    agents_table.add_column("Type", style="dim")

    builtin_roles = {
        "research": "Web research and information gathering",
        "coding": "Code generation and refactoring",
        "qa": "Testing and quality assurance",
        "debug": "Error diagnosis and bug fixing",
        "deployment": "Packaging and deployment",
        "marketing": "Marketing copy and strategy",
        "outreach": "Email and social media outreach",
        "data": "Data analysis and visualisation",
        "factory": "Create and modify agents",
    }
    for name, role in builtin_roles.items():
        agents_table.add_row(name, role, "builtin")
    for da in mem.list_dynamic_agents():
        agents_table.add_row(da["name"], da["role"], "dynamic")

    console.print(agents_table)

    # Tasks table
    tasks = mem.list_tasks()[:10]
    if tasks:
        tasks_table = Table(title="Recent Tasks", border_style="cyan")
        tasks_table.add_column("ID", style="dim", max_width=8)
        tasks_table.add_column("Goal", max_width=50)
        tasks_table.add_column("Status")
        tasks_table.add_column("Agent", style="dim")
        for t in tasks:
            status_style = {
                "done": "green", "running": "yellow",
                "failed": "red", "pending": "dim",
            }.get(t["status"], "")
            tasks_table.add_row(
                t["id"][:8],
                t["goal"][:48],
                Text(t["status"], style=status_style),
                t.get("assigned_to") or "-",
            )
        console.print(tasks_table)
    else:
        console.print("[dim]No tasks yet. Run: jarvis run \"your goal\"[/dim]")


# ── jarvis logs ───────────────────────────────────────────────────────────────

@cli.command()
@click.option("--limit", "-n", default=30, help="Number of log entries to show")
@click.option("--agent", "-a", default=None, help="Filter by agent name")
def logs(limit: int, agent: str | None):
    """View recent action logs."""
    from core.memory import get_memory

    mem = get_memory()
    entries = mem.get_recent_logs(limit=limit, agent=agent)

    if not entries:
        console.print("[dim]No logs yet.[/dim]")
        return

    table = Table(title="Action Logs", border_style="dim", show_lines=True)
    table.add_column("Time", style="dim", max_width=20)
    table.add_column("Agent", style="cyan", max_width=12)
    table.add_column("Action", style="green", max_width=20)
    table.add_column("Details / Result", max_width=60)
    table.add_column("✓", max_width=3)

    for e in entries:
        ts = e["created_at"][:19].replace("T", " ")
        details = (e.get("details") or "")[:40]
        result = (e.get("result") or "")[:40]
        cell = details or result
        approved = "[green]✓[/green]" if e.get("approved") else "[red]✗[/red]"
        table.add_row(ts, e["agent_name"], e["action"], cell, approved)

    console.print(table)


# ── jarvis agents ─────────────────────────────────────────────────────────────

@cli.group()
def agents():
    """Manage agents."""


@agents.command(name="list")
def agents_list():
    """List all available agents."""
    if not _check_env():
        sys.exit(1)

    async def _list():
        from agents.agent_factory import AgentFactory
        factory = AgentFactory()
        agent_list = await factory.list_agents()
        table = Table(title="All Agents", border_style="magenta")
        table.add_column("Name", style="cyan")
        table.add_column("Source", style="dim")
        table.add_column("File", style="dim", max_width=50)
        for a in agent_list:
            table.add_row(a["name"], a.get("source", "?"), a.get("file", "?"))
        console.print(table)

    asyncio.run(_list())


@agents.command(name="create")
@click.argument("description", nargs=-1, required=True)
def agents_create(description: tuple):
    """Create a new agent from a natural-language description."""
    if not _check_env():
        sys.exit(1)

    desc = " ".join(description)

    async def _create():
        from agents.agent_factory import AgentFactory
        factory = AgentFactory()
        result = await factory.create_agent(desc)
        if "error" in result:
            console.print(f"[red]Error:[/red] {result['error']}")
        else:
            console.print(
                Panel(
                    f"[green]Agent created![/green]\n"
                    f"Name: [cyan]{result['name']}[/cyan]\n"
                    f"File: {result['file']}",
                    title="Agent Factory",
                )
            )

    asyncio.run(_create())


@agents.command(name="modify")
@click.argument("agent_name")
@click.argument("changes", nargs=-1, required=True)
def agents_modify(agent_name: str, changes: tuple):
    """Modify an existing agent."""
    if not _check_env():
        sys.exit(1)

    changes_str = " ".join(changes)

    async def _modify():
        from agents.agent_factory import AgentFactory
        factory = AgentFactory()
        result = await factory.modify_agent(agent_name, changes_str)
        if "error" in result:
            console.print(f"[red]Error:[/red] {result['error']}")
        else:
            console.print(f"[green]Agent '{agent_name}' modified.[/green] {result['file']}")

    asyncio.run(_modify())


# ── jarvis tasks ──────────────────────────────────────────────────────────────

@cli.group()
def tasks():
    """Inspect tasks."""


@tasks.command(name="list")
@click.option("--status", default=None, help="Filter by status")
def tasks_list(status: str | None):
    """List all tasks."""
    from core.memory import get_memory

    mem = get_memory()
    task_list = mem.list_tasks(status=status)
    if not task_list:
        console.print("[dim]No tasks found.[/dim]")
        return

    table = Table(title="Tasks", border_style="cyan")
    table.add_column("ID", style="dim")
    table.add_column("Goal")
    table.add_column("Status")
    table.add_column("Created", style="dim")
    for t in task_list:
        st_color = {"done": "green", "running": "yellow", "failed": "red"}.get(t["status"], "dim")
        table.add_row(
            t["id"][:8],
            t["goal"][:60],
            Text(t["status"], style=st_color),
            t["created_at"][:16].replace("T", " "),
        )
    console.print(table)


@tasks.command(name="show")
@click.argument("task_id")
def tasks_show(task_id: str):
    """Show details of a specific task."""
    from core.memory import get_memory

    mem = get_memory()
    # Support partial ID match
    all_tasks = mem.list_tasks()
    task = next((t for t in all_tasks if t["id"].startswith(task_id)), None)
    if not task:
        console.print(f"[red]Task not found: {task_id}[/red]")
        return

    console.print(
        Panel(
            f"[bold]Goal:[/bold] {task['goal']}\n"
            f"[bold]Status:[/bold] {task['status']}\n"
            f"[bold]Agent:[/bold] {task.get('assigned_to') or '-'}\n"
            f"[bold]Created:[/bold] {task['created_at'][:19]}\n"
            f"[bold]Updated:[/bold] {task['updated_at'][:19]}\n\n"
            f"[bold]Result:[/bold]\n{task.get('result') or '(none yet)'}",
            title=f"Task {task_id[:8]}",
            border_style="cyan",
        )
    )

    # Show subtasks
    subtasks = mem.get_subtasks(task["id"])
    if subtasks:
        st_table = Table(title="Subtasks", border_style="dim", show_lines=True)
        st_table.add_column("Agent", style="cyan")
        st_table.add_column("Title")
        st_table.add_column("Status")
        for st in subtasks:
            st_color = {"done": "green", "running": "yellow", "failed": "red"}.get(st["status"], "dim")
            st_table.add_row(st["agent"], st["title"], Text(st["status"], style=st_color))
        console.print(st_table)


# ── jarvis agent run (direct) ─────────────────────────────────────────────────

@cli.command(name="agent")
@click.argument("agent_name")
@click.argument("task", nargs=-1, required=True)
def run_agent(agent_name: str, task: tuple):
    """Run a specific agent directly with a task (bypass CEO)."""
    if not _check_env():
        sys.exit(1)

    task_str = " ".join(task)

    async def _run():
        from core.orchestrator import get_orchestrator
        orch = get_orchestrator()
        try:
            result = await orch.run_task(agent_name, task_str)
            console.print(
                Panel(result, title=f"[cyan]{agent_name}[/cyan] result", border_style="cyan")
            )
        except ValueError as exc:
            console.print(f"[red]{exc}[/red]")

    asyncio.run(_run())


if __name__ == "__main__":
    cli()
