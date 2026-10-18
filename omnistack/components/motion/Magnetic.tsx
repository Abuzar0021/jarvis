"use client";

import { useRef, type ReactNode } from "react";
import { audioEngine } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useSafeReducedMotion } from "./useSafeReducedMotion";

/**
 * The design's `.om-mag` behaviour: the element leans toward the cursor while
 * hovered, then springs back on leave. Renders no DOM of its own - it clones
 * behaviour onto a wrapping span so any child (link, button) inherits it.
 *
 * Inert under prefers-reduced-motion.
 */
export function Magnetic({
  children,
  strength = 14,
  className,
}: {
  children: ReactNode;
  /** Max horizontal travel in px at the element's edge. Vertical uses ~0.7x. */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useSafeReducedMotion();

  // Display comes from a class, never an inline style: an inline
  // `display:inline-block` would beat a caller's `hidden` and leak the element
  // onto breakpoints where it should be gone.
  if (reduce) {
    return <span className={cn("inline-block", className)}>{children}</span>;
  }

  const settle = "transform .8s cubic-bezier(.22,1.5,.3,1)";
  const track = "transform .16s ease-out";

  return (
    <span
      ref={ref}
      className={cn("inline-block", className)}
      style={{ willChange: "transform" }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transition = track;
        el.style.transform = `translate(${(dx * strength).toFixed(1)}px, ${(
          dy *
          strength *
          0.7
        ).toFixed(1)}px) scale(1.03)`;
      }}
      onPointerLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.style.transition = settle;
        el.style.transform = "none";
      }}
      onPointerDown={() => audioEngine.pluck(392.0, 0.35)}
    >
      {children}
    </span>
  );
}
