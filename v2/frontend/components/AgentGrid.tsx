"use client";

import { useStore } from "@/lib/store";
import { Brain, Globe, Code, Search, CheckSquare, Database, TrendingUp } from "lucide-react";

const AGENT_ICONS: Record<string, React.ReactNode> = {
  ceo: <Brain className="h-5 w-5" />,
  research: <Search className="h-5 w-5" />,
  coding: <Code className="h-5 w-5" />,
  browser: <Globe className="h-5 w-5" />,
  qa: <CheckSquare className="h-5 w-5" />,
  memory: <Database className="h-5 w-5" />,
  optimizer: <TrendingUp className="h-5 w-5" />,
};

const AGENT_COLORS: Record<string, string> = {
  idle: "text-gray-400 bg-gray-800",
  running: "text-blue-400 bg-blue-950 ring-1 ring-blue-500",
  completed: "text-green-400 bg-green-950",
  failed: "text-red-400 bg-red-950",
};

export function AgentGrid() {
  const agents = useStore((s) => s.agents);
  const allTypes = ["ceo", "research", "coding", "browser", "qa", "memory", "optimizer"];

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Active Agents
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {allTypes.map((type) => {
          const agent = agents[type];
          const status = agent?.status ?? "idle";
          const colorClass = AGENT_COLORS[status] ?? AGENT_COLORS.idle;

          return (
            <div
              key={type}
              className={`flex flex-col items-center gap-1.5 rounded-lg p-2.5 transition-all ${colorClass}`}
            >
              <div className="relative">
                {AGENT_ICONS[type] ?? <Brain className="h-5 w-5" />}
                {status === "running" && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                )}
              </div>
              <span className="text-xs font-medium capitalize">{type}</span>
              {agent?.duration_ms && status === "completed" && (
                <span className="text-[10px] text-gray-500">{agent.duration_ms}ms</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
