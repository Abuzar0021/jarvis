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


# ── jarvis diagnose ───────────────────────────────────────────────────────────

@cli.command()
def diagnose():
    """Run full self-diagnostics: mic, speaker, WS, memory, agents, tools, API…"""
    from core.diagnostics import run_diagnostics, render_report

    report = asyncio.run(run_diagnostics())
    color = {"ok": "green", "warn": "yellow", "fail": "red"}[report["overall"]]
    console.print(render_report(report))
    console.print(f"\n[bold {color}]Overall: {report['overall'].upper()}[/bold {color}]")
    sys.exit(1 if report["overall"] == "fail" else 0)


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


# ── jarvis leads ───────────────────────────────────────────────────────────────

@cli.command(name="leads")
@click.argument("business", nargs=-1, required=False)
@click.option("--url", "-u", default="", help="Lead website URL")
@click.option("--industry", "-i", default="", help="Industry / vertical")
@click.option("--location", "-l", default="", help="Location (for local SEO angle)")
@click.option("--no-proposal", is_flag=True, help="Skip proposal generation")
def leads(business: tuple, url: str, industry: str, location: str, no_proposal: bool):
    """Run the lead-generation pipeline, or show the pipeline funnel if no business given.

    Audit, contact discovery, and scoring run WITHOUT an API key. The proposal
    uses the LLM when a key is set, otherwise a concrete audit-driven template.
    """
    async def _run():
        from core.lead_pipeline import get_lead_pipeline
        from core.crm import get_crm, STAGES

        if not business:
            # Show the funnel + top leads
            crm = get_crm()
            summary = crm.pipeline_summary()
            table = Table(title="Lead Pipeline", border_style="cyan")
            table.add_column("Stage"); table.add_column("Count", justify="right")
            table.add_column("Avg score", justify="right")
            for stage in STAGES:
                s = summary["by_stage"][stage]
                table.add_row(stage, str(s["count"]), f"{s['avg_score']:.0f}")
            console.print(table)
            console.print(
                f"[dim]Total {summary['total']} · active {summary['active']} · "
                f"conversion {summary['conversion_rate']*100:.0f}%[/dim]"
            )
            top = crm.list_leads(limit=10)
            if top:
                lt = Table(title="Top leads", border_style="magenta")
                lt.add_column("Business"); lt.add_column("Score", justify="right")
                lt.add_column("Stage"); lt.add_column("Email")
                for l in top:
                    lt.add_row(l.business, f"{l.score:.0f}", l.stage, l.contact_email or "—")
                console.print(lt)
            return

        biz = " ".join(business)
        import os
        if not os.getenv("OPENROUTER_API_KEY"):
            console.print("[dim]No API key — proposal will use the deterministic template.[/dim]")

        console.print(f"[cyan]Running pipeline for[/cyan] [bold]{biz}[/bold]…")
        trace = await get_lead_pipeline().run(
            business=biz, url=url, industry=industry, location=location,
            generate_proposal=not no_proposal,
        )

        audit = trace.get("audit", {})
        console.print(Panel(
            f"[bold]Stages:[/bold] " + " → ".join(s["stage"] for s in trace["stages"]) + "\n"
            f"[bold]Contacts:[/bold] {trace['contacts'].get('primary_email') or 'none found'}\n"
            f"[bold]Audit:[/bold] quality {audit.get('quality')}/100 · "
            f"opportunity {audit.get('opportunity')}/100\n"
            f"[bold]Issues:[/bold] {', '.join(audit.get('issues', [])) or 'none'}\n"
            f"[bold]Score:[/bold] {trace['final_score']:.0f}/100 → stage [green]{trace['final_stage']}[/green]",
            title=f"[cyan]{biz}[/cyan]", border_style="cyan",
        ))
        for r in trace["score"]["reasons"]:
            console.print(f"  [dim]• {r}[/dim]")
        if trace.get("proposal"):
            console.print(Panel(trace["proposal"], title="Proposal", border_style="green"))

    asyncio.run(_run())


# ── jarvis models ────────────────────────────────────────────────────────────────

@cli.command(name="models")
@click.option("--task", "-t", default="write",
              help="Task type: classify/extract/score/summarise/write/plan/code/research")
@click.option("--tools", is_flag=True, help="Require tool-calling support")
def models(task: str, tools: bool):
    """Show the model routing chain (cheapest-capable-first) and cost report."""
    from core.model_router import get_router
    router = get_router()
    decision = router.route(task_type=task, needs_tools=tools)

    table = Table(title=f"Routing for task='{task}'" + (" (+tools)" if tools else ""),
                  border_style="cyan")
    table.add_column("#", justify="right"); table.add_column("Model")
    table.add_column("Provider"); table.add_column("Cap", justify="right")
    table.add_column("$/1K in", justify="right"); table.add_column("$/1K out", justify="right")
    for i, m in enumerate(decision.chain):
        marker = "→" if i == 0 else str(i + 1)
        table.add_row(marker, m.id, m.provider, str(m.capability),
                      f"{m.cost_in:.5f}", f"{m.cost_out:.5f}")
    console.print(table)
    console.print(f"[green]Chosen:[/green] {decision.chosen.id} "
                  f"[dim](required capability {decision.required_capability})[/dim]")

    cost = router.usage_summary()
    console.print(f"\n[bold]Cost to date:[/bold] ${cost['total_cost_usd']:.4f} "
                  f"over {cost['total_calls']} calls")


if __name__ == "__main__":
    cli()
