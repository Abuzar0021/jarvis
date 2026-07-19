import type { Metadata } from "next";
import Link from "next/link";
import { getIndustries, getSite } from "@/lib/content";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { CTABand } from "@/components/sections/CTABand";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Industries",
  alternates: { canonical: "/industries" },
  description:
    "Senior design and engineering tailored to your sector - restaurants, fitness, SaaS, e-commerce, professional services, and real estate.",
};

export default async function IndustriesPage() {
  const [industries, site] = await Promise.all([getIndustries(), getSite()]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: industries.map((ind, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/industries/${ind.slug}`,
      name: ind.name,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        eyebrow="Industries"
        title={<>Built for the way your sector works.</>}
        intro="We bring patterns that work - adapted to the specifics of your space, from the first impression to the systems behind it."
      />

      <Section>
        {industries.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {industries.map((ind, i) => (
              <Reveal key={ind.id} delay={(i % 3) * 0.06}>
                <Link
                  href={`/industries/${ind.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-hair bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_24px_60px_-30px_rgba(47,224,238,0.14)]"
                >
                  <h2 className="text-lg font-semibold tracking-tight">{ind.name}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{ind.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted transition-all duration-300 group-hover:gap-2.5 group-hover:text-gold">
                    Explore <span aria-hidden>→</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-muted">Industry pages are on the way.</p>
        )}
      </Section>

      <CTABand site={site} />
    </>
  );
}
