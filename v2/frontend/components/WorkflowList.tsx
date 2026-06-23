"use client";

import { useStore, Workflow } from "@/lib/store";
import { CheckCircle2, XCircle, Clock, Loader2, ChevronRight } from "lucide-react";

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-400" />,
  running: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
};

const STATUS_BG: Record<string, string> = {
  pending: "border-l-yellow-500",
  running: "border-l-blue-500",
  completed: "border-l-green-500",
  failed: "border-l-red-500",
};

function WorkflowCard({ wf, isActive }: { wf: Workflow; isActive: boolean }) {
  const setActiveWorkflow = useStore((s) => s.setActiveWorkflow);

  return (
    <button
      onClick={() => setActiveWorkflow(isActive ? null : wf)}
      className={`w-full text-left rounded-lg border border-gray-800 border-l-4 bg-gray-900 p-3 transition-all hover:border-gray-700 ${
        STATUS_BG[wf.status] ?? "border-l-gray-700"
      } ${isActive ? "ring-1 ring-blue-500" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {STATUS_ICON[wf.status]}
          <span className="truncate text-sm text-white">{wf.goal}</span>
        </div>
        <ChevronRight className={`h-4 w-4 shrink-0 text-gray-600 transition-transform ${isActive ? "rotate-90" : ""}`} />
      </div>

      <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
        <span className="capitalize">{wf.status}</span>
        {wf.duration_ms && <span>{(wf.duration_ms / 1000).toFixed(1)}s</span>}
        {wf.tokens_used > 0 && <span>{wf.tokens_used.toLocaleString()} tokens</span>}
        <span className="ml-auto">{new Date(wf.created_at).toLocaleTimeString()}</span>
      </div>

      {isActive && wf.result && (
        <div className="mt-2 rounded bg-gray-800 p-2 text-xs text-gray-300">
          {wf.result.slice(0, 300)}
          {wf.result.length > 300 && "…"}
        </div>
      )}
      {isActive && wf.error && (
        <div className="mt-2 rounded bg-red-950 p-2 text-xs text-red-300">
          {wf.error.slice(0, 200)}
        </div>
      )}
      {isActive && wf.steps.length > 0 && (
        <ol className="mt-2 space-y-1">
          {wf.steps.map((step) => (
            <li key={step.index} className="flex items-center gap-2 text-xs text-gray-400">
              <span className="shrink-0 text-gray-600">{step.index + 1}.</span>
              <span className={`shrink-0 capitalize text-${step.status === "completed" ? "green" : step.status === "failed" ? "red" : "gray"}-400`}>
                [{step.agent_type}]
              </span>
              <span className="truncate">{step.description}</span>
            </li>
          ))}
        </ol>
      )}
    </button>
  );
}

export function WorkflowList() {
  const workflows = useStore((s) => s.workflows);
  const activeWorkflow = useStore((s) => s.activeWorkflow);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-800 bg-gray-950">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Workflows
        </h3>
        <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
          {workflows.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {workflows.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-600">
            No workflows yet. Enter a goal above to get started.
          </p>
        ) : (
          workflows.map((wf) => (
            <WorkflowCard
              key={wf.id}
              wf={wf}
              isActive={activeWorkflow?.id === wf.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
