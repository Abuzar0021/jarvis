"use client";

import { type ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { useStage } from "./StageContext";
import { ArtLayer } from "./ArtLayer";

/**
 * One full-screen act in the wipe stage. On the shared timeline each act slides
 * up over the previous one (translateY 100% -> 0), then recedes into z-space
 * (scale 1 -> 0.9, opacity 1 -> 0) as the next act wipes over it. The foreground
 * copy fades in on its own curve, only after the painting is most of the way up,
 * so the centered text is never seen mid-clip during the slide. Act 0 has no
 * entrance (starts at rest); the final act has no exit (never recedes). In the
 * fallback it renders as a plain full-height section.
 */
export function Act({
  index,
  acts,
  art,
  coord,
  children,
}: {
  index: number;
  acts: number;
  art: string;
  coord?: string;
  children: ReactNode;
}) {
  const { progress, fallback } = useStage();
  const step = 1 / Math.max(1, acts - 1);
  const isFirst = index === 0;
  const isLast = index === acts - 1;
  const enterStart = (index - 1) * step;

  // Framer maps each scroll-linked transform's input range onto WAAPI keyframe
  // offsets, so every range must stay within [0, 1]. The first act has no
  // entrance (starts at rest) and the last act has no exit (never recedes), so
  // those get constant transforms over a valid [0, 1] range.
  const y = useTransform(
    progress,
    isFirst ? [0, 1] : [enterStart, index * step],
    isFirst ? ["0%", "0%"] : ["100%", "0%"],
    { clamp: true },
  );
  const scale = useTransform(
    progress,
    isLast ? [0, 1] : [index * step, (index + 1) * step],
    isLast ? [1, 1] : [1, 0.9],
    { clamp: true },
  );
  const opacity = useTransform(
    progress,
    isLast ? [0, 1] : [index * step, (index + 1) * step],
    isLast ? [1, 1] : [1, 0],
    { clamp: true },
  );
  // Foreground copy fades in over the last stretch of the entrance, reaching
  // full opacity just after the painting has wiped ~80% up. Until then it stays
  // hidden, so the reader never sees the centered headline clipped by the
  // viewport edge while the section is still sliding into place.
  const contentOpacity = useTransform(
    progress,
    isFirst ? [0, 1] : [enterStart + step * 0.62, enterStart + step * 0.92],
    isFirst ? [1, 1] : [0, 1],
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
        <ArtLayer src={art} eager={index === 0} />
        <div className="relative z-20">{foreground}</div>
      </section>
    );
  }

  return (
    <motion.section
      style={{ y, scale, opacity, zIndex: index }}
      className="absolute inset-0 isolate overflow-hidden will-change-transform"
    >
      <ArtLayer src={art} eager={index === 0} />
      <motion.div
        style={{ opacity: contentOpacity }}
        className="absolute inset-0 z-20 will-change-[opacity]"
      >
        {foreground}
      </motion.div>
    </motion.section>
  );
}
