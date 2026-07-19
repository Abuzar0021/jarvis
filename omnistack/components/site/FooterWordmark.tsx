"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { audioEngine } from "@/lib/audio";

const VW = 1200;
const VH = 240;
const PAD = 70;
const N = 7;
const SEGS = 28;

// Static layout (safe to map over during render).
const STRINGS = Array.from({ length: N }, (_, i) => ({
  y: PAD + (i * (VH - 2 * PAD)) / (N - 1),
  opacity: 0.55 + (i / N) * 0.35,
}));

function waveD(y: number, amp: number, phase: number, cycles = 2.4) {
  const x1 = PAD;
  const x2 = VW - PAD;
  let d = `M ${x1} ${y}`;
  for (let i = 1; i <= SEGS; i++) {
    const t = i / SEGS;
    const env = Math.sin(Math.PI * t); // pinned at both ends
    const wobble = Math.sin(Math.PI * 2 * cycles * t + phase);
    const x = x1 + (x2 - x1) * t;
    d += ` L ${x.toFixed(1)} ${(y + wobble * amp * env).toFixed(1)}`;
  }
  return d;
}

/**
 * Interactive footer centerpiece: seven neon strings, evenly stacked like the
 * OmniStack mark, that you can pluck with the cursor. Each string rings with a
 * damped sine wave (redrawn each frame) and plays a synthesized note from the
 * audio engine. Purely decorative delight, so the SVG is aria-hidden and the
 * accessible control is the sound toggle. Static (no ring) under reduced motion.
 */
export function FooterWordmark() {
  const reduce = useReducedMotion();
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const anim = useRef(STRINGS.map((_, i) => ({ amp: 0, phase: 0, speed: 18 + i * 1.5 })));
  const raf = useRef(0);

  useEffect(() => {
    if (reduce) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      anim.current.forEach((s, i) => {
        if (s.amp > 0.15) {
          s.phase += s.speed * dt;
          s.amp -= s.amp * 3.0 * dt;
          if (s.amp < 0.15) s.amp = 0;
          pathRefs.current[i]?.setAttribute("d", waveD(STRINGS[i].y, s.amp, s.phase));
        }
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [reduce]);

  function pluck(i: number) {
    audioEngine.pluckNote(i, 0.45 + (i / N) * 0.35);
    if (reduce) return;
    const s = anim.current[i];
    s.amp = 22;
    s.phase = 0;
  }

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        aria-hidden
        style={{ pointerEvents: "auto" }}
      >
        <defs>
          <linearGradient id="fw-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2fe0ee" />
            <stop offset="0.5" stopColor="#ff2fa0" />
            <stop offset="1" stopColor="#2fe0ee" />
          </linearGradient>
        </defs>
        {STRINGS.map((s, i) => (
          <g key={i}>
            {/* wide invisible hit area so thin strings are easy to pluck */}
            <path
              d={`M ${PAD} ${s.y} L ${VW - PAD} ${s.y}`}
              stroke="transparent"
              strokeWidth={22}
              fill="none"
              style={{ pointerEvents: "stroke", cursor: "pointer" }}
              onPointerEnter={() => pluck(i)}
              onPointerDown={() => pluck(i)}
            />
            <path
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
              d={`M ${PAD} ${s.y} L ${VW - PAD} ${s.y}`}
              stroke="url(#fw-gold)"
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              opacity={s.opacity}
            />
          </g>
        ))}
      </svg>
      <p className="pointer-events-none mt-3 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted/60">
        Pluck the strings
      </p>
    </div>
  );
}
