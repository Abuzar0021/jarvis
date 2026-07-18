import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { BlurTextReveal } from "@/components/motion/BlurTextReveal";
import { HeroArtCanvas } from "./HeroArtCanvas";
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
      <span className="serif-accent text-gold">{match}</span>
      {after}
    </>
  );
}

export function Hero({ site }: { site: SiteContent }) {
  return (
    <section data-nav-hero className="relative isolate overflow-hidden">
      <div className="gold-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70vh]" aria-hidden />
      <div className="grain absolute inset-0 -z-10" aria-hidden />
      <Container className="relative pb-16 pt-14 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          {/* Copy column */}
          <div className="max-w-2xl">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-hair bg-card/60 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
                {site.hero.eyebrow}
              </span>
            </Reveal>

            <BlurTextReveal
              as="h1"
              splitBy="words"
              immediate
              delay={0.15}
              stagger={0.08}
              className="display mt-7 text-balance text-[clamp(2.75rem,5.5vw,5.25rem)]"
            >
              <Headline text={site.hero.headline} highlight={site.hero.highlight} />
            </BlurTextReveal>

            <BlurTextReveal
              as="p"
              splitBy="words"
              immediate
              delay={0.5}
              stagger={0.012}
              className="mt-6 max-w-xl text-lg leading-relaxed text-muted"
            >
              {site.hero.subhead}
            </BlurTextReveal>

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

          {/* Art column */}
          <Reveal delay={0.1}>
            <HeroArtCanvas />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
