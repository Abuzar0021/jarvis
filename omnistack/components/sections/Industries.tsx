import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import type { Industry } from "@/lib/types";

export function Industries({ industries }: { industries: Industry[] }) {
  if (!industries.length) return null;
  return (
    <Section id="industries" className="border-t border-hair">
      <SectionHeading
        eyebrow="Industries"
        title={<>Depth across the verticals we serve.</>}
        intro="We bring patterns that work — adapted to the specifics of your space."
      />
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((ind, i) => (
          <Reveal key={ind.slug} delay={(i % 3) * 0.05}>
            <div className="flex items-center justify-between rounded-xl border border-hair bg-card px-5 py-4 transition-colors duration-300 hover:border-gold/30">
              <span className="font-medium">{ind.name}</span>
              <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
