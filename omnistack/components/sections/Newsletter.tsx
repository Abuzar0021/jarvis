"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";

export function Newsletter({ title, body }: { title: string; body: string }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <section className="border-t border-hair py-16 sm:py-20">
      <Container>
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-muted">{body}</p>
          </div>
          {state === "done" ? (
            <p className="flex items-center gap-2 text-gold" role="status">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gold/50">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M2.5 6.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              You&rsquo;re on the list. Thank you.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="w-full max-w-md">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  aria-label="Email address"
                  className="h-12 flex-1 rounded-full border border-hair bg-card px-5 text-sm text-fg placeholder:text-muted/60 focus:border-gold/50"
                />
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="hidden"
                  aria-hidden
                />
                <button
                  type="submit"
                  disabled={state === "loading"}
                  className="h-12 rounded-full border border-gold/60 bg-gold-soft px-6 text-sm font-medium text-fg transition-all hover:border-gold hover:bg-gold/15 disabled:opacity-50"
                >
                  {state === "loading" ? "Subscribing…" : "Subscribe"}
                </button>
              </div>
              {state === "error" ? (
                <p className="mt-2 text-sm text-red-400">Something went wrong. Please try again.</p>
              ) : null}
            </form>
          )}
        </div>
      </Container>
    </section>
  );
}
