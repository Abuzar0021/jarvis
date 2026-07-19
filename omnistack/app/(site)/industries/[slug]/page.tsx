import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getIndustry, getServices, getSite } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Section";
import { Prose } from "@/components/ui/Prose";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { CTABand } from "@/components/sections/CTABand";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ind = await getIndustry(slug);
  if (!ind) return { title: "Industry" };
  return {
    title: ind.seoTitle || `${ind.name}`,
    description: ind.seoDescription || ind.summary,
    alternates: { canonical: `/industries/${ind.slug}` },
    openGraph: { title: ind.seoTitle || ind.name, description: ind.seoDescription || ind.summary },
  };
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [ind, site, services] = await Promise.all([
    getIndustry(slug),
    getSite(),
    getServices(),
  ]);
  if (!ind) notFound();

  const tailored = ind.services
    .map((s) => services.find((svc) => svc.slug === s || svc.name === s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: `Web development for ${ind.name}`,
    description: ind.seoDescription || ind.summary,
    provider: { "@type": "Organization", name: site.brand },
    areaServed: site.contact.locations.map((l) => l.country),
    url: `${SITE_URL}/industries/${ind.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative isolate overflow-hidden border-b border-hair">
        <div className="gold-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-full opacity-70" aria-hidden />
        <Container className="pb-12 pt-14 sm:pt-16">
          <Reveal>
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Industries", href: "/industries" },
                { label: ind.name, href: `/industries/${ind.slug}` },
              ]}
            />
          </Reveal>
          <Reveal delay={0.05}>
            <div className="mt-6">
              <Eyebrow>Industry</Eyebrow>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-[3.25rem] md:leading-[1.05]">
              {ind.name}
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{ind.summary}</p>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/book" variant="primary" withArrow>Book a Call</Button>
              <Button href="/work" variant="secondary">See our work</Button>
            </div>
          </Reveal>
        </Container>
      </section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            {ind.painPoints.length > 0 ? (
              <Reveal>
                <div className="mb-10 rounded-2xl border border-hair bg-card p-7">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Where teams get stuck</h2>
                  <ul className="mt-4 space-y-3">
                    {ind.painPoints.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-[15px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                        <span className="text-muted">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ) : null}
            {ind.body ? (
              <Reveal>
                <Prose body={ind.body} />
              </Reveal>
            ) : null}
          </div>

          <aside className="lg:col-span-5">
            {tailored.length > 0 ? (
              <div className="rounded-2xl border border-hair bg-card p-7">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">How we help</h2>
                <ul className="mt-4 space-y-2">
                  {tailored.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/services/${s.slug}`}
                        className="group flex items-center justify-between rounded-lg border border-hair bg-page px-4 py-3 text-sm transition-colors hover:border-gold/40"
                      >
                        <span>{s.name}</span>
                        <span className="text-muted transition-all group-hover:translate-x-0.5 group-hover:text-gold">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </Section>

      <CTABand site={site} />
    </>
  );
}
