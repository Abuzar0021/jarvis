import { cn } from "@/lib/utils";

// Clean bar-chart heights for the decorative "Lighthouse" widget. The last bar
// is highlighted to echo the score.
const SPARK = [40, 62, 54, 78, 70, 92, 98];

/**
 * Floating glass tech props for the hero act: a code badge, a Lighthouse data
 * card, and an AI CORE chip, bobbing over the full-bleed painting as decorative
 * HUD hardware. pointer-events-none and lg+ only so they never crowd the copy or
 * block the CTAs; the bob freezes under prefers-reduced-motion (global rule).
 */
export function HeroArtCanvas() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
      {/* Code badge */}
      <div
        className="absolute right-[7%] top-[22%] animate-bob"
        style={{ animationDelay: "-1.2s", animationDuration: "6.5s" }}
      >
        <div className="rounded-2xl border border-white/20 bg-white/10 p-3 shadow-[0_18px_50px_-20px_rgba(47,224,238,0.6)] backdrop-blur-md">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 font-mono text-sm text-[#12100b]">
            {"</>"}
          </div>
        </div>
      </div>

      {/* AI CORE chip */}
      <div
        className="absolute right-[11%] top-[40%] animate-bob"
        style={{ animationDelay: "-3.4s", animationDuration: "7.5s" }}
      >
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 shadow-[0_18px_50px_-20px_rgba(255,47,160,0.6)] backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--neon-magenta)] opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--neon-magenta)]" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/85">
            AI CORE
          </span>
        </div>
      </div>

      {/* Data card */}
      <div
        className="absolute bottom-[16%] right-[8%] animate-bob"
        style={{ animationDelay: "-2.1s", animationDuration: "8s" }}
      >
        <div className="w-[152px] rounded-2xl border border-white/20 bg-white/10 p-3.5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/60">
            Lighthouse
          </p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="display text-2xl leading-none text-white">98</span>
            <span className="text-[11px] text-white/60">/ 100</span>
          </p>
          <div className="mt-2 flex h-8 items-end gap-1">
            {SPARK.map((h, i) => (
              <span
                key={i}
                className={cn(
                  "w-full rounded-sm",
                  i === SPARK.length - 1 ? "bg-[var(--neon-cyan)]" : "bg-white/25",
                )}
                style={{ height: `${6 + h * 0.22}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
