import { Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import type { ValuePillar } from "@/lib/types";

/**
 * The design's "three things" block: a split header, then numbered tilt cards
 * that lean toward the cursor with a gold sheen. Shared by the homepage and
 * the about page, which passes its own header copy.
 */
export function ValuePillars({
  pillars,
  eyebrow = "Why us",
  title = "What you're actually getting.",
  intro,
}: {
  pillars: ValuePillar[];
  eyebrow?: string;
  title?: string;
  intro?: string;
}) {
  if (!pillars.length) return null;

  return (
    <section
      id="why"
      className="relative px-5 py-[clamp(90px,15vh,180px)] sm:px-8 lg:px-16"
    >
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <div className="flex flex-wrap items-baseline justify-between gap-5">
            <div>
              <div className="eyebrow mb-[18px]">{eyebrow}</div>
              <h2 className="display-serif m-0 whitespace-pre-line text-[clamp(34px,5vw,68px)] text-fg">
                {title}
              </h2>
            </div>
            {intro ? (
              <p className="m-0 max-w-[22em] text-pretty text-sm leading-[1.7] text-muted">
                {intro}
              </p>
            ) : null}
          </div>
        </Reveal>

        <div className="mt-[clamp(44px,7vh,80px)] grid gap-[clamp(14px,1.6vw,22px)] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={0.08 + i * 0.1}>
              <TiltCard className="flex min-h-[340px] flex-col justify-between p-[clamp(26px,3vw,40px)]">
                <div className="relative flex items-baseline justify-between">
                  <span className="font-serif text-[13px] tracking-[0.3em] text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="block h-[9px] w-[9px] rotate-45 border border-gold/50"
                    aria-hidden
                  />
                </div>
                <div className="relative">
                  <h3 className="m-0 mb-3.5 font-serif text-[clamp(26px,2.6vw,36px)] font-normal leading-[1.08] text-fg">
                    {p.title}
                  </h3>
                  <p className="m-0 text-pretty text-sm leading-[1.7] text-muted">
                    {p.body}
                  </p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
