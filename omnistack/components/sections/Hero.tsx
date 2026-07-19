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
      <span className="serif-accent text-[#e7c39a]">{match}</span>
      {after}
    </>
  );
}

/**
 * Hero act foreground: the real copy rendered in light type over the full-bleed
 * painting the Act layer supplies. The floating glass tech props live in
 * HeroArtCanvas as decorative HUD hardware on the right.
 */
export function Hero({ site }: { site: SiteContent }) {
  return (
    <Container className="relative w-full">
      <HeroArtCanvas />
      <div className="relative max-w-3xl text-[#f4f1ea]">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-cyan)]" aria-hidden />
            {site.hero.eyebrow}
          </span>
        </Reveal>

        <BlurTextReveal
          as="h1"
          splitBy="words"
          immediate
          delay={0.15}
          stagger={0.08}
          className="display mt-7 text-balance text-[clamp(3rem,7vw,7rem)]"
        >
          <Headline text={site.hero.headline} highlight={site.hero.highlight} />
        </BlurTextReveal>

        <BlurTextReveal
          as="p"
          splitBy="words"
          immediate
          delay={0.5}
          stagger={0.012}
          className="mt-6 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl"
        >
          {site.hero.subhead}
        </BlurTextReveal>

        <Reveal delay={0.18}>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href={site.hero.primaryCta.href} variant="light" size="lg" withArrow>
              {site.hero.primaryCta.label}
            </Button>
            <Button href={site.hero.secondaryCta.href} variant="lightOutline" size="lg">
              {site.hero.secondaryCta.label}
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <p className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/55">
            <span className="text-[var(--neon-cyan)]">●</span>
            {site.contact.responseTime}
            <span className="mx-1 hidden text-white/30 sm:inline">|</span>
            <span className="hidden sm:inline">
              {site.contact.locations.map((l) => l.city).join(" & ")}
            </span>
          </p>
        </Reveal>
      </div>
    </Container>
  );
}
