import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getProjects, getSite, getTestimonials } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { Prose } from "@/components/ui/Prose";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { CTABand } from "@/components/sections/CTABand";
import { coverGradient } from "@/lib/utils";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Case study" };
  return {
    title: project.seoTitle || `${project.title} — ${project.category}`,
    description: project.seoDescription || project.summary,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.seoDescription || project.summary,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, site, all, testimonials] = await Promise.all([
    getProject(slug),
    getSite(),
    getProjects(),
    getTestimonials(),
  ]);
  if (!project) notFound();

  const others = all.filter((p) => p.slug !== project.slug).slice(0, 2);
  const gallery = project.gallery ?? [];
  const linkedTestimonial = project.testimonialId
    ? testimonials.find((t) => t.id === project.testimonialId)
    : undefined;

  const sections = [
    { label: "The challenge", body: project.challenge },
    { label: "Our approach", body: project.approach },
    { label: "The outcome", body: project.outcome },
  ].filter((s) => s.body);
  const useStructured = sections.length > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    about: project.category,
    creator: { "@type": "Organization", name: site.brand },
    url: project.url || `${SITE_URL}/work/${project.slug}`,
    keywords: project.tags.join(", "),
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
                { label: "Work", href: "/work" },
                { label: project.title, href: `/work/${project.slug}` },
              ]}
            />
          </Reveal>
          <Reveal delay={0.05}>
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-[0.16em] text-gold">
              <span>{project.category}</span>
              {project.year ? <span className="text-muted">· {project.year}</span> : null}
              {project.client ? <span className="text-muted">· {project.client}</span> : null}
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-[3.25rem] md:leading-[1.05]">
              {project.title}
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{project.summary}</p>
          </Reveal>
          {project.url ? (
            <Reveal delay={0.16}>
              <div className="mt-8">
                <Button href={project.url} variant="primary" withArrow>
                  Visit live site
                </Button>
              </div>
            </Reveal>
          ) : null}
        </Container>
      </section>

      {/* Cover — deliberately always the branded gradient here, never project.cover:
          that field is a listing-page preview thumbnail, and this page already
          shows its own real header above, so reusing the same screenshot as a
          "cover" directly below it would just repeat the page back at itself. */}
      <Container className="py-10 sm:py-14">
        <Reveal>
          <div
            className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-hair"
            style={{ background: coverGradient(project.slug) }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-semibold tracking-tight text-fg/70 sm:text-5xl">{project.title}</span>
            </div>
          </div>
        </Reveal>
      </Container>

      {/* Results highlight */}
      {project.results.length > 0 ? (
        <Container className="pb-4">
          <Reveal>
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-hair bg-card p-6 sm:grid-cols-4">
              {project.results.map((r) => (
                <div key={r.label}>
                  <div className="font-mono text-3xl font-semibold text-gold">{r.value}</div>
                  <div className="mt-1 text-sm text-muted">{r.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      ) : null}

      <Section className="!pt-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            {useStructured ? (
              <div className="space-y-10">
                {sections.map((s, i) => (
                  <Reveal key={s.label} delay={i * 0.05}>
                    <div>
                      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">{s.label}</h2>
                      <div className="mt-3">
                        <Prose body={s.body} />
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            ) : (
              <Reveal>
                <Prose body={project.body} />
              </Reveal>
            )}

            {linkedTestimonial ? (
              <Reveal>
                <figure className="mt-12 rounded-3xl border border-hair bg-card p-8">
                  <span className="text-4xl leading-none text-gold" aria-hidden>“</span>
                  <blockquote className="mt-2 text-balance text-xl font-medium leading-snug tracking-tight sm:text-2xl">
                    {linkedTestimonial.quote}
                  </blockquote>
                  <figcaption className="mt-5 text-sm text-muted">
                    {[linkedTestimonial.authorName, linkedTestimonial.authorRole].filter(Boolean).join(", ")}
                    {linkedTestimonial.company ? ` · ${linkedTestimonial.company}` : ""}
                  </figcaption>
                </figure>
              </Reveal>
            ) : null}

            {gallery.length > 0 ? (
              <div className="mt-12 grid gap-4 sm:grid-cols-2">
                {gallery.map((src, i) => (
                  <Reveal key={src} delay={(i % 2) * 0.06}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${project.title} screenshot ${i + 1}`} loading="lazy" className="w-full rounded-2xl border border-hair" />
                  </Reveal>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="lg:col-span-5">
            <div className="sticky top-24 space-y-8 rounded-2xl border border-hair bg-card p-7">
              {project.logo ? (
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-hair bg-fg/95 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={project.logo} alt={`${project.client || project.title} logo`} className="h-full w-full object-contain" />
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                {project.client ? (
                  <div>
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Client</h2>
                    <p className="mt-1 text-sm text-fg/90">{project.client}</p>
                  </div>
                ) : null}
                {project.year ? (
                  <div>
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Year</h2>
                    <p className="mt-1 text-sm text-fg/90">{project.year}</p>
                  </div>
                ) : null}
              </div>

              {project.services.length > 0 ? (
                <div>
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">What we did</h2>
                  <ul className="mt-4 space-y-2 text-sm text-muted">
                    {project.services.map((s) => (
                      <li key={s} className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-gold" aria-hidden />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {project.tags.length > 0 ? (
                <div>
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Stack & focus</h2>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {project.tags.map((t) => (
                      <li key={t} className="rounded-full border border-hair bg-base px-3 py-1 text-xs text-muted">{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {project.url ? (
                <div className="border-t border-hair pt-6">
                  <Button href={project.url} variant="secondary" className="w-full" withArrow>
                    Visit live site
                  </Button>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </Section>

      {others.length > 0 ? (
        <Section className="border-t border-hair">
          <h2 className="text-2xl font-semibold tracking-tight">More work</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {others.map((p) => (
              <Link
                key={p.id}
                href={`/work/${p.slug}`}
                className="group flex items-center justify-between rounded-2xl border border-hair bg-card p-6 transition-colors hover:border-gold/40"
              >
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">{p.category}</p>
                  <p className="mt-2 text-lg font-semibold tracking-tight">{p.title}</p>
                </div>
                <span className="text-muted transition-all group-hover:translate-x-1 group-hover:text-gold">→</span>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <CTABand site={site} />
    </>
  );
}
