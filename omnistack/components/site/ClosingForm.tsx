"use client";

import { useState } from "react";
import { Magnetic } from "@/components/motion/Magnetic";

/**
 * The closing CTA, as a form rather than a mailto.
 *
 * The design puts the email address in the primary button. That looks good and
 * converts badly: a mailto has no tracking, no autoresponse, and silently dies
 * for anyone without a mail client wired up. The address is kept directly
 * underneath for people who would rather write their own email.
 */
export function ClosingForm({ email }: { email: string }) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, must stay empty
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: from,
          message,
          website,
          source: "homepage-cta",
          page: window.location.pathname,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        errors?: Record<string, string>;
      };
      if (data.ok) {
        setState("done");
        return;
      }
      setState("error");
      setError(
        data.errors?.message ??
          data.errors?.email ??
          data.errors?.name ??
          data.error ??
          "Something went wrong. Please try again.",
      );
    } catch {
      setState("error");
      setError("Network error. Please try again.");
    }
  };

  if (state === "done") {
    return (
      <div
        role="status"
        className="relative mx-auto mt-[clamp(32px,5vh,50px)] max-w-[30em] rounded-[3px] border border-gold/40 bg-gold/5 p-7"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-bright">
          Message sent
        </p>
        <p className="mt-3 text-[15px] leading-[1.6] text-muted">
          That is with me. You get a straight answer on cost, timeline and whether
          I am the right person for it, within one business day.
        </p>
      </div>
    );
  }

  const field =
    "w-full rounded-[3px] border border-hair bg-card px-4 py-3.5 text-left text-[15px] text-fg transition-colors placeholder:text-muted focus:border-gold";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="relative mx-auto mt-[clamp(32px,5vh,50px)] w-full max-w-[30em] text-left"
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div>
          <label htmlFor="cta-name" className="sr-only">
            Your name
          </label>
          <input
            id="cta-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Your name"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="cta-email" className="sr-only">
            Your email
          </label>
          <input
            id="cta-email"
            name="email"
            type="email"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@company.com"
            className={field}
          />
        </div>
      </div>

      <label htmlFor="cta-message" className="sr-only">
        About your business
      </label>
      <textarea
        id="cta-message"
        name="message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        rows={3}
        placeholder="One paragraph about your business, and what the site needs to do."
        className={`${field} mt-2.5 resize-none leading-[1.6]`}
      />

      {/* Honeypot. Real people never fill this. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
      />

      <div className="mt-3.5 flex justify-center">
        <Magnetic>
          <button
            type="submit"
            disabled={state === "sending"}
            className="inline-flex items-center gap-3 rounded-full bg-gold-bright px-[38px] py-[19px] text-[clamp(13px,1.1vw,15px)] font-semibold uppercase tracking-[0.08em] text-page shadow-[0_16px_60px_rgba(233,200,121,.34)] transition-colors hover:bg-fg disabled:opacity-60"
          >
            {state === "sending" ? "Sending" : "Start a build"}
            <span aria-hidden className="text-[17px] leading-none">
              &rarr;
            </span>
          </button>
        </Magnetic>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-center text-[12px] text-gold-bright">
          {error}
        </p>
      ) : null}

      <p className="mt-4 text-center text-[12px] text-muted">
        Or email directly:{" "}
        <a href={`mailto:${email}`} className="text-gold hover:text-gold-bright">
          {email}
        </a>
      </p>
    </form>
  );
}
