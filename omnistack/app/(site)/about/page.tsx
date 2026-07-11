import type { Metadata } from "next";
import { getSite } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/site/PageHeader";
import { ValuePillars } from "@/components/sections/ValuePillars";
import { Stats } from "@/components/sections/Stats";
import { CTABand } from "@/components/sections/CTABand";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About",
  alternates: { canonical: "/about" },
  description:
    "One accountable team that owns brand, design, engineering, and AI - based in Dublin and Jakarta.",
};

export default async function AboutPage() {
  const site = await getSite();
  const paragraphs = site.about.story.split("\n\n").filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow="About"
        title={site.about.heading || site.tagline}
        intro={site.description}
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="space-y-5 text-lg leading-relaxed text-muted">
              {paragraphs.map((p, i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <p>{p}</p>
                </Reveal>
              ))}
            </div>
          </div>
          <aside className="lg:col-span-5">
            <Reveal>
              <div className="rounded-2xl border border-hair bg-card p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Founder</p>
                <p className="mt-4 text-xl font-semibold tracking-tight">{site.founder}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">
                  Still reviews every project that ships. The person who scopes your work is the
                  person who builds it.
                </p>
                <div className="mt-6 border-t border-hair pt-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Where we work</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted">
                    {site.contact.locations.map((l) => (
                      <li key={`${l.city}-${l.country}`}>
                        {l.city}, {l.country}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          </aside>
        </div>
      </Section>

      <ValuePillars pillars={site.valuePillars} />
      <Stats stats={site.stats} />
      <CTABand site={site} />
    </>
  );
}
