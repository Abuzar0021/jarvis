"use client";

import { useEffect } from "react";
import { Zap } from "lucide-react";
import { connectWS } from "@/lib/ws";
import { useStore } from "@/lib/store";
import { WorkflowSubmit } from "@/components/WorkflowSubmit";
import { AgentGrid } from "@/components/AgentGrid";
import { EventFeed } from "@/components/EventFeed";
import { BrowserView } from "@/components/BrowserView";
import { WorkflowList } from "@/components/WorkflowList";

export default function DashboardPage() {
  const tenantId = useStore((s) => s.tenantId);
  const wsStatus = useStore((s) => s.wsStatus);

  // Dev: auto-connect with a fixed tenant for local development
  useEffect(() => {
    const tid = tenantId ?? "dev-tenant";
    if (!tenantId) useStore.getState().setAuth(tid, "dev-token");
    connectWS(tid);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-blue-400" />
          <span className="text-lg font-bold tracking-tight">Jarvis V2</span>
          <span className="rounded bg-blue-950 px-2 py-0.5 text-xs text-blue-400">BETA</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span
              className={`h-2 w-2 rounded-full ${
                wsStatus === "connected"
                  ? "bg-green-400"
                  : wsStatus === "connecting"
                  ? "bg-yellow-400 animate-pulse"
                  : "bg-red-400"
              }`}
            />
            {wsStatus === "connected" ? "LIVE" : wsStatus.toUpperCase()}
          </div>
          <a
            href="/marketplace"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Marketplace
          </a>
          <a
            href="/settings"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Settings
          </a>
        </div>
      </header>

      {/* Goal input */}
      <div className="border-b border-gray-800 px-6 py-4 shrink-0">
        <WorkflowSubmit />
      </div>

      {/* Agent grid */}
      <div className="px-6 py-3 shrink-0">
        <AgentGrid />
      </div>

      {/* Main content grid */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 p-4">
        {/* Workflow list */}
        <div className="col-span-4 min-h-0">
          <WorkflowList />
        </div>

        {/* Event feed */}
        <div className="col-span-4 min-h-0">
          <EventFeed />
        </div>

        {/* Browser view */}
        <div className="col-span-4 min-h-0">
          <BrowserView />
        </div>
      </div>
    </div>
  );
}
