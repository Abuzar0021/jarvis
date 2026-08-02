"use client";

import { useState } from "react";
import { showToast } from "@/components/motion/Toast";

/**
 * The design's footer easter egg. Toggling it warms the whole page and turns
 * the sculpture's lattice bright gold. Sculpture reads the same dataset flag
 * inside its existing render loop, so there is no shared state container.
 */
export function GildedEgg() {
  const [on, setOn] = useState(false);

  const toggle = () => {
    const next = !on;
    setOn(next);
    const root = document.documentElement;
    if (next) {
      root.dataset.gilded = "1";
      root.style.filter = "saturate(1.25) brightness(1.08)";
    } else {
      delete root.dataset.gilded;
      root.style.filter = "";
    }
    showToast(next ? "Gilded mode. Told you not to." : "Back to house gold.");
  };

  return (
    <button
      type="button"
      title="don't"
      aria-label={on ? "Turn off gilded mode" : "Turn on gilded mode"}
      aria-pressed={on}
      onClick={toggle}
      className={`block h-2 w-2 rounded-full transition-all duration-300 ${
        on
          ? "scale-150 bg-gold-bright shadow-[0_0_18px_rgba(233,200,121,.9)]"
          : "bg-gold/35 hover:scale-150 hover:bg-gold-bright hover:shadow-[0_0_18px_rgba(233,200,121,.9)]"
      }`}
    />
  );
}
