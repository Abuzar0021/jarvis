import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getService, getServices, getSite } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Section";
import { CTABand } from "@/components/sections/CTABand";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return { title: "Service" };
  return {
    title: `${service.name} Agency`,
    description: service.summary,
    openGraph: { title: service.name, description: service.summary },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [service, site, all] = await Promise.all([
    getService(slug),
    getSite(),
    getServices(),
  ]);
  if (!service) notFound();

  const related = all.filter((s) => s.group === service.group && s.slug !== service.slug).slice(0, 4);
  const paragraphs = service.body.split("\n\n").filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: service.name,
    description: service.summary,
    provider: { "@type": "Organization", name: site.brand },
    areaServed: site.contact.locations.map((l) => l.country),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative isolate overflow-hidden border-b border-hair">
        <div className="gold-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-full opacity-70" aria-hidden />
        <Container className="pb-12 pt-14 sm:pt-16">
          <Reveal>
            <Link href="/services" className="text-sm text-muted transition-colors hover:text-fg">
              ← All services
            </Link>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="mt-6">
              <Eyebrow>{service.group}</Eyebrow>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-[3.25rem] md:leading-[1.05]">
              {service.name}
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{service.summary}</p>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mt-8">
              <Button href="/contact" variant="primary" withArrow>
                Get a quote
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="space-y-5 text-lg leading-relaxed text-muted">
              {paragraphs.length ? (
                paragraphs.map((p, i) => (
                  <Reveal key={i} delay={i * 0.04}>
                    <p>{p}</p>
                  </Reveal>
                ))
              ) : (
                <p>{service.summary}</p>
              )}
            </div>
          </div>

          <aside className="lg:col-span-5">
            {service.deliverables.length > 0 ? (
              <div className="rounded-2xl border border-hair bg-card p-7">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">What you get</h2>
                <ul className="mt-4 space-y-3">
                  {service.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-3 text-[15px]">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                          <path d="M2.5 6.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="text-muted">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </Section>

      {related.length > 0 ? (
        <Section className="border-t border-hair">
          <h2 className="text-2xl font-semibold tracking-tight">More in {service.group}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((s) => (
              <Link
                key={s.id}
                href={`/services/${s.slug}`}
                className="group rounded-2xl border border-hair bg-card p-5 transition-colors hover:border-gold/40"
              >
                <p className="font-medium">{s.name}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted transition-all group-hover:gap-2.5 group-hover:text-gold">
                  Learn more <span aria-hidden>→</span>
                </span>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <CTABand site={site} />
    </>
  );
}
