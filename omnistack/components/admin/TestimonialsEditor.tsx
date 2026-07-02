"use client";

import { useState } from "react";
import type { Testimonial } from "@/lib/types";
import { Field, SaveBar, TextArea, Toggle } from "./fields";

const blank = (): Testimonial => ({
  id: "",
  quote: "",
  authorName: "",
  authorRole: "",
  company: "",
  featured: false,
});

export function TestimonialsEditor({ initial }: { initial: Testimonial[] }) {
  const [items, setItems] = useState<Testimonial[]>(initial);

  function patch(i: number, p: Partial<Testimonial>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  }

  async function save() {
    const res = await fetch("/api/admin/testimonials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok, error: data.error };
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold/30 bg-gold-soft p-4 text-sm text-fg/90">
        These are sample testimonials. Replace them with real client quotes before launch.
      </div>

      {items.map((t, i) => (
        <div key={t.id || i} className="space-y-4 rounded-2xl border border-hair bg-surface p-5">
          <TextArea label="Quote" value={t.quote} onChange={(v) => patch(i, { quote: v })} rows={3} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Author name" value={t.authorName} onChange={(v) => patch(i, { authorName: v })} hint="Optional" />
            <Field label="Role" value={t.authorRole} onChange={(v) => patch(i, { authorRole: v })} placeholder="Founder" />
            <Field label="Company" value={t.company} onChange={(v) => patch(i, { company: v })} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-4">
            <Toggle label="Featured (large pull-quote)" checked={t.featured} onChange={(v) => patch(i, { featured: v })} />
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
        + Add testimonial
      </button>

      <SaveBar onSave={save} />
    </div>
  );
}
