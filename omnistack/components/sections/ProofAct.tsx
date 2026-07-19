"use client";

import { motion } from "motion/react";
import { Container } from "@/components/ui/Container";
import { useStage } from "@/components/canvas/StageContext";
import type { SiteContent } from "@/lib/types";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Proof act foreground: the real trust line as the statement, and the four real
 * stats as big numbers that rise in as the act scrolls into view. Static under
 * reduced motion / mobile (via useStage().fallback).
 */
export function ProofAct({
  stats,
  trustLabel,
}: {
  stats: SiteContent["stats"];
  trustLabel: string;
}) {
  const { fallback } = useStage();
  return (
    <Container className="relative w-full text-[#f4f1ea]">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-cyan)]" aria-hidden />
          By the numbers
        </span>
        <p className="display mt-6 text-balance text-[clamp(1.8rem,3.6vw,3.1rem)]">
          {trustLabel}
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            className="text-center"
            initial={fallback ? false : { opacity: 0, y: 22 }}
            whileInView={fallback ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: i * 0.1, duration: 0.55, ease: EASE }}
          >
            <div className="display text-[clamp(2.75rem,6vw,5rem)] leading-none text-white">
              {s.value}
              <span className="text-[var(--neon-cyan)]">{s.suffix}</span>
            </div>
            <div className="mt-3 text-sm text-white/60">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </Container>
  );
}
