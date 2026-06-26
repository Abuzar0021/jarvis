"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";
import { SaveBar } from "./fields";
import { formatDate } from "@/lib/utils";

const STATUSES: Lead["status"][] = ["new", "contacted", "qualified", "won", "lost"];
const STATUS_STYLE: Record<Lead["status"], string> = {
  new: "border-gold/50 text-gold",
  contacted: "border-blue-400/40 text-blue-300",
  qualified: "border-violet-400/40 text-violet-300",
  won: "border-green-400/40 text-green-300",
  lost: "border-hair text-muted",
};

export function LeadsBoard({ initial }: { initial: Lead[] }) {
  const [items, setItems] = useState<Lead[]>(initial);

  function setStatus(id: string, status: Lead["status"]) {
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }
  function remove(id: string) {
    setItems((prev) => prev.filter((l) => l.id !== id));
  }

  async function save() {
    const res = await fetch("/api/admin/leads", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok, error: data.error };
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-hair p-12 text-center text-muted">
        No enquiries yet. Submissions from your contact and newsletter forms will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((l) => (
        <div key={l.id} className="rounded-2xl border border-hair bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {l.name}{" "}
                {l.company ? <span className="text-muted">· {l.company}</span> : null}
              </p>
              <a href={`mailto:${l.email}`} className="text-sm text-gold hover:underline">
                {l.email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-wide ${STATUS_STYLE[l.status]}`}>
                {l.status}
              </span>
              <span className="text-xs text-muted">{formatDate(l.createdAt)}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
            {l.service ? <span>Service: <span className="text-fg/90">{l.service}</span></span> : null}
            {l.budget ? <span>Budget: <span className="text-fg/90">{l.budget}</span></span> : null}
            <span>Source: <span className="text-fg/90">{l.source}</span></span>
          </div>

          {l.message ? (
            <p className="mt-3 whitespace-pre-wrap rounded-lg border border-hair bg-card p-3 text-sm text-fg/90">
              {l.message}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(l.id, s)}
                className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                  l.status === s ? STATUS_STYLE[s] : "border-hair text-muted hover:text-fg"
                }`}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => remove(l.id)}
              className="ml-auto text-xs text-muted hover:text-red-400"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <SaveBar onSave={save} label="Save changes" />
    </div>
  );
}
