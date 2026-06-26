import { cn } from "@/lib/utils";

/**
 * Pure-CSS infinite marquee. Renders the children twice so the loop is seamless,
 * pauses on hover, and is paused entirely under prefers-reduced-motion.
 */
export function Marquee({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex overflow-hidden",
        "[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
    >
      <div className="flex min-w-full shrink-0 animate-marquee items-center gap-12 group-hover:[animation-play-state:paused] motion-reduce:[animation-play-state:paused]">
        {children}
      </div>
      <div
        aria-hidden
        className="flex min-w-full shrink-0 animate-marquee items-center gap-12 group-hover:[animation-play-state:paused] motion-reduce:[animation-play-state:paused]"
      >
        {children}
      </div>
    </div>
  );
}
