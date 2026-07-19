import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import type { Service } from "@/lib/types";

/**
 * Services act foreground: the real services intro and featured service list in
 * light type over the full-bleed painting the Act layer supplies. Reveals fire
 * as the act wipes into view (Reveal uses whileInView, which respects the act's
 * transform, so the list staggers in on arrival).
 */
export function ServicesAct({
  intro,
  services,
}: {
  intro: string;
  services: Service[];
}) {
  return (
    <Container className="relative w-full text-[#f4f1ea]">
      <div className="max-w-3xl">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-magenta)]" aria-hidden />
            What we do
          </span>
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="display-serif mt-6 text-balance text-[clamp(2.25rem,4.6vw,4.25rem)]">
            {intro}
          </h2>
        </Reveal>
      </div>

      <div className="mt-10 grid max-w-4xl sm:grid-cols-2 sm:gap-x-12">
        {services.map((s, i) => (
          <Reveal key={s.slug} delay={0.1 + (i % 2) * 0.05}>
            <Link
              href={`/services/${s.slug}`}
              className="group flex items-center justify-between gap-6 border-b border-white/15 py-4 transition-colors hover:border-white/40"
            >
              <span className="text-lg text-white/85 transition-colors group-hover:text-white">
                {s.name}
              </span>
              <span
                className="font-mono text-white/40 transition-colors group-hover:text-[var(--neon-cyan)]"
                aria-hidden
              >
                &rarr;
              </span>
            </Link>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <div className="mt-10">
          <Button href="/services" variant="lightOutline" size="lg" withArrow>
            All services
          </Button>
        </div>
      </Reveal>
    </Container>
  );
}
