import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import type { Industry } from "@/lib/types";

/**
 * Industries act foreground: the real industries grid in light type over the
 * full-bleed painting the ScrollScene supplies, styled to match the other
 * dark acts.
 */
export function IndustriesAct({ industries }: { industries: Industry[] }) {
  return (
    <Container className="relative w-full text-[#f4f1ea]">
      <div className="max-w-3xl">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-magenta)]" aria-hidden />
            Industries
          </span>
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="display-serif mt-6 text-balance text-[clamp(2.25rem,4.6vw,4.25rem)]">
            Depth across the verticals we serve.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
            We bring patterns that work - adapted to the specifics of your space.
          </p>
        </Reveal>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((ind, i) => (
          <Reveal key={ind.id} delay={0.14 + (i % 3) * 0.05}>
            <Link
              href={`/industries/${ind.slug}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/15 bg-[#100e0a]/70 px-5 py-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-white/40"
            >
              <span className="font-medium tracking-tight text-white">{ind.name}</span>
              <span className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-white/60">
                {ind.summary}
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-white/60 transition-all group-hover:gap-2.5 group-hover:text-[var(--neon-cyan)]">
                Learn more <span aria-hidden>&rarr;</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.3}>
        <div className="mt-10">
          <Button href="/industries" variant="lightOutline" size="lg" withArrow>
            All industries
          </Button>
        </div>
      </Reveal>
    </Container>
  );
}
