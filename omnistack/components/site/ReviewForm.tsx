"use client";

import { useEffect, useRef, useState } from "react";
import { Magnetic } from "@/components/motion/Magnetic";

/**
 * Eight fields is past the point where placeholder-only labels work. People
 * tab in, the placeholder vanishes, and they have lost the question. Every
 * label here is visible and stays visible.
 */
const LABEL =
  "mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-muted";

const FIELD =
  "w-full rounded-[3px] border border-hair bg-card px-4 py-3.5 text-left text-[15px] text-fg transition-colors placeholder:text-muted focus:border-gold";

const HINT = "mt-2 text-[12px] leading-[1.6] text-muted";

/** Ordered so the error summary reads in the same order as the form. */
const FIELDS: { key: string; id: string; label: string }[] = [
  { key: "name", id: "rv-name", label: "Your name" },
  { key: "role", id: "rv-role", label: "Your role" },
  { key: "company", id: "rv-company", label: "Company or sector" },
  { key: "projectScope", id: "rv-scope", label: "What we built" },
  { key: "quote", id: "rv-quote", label: "Your review" },
  { key: "email", id: "rv-email", label: "Your email" },
  { key: "consent", id: "rv-consent", label: "Permission to publish" },
];

type State = "idle" | "sending" | "done" | "error";

