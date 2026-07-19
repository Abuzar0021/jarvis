import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/motion/Reveal";
import type { ProcessStep } from "@/lib/types";

/**
 * How We Work act foreground: the real process steps in light type over the
 * full-bleed painting the ScrollScene supplies, styled to match the other
 * dark acts (numbered markers in neon cyan instead of the coda's gold).
 */
export function HowWeWorkAct({
  steps,
  intro,
}: {
  steps: ProcessStep[];
  intro: string;
}) {
  return (
    <Container className="relative w-full text-[#f4f1ea]">
      <div className="max-w-3xl">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-cyan)]" aria-hidden />
            How we work
          </span>
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="display mt-6 text-balance text-[clamp(2.25rem,4.6vw,4.25rem)]">
            A clear path, every time.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">{intro}</p>
        </Reveal>
      </div>

      <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={0.14 + i * 0.07}>
            <li className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neon-cyan)]/50 bg-black/40 font-mono text-sm text-[var(--neon-cyan)]">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{s.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </Container>
  );
}
