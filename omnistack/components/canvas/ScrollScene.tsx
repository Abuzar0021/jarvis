"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Canvas } from "@react-three/fiber";
import { useMotionValue, useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { StardustPlane, type StardustHandle } from "./StardustPlane";
import { GoldenGrid } from "./GoldenGrid";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import { StageContext } from "./StageContext";
import { Button } from "@/components/ui/Button";
import type { Scene } from "@/lib/scenes";

function hasWebgl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

gsap.registerPlugin(ScrollTrigger);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type Cta = { label: string; href: string };

export function ScrollScene({
  scene,
  eager,
  coord,
  eyebrow,
  body,
  meta,
  primaryCta,
  secondaryCta,
  children,
}: {
  scene: Scene;
  eager?: boolean;
  /** Small corner reference label (e.g. "SYS_REF // 00.02"), matching the wipe stage's motif. */
  coord?: string;
  eyebrow?: string;
  body?: string;
  meta?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
  /** Bespoke foreground (e.g. a card deck or pipeline diagram) instead of the headline/body/cta layout. Receives useStage().fallback. */
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [narrow, setNarrow] = useState(false);
  const [visible, setVisible] = useState(Boolean(eager));
  const [noWebgl, setNoWebgl] = useState(false);
  const dummyProgress = useMotionValue(0);

  useEffect(() => {
    // One-shot capability check (WebGL support can't change at runtime), not
    // a subscription, so there's nothing to react to beyond this mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hasWebgl()) setNoWebgl(true);
  }, []);

  const outerRef = useRef<HTMLDivElement>(null);
  const stardustRef = useRef<StardustHandle>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLParagraphElement>(null);
  const techRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const fallback = Boolean(reduce) || narrow;
  // Existing act components (WorkAct, AIAct, ProofAct) read useStage().fallback
  // to switch between animated and static rendering; the shared progress value
  // is unused by any of them, so a stable dummy MotionValue is sufficient here.
  const stageValue = useMemo(() => ({ progress: dummyProgress, fallback }), [dummyProgress, fallback]);

  // Lazy-mount the WebGL canvas only once the scene nears the viewport, and
  // unmount (disposing the GL context/textures) once it scrolls well away.
  useEffect(() => {
    if (fallback || eager) return;
    const el = outerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fallback, eager]);

  useEffect(() => {
    if (fallback) return;
    const el = outerRef.current;
    if (!el) return;

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        stardustRef.current?.setProgress(p);

        const reveal = clamp01((p - 0.14) / 0.34);
        if (eyebrowRef.current) eyebrowRef.current.style.opacity = String(reveal);
        if (headlineRef.current) {
          headlineRef.current.style.opacity = String(reveal);
          headlineRef.current.style.transform = `translateY(${(1 - reveal) * 36}px) scale(${0.95 + reveal * 0.05})`;
        }

        const bodyReveal = clamp01((p - 0.26) / 0.34);
        if (bodyRef.current) {
          bodyRef.current.style.opacity = String(bodyReveal);
          bodyRef.current.style.transform = `translateY(${(1 - bodyReveal) * 22}px)`;
        }

        const ctaReveal = clamp01((p - 0.34) / 0.32);
        if (ctaRef.current) {
          ctaRef.current.style.opacity = String(ctaReveal);
          ctaRef.current.style.transform = `translateY(${(1 - ctaReveal) * 16}px)`;
        }
        if (metaRef.current) metaRef.current.style.opacity = String(ctaReveal);

        const techReveal = clamp01((p - 0.5) / 0.4);
        if (techRef.current) {
          techRef.current.style.opacity = String(techReveal);
          techRef.current.style.transform = `translate3d(-50%, ${(1 - techReveal) * 18 - 50}%, 0)`;
        }

        const blinkIn = clamp01((p - 0.6) / 0.4);
        if (loopRef.current) loopRef.current.style.opacity = String(blinkIn);

        if (gridRef.current && scene.golden) {
          const gridOut = 1 - clamp01(p / 0.32);
          gridRef.current.style.opacity = String(gridOut);
          gridRef.current.style.transform = `scale(${1 - p * 0.45})`;
        }
      },
    });

    return () => st.kill();
  }, [fallback, scene.golden]);

  if (fallback) {
    return (
      <section
        ref={outerRef}
        data-nav-hero
        data-nav-tone="dark"
        className="relative isolate min-h-screen w-full overflow-hidden bg-black"
      >
        <Image src={scene.bg} alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative z-10 flex min-h-screen flex-col justify-center px-6 py-24">
          {children ? (
            <StageContext.Provider value={stageValue}>{children}</StageContext.Provider>
          ) : (
            <div className="flex flex-col items-center text-center">
              {eyebrow ? (
                <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/60">{eyebrow}</span>
              ) : null}
              <h1 className="mt-5 max-w-4xl font-serif text-[clamp(2.25rem,8vw,5.5rem)] leading-[0.98] text-white">
                {scene.headline}
              </h1>
              {body ? <p className="mt-6 max-w-xl text-lg text-white/75">{body}</p> : null}
              {primaryCta || secondaryCta ? (
                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                  {primaryCta ? (
                    <Button href={primaryCta.href} variant="light" size="lg" withArrow>
                      {primaryCta.label}
                    </Button>
                  ) : null}
                  {secondaryCta ? (
                    <Button href={secondaryCta.href} variant="lightOutline" size="lg">
                      {secondaryCta.label}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {meta ? <p className="mt-8 text-sm text-white/55">{meta}</p> : null}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <div ref={outerRef} data-nav-hero data-nav-tone="dark" className="relative h-[300vh] w-full bg-black">
      <div className="sticky top-0 h-screen w-screen overflow-hidden bg-black isolate">
        {visible && !noWebgl ? (
          <CanvasErrorBoundary
            fallback={<Image src={scene.bg} alt="" fill sizes="100vw" className="object-cover" />}
          >
            <Canvas
              dpr={[1, 2]}
              orthographic
              gl={{ antialias: true, alpha: false }}
              className="absolute inset-0"
            >
              <StardustPlane ref={stardustRef} src={scene.bg} />
            </Canvas>
          </CanvasErrorBoundary>
        ) : visible ? (
          <Image src={scene.bg} alt="" fill sizes="100vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-black" />
        )}

        {scene.loop ? (
          <video
            ref={loopRef}
            src={scene.loop}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-0"
            style={{ mixBlendMode: "normal" }}
          />
        ) : null}

        {scene.golden ? <GoldenGrid ref={gridRef} /> : null}

        {scene.tech ? (
          <div
            ref={techRef}
            className="absolute h-32 w-32 opacity-0 drop-shadow-[0_0_24px_rgba(255,255,255,0.35)] sm:h-40 sm:w-40"
            style={{
              left: `${scene.techPosition?.x ?? 50}%`,
              top: `${scene.techPosition?.y ?? 50}%`,
              transform: "translate3d(-50%,-50%,0)",
            }}
          >
            <Image src={scene.tech} alt="" fill className="object-contain" />
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-24 bg-gradient-to-b from-black/45 to-transparent" />

        {coord ? (
          <span
            className="pointer-events-none absolute left-5 top-[84px] z-30 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50 sm:left-8"
            aria-hidden
          >
            {coord}
          </span>
        ) : null}

        {children ? (
          <div className="relative z-20 flex h-full flex-col justify-center py-24">
            <StageContext.Provider value={stageValue}>{children}</StageContext.Provider>
          </div>
        ) : (
          <div className="relative z-20 flex h-full flex-col items-center justify-center px-6 text-center">
            {eyebrow ? (
              <span
                ref={eyebrowRef}
                className="font-mono text-xs uppercase tracking-[0.3em] text-white/60 opacity-0"
              >
                {eyebrow}
              </span>
            ) : null}
            <h1
              ref={headlineRef}
              className="mt-5 max-w-4xl font-serif text-[clamp(2.5rem,8.5vw,6.5rem)] leading-[0.96] text-white opacity-0 will-change-transform"
            >
              {scene.headline}
            </h1>
            {body ? (
              <p ref={bodyRef} className="mt-6 max-w-xl text-lg text-white/75 opacity-0 will-change-transform">
                {body}
              </p>
            ) : null}
            {primaryCta || secondaryCta ? (
              <div
                ref={ctaRef}
                className="mt-9 flex flex-col gap-3 opacity-0 will-change-transform sm:flex-row sm:items-center"
              >
                {primaryCta ? (
                  <Button href={primaryCta.href} variant="light" size="lg" withArrow>
                    {primaryCta.label}
                  </Button>
                ) : null}
                {secondaryCta ? (
                  <Button href={secondaryCta.href} variant="lightOutline" size="lg">
                    {secondaryCta.label}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {meta ? (
              <p ref={metaRef} className="mt-8 text-sm text-white/55 opacity-0">
                {meta}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
