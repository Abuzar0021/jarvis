import type { Metadata } from "next";
import { getPosts, getSite } from "@/lib/content";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { PostCard } from "@/components/sections/PostCard";
import { CTABand } from "@/components/sections/CTABand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "Practical writing on design, engineering, and AI — from the team that builds and ships.",
};

export default async function InsightsPage() {
  const [posts, site] = await Promise.all([getPosts(), getSite()]);

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title={<>Notes on shipping better products.</>}
        intro="Clear, practical writing on design, engineering, and AI — no fluff."
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

      <CTABand site={site} />
    </>
  );
}
