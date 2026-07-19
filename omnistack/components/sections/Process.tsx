import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import type { ProcessStep } from "@/lib/types";

export function Process({
  steps,
  intro,
}: {
  steps: ProcessStep[];
  intro: string;
}) {
  if (!steps.length) return null;
  return (
    <Section id="process" className="border-t border-hair">
      <SectionHeading eyebrow="How we work" title={<>A clear path, every time.</>} intro={intro} />

      <div className="relative mt-14">
        <div
          className="absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-gold/60 via-gold/30 to-transparent lg:block"
          aria-hidden
        />
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.07}>
              <li className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/50 bg-page font-mono text-sm text-gold">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}
