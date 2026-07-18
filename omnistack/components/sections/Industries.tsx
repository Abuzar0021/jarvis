import Link from "next/link";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { Spotlight } from "@/components/motion/Spotlight";
import type { Industry } from "@/lib/types";

export function Industries({ industries }: { industries: Industry[] }) {
  if (!industries.length) return null;
  return (
    <Section id="industries" className="border-t border-hair">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading
          eyebrow="Industries"
          title={<>Depth across the verticals we serve.</>}
          intro="We bring patterns that work - adapted to the specifics of your space."
        />
        <Reveal>
          <Button href="/industries" variant="secondary" withArrow>
            All industries
          </Button>
        </Reveal>
      </div>
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((ind, i) => (
          <Reveal key={ind.id} delay={(i % 3) * 0.05}>
            <Link
              href={`/industries/${ind.slug}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-hair bg-card px-5 py-5 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_24px_60px_-30px_rgba(27,22,14,0.14)]"
            >
              <Spotlight />
              <span className="font-medium tracking-tight">{ind.name}</span>
              <span className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">{ind.summary}</span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted transition-all group-hover:gap-2.5 group-hover:text-gold">
                Learn more <span aria-hidden>→</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
