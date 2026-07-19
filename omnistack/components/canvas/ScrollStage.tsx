"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion, useScroll } from "motion/react";
import { StageContext } from "./StageContext";

/**
 * The fixed-canvas scroll stage (Shopify Editions mechanic). A tall outer track
 * provides the scroll distance; an inner sticky layer pins to the viewport while
 * the track scrolls past it, so the acts inside can wipe over one another on a
 * single `useScroll` timeline. Under reduced motion or below lg, it degrades to
 * plain stacked sections in normal flow (no pin, no transforms).
 */
export function ScrollStage({
  units,
  children,
}: {
  units: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const fallback = Boolean(reduce) || narrow;

  if (fallback) {
    return (
      <StageContext.Provider value={{ progress: scrollYProgress, fallback: true }}>
        <div ref={ref} data-nav-hero data-nav-tone="dark" className="relative">
          {children}
        </div>
      </StageContext.Provider>
    );
  }

  return (
    <StageContext.Provider value={{ progress: scrollYProgress, fallback: false }}>
      <div
        ref={ref}
        data-nav-hero
        data-nav-tone="dark"
        style={{ height: `${units * 100}vh` }}
        className="relative"
      >
        <div className="sticky top-0 h-screen w-screen overflow-hidden bg-[#0b0a07] isolate">
          {children}
          {/* Top scrim so the transparent light nav stays legible over any act */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-24 bg-gradient-to-b from-black/45 to-transparent" />
        </div>
      </div>
    </StageContext.Provider>
  );
}
