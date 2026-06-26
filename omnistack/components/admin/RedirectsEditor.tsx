"use client";

import { useState } from "react";
import type { Redirect } from "@/lib/types";
import { Field, SaveBar, Toggle } from "./fields";

const blank = (): Redirect => ({ id: "", from: "", to: "", permanent: true });

export function RedirectsEditor({ initial }: { initial: Redirect[] }) {
  const [items, setItems] = useState<Redirect[]>(initial);

  const patch = (i: number, p: Partial<Redirect>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));

  async function save() {
    const res = await fetch("/api/admin/redirects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok, error: data.error };
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-hair bg-card p-4 text-sm text-muted">
        Redirects are applied on the next build/deploy. Use them when you change
        a URL so old links keep working (good for SEO).
      </div>

      {items.map((r, i) => (
        <div key={r.id || i} className="space-y-3 rounded-2xl border border-hair bg-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="From (old path)" value={r.from} onChange={(v) => patch(i, { from: v })} placeholder="/old-page" mono />
            <Field label="To (new path or URL)" value={r.to} onChange={(v) => patch(i, { to: v })} placeholder="/new-page" mono />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Toggle label="Permanent (301)" checked={r.permanent} onChange={(v) => patch(i, { permanent: v })} />
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
              className="rounded-lg border border-hair px-3 py-1.5 text-sm text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, blank()])}
        className="w-full rounded-2xl border border-dashed border-hair py-4 text-sm text-muted transition-colors hover:border-gold/50 hover:text-gold"
      >
        + Add redirect
      </button>

      <SaveBar onSave={save} />
    </div>
  );
}
