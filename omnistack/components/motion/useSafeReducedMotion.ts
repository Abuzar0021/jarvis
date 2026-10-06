"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * SSR-safe prefers-reduced-motion.
 *
 * Framer's `useReducedMotion` reads matchMedia during the first client render,
 * but the server has no media query and always renders the animated branch.
 * Any component that changes its markup on that flag then hydrates against
 * mismatched HTML and React throws the whole subtree away.
 *
 * useSyncExternalStore fixes it properly: React uses `getServerSnapshot`
 * during hydration, so the first client render matches the server, then it
 * re-renders with the real value and stays subscribed to changes.
 */
export function useSafeReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false, // server: assume motion is allowed, matching the SSR markup
  );
}
