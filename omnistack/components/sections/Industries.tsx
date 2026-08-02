import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { Magnetic } from "@/components/motion/Magnetic";
import type { Industry } from "@/lib/types";

/** Industries as a tilt-card grid, matching the design's card treatment. */
export function Industries({ industries }: { industries: Industry[] }) {
  if (!industries.length) return null;

  return (
    <section
      id="industries"
      className="relative px-5 py-[clamp(80px,12vh,150px)] sm:px-8 lg:px-16"
    >
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <div className="flex flex-wrap items-baseline justify-between gap-5">
            <div>
              <div className="eyebrow mb-[18px]">Industries</div>
              <h2 className="display-serif m-0 text-[clamp(34px,5vw,68px)] text-fg">
                Depth across the verticals we serve.
              </h2>
            </div>
            <p className="m-0 max-w-[22em] text-pretty text-sm leading-[1.7] text-muted">
              We bring patterns that work - adapted to the specifics of your space.
            </p>
          </div>
        </Reveal>

        <div className="mt-[clamp(40px,6vh,70px)] grid gap-[clamp(14px,1.6vw,22px)] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {industries.map((ind, i) => (
            <Reveal key={ind.id} delay={0.06 + (i % 3) * 0.08}>
              <TiltCard className="h-full">
                <Link
                  href={`/industries/${ind.slug}`}
                  className="group relative flex h-full flex-col p-[clamp(22px,2.4vw,32px)]"
                >
                  <span className="font-mono text-[11px] tracking-[0.26em] text-gold/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-5 font-serif text-[clamp(20px,2vw,27px)] font-normal leading-[1.15] text-fg">
                    {ind.name}
                  </span>
                  <span className="mt-2.5 line-clamp-2 flex-1 text-pretty text-sm leading-[1.7] text-muted">
                    {ind.summary}
                  </span>
                  <span className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted transition-all group-hover:gap-3 group-hover:text-gold">
                    Explore <span aria-hidden>&rarr;</span>
                  </span>
                </Link>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <Magnetic className="mt-10 inline-block">
            <Link
              href="/industries"
              className="inline-flex items-center gap-2.5 rounded-full border border-hair px-[30px] py-4 font-mono text-xs uppercase tracking-[0.2em] text-fg transition-colors hover:border-gold hover:text-gold-bright"
            >
              All industries <span aria-hidden>&rarr;</span>
            </Link>
          </Magnetic>
        </Reveal>
      </div>
    </section>
  );
}
