"use client";

import { useEffect, useState } from "react";

/**
 * The design's bottom-centre toast pill. Module-level emitter so any client
 * component (the sculpture, the easter egg) can fire one without threading a
 * context through the tree. Mount <Toaster /> once, in the site layout.
 */
type Listener = (msg: string) => void;
const listeners = new Set<Listener>();

export function showToast(message: string) {
  listeners.forEach((l) => l(message));
}

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast: Listener = (m) => {
      setMsg(m);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2600);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-[34px] left-1/2 z-[60] rounded-full border border-gold/40 bg-card px-[22px] py-[13px] font-mono text-[11px] uppercase tracking-[0.2em] text-gold-bright shadow-[0_14px_50px_rgba(0,0,0,.6)] transition-all duration-[400ms] ease-snap"
      style={{
        opacity: msg ? 1 : 0,
        transform: `translate(-50%, ${msg ? "0" : "24px"})`,
      }}
    >
      {msg}
    </div>
  );
}
