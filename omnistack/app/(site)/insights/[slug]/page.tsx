import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, getPosts, getSite } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Section";
import { Prose } from "@/components/ui/Prose";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { CTABand } from "@/components/sections/CTABand";
import { PostCard } from "@/components/sections/PostCard";
import { coverGradient, formatDate, readingTime } from "@/lib/utils";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Article" };
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    alternates: { canonical: `/insights/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, site, all] = await Promise.all([getPost(slug), getSite(), getPosts()]);
  if (!post) notFound();

  const related = all.filter((p) => p.slug !== post.slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: { "@type": post.author ? "Person" : "Organization", name: post.author || site.brand },
    publisher: {
      "@type": "Organization",
      name: site.brand,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` },
    },
    // Google treats a missing dateModified as "never updated". Posts carry no
    // separate modified date, so publishedAt is the honest value for both.
    dateModified: post.publishedAt,
    ...(post.cover ? { image: `${SITE_URL}${post.cover}` } : {}),
    mainEntityOfPage: `${SITE_URL}/insights/${post.slug}`,
    articleSection: post.category,
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
                { label: "Insights", href: "/insights" },
                { label: post.title, href: `/insights/${post.slug}` },
              ]}
            />
          </Reveal>
          <Reveal delay={0.05}>
            <div className="mt-6">
              <Eyebrow>{post.category}</Eyebrow>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="display-serif mt-4 max-w-3xl text-balance text-4xl sm:text-5xl">
              {post.title}
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              {post.author ? <span>By {post.author}</span> : null}
              <span aria-hidden>·</span>
              <span>{formatDate(post.publishedAt)}</span>
              <span aria-hidden>·</span>
              <span>{readingTime(post.body)} min read</span>
            </p>
          </Reveal>
        </Container>
      </section>

      <Container className="py-10 sm:py-14">
        <Reveal>
          <div
            className="relative aspect-[16/8] overflow-hidden rounded-3xl border border-hair"
            style={{ background: coverGradient(post.slug) }}
          >
            {post.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.cover} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
          </div>
        </Reveal>
      </Container>

      <Section className="!pt-2">
        <article className="mx-auto max-w-2xl">
          <Reveal>
            <Prose body={post.body} />
          </Reveal>
        </article>
      </Section>

      {related.length > 0 ? (
        <Section className="border-t border-hair">
          <h2 className="text-2xl font-semibold tracking-tight">More insights</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </Section>
      ) : null}

      <CTABand site={site} />
    </>
  );
}
