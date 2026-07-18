"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor-following highlight for card hover states. Drop as a child of any
 * `relative` element with the `group` class — it finds its own parent and
 * tracks the cursor within it, so the Server Component rendering the card
 * never has to pass an event handler across the server/client boundary.
 */
export function Spotlight() {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const onMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
    };

    parent.addEventListener("mousemove", onMove);
    return () => parent.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      style={{
        background:
          "radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(143,95,40,0.08), transparent 70%)",
      }}
    />
  );
}
