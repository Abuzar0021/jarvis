import type { Metadata } from "next";
import { getPosts, getSite } from "@/lib/content";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { PostCard } from "@/components/sections/PostCard";
import { Newsletter } from "@/components/sections/Newsletter";
import { CTABand } from "@/components/sections/CTABand";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "Practical writing on design, engineering, and AI - from the team that builds and ships.",
  alternates: {
    canonical: "/insights",
    types: { "application/rss+xml": "/feed.xml" },
  },
};

export default async function InsightsPage() {
  const [posts, site] = await Promise.all([getPosts(), getSite()]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/insights/${p.slug}`,
      name: p.title,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        eyebrow="Insights"
        title={<>Notes on shipping better products.</>}
        intro="Clear, practical writing on design, engineering, and AI - no fluff."
      />

      <Section>
        {posts.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.06}>
                <PostCard post={p} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-muted">Articles are on the way. Check back soon.</p>
        )}
      </Section>

      {/* The homepage is now the design one to one and has no newsletter, so
          the signup lives here, next to the writing it is a signup for. */}
      <Newsletter title={site.newsletter.title} body={site.newsletter.body} />

      <CTABand site={site} />
    </>
  );
}
