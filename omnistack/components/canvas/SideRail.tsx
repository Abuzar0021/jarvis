"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Side progress rail spanning the run of pinned <ScrollScene> sections (the
 * reference site's side-nav mechanic). Each scene is independently pinned via
 * its own GSAP ScrollTrigger, so there's no single shared progress value here;
 * instead this reads window.scrollY directly against the combined bounding
 * box of every [data-nav-hero] section, matching how Nav treats the same run
 * as one continuous block. Stops are real buttons that jump to a scene via
 * Lenis (falling back to native smooth scroll). Hidden under reduced motion
 * or below the lg breakpoint, where scenes render as plain static sections.
 */
export function SideRail({ count }: { count: number }) {
  const reduce = useReducedMotion();
  const [narrow, setNarrow] = useState(false);
  const [active, setActive] = useState(0);
  const [fill, setFill] = useState(0);
  const [inRun, setInRun] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduce || narrow) return;

    const onScroll = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-hero]"));
      if (!sections.length) return;
      const tops = sections.map((el) => el.getBoundingClientRect().top + window.scrollY);
      const runTop = tops[0]!;
      const runBottom = tops[tops.length - 1]! + sections[sections.length - 1]!.offsetHeight;
      const runHeight = runBottom - runTop - window.innerHeight;
      const p = runHeight > 0 ? (window.scrollY - runTop) / runHeight : 0;
      setFill(Math.min(1, Math.max(0, p)));
      // The rail only makes sense while the pinned scene run is on screen;
      // hide it once the page has scrolled into the lighter coda below.
      setInRun(window.scrollY < runBottom);

      const centerY = window.scrollY + window.innerHeight / 2;
      let current = 0;
      tops.forEach((top, i) => {
        if (centerY >= top) current = i;
      });
      setActive(Math.min(count - 1, current));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduce, narrow, count]);

  if (reduce || narrow || !inRun) return null;

  const jump = (i: number) => {
    const sections = document.querySelectorAll<HTMLElement>("[data-nav-hero]");
    const target = sections[i];
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY;
    if (window.__lenis) window.__lenis.scrollTo(top);
    else window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <nav
      aria-label="Sections"
      className="pointer-events-none fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
    >
      <div className="relative flex flex-col items-center gap-4">
        <div className="absolute bottom-2 top-2 w-px bg-white/15" aria-hidden />
        <div
          style={{ transform: `scaleY(${fill})` }}
          className="absolute bottom-2 top-2 w-px origin-top bg-[linear-gradient(180deg,var(--neon-cyan),var(--neon-magenta))]"
          aria-hidden
        />
        {Array.from({ length: count }, (_, i) => (
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
