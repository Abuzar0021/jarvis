import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { Magnetic } from "@/components/motion/Magnetic";
import type { Service } from "@/lib/types";

/**
 * Services as a hairline-ruled index: each row is a rule, a name, and an arrow
 * that slides on hover. Matches the design's list rhythm rather than a card
 * grid, so it reads as an index instead of competing with the tilt cards.
 */
export function Services({
  intro,
  services,
}: {
  intro: string;
  services: Service[];
}) {
  if (!services.length) return null;

  return (
    <section
      id="services"
      className="relative px-5 py-[clamp(80px,12vh,150px)] sm:px-8 lg:px-16"
    >
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <div className="eyebrow mb-[18px]">What we do</div>
          <h2 className="display-serif m-0 max-w-[16em] text-[clamp(34px,5vw,68px)] text-fg">
            {intro}
          </h2>
        </Reveal>

        <div className="mt-[clamp(40px,6vh,70px)] grid max-w-[1000px] sm:grid-cols-2 sm:gap-x-14">
          {services.map((s, i) => (
            <Reveal key={s.slug} delay={0.06 + (i % 2) * 0.06}>
              <Link
                href={`/services/${s.slug}`}
                className="group flex items-center justify-between gap-6 border-b border-hair py-5 transition-colors hover:border-gold/50"
              >
                <span className="flex items-baseline gap-4">
                  <span className="font-mono text-[11px] tracking-[0.26em] text-gold/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-lg text-fg/85 transition-colors group-hover:text-fg">
                    {s.name}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="font-mono text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold"
                >
                  &rarr;
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <Magnetic className="mt-10 inline-block">
            <Link
              href="/services"
              className="inline-flex items-center gap-2.5 rounded-full border border-hair px-[30px] py-4 font-mono text-xs uppercase tracking-[0.2em] text-fg transition-colors hover:border-gold hover:text-gold-bright"
            >
              All services <span aria-hidden>&rarr;</span>
            </Link>
          </Magnetic>
        </Reveal>
      </div>
    </section>
  );
}
