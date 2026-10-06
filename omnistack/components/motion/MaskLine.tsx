"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useSafeReducedMotion } from "./useSafeReducedMotion";

/**
 * The pricing page's `.mask-line`: a clipped row whose contents slide up from
 * fully below the mask. Use one per visual line of a headline.
 */
export function MaskLine({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useSafeReducedMotion();

  if (reduce) return <span className={cn("block", className)}>{children}</span>;

  return (
    <span className={cn("block overflow-hidden", className)}>
      <motion.span
        className="block"
        initial={{ y: "105%" }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}
