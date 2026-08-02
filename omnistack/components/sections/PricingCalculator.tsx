"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TiltCard } from "@/components/motion/TiltCard";
import { Reveal } from "@/components/motion/Reveal";
import { useSafeReducedMotion } from "@/components/motion/useSafeReducedMotion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Pricing model. Every number the calculator can produce comes from
   here, so rates are changed in one place.
   ------------------------------------------------------------------ */

type BuildType = "landing" | "business" | "ecom" | "app";
type PageBand = "p1" | "p2" | "p3" | "p4";
type Feature = "cms" | "booking" | "payments" | "accounts" | "multi" | "motion";
type Speed = "flex" | "normal" | "rush";

const BASE: Record<BuildType, number> = {
  landing: 900,
  business: 2200,
  ecom: 4200,
  app: 6500,
};
const PAGE_ADD: Record<PageBand, number> = { p1: 0, p2: 700, p3: 1600, p4: 2900 };
const FEATURE_ADD: Record<Feature, number> = {
  cms: 600,
  booking: 750,
  payments: 900,
  accounts: 1400,
  multi: 800,
  motion: 1100,
};
const SPEED_MULTIPLIER: Record<Speed, number> = { flex: 0.92, normal: 1, rush: 1.28 };
/** Range shown around the midpoint, plus and minus. */
const SPREAD = 0.15;

type Choice<K extends string> = { key: K; label: string; summary?: string };

const BUILD_TYPES: Choice<BuildType>[] = [
  { key: "landing", label: "Landing page" },
  { key: "business", label: "Business site" },
  { key: "ecom", label: "Online store" },
  { key: "app", label: "Web app" },
];

const PAGE_BANDS: Choice<PageBand>[] = [
  { key: "p1", label: "1 to 5", summary: "1 to 5 pages" },
  { key: "p2", label: "6 to 15", summary: "6 to 15 pages" },
  { key: "p3", label: "16 to 30", summary: "16 to 30 pages" },
  { key: "p4", label: "30+", summary: "30+ pages" },
];

const FEATURES: Choice<Feature>[] = [
  { key: "cms", label: "Edit content yourself", summary: "CMS" },
  { key: "booking", label: "Take bookings", summary: "Bookings" },
  { key: "payments", label: "Take payments", summary: "Payments" },
  { key: "accounts", label: "User accounts", summary: "Accounts" },
  { key: "multi", label: "Multiple languages", summary: "Multi-language" },
  { key: "motion", label: "Advanced animation", summary: "Animation" },
];

const SPEEDS: Choice<Speed>[] = [
  { key: "flex", label: "I'm flexible", summary: "Flexible" },
  { key: "normal", label: "Next 4 to 6 weeks", summary: "4 to 6 weeks" },
  { key: "rush", label: "Under 3 weeks", summary: "Under 3 weeks" },
];

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function summaryOf<K extends string>(list: Choice<K>[], key: K): string {
  const hit = list.find((o) => o.key === key);
  return hit ? (hit.summary ?? hit.label) : "";
}

/**
 * The design's `animateNum`: numbers ease toward their new target over ~420ms
 * so a changed selection reads as weight rather than a flicker. Holding the
 * live value in a ref means a change mid flight continues from where the
 * previous run left off instead of snapping back.
 */
function useCountUp(target: number, reduce: boolean): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    // Reduced motion reads `target` straight out of the return below, so the
    // ref only needs resyncing here, never a synchronous setState.
    if (reduce) {
      current.current = target;
      return;
    }
    const from = current.current;
    if (from === target) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min((now - t0) / 420, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      current.current = from + (target - from) * eased;
      setValue(current.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);

  return reduce ? target : value;
}

const SLIDER_CLASS = cn(
  "h-[2px] w-full cursor-pointer appearance-none bg-hair outline-none",
  "[&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px]",
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-page",
  "[&::-webkit-slider-thumb]:bg-gold",
  "[&::-webkit-slider-thumb]:shadow-[0_0_0_1px_var(--color-gold)]",
  "[&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px]",
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px]",
  "[&::-moz-range-thumb]:border-page [&::-moz-range-thumb]:bg-gold",
);

function Opt({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-[2px] border px-5 py-3 text-left text-[13.5px] transition-colors duration-300 ease-snap",
        pressed
          ? "border-gold bg-gold-soft text-gold-bright"
          : "border-hair-soft text-fg hover:border-hair hover:bg-gold-soft",
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-9">
      <legend className="mb-3.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </fieldset>
  );
}

function BreakRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2 text-[12.5px] text-muted">
      <span>{label}</span>
      <span
        className={cn(
          "text-right font-mono text-[12px]",
          accent ? "text-gold" : "text-fg",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Section 2: pick a scope, see the range OmniStack would quote for it. */
/**
 * Turns a configured estimate into a lead. Everything the visitor already told
 * the calculator is posted with it, so the enquiry arrives qualified instead of
 * as a blank "get in touch". Posts to the existing /api/contact, which handles
 * rate limiting, validation, storage and the notification email.
 */
function EstimateCapture({
  service,
  budget,
  summary,
}: {
  service: string;
  budget: string;
  summary: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
          email,
          website,
          service,
          budget,
          message: summary,
          source: "pricing-calculator",
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
        className="mt-6 rounded-[2px] border border-gold/40 bg-gold/5 p-5 text-center"
      >
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-gold-bright">
          Estimate sent
        </p>
        <p className="mt-2.5 text-[12.5px] leading-[1.6] text-muted">
          Your configuration is on its way. You get a straight answer within one
          business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6" noValidate>
      <label htmlFor="est-name" className="sr-only">
        Your name
      </label>
      <input
        id="est-name"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoComplete="name"
        placeholder="Your name"
        className="h-12 w-full rounded-[2px] border border-hair bg-page px-4 text-sm text-fg outline-none transition-colors placeholder:text-muted focus:border-gold"
      />
      <label htmlFor="est-email" className="sr-only">
        Your email
      </label>
      <input
        id="est-email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        placeholder="you@company.com"
        className="mt-2.5 h-12 w-full rounded-[2px] border border-hair bg-page px-4 text-sm text-fg outline-none transition-colors placeholder:text-muted focus:border-gold"
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
      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-3 h-12 w-full rounded-full bg-gold text-[13px] font-semibold uppercase tracking-[0.08em] text-page transition-colors hover:bg-gold-bright disabled:opacity-60"
      >
        {state === "sending" ? "Sending" : "Send me this estimate"}
      </button>
      {error ? (
        <p role="alert" className="mt-2.5 text-center text-[11px] text-gold-bright">
          {error}
        </p>
      ) : null}
      <p className="mt-3.5 text-center text-[11px] leading-[1.5] text-muted">
        No obligation. A 20 minute call confirms scope and locks the final number.
      </p>
    </form>
  );
}

export function PricingCalculator() {
  const reduce = useSafeReducedMotion();
  const [buildType, setBuildType] = useState<BuildType>("business");
  const [pages, setPages] = useState<PageBand>("p1");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [speed, setSpeed] = useState<Speed>("normal");

  const mid =
    (BASE[buildType] +
      PAGE_ADD[pages] +
      features.reduce((sum, f) => sum + FEATURE_ADD[f], 0)) *
    SPEED_MULTIPLIER[speed];

  const lo = useCountUp(mid * (1 - SPREAD), reduce);
  const hi = useCountUp(mid * (1 + SPREAD), reduce);

  const toggleFeature = (key: Feature) =>
    setFeatures((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
    );

  const featureSummary = features.length
    ? FEATURES.filter((f) => features.includes(f.key))
        .map((f) => f.summary ?? f.label)
        .join(", ")
    : "None";

  // Built from `mid`, not the animated counters, so a lead sent mid-count-up
  // still carries the settled number.
  const estimateRange = `${money(mid * (1 - SPREAD))} to ${money(mid * (1 + SPREAD))}`;
  const estimateSummary = [
    "Estimate configured on the pricing calculator.",
    `Build type: ${summaryOf(BUILD_TYPES, buildType)}`,
    `Scale: ${summaryOf(PAGE_BANDS, pages)}`,
    `Added capability: ${featureSummary}`,
    `Timeline: ${summaryOf(SPEEDS, speed)}`,
    `Estimated range: ${estimateRange}`,
  ].join("\n");

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
      <Reveal>
        <div>
          <Field label="What are you building?">
            {BUILD_TYPES.map((o) => (
              <Opt
                key={o.key}
                pressed={buildType === o.key}
                onClick={() => setBuildType(o.key)}
              >
                {o.label}
              </Opt>
            ))}
          </Field>

          <Field label="Roughly how many pages?">
            {PAGE_BANDS.map((o) => (
              <Opt key={o.key} pressed={pages === o.key} onClick={() => setPages(o.key)}>
                {o.label}
              </Opt>
            ))}
          </Field>

          <Field label="What does it need to do? Pick any.">
            {FEATURES.map((o) => (
              <Opt
                key={o.key}
                pressed={features.includes(o.key)}
                onClick={() => toggleFeature(o.key)}
              >
                {o.label}
              </Opt>
            ))}
          </Field>

          <Field label="When do you need it live?">
            {SPEEDS.map((o) => (
              <Opt key={o.key} pressed={speed === o.key} onClick={() => setSpeed(o.key)}>
                {o.label}
              </Opt>
            ))}
          </Field>
        </div>
      </Reveal>

      <Reveal delay={0.16}>
        <div className="rounded-[4px] border border-hair bg-card p-8 lg:sticky lg:top-24">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
            Estimated range
          </p>
          <p
            aria-live="polite"
            className="display-serif mt-3.5 text-[clamp(30px,4vw,44px)] text-fg"
          >
            {money(lo)}
            <span className="px-2 align-middle text-[0.5em] text-muted">to</span>
            {money(hi)}
          </p>
          <p className="mt-3.5 text-[12.5px] leading-[1.6] text-muted">
            One time. You own the code, the content, and the hosting account when it
            ships.
          </p>

          <div className="mt-6 border-t border-hair-soft pt-5">
            <BreakRow label="Build type" value={summaryOf(BUILD_TYPES, buildType)} />
            <BreakRow label="Scale" value={summaryOf(PAGE_BANDS, pages)} />
            <BreakRow label="Added capability" value={featureSummary} />
            <BreakRow label="Timeline" value={summaryOf(SPEEDS, speed)} accent />
          </div>

          <EstimateCapture
            service={summaryOf(BUILD_TYPES, buildType)}
            budget={estimateRange}
            summary={estimateSummary}
          />
        </div>
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------
   Section 3: retainer tiers. The payback line under each price is
   driven by the "what is a customer worth" slider.
   ------------------------------------------------------------------ */

type Tier = {
  name: string;
  audience: string;
  price: number;
  featured?: boolean;
  points: string[];
};

const TIERS: Tier[] = [
  {
    name: "Foundation",
    audience: "For a site that's live and needs to stop being invisible.",
    price: 249,
    points: [
      "1 optimised page or article written and published",
      "Technical health check: speed, crawl, broken links",
      "Google Business Profile kept current",
      "Search Console monitoring",
      "Monthly report in plain English",
    ],
  },
  {
    name: "Growth",
    audience: "For businesses actively competing for local or niche search.",
    price: 499,
    featured: true,
    points: [
      "3 optimised pages or articles a month",
      "Everything in Foundation",
      "Local SEO and review strategy",
      "Backlink outreach with real placements, no directories",
      "Keyword expansion as you rank",
      "Competitor position tracking",
    ],
  },
  {
    name: "Compound",
    audience: "For businesses where search is the main channel that has to perform.",
    price: 899,
    points: [
      "6 optimised pages or articles a month",
      "Everything in Growth",
      "Conversion testing on key pages",
      "Quarterly strategy call",
      "Priority turnaround on requests",
      "Landing pages built as campaigns need them",
    ],
  },
];

export function RetainerTiers() {
  const [customerValue, setCustomerValue] = useState(150);

  return (
    <>
      <div className="grid gap-[clamp(14px,1.6vw,22px)] lg:grid-cols-3">
        {TIERS.map((tier, i) => (
          <Reveal key={tier.name} delay={i * 0.09} className="h-full">
            <TiltCard className="flex h-full flex-col p-8">
              {tier.featured ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gold"
                />
              ) : null}

              <h3 className="relative font-serif text-[22px] font-normal text-fg">
                {tier.name}
              </h3>
              <p className="relative mt-1.5 text-[12px] leading-[1.5] text-muted lg:min-h-[34px]">
                {tier.audience}
              </p>

              <p className="relative mt-5 flex items-baseline gap-1">
                <span
                  className={cn(
                    "display-serif text-[44px]",
                    tier.featured ? "text-gold" : "text-fg",
                  )}
                >
                  ${tier.price}
                </span>
                <span className="text-[12px] tracking-[0.06em] text-muted">/month</span>
              </p>

              <p className="relative mt-3 border-y border-hair-soft py-2.5 text-[12px] leading-[1.5] text-gold-bright">
                Pays for itself at{" "}
                <b className="font-medium">
                  {Math.max(1, Math.ceil(tier.price / customerValue))} new customers
                </b>{" "}
                a month
              </p>

              <ul className="relative my-5 flex-1 space-y-0.5">
                {tier.points.map((p) => (
                  <li
                    key={p}
                    className="relative py-2 pl-5 text-[13.5px] leading-[1.5] text-muted"
                  >
                    <span aria-hidden className="absolute left-0 top-[9px] text-[10px] text-gold">
                      &#10022;
                    </span>
                    {p}
                  </li>
                ))}
              </ul>

              <div className="relative">
                <Button
                  href="/contact"
                  variant={tier.featured ? "primary" : "secondary"}
                  className="w-full"
                >
                  Start {tier.name}
                </Button>
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.12}>
        <div className="mt-11 grid items-center gap-7 rounded-[4px] border border-hair bg-card px-8 py-7 lg:grid-cols-[1fr_300px] lg:gap-12">
          <div>
            <label
              htmlFor="customer-value"
              className="mb-3.5 block font-mono text-[12px] uppercase tracking-[0.12em] text-muted"
            >
              What&apos;s one new customer worth to you?
            </label>
            <input
              id="customer-value"
              type="range"
              min={50}
              max={2000}
              step={50}
              value={customerValue}
              onChange={(e) => setCustomerValue(Number(e.target.value))}
              className={SLIDER_CLASS}
            />
          </div>
          <div>
            <p className="display-serif text-[30px] text-gold" aria-live="polite">
              {money(customerValue)}
            </p>
            <p className="mt-2 text-[12.5px] leading-[1.6] text-muted">
              Average value of a single new customer. The tiers above update to show how
              many you&apos;d need for each to pay for itself.
            </p>
          </div>
        </div>
      </Reveal>
    </>
  );
}
