import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { Spotlight } from "@/components/motion/Spotlight";
import type { ValuePillar } from "@/lib/types";

const ICONS = [
  // One team
  <path key="i0" d="M4 18v-1a4 4 0 014-4h2m6 5v-1a4 4 0 00-3-3.87M9 7a3 3 0 106 0 3 3 0 00-6 0zm9 0a2.5 2.5 0 11-2-2.45" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  // Senior-only
  <path key="i1" d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.3 7.2 18l.9-5.4L4.2 8.7l5.4-.8L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  // Built to perform
  <path key="i2" d="M12 20a8 8 0 100-16 8 8 0 000 16zm0-8l3.5-3.5M12 12v.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
];

export function ValuePillars({ pillars }: { pillars: ValuePillar[] }) {
  if (!pillars.length) return null;
  return (
    <Section className="border-b border-hair py-16 sm:py-20">
      <SectionHeading eyebrow="Why us" title={<>What you&rsquo;re actually getting.</>} />
      <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
        {pillars.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.08}>
            <div
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-hair bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_24px_60px_-30px_rgba(212,175,55,0.4)]"
            >
              <Spotlight />
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/30 bg-gold-soft text-gold">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  {ICONS[i % ICONS.length]}
                </svg>
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
