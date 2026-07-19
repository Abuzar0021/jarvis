import Image from "next/image";
import { Marquee } from "@/components/motion/Marquee";

/**
 * Infinite ticker band bridging the painting scenes and the coda: the trust
 * items scroll as an engraved-plate marquee, with the woodcut horn engraving
 * repeating as a textural medallion between entries. Pure CSS motion via
 * Marquee (pauses on hover and under reduced motion).
 */
export function TickerBand({ items }: { items: string[] }) {
  return (
    <section
      aria-label="Who we work with"
      className="border-y border-white/10 bg-black py-8"
    >
      <Marquee>
        {items.map((item) => (
          <span key={item} className="flex shrink-0 items-center gap-12">
            <Image
              src="/art/woodcut-horn.webp"
              alt=""
              width={500}
              height={818}
              className="h-14 w-auto rounded-md border border-white/15 opacity-80"
            />
            <span className="font-mono text-sm uppercase tracking-[0.22em] text-white/60">
              {item}
            </span>
          </span>
        ))}
      </Marquee>
    </section>
  );
}
