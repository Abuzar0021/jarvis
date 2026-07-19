"use client";

import { motion } from "motion/react";
import { Container } from "@/components/ui/Container";
import { useStage } from "@/components/canvas/StageContext";
import type { SiteContent } from "@/lib/types";

// The pipeline stages (a process device requested in the brief). The real value
// copy lives in the left column; these are the flow labels only.
const STAGES = ["Trigger", "Qualify", "Enrich", "Act", "Outcome"];
const EASE = [0.16, 1, 0.3, 1] as const;

function Check() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--neon-cyan)]/50 text-[var(--neon-cyan)]">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M2.5 6.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/**
 * AI act foreground: the real aiShowcase copy on the left, and a chat-bubble
 * pipeline (Trigger -> Qualify -> Enrich -> Act -> Outcome) on the right whose
 * neon spine draws down and whose bubbles slide in as the act scrolls into
 * view. Static under reduced motion / mobile (via useStage().fallback).
 */
export function AIAct({ ai }: { ai: SiteContent["aiShowcase"] }) {
  const { fallback } = useStage();

  return (
    <Container className="relative w-full text-[#f4f1ea]">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
        {/* Copy */}
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-magenta)]" aria-hidden />
            {ai.eyebrow}
          </span>
          <h2 className="display-serif mt-6 text-balance text-[clamp(2.25rem,4.4vw,4rem)]">
            {ai.title}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/70">{ai.body}</p>
          <ul className="mt-7 space-y-3">
            {ai.points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] text-white/80">
                <Check />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Pipeline */}
        <div className="relative mx-auto w-full max-w-sm lg:mx-0">
          <span className="mb-4 block font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
            Agent pipeline
          </span>
          <div className="relative">
            {/* neon spine */}
            <motion.span
              className="absolute left-[9px] top-2 bottom-2 w-px origin-top bg-[linear-gradient(180deg,var(--neon-cyan),var(--neon-magenta))]"
              initial={fallback ? false : { scaleY: 0 }}
              whileInView={fallback ? undefined : { scaleY: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, ease: EASE }}
              aria-hidden
            />
            <ul className="space-y-3.5">
              {STAGES.map((s, i) => (
                <li key={s} className="relative flex items-center">
                  <motion.span
                    className="absolute left-[3px] z-10 h-3.5 w-3.5 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_12px_var(--neon-cyan)]"
                    initial={fallback ? false : { scale: 0 }}
                    whileInView={fallback ? undefined : { scale: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ delay: 0.2 + i * 0.12, duration: 0.4, ease: EASE }}
                    aria-hidden
                  />
                  <motion.div
                    className="ml-9 flex flex-1 items-center gap-3 rounded-2xl border border-white/15 bg-[#100e0a]/70 px-4 py-3.5 backdrop-blur"
                    initial={fallback ? false : { opacity: 0, x: 16 }}
                    whileInView={fallback ? undefined : { opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: EASE }}
                  >
                    <span className="font-mono text-[11px] text-[var(--neon-cyan)]">0{i + 1}</span>
                    <span className="font-medium text-white">{s}</span>
                    <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
                      {i === STAGES.length - 1 ? "done" : "step"}
                    </span>
                  </motion.div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Container>
  );
}
