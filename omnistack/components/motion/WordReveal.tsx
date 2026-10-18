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
  eager = false,
}: {
  text: string;
  /** Case-insensitive word to italicise in gold. Punctuation is ignored. */
  highlight?: string;
  className?: string;
  delay?: number;
  as?: keyof typeof TAGS;
  /**
   * Run the reveal from CSS instead of motion. Set this on anything above the
   * fold, and never anywhere else.
   *
   * The motion path holds every word at opacity 0 until the library hydrates.
   * On the hero that made the headline the largest contentful paint and pinned
   * it to whenever the JS bundle finished, measured at 6.4s against a 1.7s
   * first paint on a throttled phone. CSS animates from the moment styles
   * apply, so the same reveal costs nothing and waits for nothing.
   */
  eager?: boolean;
}) {
  const reduce = useSafeReducedMotion();
  const words = text.split(" ").filter(Boolean);
  const key = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  const hit = highlight ? key(highlight) : null;
  const MotionTag = TAGS[as];

  if (eager) {
    const Tag = as;
    return (
      <Tag className={cn("word-rise text-balance", className)}>
        {words.map((w, i) => (
          <Fragment key={`${w}-${i}`}>
            {i > 0 ? " " : null}
            <span
              className={cn(
                "inline-block",
                hit && key(w) === hit && "serif-accent text-gold",
              )}
              style={
                {
                  "--i": i,
                  "--rot": i % 2 ? "-3deg" : "4deg",
                  ...(hit && key(w) === hit
                    ? { textShadow: "0 0 46px rgba(198,161,91,.45)" }
                    : null),
                } as React.CSSProperties
              }
            >
              {w}
            </span>
          </Fragment>
        ))}
      </Tag>
    );
  }

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
              hidden: {
                opacity: 0,
                transform: `translateY(38px) rotate(${i % 2 ? -3 : 4}deg)`,
              },
              shown: { opacity: 1, transform: "translateY(0px) rotate(0deg)" },
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
