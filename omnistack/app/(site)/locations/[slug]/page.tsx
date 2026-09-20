import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocation, getLocations, getServices, getSite } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
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
  const loc = await getLocation(slug);
  if (!loc) return { title: "Location" };
  const title = loc.seoTitle || loc.name;
  const description = loc.seoDescription || loc.summary;
  return {
    title,
    description,
    alternates: { canonical: `/locations/${loc.slug}` },
    openGraph: { title, description },
  };
}

export default async function LocationPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [loc, site, all, services] = await Promise.all([
    getLocation(slug),
    getSite(),
    getLocations(),
    getServices(),
  ]);
  if (!loc) notFound();

  const parent = loc.parent ? all.find((l) => l.slug === loc.parent) : undefined;
  const children = all.filter((l) => l.parent === loc.slug);
  const siblings = all.filter(
    (l) => l.slug !== loc.slug && l.parent === loc.parent && !l.parent,
  );
  const featuredServices = services.filter((s) => s.featured).slice(0, 6);

  // areaServed is the specific market this page is about, not the studio's own
  // office list. A Service offered to California is served in California
  // regardless of where it is produced, and saying otherwise would be the same
  // overclaim the page copy is written to avoid.
  const area = loc.region
    ? {
        "@type": "State",
        name: loc.region,
        containedInPlace: { "@type": "Country", name: loc.country },
      }
    : { "@type": "Country", name: loc.country };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: `Web development in ${loc.name}`,
    description: loc.seoDescription || loc.summary,
    provider: {
      "@type": "Organization",
      name: site.brand,
      url: SITE_URL,
      email: site.contact.email,
    },
    areaServed: area,
    url: `${SITE_URL}/locations/${loc.slug}`,
  };

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Locations", href: "/locations" },
    ...(parent
      ? [{ label: parent.name, href: `/locations/${parent.slug}` }]
      : []),
    { label: loc.name, href: `/locations/${loc.slug}` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative isolate overflow-hidden border-b border-hair">
        <div
          className="gold-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-full opacity-70"
          aria-hidden
        />
        <Container className="pb-[clamp(48px,7vh,76px)] pt-[clamp(112px,15vh,160px)]">
          <Reveal>
            <Breadcrumbs items={crumbs} />
          </Reveal>
          <Reveal delay={0.04}>
            <div className="mt-7">
              <Eyebrow>Where we work</Eyebrow>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="display-serif mt-5 max-w-3xl text-balance text-[clamp(36px,5.4vw,72px)]">
              {loc.name}
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 max-w-[36em] text-pretty text-[15.5px] leading-[1.7] text-muted">
              {loc.intro}
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Button href="/contact" variant="primary" withArrow>
                Start a project
              </Button>
              <span className="text-sm text-muted">
                <Link
                  href="/pricing"
                  className="text-gold underline-offset-4 transition-opacity hover:underline hover:opacity-80"
                >
                  See what it costs
                </Link>
                <span aria-hidden className="mx-2.5 text-hair">
                  /
                </span>
                <Link
                  href="/work"
                  className="text-gold underline-offset-4 transition-opacity hover:underline hover:opacity-80"
                >
                  See the work
                </Link>
              </span>
            </div>
          </Reveal>
        </Container>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Prose body={loc.body} />
          </div>

          <aside className="lg:col-span-5">
            {/* Presence and overlap are stated plainly and near the top of the
                sidebar on purpose. These pages exist to rank in markets the
                studio sells into, and only two of them contain an office, so
                the page has to say which is which before it says anything
                persuasive. */}
            <div className="rounded-2xl border border-hair bg-card p-6">
              <h2 className="eyebrow m-0">Where we are</h2>
              <p className="mt-3 text-[14.5px] leading-[1.7] text-muted">
                {loc.presence}
              </p>
              <h2 className="eyebrow m-0 mt-7">Hours and overlap</h2>
              <p className="mt-3 text-[14.5px] leading-[1.7] text-muted">
                {loc.overlap}
              </p>
            </div>

            {loc.points.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {loc.points.map((point) => (
                  <li
                    key={point}
                    className="flex gap-3 text-[14.5px] leading-[1.65] text-muted"
                  >
                    <span aria-hidden className="mt-[9px] h-px w-3 shrink-0 bg-gold" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </aside>
        </div>
      </Section>

      {children.length > 0 ? (
        <Section>
          <h2 className="display-serif m-0 text-[clamp(26px,3.4vw,44px)]">
            States we work in
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Link
                key={child.slug}
                href={`/locations/${child.slug}`}
                className="group rounded-2xl border border-hair bg-card p-6 transition-colors hover:border-gold/40"
              >
                <span className="block text-lg font-medium tracking-tight text-fg">
                  {child.name}
                </span>
                <span className="mt-2 block text-sm leading-[1.6] text-muted">
                  {child.summary}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {featuredServices.length > 0 ? (
        <Section>
          <h2 className="display-serif m-0 text-[clamp(26px,3.4vw,44px)]">
            What we build{loc.region ? ` in ${loc.region}` : ` in ${loc.name}`}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredServices.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="group rounded-2xl border border-hair bg-card p-6 transition-colors hover:border-gold/40"
              >
                <span className="block text-base font-medium tracking-tight text-fg">
                  {service.name}
                </span>
                <span className="mt-2 block text-sm leading-[1.6] text-muted">
                  {service.summary}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {siblings.length > 0 ? (
        <Section>
          <h2 className="display-serif m-0 text-[clamp(24px,3vw,38px)]">
            Other markets
          </h2>
          <div className="mt-7 flex flex-wrap gap-3">
            {siblings.map((sib) => (
              <Link
                key={sib.slug}
                href={`/locations/${sib.slug}`}
                className="rounded-full border border-hair px-4 py-2 text-sm text-muted transition-colors hover:border-gold/40 hover:text-fg"
              >
                {sib.name}
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <CTABand site={site} />
    </>
  );
}
