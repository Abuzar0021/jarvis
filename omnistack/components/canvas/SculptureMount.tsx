"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

/**
 * Keeps three.js out of the shared layout bundle.
 *
 * Sculpture was imported directly by the site layout, which put the whole
 * three build (526 KB decoded, 131 KB transferred) into the first request wave
 * on every route, including /pricing, whose only WebGL is this decorative
 * background. It also cost about 72 ms of scripting per second, permanently,
 * on routes that never show it.
 *
 * A dynamic import with ssr disabled means the chunk is only fetched when the
 * component actually renders, and gating on the homepage means it never
 * renders anywhere else. To bring it back sitewide, delete the pathname check.
 */
const Sculpture = dynamic(
  () => import("./Sculpture").then((m) => m.Sculpture),
  { ssr: false },
);

export function SculptureMount() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return <Sculpture />;
}
