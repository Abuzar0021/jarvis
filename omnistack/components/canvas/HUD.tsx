"use client";

import { motion, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { useStage } from "./StageContext";

function Cross({ className }: { className?: string }) {
  return (
    <svg
      className={cn("absolute h-3.5 w-3.5 text-white/40", className)}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
    >
      <path d="M7 0v14M0 7h14" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/**
 * Tech-hardware overlay for the pinned stage: corner crosshairs, a fixed system
 * label, and a live scroll-coordinate readout bound to the shared timeline.
 * pointer-events-none; hidden in the reduced-motion / mobile fallback.
 */
export function HUD() {
  const { progress, fallback } = useStage();
  const pct = useTransform(
    progress,
    (v) => `${String(Math.round(v * 100)).padStart(3, "0")}%`,
  );
  if (fallback) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 font-mono text-[10px] uppercase tracking-[0.22em] text-white/45"
      aria-hidden
    >
      <Cross className="left-4 top-[84px]" />
      <Cross className="right-4 top-[84px]" />
      <Cross className="bottom-6 left-4" />
      <Cross className="bottom-6 right-4" />
      <span className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 sm:inline">
        OMNISTACK // CANVAS
      </span>
      <span className="absolute bottom-6 right-10 flex items-center gap-2">
        SCROLL
        <motion.span className="text-[var(--neon-cyan)]">{pct}</motion.span>
      </span>
    </div>
  );
}
