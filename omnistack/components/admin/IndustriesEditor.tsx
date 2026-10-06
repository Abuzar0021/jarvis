"use client";

import { useState } from "react";
import type { Industry } from "@/lib/types";
import { Field, ImageField, SaveBar, StringList, TextArea, Toggle } from "./fields";

const blank = (): Industry => ({
  id: "",
  name: "New industry",
  slug: "",
  summary: "",
  painPoints: [],
  services: [],
  body: "",
  cover: "",
  featured: false,
  sortOrder: 0,
  seoTitle: "",
  seoDescription: "",
});

export function IndustriesEditor({ initial }: { initial: Industry[] }) {
  const [items, setItems] = useState<Industry[]>(initial);

  const patch = (i: number, p: Partial<Industry>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));

  function move(i: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    const res = await fetch("/api/admin/industries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok, error: data.error };
  }

  return (
    <div className="space-y-4">
      {items.map((it, i) => (
        <details key={it.id || i} className="group rounded-2xl border border-hair bg-surface" open={!it.id}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
            <span className="flex items-center gap-3">
              <span className="font-medium">{it.name}</span>
              {it.featured ? (
                <span className="rounded-full border border-gold/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold">Featured</span>
              ) : null}
            </span>
            <span className="flex items-center gap-1.5 text-muted">
              <button type="button" onClick={(e) => { e.preventDefault(); move(i, -1); }} className="px-1.5 hover:text-fg" aria-label="Move up">↑</button>
              <button type="button" onClick={(e) => { e.preventDefault(); move(i, 1); }} className="px-1.5 hover:text-fg" aria-label="Move down">↓</button>
              <span className="ml-1 transition-transform group-open:rotate-180">▾</span>
            </span>
          </summary>
          <div className="space-y-5 border-t border-hair p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" value={it.name} onChange={(v) => patch(i, { name: v })} />
              <Field label="Slug" value={it.slug} onChange={(v) => patch(i, { slug: v })} hint="Auto from name if blank" mono />
            </div>
            <TextArea label="Summary" value={it.summary} onChange={(v) => patch(i, { summary: v })} rows={2} />
            <ImageField label="Cover image" value={it.cover} onChange={(v) => patch(i, { cover: v })} hint="Optional - branded gradient used if empty." />
            <StringList label="Pain points" values={it.painPoints} onChange={(v) => patch(i, { painPoints: v })} placeholder="A problem this industry faces" />
            <StringList label="Featured service slugs" values={it.services} onChange={(v) => patch(i, { services: v })} placeholder="e.g. website-development" />
            <TextArea label="Body" value={it.body} onChange={(v) => patch(i, { body: v })} rows={6} hint="Separate paragraphs with a blank line." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SEO title" value={it.seoTitle} onChange={(v) => patch(i, { seoTitle: v })} />
              <Field label="SEO description" value={it.seoDescription} onChange={(v) => patch(i, { seoDescription: v })} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-4">
              <Toggle label="Feature on homepage" checked={it.featured} onChange={(v) => patch(i, { featured: v })} />
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                className="rounded-lg border border-hair px-3 py-1.5 text-sm text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
              >
                Delete industry
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
        + Add industry
      </button>

      <SaveBar onSave={save} />
    </div>
  );
}
