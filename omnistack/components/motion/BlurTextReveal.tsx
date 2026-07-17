"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(SplitText, ScrollTrigger);

type Props = {
  as?: ElementType;
  children: ReactNode;
  /** Granularity of the reveal. */
  splitBy?: "chars" | "words" | "lines";
  stagger?: number;
  delay?: number;
  /** Animate on mount (hero) instead of when scrolled into view. */
  immediate?: boolean;
  className?: string;
};

/**
 * Staggered blur-to-sharp text reveal. Each unit fades up out of a blur so the
 * copy reads as coming "into focus" rather than a plain fade. Centralises
 * reduced-motion handling (renders plain, no split), GPU-layer cleanup, and
 * ScrollTrigger wiring so individual headings don't each reinvent it.
 *
 * The hide + animate runs inside useGSAP's layout effect (before paint), so
 * there's no flash of un-animated text; the copy is always in the DOM for SEO.
 */
export function BlurTextReveal({
  as: Tag = "div",
  children,
  splitBy = "words",
  stagger = 0.06,
  delay = 0,
  immediate = false,
  className,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useGSAP(
    () => {
      if (reduce || !ref.current) return;

      const split = new SplitText(ref.current, {
        type: "chars,words,lines",
        smartWrap: true,
      });
      const targets =
        splitBy === "chars" ? split.chars : splitBy === "lines" ? split.lines : split.words;

      gsap.set(targets, {
        autoAlpha: 0,
        filter: "blur(12px)",
        willChange: "filter, opacity",
      });

      gsap.to(targets, {
        autoAlpha: 1,
        filter: "blur(0px)",
        duration: 0.8,
        ease: "power2.out",
        delay,
        stagger: { each: stagger, from: splitBy === "chars" ? "random" : "start" },
        scrollTrigger: immediate
          ? undefined
          : { trigger: ref.current, start: "top 85%", once: true },
        onComplete: () => gsap.set(targets, { clearProps: "willChange,filter" }),
      });

      return () => split.revert();
    },
    { scope: ref, dependencies: [reduce] },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
