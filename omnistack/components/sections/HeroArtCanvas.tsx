import Image from "next/image";
import { cn } from "@/lib/utils";

// Clean bar-chart heights for the decorative "Lighthouse" widget. Static, so
// safe to map over in render. The final bar is highlighted to echo the score.
const SPARK = [40, 62, 54, 78, 70, 92, 98];

/**
 * The "Modern Classical" hero canvas: a framed classical portrait lit by a
 * slow, drifting cyan/magenta duotone glow, with a few glassmorphic widgets
 * bobbing around it. All motion is pure CSS (keyframes live in globals.css), so
 * this stays a server component with no client JS. The global reduced-motion
 * rule freezes every animation, and the drift + widgets are gated to lg+ so
 * small screens get a calm, static plate. The whole canvas is decorative chrome
 * around the real hero copy, hence aria-hidden.
 */
export function HeroArtCanvas({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[380px] lg:mr-0 lg:ml-auto lg:max-w-[540px]",
        className,
      )}
      style={{ perspective: "1200px" }}
      aria-hidden
    >
      {/* Framed art plate. isolate keeps the screen-blended glow inside. */}
      <div className="relative aspect-[5/7] isolate overflow-hidden rounded-[28px] border border-hair bg-card shadow-[0_50px_130px_-50px_rgba(27,22,14,0.5)]">
        <Image
          src="/art/portrait-dinner.webp"
          alt=""
          fill
          sizes="(min-width: 1024px) 540px, 90vw"
          loading="eager"
          className="object-cover object-center"
        />

        {/* Warm tie-in so the painting settles into the parchment palette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1b160e]/30 via-transparent to-[#1b160e]/5" />

        {/* Drifting duotone glow: two screen-blended lights on separate paths.
            Frozen below lg and under prefers-reduced-motion (global rule). */}
        <div
          className="pointer-events-none absolute -inset-[22%] rounded-full opacity-40 mix-blend-screen blur-2xl lg:animate-shift-glow"
          style={{
            background:
              "radial-gradient(closest-side, var(--neon-cyan), transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -inset-[22%] rounded-full opacity-35 mix-blend-screen blur-2xl lg:animate-shift-glow-alt"
          style={{
            background:
              "radial-gradient(closest-side, var(--neon-magenta), transparent 70%)",
          }}
        />

        {/* Inner edge, so it reads as a seated art object, not a flat crop */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_0_70px_rgba(27,22,14,0.32)] ring-1 ring-inset ring-white/10" />
      </div>

      {/* Floating glass widgets (lg+ only, to avoid mobile overflow/clutter). */}
      {/* Code badge */}
      <div
        className="absolute left-[-22px] top-[13%] hidden lg:block lg:animate-bob"
        style={{ animationDelay: "-1.2s", animationDuration: "6.5s" }}
      >
        <div className="rounded-2xl border border-white/60 bg-white/70 p-3 shadow-[0_18px_50px_-20px_rgba(47,224,238,0.75)] backdrop-blur-md">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fg font-mono text-sm text-[#f2efe6]">
            {"</>"}
          </div>
        </div>
      </div>

      {/* AI CORE chip */}
      <div
        className="absolute right-[-16px] top-[27%] hidden lg:block lg:animate-bob"
        style={{ animationDelay: "-3.4s", animationDuration: "7.5s" }}
      >
        <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3.5 py-2 shadow-[0_18px_50px_-20px_rgba(255,47,160,0.75)] backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--neon-magenta)] opacity-60 lg:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--neon-magenta)]" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg">
            AI CORE
          </span>
        </div>
      </div>

      {/* Data card */}
      <div
        className="absolute bottom-[11%] left-[-26px] hidden lg:block lg:animate-bob"
        style={{ animationDelay: "-2.1s", animationDuration: "8s" }}
      >
        <div className="w-[152px] rounded-2xl border border-white/60 bg-white/70 p-3.5 shadow-[0_18px_50px_-20px_rgba(27,22,14,0.5)] backdrop-blur-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Lighthouse
          </p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="display text-2xl leading-none text-fg">98</span>
            <span className="text-[11px] text-muted">/ 100</span>
          </p>
          <div className="mt-2 flex h-8 items-end gap-1">
            {SPARK.map((h, i) => (
              <span
                key={i}
                className={cn(
                  "w-full rounded-sm",
                  i === SPARK.length - 1 ? "bg-[var(--neon-cyan)]" : "bg-fg/20",
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
