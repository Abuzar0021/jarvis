"use client";

import { motion } from "motion/react";
import { useSafeReducedMotion } from "./useSafeReducedMotion";

/**
 * The design's `data-reveal="up"` / `.rv`: fade and rise into view once.
 * Timing matches the source (0.9s opacity, ease-snap, ~24px travel); the
 * design does not scale, so `scale` defaults to off but stays available.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  scale = 1,
  rotate = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  scale?: number;
  /** The design tilts its process rows +/-1.2deg as they rise. */
  rotate?: number;
  className?: string;
}) {
  const reduce = useSafeReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale, rotate }}
      whileInView={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
