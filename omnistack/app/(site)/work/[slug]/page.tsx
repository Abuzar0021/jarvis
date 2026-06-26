import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getProjects, getSite } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { CTABand } from "@/components/sections/CTABand";
import { coverGradient } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Case study" };
  return {
    title: `${project.title} — ${project.category}`,
    description: project.summary,
    openGraph: { title: project.title, description: project.summary },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, site, all] = await Promise.all([
    getProject(slug),
    getSite(),
    getProjects(),
  ]);
  if (!project) notFound();

  const others = all.filter((p) => p.slug !== project.slug).slice(0, 2);
  const paragraphs = project.body.split("\n\n").filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    about: project.category,
    creator: { "@type": "Organization", name: site.brand },
    url: project.url || undefined,
    keywords: project.tags.join(", "),
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
            <Link href="/work" className="text-sm text-muted transition-colors hover:text-fg">
              ← Back to work
            </Link>
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

      {/* Cover */}
      <Container className="py-10 sm:py-14">
        <Reveal>
          <div
            className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-hair"
            style={{ background: coverGradient(project.slug) }}
          >
            {project.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.cover}
                alt={`${project.title} — ${project.category}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-semibold tracking-tight text-fg/70 sm:text-5xl">
                  {project.title}
                </span>
              </div>
            )}
          </div>
        </Reveal>
      </Container>

      <Section className="!pt-2">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="space-y-5 text-lg leading-relaxed text-muted">
              {paragraphs.map((p, i) => (
                <Reveal key={i} delay={i * 0.04}>
                  <p>{p}</p>
                </Reveal>
              ))}
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="sticky top-24 space-y-8 rounded-2xl border border-hair bg-card p-7">
              {project.results.length > 0 ? (
                <div>
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Results</h2>
                  <dl className="mt-4 grid grid-cols-2 gap-4">
                    {project.results.map((r) => (
                      <div key={r.label}>
                        <dt className="font-mono text-2xl font-semibold text-fg">{r.value}</dt>
                        <dd className="mt-1 text-sm text-muted">{r.label}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

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
                      <li key={t} className="rounded-full border border-hair bg-base px-3 py-1 text-xs text-muted">
                        {t}
                      </li>
                    ))}
                  </ul>
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
