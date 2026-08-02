"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { WordReveal } from "@/components/motion/WordReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import type { CTA } from "@/lib/types";
import { useSafeReducedMotion } from "@/components/motion/useSafeReducedMotion";

const WORDMARK_CLS =
  "font-serif font-normal text-[clamp(110px,18.5vw,380px)] leading-[0.8] tracking-[-0.04em] whitespace-nowrap";

/**
 * The design's hero. A giant outlined wordmark sits behind the headline; a
 * cursor-tracked spotlight uncovers a gold-filled copy of it, a fine grid, and
 * four hand-written annotations floating around it.
 */
export function Hero({
  brand,
  eyebrow,
  headline,
  highlight,
  subhead,
  primaryCta,
  secondaryCta,
  meta,
  annotations,
}: {
  brand: string;
  eyebrow: string;
  headline: string;
  highlight?: string;
  subhead: string;
  primaryCta: CTA;
  secondaryCta: CTA;
  meta: string;
  annotations: string[];
}) {
  const revealRef = useRef<HTMLDivElement>(null);
  const reduce = useSafeReducedMotion();
  const wordmark = brand.split(" ")[0] || brand;

  // Positions and sizes of the design's four floating annotations.
  const spots = [
    { top: "21%", right: "7%", rotate: -4, size: "clamp(17px,1.7vw,26px)" },
    { top: "42%", right: "13%", rotate: 3, size: "clamp(15px,1.4vw,22px)" },
    { top: "62%", right: "5%", rotate: -2, size: "clamp(16px,1.6vw,24px)" },
    { top: "79%", right: "24%", rotate: 2, size: "clamp(14px,1.3vw,20px)" },
  ];

  useEffect(() => {
    if (reduce) return;
    const el = revealRef.current;
    if (!el) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) {
      // No cursor to follow: park a soft spotlight and leave it lit.
      el.style.opacity = "0.85";
      const m =
        "radial-gradient(circle 340px at 66% 52%, rgba(0,0,0,1) 0%, rgba(0,0,0,.85) 50%, rgba(0,0,0,0) 100%)";
      el.style.webkitMaskImage = m;
      el.style.maskImage = m;
      return;
    }

    let mx = window.innerWidth * 0.6;
    let my = window.innerHeight * 0.5;
    let x = mx;
    let y = my;
    let lit = false;
    let raf = 0;
    const t0 = performance.now();

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!lit) {
        lit = true;
        el.style.opacity = "1";
      }
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const r = el.getBoundingClientRect();
      if (r.bottom <= 0) return; // hero scrolled away
      x += (mx - x) * 0.14;
      y += (my - y) * 0.14;
      const rad = 290 + Math.sin((performance.now() - t0) / 900) * 14;
      const m = `radial-gradient(circle ${rad.toFixed(0)}px at ${(x - r.left).toFixed(
        1,
      )}px ${(y - r.top).toFixed(1)}px, rgba(0,0,0,1) 0%, rgba(0,0,0,.9) 42%, rgba(0,0,0,0) 100%)`;
      el.style.webkitMaskImage = m;
      el.style.maskImage = m;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  // The nav is fixed, as in the design, so the hero carries the design's own
  // top padding to clear it rather than subtracting chrome from its height.
  return (
    <section
      data-nav-hero
      className="relative grid min-h-[100svh] items-center overflow-hidden px-5 pb-[clamp(60px,9vh,110px)] pt-[clamp(120px,16vh,190px)] sm:px-8 lg:px-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[40%] -ml-[450px] -mt-[450px] h-[900px] w-[900px]"
        style={{
          background:
            "radial-gradient(circle, rgba(198,161,91,.1) 0%, rgba(198,161,91,0) 60%)",
        }}
      />

      {/* Outlined wordmark, always visible */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 -bottom-[0.12em] z-0 text-center text-transparent ${WORDMARK_CLS}`}
        style={{ WebkitTextStroke: "1px rgba(198,161,91,.14)" }}
      >
        {wordmark}
      </div>

      {/* Spotlight layer: only what the cursor uncovers */}
      <div
        ref={revealRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-700 ease-snap"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(198,161,91,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(198,161,91,.08) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 55% 55%, rgba(233,200,121,.09), transparent 68%)",
          }}
        />
        <div
          className={`absolute inset-x-0 -bottom-[0.12em] text-center ${WORDMARK_CLS}`}
          style={{
            background: "linear-gradient(180deg, #e9c879 0%, #c6a15b 78%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {wordmark}
        </div>
        {annotations.slice(0, 4).map((text, i) => {
          const spot = spots[i];
          return (
            <span
              key={text}
              className="serif-accent absolute text-gold-bright"
              style={{
                top: spot.top,
                right: spot.right,
                transform: `rotate(${spot.rotate}deg)`,
                fontSize: spot.size,
                textShadow: "0 0 26px rgba(233,200,121,.5)",
              }}
            >
              {text}
            </span>
          );
        })}
      </div>

      <div className="relative z-[2] max-w-[780px]">
        <Reveal>
          <div className="mb-[clamp(24px,4vh,40px)] flex items-center gap-3">
            <span className="block h-px w-[26px] bg-gold" aria-hidden />
            <span className="eyebrow">{eyebrow}</span>
          </div>
        </Reveal>

        <WordReveal
          as="h1"
          text={headline}
          highlight={highlight}
          delay={0.06}
          className="display-serif m-0 text-[clamp(52px,9.2vw,148px)] text-fg"
        />

        <Reveal delay={0.42}>
          <p className="mt-[clamp(26px,4vh,40px)] max-w-[30em] text-pretty text-[clamp(15px,1.35vw,19px)] leading-[1.65] text-muted">
            {subhead}
          </p>
        </Reveal>

        <Reveal delay={0.52}>
          <div className="mt-[clamp(30px,5vh,46px)] flex flex-wrap items-center gap-3.5">
            <Magnetic>
              <Button href={primaryCta.href} variant="primary" size="lg" withArrow>
                {primaryCta.label}
              </Button>
            </Magnetic>
            <Magnetic>
              <Button href={secondaryCta.href} variant="secondary" size="lg">
                {secondaryCta.label}
              </Button>
            </Magnetic>
          </div>
        </Reveal>

        <Reveal delay={0.62}>
          <div className="mt-[clamp(28px,4vh,42px)] flex items-center gap-2.5">
            <span
              className="block h-1.5 w-1.5 rounded-full bg-gold animate-pulse-dot"
              aria-hidden
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              {meta}
            </span>
          </div>
        </Reveal>
      </div>

      <div className="absolute bottom-[26px] left-5 z-[2] flex items-center gap-3.5 sm:left-8 lg:left-16">
        <span className="relative block h-[46px] w-px overflow-hidden bg-gold/25" aria-hidden>
          <span className="absolute inset-0 bg-gradient-to-b from-gold to-transparent animate-scrollhint" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
          Scroll
        </span>
      </div>
    </section>
  );
}
