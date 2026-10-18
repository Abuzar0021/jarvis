"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useSafeReducedMotion } from "@/components/motion/useSafeReducedMotion";

/**
 * The looping motion preview on a work or template card.
 *
 * It deliberately does not decide for itself when to play. The pinned track
 * already computes each card's distance from centre every frame, so it drives
 * playback by setting `data-playing` on the element wrapping this. Letting each
 * video autoplay on its own would mean three or four simultaneous decodes on the
 * heaviest page of the site, on top of three.js, GSAP and Lenis.
 *
 * `preload="none"` matters as much as the play gating: without it the browser
 * fetches every source during page load and the videos compete with the hero for
 * bandwidth, which shows up directly as a worse LCP.
 */
export function CardVideo({
  src,
  poster,
  alt,
  className = "",
}: {
  src: string;
  poster: string;
  alt: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useSafeReducedMotion();

  // A sibling .webm, offered first. Chrome and Firefox take the smaller VP9
  // file, Safari falls through to the H.264 mp4.
  const webm = src.replace(/\.mp4$/, ".webm");

  useEffect(() => {
    if (reduce) return;
    const host = hostRef.current;
    const video = videoRef.current;
    if (!host || !video) return;

    // The track writes data-playing. Reacting to the attribute rather than a
    // React prop keeps the per-frame loop out of React's render path entirely.
    const sync = () => {
      const wanted = host.dataset.playing === "1";
      if (wanted && video.paused) {
        // Autoplay can still be refused even when muted. A rejected promise is
        // not an error worth surfacing: the poster is already showing and the
        // card stays perfectly usable.
        void video.play().catch(() => {});
      } else if (!wanted && !video.paused) {
        video.pause();
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(host, { attributes: true, attributeFilter: ["data-playing"] });
    sync();

    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [reduce]);

  // Reduced motion: the poster only. No <video> element is created at all, so
  // nothing is fetched and there is no paused-but-loaded media sitting in memory.
  if (reduce) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={poster}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 560px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div ref={hostRef} data-card-video className={`relative overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        // aria-hidden with an empty alt sibling: the card's heading and summary
        // already name the project, so announcing the clip repeats it.
        aria-hidden
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={webm} type="video/webm" />
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
