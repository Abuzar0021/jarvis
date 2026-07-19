"use client";

import { useState } from "react";
import { motion, useMotionValueEvent } from "motion/react";
import { cn } from "@/lib/utils";
import { useStage } from "./StageContext";

/**
 * Side progress rail for the pinned act stage (the reference site's side-nav
 * mechanic): a thin vertical track whose neon fill grows with scroll progress,
 * with one numbered stop per act. Stops are real buttons that jump the page to
 * that act via Lenis (falling back to native smooth scroll). Hidden in the
 * reduced-motion / mobile fallback, where the stage is normal document flow.
 */
export function SideRail({ units }: { units: number }) {
  const { progress, fallback } = useStage();
  const [active, setActive] = useState(0);

  useMotionValueEvent(progress, "change", (p) => {
    // The entering act becomes "current" once it is more than halfway in.
    setActive(Math.min(units - 1, Math.max(0, Math.round(p * units) - 1)));
  });

  if (fallback) return null;

  const jump = (i: number) => {
    const track = document.querySelector<HTMLElement>("[data-nav-hero]");
    if (!track) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const scrollable = track.offsetHeight - window.innerHeight;
    const target = i === 0 ? top : top + ((i + 1) / units) * scrollable;
    if (window.__lenis) window.__lenis.scrollTo(target);
    else window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <nav
      aria-label="Sections"
      className="pointer-events-none absolute right-5 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
    >
      <div className="relative flex flex-col items-center gap-4">
        {/* progress track + neon fill */}
        <div className="absolute bottom-2 top-2 w-px bg-white/15" aria-hidden />
        <motion.div
          style={{ scaleY: progress }}
          className="absolute bottom-2 top-2 w-px origin-top bg-[linear-gradient(180deg,var(--neon-cyan),var(--neon-magenta))]"
          aria-hidden
        />
        {Array.from({ length: units }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to section ${String(i + 1).padStart(2, "0")}`}
            aria-current={active === i ? "true" : undefined}
            onClick={() => jump(i)}
            className={cn(
              "pointer-events-auto relative flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[10px] tracking-[0.08em] backdrop-blur-sm transition-colors",
              active === i
                ? "border-[var(--neon-cyan)]/70 bg-black/50 text-white shadow-[0_0_14px_rgba(47,224,238,0.45)]"
                : "border-white/20 bg-black/30 text-white/50 hover:border-white/50 hover:text-white",
            )}
          >
            {String(i + 1).padStart(2, "0")}
          </button>
        ))}
      </div>
    </nav>
  );
}
