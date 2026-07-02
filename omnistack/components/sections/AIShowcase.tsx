import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import type { SiteContent } from "@/lib/types";

function NodeFlow() {
  const nodes = ["Trigger", "Qualify", "Enrich", "Act"];
  return (
    <div className="relative rounded-2xl border border-hair bg-base/60 p-6">
      <div className="grain absolute inset-0 rounded-2xl" aria-hidden />
      <div className="relative space-y-3">
        {nodes.map((n, i) => (
          <div key={n} className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/40 bg-gold-soft font-mono text-xs text-gold"
              style={{ opacity: 1 - i * 0.04 }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="flex-1 rounded-lg border border-hair bg-card px-4 py-3">
              <p className="text-sm font-medium">{n}</p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-hair">
                <div
                  className="h-full rounded-full bg-gold/70"
                  style={{ width: `${88 - i * 16}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="relative mt-4 flex items-center justify-between rounded-lg border border-gold/30 bg-gold-soft px-4 py-2.5">
        <span className="text-sm text-fg">Outcome delivered</span>
        <span className="font-mono text-xs text-gold">live · monitored</span>
      </div>
    </div>
  );
}

export function AIShowcase({ site }: { site: SiteContent }) {
  const ai = site.aiShowcase;
  if (!ai.title) return null;
  return (
    <section className="relative isolate overflow-hidden border-y border-hair bg-surface py-24 sm:py-32">
      <div className="gold-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/2 opacity-60" aria-hidden />
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <Eyebrow>{ai.eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-[1.05]">
                {ai.title}
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">{ai.body}</p>
            </Reveal>
            <Reveal delay={0.15}>
              <ul className="mt-6 space-y-3">
                {ai.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[15px]">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path d="M2.5 6.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-muted">{p}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-8">
                <Button href="/services/ai-agents" variant="primary" withArrow>
                  Explore AI services
                </Button>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <NodeFlow />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
