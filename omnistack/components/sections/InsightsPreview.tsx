import { Section, SectionHeading } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { PostCard } from "./PostCard";
import type { Post } from "@/lib/types";

export function InsightsPreview({ posts }: { posts: Post[] }) {
  if (!posts.length) return null;
  return (
    <Section id="insights" className="border-t border-hair">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading
          eyebrow="Insights"
          title={<>Notes on shipping better products.</>}
          intro="Practical writing on design, engineering, and AI."
        />
        <Reveal>
          <Button href="/insights" variant="secondary" withArrow>
            Read the blog
          </Button>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => (
          <Reveal key={p.id} delay={(i % 3) * 0.06}>
            <PostCard post={p} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
