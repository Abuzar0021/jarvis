"use client";

import { useState } from "react";
import type { Project, Testimonial } from "@/lib/types";
import {
  Card,
  Field,
  ImageField,
  SaveBar,
  SelectField,
  StringList,
  TextArea,
  Toggle,
} from "./fields";

const blank = (): Project => ({
  id: "",
  kind: "work",
  title: "New project",
  slug: "",
  client: "",
  category: "",
  year: String(new Date().getFullYear()),
  summary: "",
  body: "",
  challenge: "",
  approach: "",
  outcome: "",
  gallery: [],
  testimonialId: "",
  cover: "",
  video: "",
  videoPoster: "",
  logo: "",
  url: "",
  tags: [],
  services: [],
  results: [],
  featured: false,
  sortOrder: 0,
  seoTitle: "",
  seoDescription: "",
});

export function ProjectsEditor({
  initial,
  testimonials,
}: {
  initial: Project[];
  testimonials: Testimonial[];
}) {
  const [items, setItems] = useState<Project[]>(initial);

  function patch(i: number, p: Partial<Project>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  }
  function remove(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
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
    const res = await fetch("/api/admin/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok, error: data.error };
  }

  const testimonialOptions = [
    { value: "", label: "None" },
    ...testimonials.map((t) => ({
      value: t.id,
      label: `${t.company || t.authorRole || "Quote"} - ${t.quote.slice(0, 32)}…`,
    })),
  ];

  return (
    <div className="space-y-4">
      {items.map((p, i) => (
        <details key={p.id || i} className="group rounded-2xl border border-hair bg-surface" open={!p.id}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
            <span className="flex items-center gap-3">
              <span className="font-medium">{p.title || "Untitled"}</span>
              {p.featured ? (
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
            {/* Work and templates are kept apart deliberately. Templates never
                appear in /work, the sitemap or search, because a design nobody
                commissioned must not read as a delivered case study. */}
            <SelectField
              label="Type"
              value={p.kind ?? "work"}
              onChange={(v) => patch(i, { kind: v === "template" ? "template" : "work" })}
              options={[
                { value: "work", label: "Client work (shown in /work)" },
                { value: "template", label: "Template (shown in /templates)" },
              ]}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" value={p.title} onChange={(v) => patch(i, { title: v })} />
              <Field label="Slug" value={p.slug} onChange={(v) => patch(i, { slug: v })} hint="Auto-generated from title if left blank" mono />
              <Field label="Client" value={p.client} onChange={(v) => patch(i, { client: v })} />
              <Field label="Category" value={p.category} onChange={(v) => patch(i, { category: v })} placeholder="e.g. Restaurant Website" />
              <Field label="Year" value={p.year} onChange={(v) => patch(i, { year: v })} />
              <Field label="Live URL" value={p.url} onChange={(v) => patch(i, { url: v })} placeholder="https://…" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ImageField label="Cover image" value={p.cover} onChange={(v) => patch(i, { cover: v })} hint="Optional - a branded gradient is used if empty." />
              <ImageField label="Client logo" value={p.logo ?? ""} onChange={(v) => patch(i, { logo: v })} hint="Optional - small mark shown on the card and case study page." />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Motion preview (mp4)" value={p.video ?? ""} onChange={(v) => patch(i, { video: v })} placeholder="/media/banafee-motion.mp4" hint="Optional - a looping clip that plays while this card is centred. A matching .webm beside it is used automatically. Leave empty to keep the still image." mono />
              <ImageField label="Video poster" value={p.videoPoster ?? ""} onChange={(v) => patch(i, { videoPoster: v })} hint="Optional - first frame, shown before the clip plays and under reduced motion. Falls back to the cover image." />
            </div>

            <TextArea label="Summary" value={p.summary} onChange={(v) => patch(i, { summary: v })} rows={2} hint="Short line shown on cards and search." />

            <Card title="Case study">
              <div className="space-y-4">
                <TextArea label="The challenge" value={p.challenge ?? ""} onChange={(v) => patch(i, { challenge: v })} rows={3} />
                <TextArea label="Our approach" value={p.approach ?? ""} onChange={(v) => patch(i, { approach: v })} rows={3} />
                <TextArea label="The outcome" value={p.outcome ?? ""} onChange={(v) => patch(i, { outcome: v })} rows={3} />
                <TextArea label="Overview (fallback)" value={p.body} onChange={(v) => patch(i, { body: v })} rows={4} hint="Shown only if the three sections above are empty." />
              </div>
            </Card>

            <GalleryField images={p.gallery ?? []} onChange={(g) => patch(i, { gallery: g })} />

            <div className="grid gap-4 sm:grid-cols-2">
              <StringList label="Tags / stack" values={p.tags} onChange={(v) => patch(i, { tags: v })} placeholder="e.g. Next.js" />
              <StringList label="What we did" values={p.services} onChange={(v) => patch(i, { services: v })} placeholder="e.g. UI/UX Design" />
            </div>

            <ResultsEditor results={p.results} onChange={(r) => patch(i, { results: r })} />

            <SelectField
              label="Linked testimonial"
              value={p.testimonialId ?? ""}
              onChange={(v) => patch(i, { testimonialId: v })}
              options={testimonialOptions}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SEO title" value={p.seoTitle ?? ""} onChange={(v) => patch(i, { seoTitle: v })} />
              <Field label="SEO description" value={p.seoDescription ?? ""} onChange={(v) => patch(i, { seoDescription: v })} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-4">
              <Toggle label="Feature on homepage" checked={p.featured} onChange={(v) => patch(i, { featured: v })} />
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded-lg border border-hair px-3 py-1.5 text-sm text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
              >
                Delete project
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
        + Add project
      </button>

      <SaveBar onSave={save} />
    </div>
  );
}

function GalleryField({
  images,
  onChange,
}: {
  images: string[];
  onChange: (g: string[]) => void;
}) {
  return (
    <Card title="Gallery (optional)">
      <div className="space-y-3">
        {images.map((src, i) => (
          <ImageField
            key={i}
            label={`Image ${i + 1}`}
            value={src}
            onChange={(v) => onChange(images.map((x, idx) => (idx === i ? v : x)))}
          />
        ))}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => onChange([...images, ""])} className="text-sm text-gold hover:underline">
            + Add image
          </button>
          {images.length > 0 ? (
            <button type="button" onClick={() => onChange(images.slice(0, -1))} className="text-sm text-muted hover:text-red-400">
              Remove last
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function ResultsEditor({
  results,
  onChange,
}: {
  results: { label: string; value: string }[];
  onChange: (r: { label: string; value: string }[]) => void;
}) {
  return (
    <Card title="Results (optional)">
      <div className="space-y-2">
        {results.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={r.value}
              onChange={(e) => onChange(results.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))}
              placeholder="+182%"
              className="w-28 rounded-lg border border-hair bg-card px-3 py-2 text-sm focus:border-gold/60"
            />
            <input
              value={r.label}
              onChange={(e) => onChange(results.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))}
              placeholder="organic traffic"
              className="flex-1 rounded-lg border border-hair bg-card px-3 py-2 text-sm focus:border-gold/60"
            />
            <button
              type="button"
              onClick={() => onChange(results.filter((_, idx) => idx !== i))}
              className="rounded-lg border border-hair px-3 text-muted hover:border-red-500/50 hover:text-red-400"
              aria-label="Remove result"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...results, { label: "", value: "" }])} className="mt-2 text-sm text-gold hover:underline">
        + Add result
      </button>
    </Card>
  );
}
