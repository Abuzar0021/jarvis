import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import type { SiteContent } from "@/lib/types";

function Headline({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight || !text.toLowerCase().includes(highlight.toLowerCase())) {
    return <>{text}</>;
  }
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + highlight.length);
  const after = text.slice(idx + highlight.length);
  return (
    <>
      {before}
      <span className="text-gold">{match}</span>
      {after}
    </>
  );
}

export function Hero({ site }: { site: SiteContent }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="gold-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70vh]" aria-hidden />
      <div className="grain absolute inset-0 -z-10" aria-hidden />
      <Container className="relative pb-20 pt-20 sm:pb-28 sm:pt-28 md:pb-36 md:pt-32">
        <div className="max-w-4xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-hair bg-card/60 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
              {site.hero.eyebrow}
            </span>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="mt-6 text-balance text-[clamp(2.75rem,6.4vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
              <Headline text={site.hero.headline} highlight={site.hero.highlight} />
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
              {site.hero.subhead}
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href={site.hero.primaryCta.href} variant="primary" size="lg" withArrow>
                {site.hero.primaryCta.label}
              </Button>
              <Button href={site.hero.secondaryCta.href} variant="secondary" size="lg">
                {site.hero.secondaryCta.label}
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.24}>
            <p className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span className="text-gold">●</span>
              {site.contact.responseTime}
              <span className="mx-1 hidden text-hair sm:inline">|</span>
              <span className="hidden sm:inline">
                {site.contact.locations.map((l) => l.city).join(" & ")}
              </span>
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
