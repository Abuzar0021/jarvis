"use client";

import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Full-bleed painting layer for an act. The classical oil bleeds edge to edge,
 * seated in shadow so the copy stays legible, with two drifting cyan/magenta
 * radial blobs blended onto the brushstrokes via mix-blend-screen so the neon
 * light physically reacts to the paint. Drift is frozen under reduced motion.
 */
export function ArtLayer({ src, eager = false }: { src: string; eager?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 isolate overflow-hidden bg-[#0b0a07]" aria-hidden>
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        loading={eager ? "eager" : "lazy"}
        className="object-cover object-center opacity-90"
      />

      {/* Seat the painting in shadow (vignette + bottom fade) */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_130%_at_50%_12%,rgba(8,6,4,0.12)_0%,rgba(8,6,4,0.82)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#060503]/85" />

      {/* Duotone neon, blended onto the oil paint */}
      <div
        className={cn(
          "absolute left-[-12%] top-[-12%] h-[75%] w-[75%] rounded-full opacity-60 mix-blend-screen blur-3xl",
          !reduce && "animate-shift-glow",
        )}
        style={{ background: "radial-gradient(closest-side, var(--neon-cyan), transparent 70%)" }}
      />
      <div
        className={cn(
          "absolute bottom-[-12%] right-[-12%] h-[80%] w-[80%] rounded-full opacity-55 mix-blend-screen blur-3xl",
          !reduce && "animate-shift-glow-alt",
        )}
        style={{ background: "radial-gradient(closest-side, var(--neon-magenta), transparent 70%)" }}
      />
    </div>
  );
}
