import type { Metadata } from "next";
import { getFaqs, getSite } from "@/lib/content";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { FAQ } from "@/components/sections/FAQ";
import { CTABand } from "@/components/sections/CTABand";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pricing",
  alternates: { canonical: "/pricing" },
  description:
    "Clear scope, clear timeline, clear price. Choose the engagement model that fits - and get a fixed quote.",
};

export default async function PricingPage() {
  const [site, faqs] = await Promise.all([getSite(), getFaqs()]);
  const { pricing } = site;

  return (
    <>
      <PageHeader eyebrow="Pricing" title={<>Clear scope, clear price.</>} intro={pricing.intro} />

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {pricing.models.map((m, i) => (
            <Reveal key={m.name} delay={(i % 3) * 0.07}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-3xl border p-8 transition-colors",
                  m.highlighted
                    ? "border-gold/50 bg-card shadow-[0_30px_80px_-40px_rgba(47,224,238,0.2)]"
                    : "border-hair bg-card",
                )}
              >
                {m.highlighted ? (
                  <span className="absolute right-6 top-6 rounded-full border border-gold/50 bg-gold-soft px-3 py-1 text-[11px] uppercase tracking-wide text-gold">
                    Most popular
                  </span>
                ) : null}
                <h2 className="text-xl font-semibold tracking-tight">{m.name}</h2>
                <p className="mt-2 text-sm text-muted">{m.tagline}</p>
                <p className="mt-6 font-mono text-2xl font-semibold text-gold">{m.priceLabel}</p>

                <ul className="mt-6 flex-1 space-y-3">
                  {m.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[15px]">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                          <path d="M2.5 6.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="text-muted">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Button
                    href="/contact"
                    variant={m.highlighted ? "primary" : "secondary"}
                    className="w-full"
                    withArrow
                  >
                    Get a quote
                  </Button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {pricing.note ? (
          <Reveal>
            <p className="mt-8 text-center text-sm text-muted">{pricing.note}</p>
          </Reveal>
        ) : null}
      </Section>

      <FAQ faqs={faqs} />
      <CTABand site={site} />
    </>
  );
}
