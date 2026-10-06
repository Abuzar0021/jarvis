"use client";

import { useState } from "react";
import type { Testimonial, TestimonialStatus } from "@/lib/types";
import { canPublish } from "@/lib/utils";
import { Field, SelectField, TextArea, Toggle, SaveBar } from "./fields";

const blank = (): Testimonial => ({
  id: "",
  quote: "",
  authorName: "",
  authorRole: "",
  company: "",
  featured: false,
  status: "pending",
  projectScope: "",
  deliveredOn: "",
  verifiedBy: "",
  nameWithheld: false,
  contactEmail: "",
  submittedAt: "",
  consentAt: "",
});

const STATUS_OPTIONS: { value: TestimonialStatus; label: string }[] = [
  { value: "pending", label: "Pending (not on the site)" },
  { value: "approved", label: "Approved (live)" },
  { value: "rejected", label: "Rejected (kept, never shown)" },
];

const VERIFIED_OPTIONS = [
  { value: "", label: "Not verified" },
  { value: "email", label: "Email confirmed" },
  { value: "handover", label: "Verified at handover" },
];

const STATUS_STYLE: Record<TestimonialStatus, string> = {
  pending: "border-gold/50 bg-gold-soft text-gold",
  approved: "border-hair bg-card text-fg/90",
  rejected: "border-hair bg-card text-muted",
};

function shortDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IE");
}

export function TestimonialsEditor({ initial }: { initial: Testimonial[] }) {
  const [items, setItems] = useState<Testimonial[]>(initial);
  const pending = items.filter((t) => t.status === "pending").length;

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
        {pending > 0
          ? `${pending} review${pending === 1 ? "" : "s"} waiting on you. Nothing reaches the site until you set it to Approved.`
          : "Nothing is waiting. Submissions from /reviews/new land here as Pending and stay off the site until approved."}
      </div>

      {items.map((t, i) => {
        const publishable = canPublish(t);
        return (
          <div key={t.id || i} className="space-y-4 rounded-2xl border border-hair bg-surface p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${STATUS_STYLE[t.status]}`}
              >
                {t.status}
              </span>
              {t.submittedAt ? (
                <span className="text-xs text-muted">
                  Submitted {shortDate(t.submittedAt)}
                </span>
              ) : null}
              {t.contactEmail ? (
                <span className="text-xs text-muted">
                  Private contact: {t.contactEmail}
                </span>
              ) : null}
            </div>

            <TextArea label="Quote" value={t.quote} onChange={(v) => patch(i, { quote: v })} rows={4} />

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Author name" value={t.authorName} onChange={(v) => patch(i, { authorName: v })} hint="Optional" />
              <Field label="Role" value={t.authorRole} onChange={(v) => patch(i, { authorRole: v })} placeholder="Founder" />
              <Field label="Company" value={t.company} onChange={(v) => patch(i, { company: v })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Project scope"
                value={t.projectScope}
                onChange={(v) => patch(i, { projectScope: v })}
                placeholder="Five page site, booking flow"
                hint="Required before approval"
              />
              <Field
                label="Delivered"
                value={t.deliveredOn}
                onChange={(v) => patch(i, { deliveredOn: v })}
                placeholder="2026-03"
                hint="YYYY-MM, optional"
                mono
              />
              <SelectField
                label="Verified by"
                value={t.verifiedBy}
                onChange={(v) => patch(i, { verifiedBy: v as Testimonial["verifiedBy"] })}
                options={VERIFIED_OPTIONS}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Status"
                value={t.status}
                onChange={(v) => patch(i, { status: v as TestimonialStatus })}
                options={
                  // The attribution ladder: a quote with no identity or no
                  // scope is not publishable, so Approved is not offered. It
                  // stays listed for a record that is already approved, so the
                  // select never shows a value it does not contain, and the
                  // save is refused server side instead.
                  publishable || t.status === "approved"
                    ? STATUS_OPTIONS
                    : STATUS_OPTIONS.filter((o) => o.value !== "approved")
                }
              />
              <div className="flex items-end">
                {!publishable ? (
                  <p className="text-sm text-muted">
                    Cannot be approved yet: it needs a name, role or company,
                    and a project scope.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-4">
              <div className="flex flex-wrap items-center gap-6">
                <Toggle label="Featured (large pull-quote)" checked={t.featured} onChange={(v) => patch(i, { featured: v })} />
                <Toggle label="Publish without the name" checked={t.nameWithheld} onChange={(v) => patch(i, { nameWithheld: v })} />
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
        );
      })}

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
