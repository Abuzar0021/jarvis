"use client";

import { useStore, LiveEvent } from "@/lib/store";
import { ScrollArea } from "@radix-ui/react-scroll-area";

const EVENT_COLORS: Record<string, string> = {
  "workflow.started": "text-blue-400",
  "workflow.completed": "text-green-400",
  "workflow.failed": "text-red-400",
  "workflow.step.started": "text-cyan-400",
  "workflow.step.completed": "text-teal-400",
  "agent.started": "text-purple-400",
  "agent.completed": "text-violet-400",
  "agent.failed": "text-rose-400",
  "tool.called": "text-yellow-400",
  "tool.completed": "text-lime-400",
  "tool.failed": "text-orange-400",
  "browser.screenshot": "text-sky-400",
  "self.improvement": "text-pink-400",
};

function EventRow({ event }: { event: LiveEvent }) {
  const color = EVENT_COLORS[event.type] ?? "text-gray-400";
  const ts = new Date(event.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const summary = summarize(event);

  return (
    <div className="flex gap-2 py-1 text-xs font-mono border-b border-gray-800/50 last:border-0">
      <span className="shrink-0 text-gray-600">{ts}</span>
      <span className={`shrink-0 ${color}`}>{event.type}</span>
      <span className="text-gray-400 truncate">{summary}</span>
    </div>
  );
}

function summarize(ev: LiveEvent): string {
  const d = ev.data;
  if (ev.type === "workflow.started") return `goal: ${String(d.goal ?? "").slice(0, 60)}`;
  if (ev.type === "workflow.completed") return `✓ ${String(d.result ?? "").slice(0, 60)}`;
  if (ev.type === "workflow.failed") return `✗ ${String(d.error ?? "").slice(0, 60)}`;
  if (ev.type === "agent.started") return `${d.agent_type}: ${String(d.task ?? "").slice(0, 50)}`;
  if (ev.type === "agent.completed") return `${d.agent_type} ✓ ${d.duration_ms}ms`;
  if (ev.type === "tool.called") return `${d.tool}(${JSON.stringify(d.arguments ?? {}).slice(0, 40)})`;
  if (ev.type === "tool.completed") return `${d.tool} → ${String(d.result_snippet ?? "").slice(0, 50)}`;
  if (ev.type === "browser.screenshot") return `📸 ${d.url}`;
  if (ev.type === "workflow.step.started") return `step ${d.step} [${d.agent_type}]: ${String(d.description ?? "").slice(0, 50)}`;
  return JSON.stringify(d).slice(0, 80);
}

export function EventFeed() {
  const events = useStore((s) => s.events);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Live Event Stream
        </h3>
        <span className="text-xs text-gray-600">{events.length} events</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {events.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-600">
            Waiting for events...
          </p>
        ) : (
          events.map((ev) => <EventRow key={ev.id} event={ev} />)
        )}
      </div>
    </div>
  );
}
