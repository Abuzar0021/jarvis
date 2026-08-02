"use client";

import { Fragment } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useSafeReducedMotion } from "./useSafeReducedMotion";

/**
 * The design's `data-reveal="word"` headline: each word rises and un-rotates
 * on a stagger. Alternating words tilt opposite ways, matching the source.
 *
 * `highlight` italicises and golds a single word (the design's treatment of
 * "own." in the hero and "own" in the closing CTA).
 */
const TAGS = {
  h1: motion.h1,
  h2: motion.h2,
  p: motion.p,
} as const;

export function WordReveal({
  text,
  highlight,
  className,
  delay = 0,
  as = "h2",
}: {
  text: string;
  /** Case-insensitive word to italicise in gold. Punctuation is ignored. */
  highlight?: string;
  className?: string;
  delay?: number;
  as?: keyof typeof TAGS;
}) {
  const reduce = useSafeReducedMotion();
  const words = text.split(" ").filter(Boolean);
  const key = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  const hit = highlight ? key(highlight) : null;
  const MotionTag = TAGS[as];

  return (
    <MotionTag
      className={cn("text-balance", className)}
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "shown"}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ staggerChildren: 0.07, delayChildren: delay }}
    >
      {words.map((w, i) => (
        <Fragment key={`${w}-${i}`}>
          {/* space lives outside the inline-block so wrapping stays natural */}
          {i > 0 ? " " : null}
          <motion.span
            className={cn(
              "inline-block",
              hit && key(w) === hit && "serif-accent text-gold",
            )}
            style={
              hit && key(w) === hit
                ? { textShadow: "0 0 46px rgba(198,161,91,.45)" }
                : undefined
            }
            variants={{
              hidden: { opacity: 0, y: 38, rotate: i % 2 ? -3 : 4 },
              shown: { opacity: 1, y: 0, rotate: 0 },
            }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            {w}
          </motion.span>
        </Fragment>
      ))}
    </MotionTag>
  );
}
