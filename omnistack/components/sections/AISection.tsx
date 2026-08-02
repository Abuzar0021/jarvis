import { Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import type { SiteContent } from "@/lib/types";

/** The design's agent pipeline, drawn as a gold spine with lettered nodes. */
const STAGES = ["Trigger", "Qualify", "Enrich", "Act", "Outcome"];

export function AISection({ ai }: { ai: SiteContent["aiShowcase"] }) {
  if (!ai.title) return null;

  return (
    <section
      id="ai"
      className="relative px-5 py-[clamp(80px,12vh,150px)] sm:px-8 lg:px-16"
    >
      <div className="mx-auto grid max-w-[1240px] items-center gap-[clamp(40px,6vw,90px)] lg:grid-cols-[1fr_0.8fr]">
        <div>
          <Reveal>
            <div className="eyebrow mb-[18px]">{ai.eyebrow}</div>
            <h2 className="display-serif m-0 text-[clamp(34px,5vw,68px)] text-fg">
              {ai.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-[32em] text-pretty text-[15px] leading-[1.75] text-muted">
              {ai.body}
            </p>
          </Reveal>
          <ul className="mt-8 space-y-3.5">
            {ai.points.map((p, i) => (
              <Reveal key={p} delay={0.16 + i * 0.06}>
                <li className="flex items-start gap-3.5 text-[15px] text-fg/85">
                  <span
                    className="mt-[7px] block h-[7px] w-[7px] shrink-0 rotate-45 border border-gold"
                    aria-hidden
                  />
                  {p}
                </li>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={0.12}>
          <TiltCard className="p-[clamp(24px,3vw,38px)]">
            <div className="relative">
              <span className="eyebrow">Agent pipeline</span>
              <ol className="relative mt-6 space-y-4">
                <span
                  aria-hidden
                  className="absolute bottom-3 left-[9px] top-3 w-px bg-gradient-to-b from-gold to-gold-bright"
                />
                {STAGES.map((s, i) => (
                  <li key={s} className="relative flex items-center gap-5 pl-0">
                    <span
                      aria-hidden
                      className="relative z-10 block h-[19px] w-[19px] shrink-0 rotate-45 border border-gold bg-card"
                    />
                    <span className="flex flex-1 items-baseline justify-between gap-3 border-b border-hair-soft pb-3">
                      <span className="text-sm text-fg">{s}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}
