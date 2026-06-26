"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

export function Counter({
  value,
  suffix = "",
  durationMs = 1400,
}: {
  value: string;
  suffix?: string;
  durationMs?: number;
}) {
  const target = parseFloat(value);
  const isNumeric = !Number.isNaN(target);
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(isNumeric && !reduce ? 0 : target);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!isNumeric || reduce) {
      setDisplay(target);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / durationMs, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(target * eased));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [isNumeric, reduce, target, durationMs]);

  if (!isNumeric) {
    return (
      <span>
        {value}
        {suffix}
      </span>
    );
  }

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}
