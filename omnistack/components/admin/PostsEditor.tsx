"use client";

import { useState } from "react";
import type { Post } from "@/lib/types";
import { Field, ImageField, SaveBar, TextArea, Toggle } from "./fields";

const blank = (): Post => ({
  id: "",
  title: "New article",
  slug: "",
  excerpt: "",
  body: "",
  cover: "",
  category: "Guides",
  author: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  featured: false,
});

export function PostsEditor({ initial }: { initial: Post[] }) {
  const [items, setItems] = useState<Post[]>(initial);

  function patch(i: number, p: Partial<Post>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  }

  async function save() {
    const res = await fetch("/api/admin/posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok, error: data.error };
  }

  return (
    <div className="space-y-4">
      {items.map((p, i) => (
        <details key={p.id || i} className="group rounded-2xl border border-hair bg-surface" open={!p.id}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
            <span className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-wide text-gold">{p.category}</span>
              <span className="font-medium">{p.title || "Untitled"}</span>
            </span>
            <span className="text-muted transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="space-y-5 border-t border-hair p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" value={p.title} onChange={(v) => patch(i, { title: v })} />
              <Field label="Slug" value={p.slug} onChange={(v) => patch(i, { slug: v })} hint="Auto from title if blank" mono />
              <Field label="Category" value={p.category} onChange={(v) => patch(i, { category: v })} />
              <Field label="Author" value={p.author} onChange={(v) => patch(i, { author: v })} />
              <Field label="Published date" value={p.publishedAt} onChange={(v) => patch(i, { publishedAt: v })} type="date" />
            </div>
            <ImageField label="Cover image" value={p.cover} onChange={(v) => patch(i, { cover: v })} hint="Optional — a branded gradient is used if empty." />
            <TextArea label="Excerpt" value={p.excerpt} onChange={(v) => patch(i, { excerpt: v })} rows={2} hint="Short summary shown on cards." />
            <TextArea
              label="Body"
              value={p.body}
              onChange={(v) => patch(i, { body: v })}
              rows={12}
              hint="Use ## for headings, - for bullet points, and a blank line between paragraphs."
            />
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-4">
              <Toggle label="Feature on homepage" checked={p.featured} onChange={(v) => patch(i, { featured: v })} />
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                className="rounded-lg border border-hair px-3 py-1.5 text-sm text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
              >
                Delete article
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
        + Add article
      </button>

      <SaveBar onSave={save} />
    </div>
  );
}
