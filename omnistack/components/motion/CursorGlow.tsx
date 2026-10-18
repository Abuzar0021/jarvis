"use client";

import { useEffect, useRef } from "react";
import { useSafeReducedMotion } from "./useSafeReducedMotion";

/**
 * Faint ambient light that drifts toward the cursor. Purely decorative -
 * mutates a ref'd element's transform directly rather than via state, and
 * is skipped entirely under prefers-reduced-motion.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useSafeReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;

    let raf = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;
    let seen = false;

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      // The design keeps the glow hidden until the pointer first moves, so it
      // never flashes centre-screen on load.
      if (!seen) {
        seen = true;
        if (ref.current) ref.current.style.opacity = "1";
      }
    };

    const tick = () => {
      x += (targetX - x) * 0.12;
      y += (targetY - y) * 0.12;
      const el = ref.current;
      if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 -ml-[320px] -mt-[320px] h-[640px] w-[640px] opacity-0 mix-blend-screen transition-opacity duration-500 z-[2]"
      style={{
        background:
          "radial-gradient(circle, rgba(198,161,91,.16) 0%, rgba(198,161,91,.07) 32%, rgba(198,161,91,0) 62%)",
      }}
    />
  );
}
