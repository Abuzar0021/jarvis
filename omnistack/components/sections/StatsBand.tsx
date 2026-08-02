import { Reveal } from "@/components/motion/Reveal";
import { MaskLine } from "@/components/motion/MaskLine";
import type { SiteContent } from "@/lib/types";

/**
 * The numbers band: the trust line as a masked-line headline, then the real
 * stats as oversized serif figures on a hairline grid.
 */
export function StatsBand({
  stats,
  trustLabel,
}: {
  stats: SiteContent["stats"];
  trustLabel: string;
}) {
  if (!stats.length) return null;

  return (
    <section
      id="numbers"
      className="relative px-5 py-[clamp(80px,12vh,150px)] sm:px-8 lg:px-16"
    >
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <div className="eyebrow mb-[18px]">By the numbers</div>
        </Reveal>
        <h2 className="display-serif m-0 max-w-[15em] text-[clamp(30px,4.4vw,58px)] text-fg">
          <MaskLine>{trustLabel}</MaskLine>
        </h2>

        <div className="mt-[clamp(44px,7vh,80px)] grid gap-px border-t border-hair sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.09}>
              <div className="border-b border-hair py-8 sm:border-b-0 sm:py-10">
                <div className="font-serif text-[clamp(44px,5.5vw,78px)] font-light leading-none text-fg">
                  {s.value}
                  <span className="text-gold">{s.suffix}</span>
                </div>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.26em] text-muted">
                  {s.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
