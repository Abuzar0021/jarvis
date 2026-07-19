"use client";

import { type ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { useStage } from "./StageContext";
import { ArtLayer } from "./ArtLayer";

/**
 * One act in the wipe stage, positioned on the shared timeline by units. An act
 * occupies `spanUnits` units starting at `unitStart` (of `totalUnits`). It wipes
 * up over its first unit (translateY 100% -> 0), then recedes (scale + opacity)
 * as the next act wipes over it. The foreground copy fades in on view (once the
 * act is most of the way up), so centered text is never seen clipped mid-slide;
 * the first act's copy is visible on load. Every input range stays within [0,1]
 * (WAAPI offsets). In the fallback it renders as a plain full-height section.
 */
export function Act({
  unitStart,
  spanUnits = 1,
  totalUnits,
  art,
  coord,
  children,
}: {
  unitStart: number;
  spanUnits?: number;
  totalUnits: number;
  art: string;
  coord?: string;
  children: ReactNode;
}) {
  const { progress, fallback } = useStage();
  const step = 1 / Math.max(1, totalUnits);
  const isFirst = unitStart === 0;
  const isLast = unitStart + spanUnits >= totalUnits;
  const start = unitStart * step;
  const exitStart = (unitStart + spanUnits) * step;

  const y = useTransform(
    progress,
    isFirst ? [0, 1] : [start, start + step],
    isFirst ? ["0%", "0%"] : ["100%", "0%"],
    { clamp: true },
  );
  const scale = useTransform(
    progress,
    isLast ? [0, 1] : [exitStart, exitStart + step],
    isLast ? [1, 1] : [1, 0.9],
    { clamp: true },
  );
  const opacity = useTransform(
    progress,
    isLast ? [0, 1] : [exitStart, exitStart + step],
    isLast ? [1, 1] : [1, 0],
    { clamp: true },
  );

  const foreground = (
    <>
      {coord ? (
        <span
          className="pointer-events-none absolute left-5 top-[84px] z-30 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50 sm:left-8"
          aria-hidden
        >
          {coord}
        </span>
      ) : null}
      <div className="flex h-full min-h-screen flex-col justify-center py-24">
        {children}
      </div>
    </>
  );

  if (fallback) {
    return (
      <section className="relative isolate min-h-screen w-full overflow-hidden bg-[#0b0a07]">
        <ArtLayer src={art} eager={isFirst} />
        <div className="relative z-20">{foreground}</div>
      </section>
    );
  }

  return (
    <motion.section
      style={{ y, scale, opacity, zIndex: unitStart }}
      className="absolute inset-0 isolate overflow-hidden will-change-transform"
    >
      <ArtLayer src={art} eager={isFirst} />
      {isFirst ? (
        <div className="absolute inset-0 z-20">{foreground}</div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-20"
        >
          {foreground}
        </motion.div>
      )}
    </motion.section>
  );
}
