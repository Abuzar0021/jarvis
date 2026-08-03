"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BUDGETS = ["Not sure yet", "Under €2k", "€2k-€5k", "€5k-€10k", "€10k+"];

const inputCls =
  "h-12 w-full rounded-xl border border-hair bg-card px-4 text-sm text-fg placeholder:text-muted/60 transition-colors focus:border-gold/60";

export function ContactForm({
  services,
  source = "contact",
}: {
  services: string[];
  source?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = Object.fromEntries(
      Array.from(fd.entries()).map(([k, v]) => [k, String(v)]),
    );
    payload.source = source;
    if (typeof window !== "undefined") {
      payload.page = window.location.pathname;
      const sp = new URLSearchParams(window.location.search);
      payload.utm = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]
        .map((k) => {
          const val = sp.get(k);
          return val ? `${k.replace("utm_", "")}=${val}` : null;
        })
        .filter(Boolean)
        .join("&");
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push("/thank-you");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data?.errors) setErrors(data.errors);
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm text-muted">Name</label>
          <input id="name" name="name" required className={inputCls} placeholder="Your name" />
          {errors.name ? <p className="mt-1 text-xs text-red-400">{errors.name}</p> : null}
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm text-muted">Email</label>
          <input id="email" name="email" type="email" required className={inputCls} placeholder="you@company.com" />
          {errors.email ? <p className="mt-1 text-xs text-red-400">{errors.email}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className="mb-1.5 block text-sm text-muted">Company <span className="text-muted/50">(optional)</span></label>
          <input id="company" name="company" className={inputCls} placeholder="Company" />
        </div>
        <div>
          <label htmlFor="service" className="mb-1.5 block text-sm text-muted">What do you need?</label>
          <select id="service" name="service" defaultValue="" className={inputCls}>
            <option value="">Select a service</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="Something else">Something else</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="budget" className="mb-1.5 block text-sm text-muted">Budget</label>
        <select id="budget" name="budget" defaultValue="" className={inputCls}>
          <option value="">Select a range</option>
          {BUDGETS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm text-muted">Project details</label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full rounded-xl border border-hair bg-card px-4 py-3 text-sm text-fg placeholder:text-muted/60 transition-colors focus:border-gold/60"
          placeholder="Tell us what you're building, your timeline, and what success looks like."
        />
        {errors.message ? <p className="mt-1 text-xs text-red-400">{errors.message}</p> : null}
      </div>

      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <button
        type="submit"
        disabled={status === "loading"}
        className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-gold/60 bg-gold-soft px-6 text-sm font-medium text-fg transition-all hover:border-gold hover:bg-gold/15 disabled:opacity-50 sm:w-auto"
      >
        {status === "loading" ? "Sending…" : "Send your requirements"}
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
      </button>

      {status === "error" ? (
        <p className="text-sm text-red-400" role="alert">
          Something went wrong sending your message. Please email us directly or try again.
        </p>
      ) : null}
    </form>
  );
}
