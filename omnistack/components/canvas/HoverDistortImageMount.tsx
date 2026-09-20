"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

/**
 * Keeps three.js out of the first request wave, the way SculptureMount already
 * does for Sculpture.
 *
 * SculptureMount moved the three build off the shared layout bundle, but
 * WorkTrack still imported HoverDistortImage statically, so three was pulled
 * straight back into the homepage entry: 527 KB decoded, ~160 KB transferred,
 * loaded eagerly on every visit. It buys a cursor-following RGB split on a
 * single card image, and only on the cards that have no video.
 *
 * The plain next/image below is the real content. It renders on the server, so
 * crawlers, no-JS visitors, phones and reduced-motion users all get the same
 * <img> in the HTML that they got before, and the WebGL build is fetched only
 * once a pointer-capable desktop viewport has actually mounted. The gate
 * matches SculptureMount deliberately: the effect is a hover response, so a
 * device that cannot hover gains nothing and should not pay for a context, a
 * shader compile and a 527 KB parse.
 */
const HoverDistortImage = dynamic(
  () => import("./HoverDistortImage").then((m) => m.HoverDistortImage),
  { ssr: false },
);

export type HoverDistortImageMountProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
};

export function HoverDistortImageMount({
  src,
  alt,
  className = "",
  imageClassName = "",
  sizes,
}: HoverDistortImageMountProps) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Evaluated after mount rather than during render: matchMedia does not
    // exist on the server, and guessing wrong would hydrate a mismatch.
    const query = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const sync = () => setAllowed(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  if (allowed) {
    return (
      <HoverDistortImage
        src={src}
        alt={alt}
        className={className}
        imageClassName={imageClassName}
        sizes={sizes}
      />
    );
  }

  // Identical markup to HoverDistortImage's own non-WebGL output, so the swap
  // on desktop replaces like with like and next/image serves the already
  // decoded file from cache rather than downloading it a second time.
  return (
    <div className={`overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover ${imageClassName}`}
      />
    </div>
  );
}
