import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import type { TechGroup } from "@/lib/types";

export function TechStack({ groups }: { groups: TechGroup[] }) {
  if (!groups.length) return null;
  return (
    <Section className="border-t border-hair">
      <SectionHeading
        eyebrow="Engineering depth"
        title={<>Built on a modern, proven stack.</>}
        intro="We choose tools for reliability and speed - and we keep the bundle lean."
      />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g, i) => (
          <Reveal key={g.group} delay={(i % 4) * 0.06}>
            <div className="h-full rounded-2xl border border-hair bg-card p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">{g.group}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {g.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-hair bg-base px-3 py-1.5 text-sm text-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
