"use client";

import { useState } from "react";
import type { Service, ServiceGroup } from "@/lib/types";
import { Field, SaveBar, SelectField, StringList, TextArea, Toggle } from "./fields";

const GROUPS: ServiceGroup[] = ["Build", "AI", "Design", "Grow"];

const blank = (): Service => ({
  id: "",
  name: "New service",
  slug: "",
  group: "Build",
  summary: "",
  body: "",
  deliverables: [],
  featured: false,
});

export function ServicesEditor({ initial }: { initial: Service[] }) {
  const [items, setItems] = useState<Service[]>(initial);

  function patch(i: number, p: Partial<Service>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  }

  async function save() {
    const res = await fetch("/api/admin/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok, error: data.error };
  }

  return (
    <div className="space-y-4">
      {items.map((s, i) => (
        <details key={s.id || i} className="group rounded-2xl border border-hair bg-surface" open={!s.id}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
            <span className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-wide text-gold">{s.group}</span>
              <span className="font-medium">{s.name}</span>
            </span>
            <span className="transition-transform group-open:rotate-180 text-muted">▾</span>
          </summary>
          <div className="space-y-5 border-t border-hair p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" value={s.name} onChange={(v) => patch(i, { name: v })} />
              <Field label="Slug" value={s.slug} onChange={(v) => patch(i, { slug: v })} hint="Auto from name if blank" mono />
            </div>
            <SelectField
              label="Group"
              value={s.group}
              onChange={(v) => patch(i, { group: v as ServiceGroup })}
              options={GROUPS.map((g) => ({ value: g, label: g }))}
            />
            <TextArea label="Summary" value={s.summary} onChange={(v) => patch(i, { summary: v })} rows={2} />
            <TextArea label="Body" value={s.body} onChange={(v) => patch(i, { body: v })} rows={4} hint="Separate paragraphs with a blank line." />
            <StringList label="Deliverables" values={s.deliverables} onChange={(v) => patch(i, { deliverables: v })} placeholder="e.g. Design system" />
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-4">
              <Toggle label="Feature on homepage" checked={s.featured} onChange={(v) => patch(i, { featured: v })} />
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                className="rounded-lg border border-hair px-3 py-1.5 text-sm text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
              >
                Delete service
              </button>
            </div>
          </div>
        </details>
      ))}

      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, blank()])}
        className="w-full rounded-2xl border border-dashed border-hair py-4 text-sm text-muted transition-colors hover:border-gold/50 hover:text-gold"
      >
        + Add service
      </button>

      <SaveBar onSave={save} />
    </div>
  );
}
