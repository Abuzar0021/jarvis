"use client";

import { createContext, useContext } from "react";
import type { MotionValue } from "motion/react";

/**
 * Shared state for the Editions-style scroll stage. `progress` is the single
 * 0..1 scroll timeline every act maps its wipe transforms onto; `fallback` is
 * true under prefers-reduced-motion or below the lg breakpoint, where the stage
 * degrades to plain stacked sections in normal document flow.
 */
export type StageState = {
  progress: MotionValue<number>;
  fallback: boolean;
};

export const StageContext = createContext<StageState | null>(null);

export function useStage(): StageState {
  const ctx = useContext(StageContext);
  if (!ctx) {
    throw new Error("useStage must be used within <ScrollStage>");
  }
  return ctx;
}
