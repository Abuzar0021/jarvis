"use client";

import { useEffect, useSyncExternalStore } from "react";
import { audioEngine } from "@/lib/audio";

function useSoundEnabled() {
  return useSyncExternalStore(
    (cb) => audioEngine.subscribe(cb),
    () => audioEngine.isEnabled(),
    () => true, // server snapshot: sound is armed by default
  );
}

export function SoundToggle({ className }: { className?: string }) {
  const enabled = useSoundEnabled();

  useEffect(() => {
    audioEngine.init();
  }, []);

  return (
    <button
      type="button"
      onClick={() => audioEngine.setEnabled(!enabled)}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn sound off" : "Turn sound on"}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-[color,border-color,transform] ease-snap active:scale-[0.97] ${
        enabled
          ? "border-gold/50 text-gold hover-hover:hover:border-gold hover-hover:hover:text-gold-bright"
          : "border-hair text-muted hover-hover:hover:border-gold/50 hover-hover:hover:text-fg"
      } ${className ?? ""}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 9v6h4l5 4V5L8 9H4z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {enabled ? (
          <path
            d="M16 8.5a5 5 0 010 7M18.5 6a8 8 0 010 12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        ) : (
          <path d="M17 9.5l4 5m0-5l-4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        )}
      </svg>
      Sound {enabled ? "on" : "off"}
    </button>
  );
}
