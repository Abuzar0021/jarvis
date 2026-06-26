import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import type { Testimonial } from "@/lib/types";

function attribution(t: Testimonial): string {
  const who = [t.authorName, t.authorRole].filter(Boolean).join(", ");
  return [who, t.company].filter(Boolean).join(" · ");
}

export function Testimonials({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;
  const featured = items.find((t) => t.featured) ?? items[0];
  const rest = items.filter((t) => t.id !== featured.id);

  return (
    <Section className="border-t border-hair">
      <SectionHeading eyebrow="In their words" title={<>Teams that trusted us with the whole thing.</>} />

      <Reveal>
        <figure className="mt-12 rounded-3xl border border-hair bg-card p-8 sm:p-12">
          <span className="font-serif text-5xl leading-none text-gold" aria-hidden>“</span>
          <blockquote className="mt-2 text-balance text-2xl font-medium leading-snug tracking-tight sm:text-3xl">
            {featured.quote}
          </blockquote>
          <figcaption className="mt-6 text-sm text-muted">{attribution(featured)}</figcaption>
        </figure>
      </Reveal>

      {rest.length > 0 ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {rest.map((t, i) => (
            <Reveal key={t.id} delay={(i % 2) * 0.08}>
              <figure className="h-full rounded-2xl border border-hair bg-card p-7">
                <blockquote className="text-[15px] leading-relaxed text-fg/90">{t.quote}</blockquote>
                <figcaption className="mt-5 text-sm text-muted">{attribution(t)}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      ) : null}
    </Section>
  );
}
