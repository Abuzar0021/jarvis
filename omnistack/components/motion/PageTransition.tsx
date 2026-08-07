"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useSafeReducedMotion } from "./useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Filmic route-change transition: the outgoing page fades/scales out, then
 * the incoming one fades/scales in. Nav/Footer live outside this (in the
 * site layout) so only the page content itself transitions. Skipped under
 * reduced motion, and on the very first load (no page to transition from).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useSafeReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, transform: "scale(0.985)" }}
        animate={{ opacity: 1, transform: "scale(1)" }}
        exit={{ opacity: 0, transform: "scale(0.985)" }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
