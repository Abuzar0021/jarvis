import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTemplates, getSite } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Prose } from "@/components/ui/Prose";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Section";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { CTABand } from "@/components/sections/CTABand";
import { coverGradient } from "@/lib/utils";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getTemplates()).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = (await getTemplates()).find((t) => t.slug === slug);
  if (!template) return { title: "Template not found" };
  return {
    title: template.seoTitle || `${template.title} template`,
    description: template.seoDescription || template.summary,
    alternates: { canonical: `/templates/${template.slug}` },
  };
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [all, site] = await Promise.all([getTemplates(), getSite()]);
  const template = all.find((t) => t.slug === slug);
  if (!template) notFound();

  const others = all.filter((t) => t.slug !== template.slug).slice(0, 3);
  const poster = template.videoPoster || template.cover;

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-hair">
        <Container className="py-[clamp(48px,8vh,90px)]">
          <Breadcrumbs
            items={[
              { label: "Templates", href: "/templates" },
              { label: template.title, href: `/templates/${template.slug}` },
            ]}
          />
          <Reveal>
            <Eyebrow>Template</Eyebrow>
            <h1 className="display-serif mt-4 text-[clamp(32px,5vw,64px)] text-fg">
              {template.title}
            </h1>
            <p className="mt-5 max-w-[46em] text-pretty text-lg leading-relaxed text-muted">
              {template.summary}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button href={`/preview/${template.slug}`} size="lg">
                Open live preview
              </Button>
              <Button href="/contact" variant="secondary" size="lg">
                Build something like this
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      <Section>
        <Reveal>
          <div
            className="relative aspect-[16/9] overflow-hidden rounded-[4px] border border-hair"
            style={{ background: coverGradient(template.slug) }}
          >
            {poster ? (
              <Image
                src={poster}
                alt={`${template.title} template`}
                fill
                sizes="(max-width: 1024px) 100vw, 1100px"
                className="object-cover"
                priority
              />
            ) : null}
          </div>
        </Reveal>

        <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            {template.body.trim() ? (
              <Reveal>
                <Prose body={template.body} />
              </Reveal>
            ) : null}
          </div>

          <aside className="lg:col-span-5">
            {template.tags.length ? (
              <Reveal>
                <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                  What it does
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {template.tags.map((tag) => (
                    <li key={tag} className="flex items-start gap-3 text-sm text-fg/85">
                      <span
                        aria-hidden
                        className="mt-1.5 block h-[7px] w-[7px] shrink-0 rotate-45 border border-gold"
                      />
                      {tag}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}

            {/* Repeated on every template page on purpose. This is the exact
                point where a visitor decides whether they are buying a theme. */}
            <Reveal delay={0.08}>
              <div className="mt-10 rounded-[3px] border border-hair bg-card-2 p-6">
                <h2 className="m-0 font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
                  This is not a theme
                </h2>
                <p className="mt-3 text-[13.5px] leading-[1.7] text-muted">
                  We do not license templates or pour your content into one. This
                  is a direction to react to. What we build from it is drawn
                  around your brand and your content, and you get the code, the
                  repository and the hosting account outright.
                </p>
                <Link
                  href="/pricing"
                  className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-gold hover:text-gold-bright"
                >
                  What that costs
                </Link>
              </div>
            </Reveal>
          </aside>
        </div>
      </Section>

      {others.length ? (
        <Section className="border-t border-hair">
          <h2 className="display-serif m-0 text-[clamp(22px,2.6vw,32px)] text-fg">
            Other directions
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((t) => (
              <Link
                key={t.id}
                href={`/templates/${t.slug}`}
                className="group rounded-[4px] border border-hair bg-card p-6 transition-colors hover:border-gold/40"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                  {t.category}
                </span>
                <h3 className="mt-2 font-serif text-xl font-normal text-fg group-hover:text-gold">
                  {t.title}
                </h3>
                <p className="mt-2 text-sm leading-[1.65] text-muted">{t.summary}</p>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <CTABand site={site} />
    </>
  );
}
