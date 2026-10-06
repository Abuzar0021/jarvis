"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

/**
 * Keeps three.js out of the shared layout bundle, and off phones entirely.
 *
 * Sculpture was imported directly by the site layout, which put the whole
 * three build (526 KB decoded, 131 KB transferred) into the first request wave
 * on every route, including /pricing, whose only WebGL is this decorative
 * background. A dynamic import with ssr disabled means the chunk is only
 * fetched when the component actually renders.
 *
 * The viewport gate is the second half. On a throttled mid range phone the
 * homepage was spending a single 1,546 ms task on the main thread, and the
 * measured total blocking time ran to fifteen seconds. This is a decorative
 * background: it is not worth a second of unresponsiveness, let alone fifteen.
 * Desktop, where the budget exists and the effect is actually visible, is
 * unchanged.
 */
const Sculpture = dynamic(
  () => import("./Sculpture").then((m) => m.Sculpture),
  { ssr: false },
);

export function SculptureMount() {
  const pathname = usePathname();
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

  if (pathname !== "/" || !allowed) return null;
  return <Sculpture />;
}
