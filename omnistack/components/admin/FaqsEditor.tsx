"use client";

import { useState } from "react";
import type { Faq } from "@/lib/types";
import { Field, SaveBar, TextArea } from "./fields";

const blank = (): Faq => ({ id: "", question: "", answer: "", category: "General" });

export function FaqsEditor({ initial }: { initial: Faq[] }) {
  const [items, setItems] = useState<Faq[]>(initial);

  function patch(i: number, p: Partial<Faq>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  }

  async function save() {
    const res = await fetch("/api/admin/faqs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok, error: data.error };
  }

  return (
    <div className="space-y-4">
      {items.map((f, i) => (
        <div key={f.id || i} className="space-y-4 rounded-2xl border border-hair bg-surface p-5">
          <Field label="Question" value={f.question} onChange={(v) => patch(i, { question: v })} />
          <TextArea label="Answer" value={f.answer} onChange={(v) => patch(i, { answer: v })} rows={3} />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="w-48">
              <Field label="Category" value={f.category} onChange={(v) => patch(i, { category: v })} />
            </div>
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
        + Add FAQ
      </button>

      <SaveBar onSave={save} />
    </div>
  );
}
