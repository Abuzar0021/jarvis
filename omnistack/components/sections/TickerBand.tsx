import { Marquee } from "@/components/motion/Marquee";

/**
 * Infinite trust ticker. The paintings that used to punctuate it are gone with
 * the old theme, so the separator is now the design's rotated gold diamond.
 * Pure CSS motion via Marquee (pauses on hover and under reduced motion).
 */
export function TickerBand({ items }: { items: string[] }) {
  if (!items.length) return null;

  return (
    <section
      aria-label="Who we work with"
      className="relative border-y border-hair py-7"
    >
      <Marquee>
        {items.map((item) => (
          <span key={item} className="flex shrink-0 items-center gap-10">
            <span
              aria-hidden
              className="block h-[7px] w-[7px] rotate-45 border border-gold/60"
            />
            <span className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
              {item}
            </span>
          </span>
        ))}
      </Marquee>
    </section>
  );
}
