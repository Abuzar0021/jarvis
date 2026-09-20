"use client";

import { useRef, type ReactNode } from "react";
import { audioEngine } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useSafeReducedMotion } from "./useSafeReducedMotion";

/**
 * The design's `data-tilt` card: perspective tilt toward the cursor, a gold
 * radial sheen that tracks the pointer, and a lifted border/shadow. Springs
 * back on leave. Static under prefers-reduced-motion.
 */
export function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const reduce = useSafeReducedMotion();

  const base = cn(
    "relative overflow-hidden rounded-[4px] border border-hair bg-card",
    className,
  );

  if (reduce) {
    return <div className={base}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={cn(base, "will-change-transform [transform-style:preserve-3d]")}
      style={{
        transition:
          "transform .45s cubic-bezier(.16,1,.3,1), border-color .4s ease, box-shadow .5s ease",
      }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.transition =
          "transform .12s linear, border-color .4s ease, box-shadow .5s ease";
        el.style.transform = `perspective(900px) rotateY(${((px - 0.5) * 13).toFixed(
          2,
        )}deg) rotateX(${((0.5 - py) * 13).toFixed(2)}deg) translateY(-10px) scale(1.015)`;
        el.style.borderColor = "rgba(198,161,91,.5)";
        el.style.boxShadow = "0 30px 70px rgba(0,0,0,.55)";
        const sheen = sheenRef.current;
        if (sheen) {
          sheen.style.opacity = "1";
          sheen.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
          sheen.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        }
      }}
      onPointerEnter={() => audioEngine.hover()}
      onPointerLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.style.transition =
          "transform .7s cubic-bezier(.22,1.3,.3,1), border-color .4s ease, box-shadow .5s ease";
        el.style.transform = "none";
        el.style.borderColor = "";
        el.style.boxShadow = "none";
        if (sheenRef.current) sheenRef.current.style.opacity = "0";
      }}
    >
      <div
        ref={sheenRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[350ms]"
        style={{
          background:
            "radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), rgba(233,200,121,.16), transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}