export function ReviewForm() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [projectScope, setProjectScope] = useState("");
  const [quote, setQuote] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, must stay empty
  const [nameWithheld, setNameWithheld] = useState(false);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  // Bumped on every failed submit so focus moves to the summary even when the
  // same field fails twice in a row.
  const [failures, setFailures] = useState(0);

  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (failures > 0) summaryRef.current?.focus();
  }, [failures]);

  const listed = FIELDS.filter((f) => errors[f.key]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setErrors({});
    setFormError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          company,
          projectScope,
          quote,
          email,
          website,
          nameWithheld,
          consent,
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
      setErrors(data.errors ?? {});
      setFormError(
        data.errors
          ? ""
          : data.error || "Something went wrong. Please try again.",
      );
      setFailures((n) => n + 1);
    } catch {
      setState("error");
      setFormError("Network error. Please try again.");
      setFailures((n) => n + 1);
    }
  }

  if (state === "done") {
    return (
      // role="status" alone would announce the result and leave the keyboard
      // on a submit button that no longer exists, so this takes focus too.
      <div
        role="status"
        tabIndex={-1}
        ref={(el) => {
          el?.focus();
        }}
        className="rounded-[3px] border border-gold/40 bg-gold-soft p-7 sm:p-9"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-bright">
          Review received
        </p>
        <h2 className="display-serif mt-4 text-[clamp(22px,2.6vw,32px)] text-fg">
          Thank you. It is with a person now.
        </h2>
        <p className="mt-4 max-w-[38em] text-[14px] leading-[1.7] text-fg/85">
          Nothing has been published. We read every review, check it against our
          own project records, and publish it word for word or not at all. If we
          need to confirm anything we will email you at the address you gave.
        </p>
      </div>
    );
  }

  const describedBy = (key: string, extra?: string) =>
    [errors[key] ? `${key}-error` : "", extra ?? ""].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div>
      {/* Exactly one live region for validation. Per-field messages are plain
          text tied to their input, so a screen reader hears one summary
          instead of a burst of six competing alerts. */}
      {listed.length > 0 || formError ? (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          className="mb-8 rounded-[3px] border border-gold/50 bg-gold-soft p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-bright">
            {listed.length > 0
              ? `${listed.length} ${listed.length === 1 ? "field needs" : "fields need"} attention`
              : "Could not send"}
          </p>
          {listed.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-[13px] leading-[1.6]">
              {listed.map((f) => (
                <li key={f.key}>
                  <a href={`#${f.id}`} className="text-fg/85 underline hover:text-gold">
                    {f.label}: {errors[f.key]}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] leading-[1.6] text-fg/85">{formError}</p>
          )}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        noValidate
        aria-busy={state === "sending"}
        className="max-w-[42em]"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="rv-name" className={LABEL}>
              Your name
            </label>
            <input
              id="rv-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              aria-invalid={errors.name ? "true" : undefined}
              aria-describedby={describedBy("name", "rv-name-hint")}
              className={FIELD}
            />
            {errors.name ? (
              <p id="name-error" className="mt-2 text-[12px] text-gold-bright">
                {errors.name}
              </p>
            ) : null}
            <p id="rv-name-hint" className={HINT}>
              We need this to check the review is real. You can still ask us to
              publish it without your name, further down.
            </p>
          </div>

          <div>
            <label htmlFor="rv-role" className={LABEL}>
              Your role
            </label>
            <input
              id="rv-role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Founder, Owner, Marketing Lead"
              aria-invalid={errors.role ? "true" : undefined}
              aria-describedby={describedBy("role")}
              className={FIELD}
            />
            {errors.role ? (
              <p id="role-error" className="mt-2 text-[12px] text-gold-bright">
                {errors.role}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="rv-company" className={LABEL}>
            Company or sector
          </label>
          <input
            id="rv-company"
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            autoComplete="organization"
            placeholder="Northside Dental, or Dublin dental practice"
            aria-invalid={errors.company ? "true" : undefined}
            aria-describedby={describedBy("company", "rv-company-hint")}
            className={FIELD}
          />
          {errors.company ? (
            <p id="company-error" className="mt-2 text-[12px] text-gold-bright">
              {errors.company}
            </p>
          ) : null}
          <p id="rv-company-hint" className={HINT}>
            A sector is fine if you would rather not name the business.
          </p>
        </div>

        <div className="mt-5">
          <label htmlFor="rv-scope" className={LABEL}>
            What we built
          </label>
          <input
            id="rv-scope"
            name="projectScope"
            value={projectScope}
            onChange={(e) => setProjectScope(e.target.value)}
            placeholder="Five page site, online booking, handover"
            aria-invalid={errors.projectScope ? "true" : undefined}
            aria-describedby={describedBy("projectScope", "rv-scope-hint")}
            className={FIELD}
          />
          {errors.projectScope ? (
            <p id="projectScope-error" className="mt-2 text-[12px] text-gold-bright">
              {errors.projectScope}
            </p>
          ) : null}
          <p id="rv-scope-hint" className={HINT}>
            Published alongside your review. A review nobody can place against a
            real piece of work is not worth reading.
          </p>
        </div>

        <div className="mt-5">
          <label htmlFor="rv-quote" className={LABEL}>
            Your review
          </label>
          <textarea
            id="rv-quote"
            name="quote"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={7}
            placeholder="What you needed, how the work went, and what changed afterwards."
            aria-invalid={errors.quote ? "true" : undefined}
            aria-describedby={describedBy("quote", "rv-quote-hint")}
            className={`${FIELD} resize-y leading-[1.7]`}
          />
          {errors.quote ? (
            <p id="quote-error" className="mt-2 text-[12px] text-gold-bright">
              {errors.quote}
            </p>
          ) : null}
          <p id="rv-quote-hint" className={HINT}>
            Between 40 and 1200 characters. There is nothing to rate out of
            five: we publish what you write, not a score.
          </p>
        </div>

        <div className="mt-5">
          <label htmlFor="rv-email" className={LABEL}>
            Your email
          </label>
          <input
            id="rv-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby={describedBy("email", "rv-email-hint")}
            className={FIELD}
          />
          {errors.email ? (
            <p id="email-error" className="mt-2 text-[12px] text-gold-bright">
              {errors.email}
            </p>
          ) : null}
          <p id="rv-email-hint" className={HINT}>
            Kept private and never published. It is only used to confirm the
            review came from you.
          </p>
        </div>

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

        <label className="mt-7 flex cursor-pointer items-start gap-3.5 rounded-[3px] border border-hair bg-card p-4">
          <input
            type="checkbox"
            checked={nameWithheld}
            onChange={(e) => setNameWithheld(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
          />
          <span className="text-[14px] leading-[1.6] text-fg/85">
            Publish this without my name.
            <span className="mt-1 block text-[12px] text-muted">
              Your role, company or sector and the project scope still appear,
              and the card says the name was withheld at your request.
            </span>
          </span>
        </label>

        <div className="mt-7 rounded-[3px] border border-hair bg-card-2 p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
            What happens next
          </p>
          <ol className="mt-4 space-y-3 text-[13.5px] leading-[1.65] text-fg/85">
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-[7px] block h-[7px] w-[7px] shrink-0 rotate-45 border border-gold"
              />
              <span>
                Your review is stored as pending. Nothing appears on the site
                yet, and nothing is published automatically.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-[7px] block h-[7px] w-[7px] shrink-0 rotate-45 border border-gold"
              />
              <span>
                We check it against our own project records. If we can confirm
                your email or the handover, the published card is marked
                verified. If we cannot, it stays unmarked and the page says so.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-[7px] block h-[7px] w-[7px] shrink-0 rotate-45 border border-gold"
              />
              <span>
                If we publish it, we publish it word for word. We do not edit
                reviews for tone, we do not pay for them, and we do not hide the
                unfavourable ones. Ask us at any time and we will take yours
                down.
              </span>
            </li>
          </ol>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3.5">
          <input
            id="rv-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            aria-invalid={errors.consent ? "true" : undefined}
            aria-describedby={describedBy("consent")}
            className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
          />
          <span className="text-[14px] leading-[1.6] text-fg/85">
            I am a real client, this review is my own honest experience, and I
            agree to it being published on this site with the attribution shown
            above.
          </span>
        </label>
        {errors.consent ? (
          <p id="consent-error" className="mt-2 text-[12px] text-gold-bright">
            {errors.consent}
          </p>
        ) : null}

        <div className="mt-8">
          <Magnetic>
            <button
              type="submit"
              disabled={state === "sending"}
              className="inline-flex items-center gap-3 rounded-full bg-gold-bright px-[34px] py-[17px] text-[13px] font-semibold uppercase tracking-[0.08em] text-page shadow-[0_16px_60px_rgba(233,200,121,.34)] transition-colors hover:bg-fg disabled:opacity-60"
            >
              {state === "sending" ? "Sending" : "Submit for review"}
              <span aria-hidden className="text-[17px] leading-none">
                &rarr;
              </span>
            </button>
          </Magnetic>
        </div>
      </form>
    </div>
  );
}
