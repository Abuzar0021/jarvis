import Link from "next/link";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { ReviewCard } from "./ReviewCard";
import type { Testimonial } from "@/lib/types";

/**
 * The homepage proof slot: one review, the disclosure that makes it worth
 * believing, and a way through to the rest. Deliberately not a wall of quotes,
 * and deliberately not a star widget: Google excludes self serving reviews
 * from review rich results, so a rating would buy nothing and cost the page
 * its composure. No AggregateRating or Review schema is emitted anywhere.
 */
export function Testimonials({ items }: { items: Testimonial[] }) {
  // Belt and braces. The page already passes an approved-only read, but this
  // section must never be the thing that publishes a pending review.
  const approved = items.filter((t) => t.status === "approved");
  if (!approved.length) return null;
  const featured = approved.find((t) => t.featured) ?? approved[0];

  return (
    <Section className="border-t border-hair">
      <SectionHeading
        eyebrow="In their words"
        title={<>Teams that trusted us with the whole thing.</>}
      />

      <Reveal className="mt-[clamp(32px,5vh,56px)]">
        <ReviewCard review={featured} variant="featured" />
      </Reveal>

      <Reveal delay={0.06}>
        <div className="mt-6 flex flex-col gap-4 border-t border-hair pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[44em] text-[13px] leading-[1.7] text-muted">
            Every review is submitted by the client, read by a person before it
            appears, and published word for word. Nothing is paid for, and
            nothing is auto published.
          </p>
          <Link
            href="/reviews"
            className="group inline-flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-gold transition-colors hover:text-gold-bright"
          >
            All reviews
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
        </div>
      </Reveal>
    </Section>
  );
}
