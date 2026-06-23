"use client";

import { useState } from "react";
import { SendHorizontal, Loader2 } from "lucide-react";
import { submitGoal } from "@/lib/ws";
import { useStore } from "@/lib/store";

export function WorkflowSubmit() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const tenantId = useStore((s) => s.tenantId);
  const accessToken = useStore((s) => s.accessToken);
  const addWorkflow = useStore((s) => s.addWorkflow);
  const wsStatus = useStore((s) => s.wsStatus);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim() || loading) return;

    setLoading(true);
    try {
      // Submit via REST API for persistence
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/workflows`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ goal: goal.trim() }),
        }
      );

      if (resp.ok) {
        const data = await resp.json();
        addWorkflow({
          id: data.id,
          goal: goal.trim(),
          status: "pending",
          tokens_used: 0,
          created_at: new Date().toISOString(),
          steps: [],
        });
        setGoal("");
      }
    } catch (err) {
      console.error("Submit failed", err);
      // Fallback to WS submit
      submitGoal(goal.trim());
      setGoal("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Enter a goal for Jarvis... (e.g. 'Research quantum computing trends and write a summary')"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 pr-12 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={loading || !tenantId}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <span
            className={`h-2 w-2 rounded-full ${
              wsStatus === "connected"
                ? "bg-green-400"
                : wsStatus === "connecting"
                ? "bg-yellow-400 animate-pulse"
                : "bg-red-400"
            }`}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading || !goal.trim() || !tenantId}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SendHorizontal className="h-4 w-4" />
        )}
        Run
      </button>
    </form>
  );
}
