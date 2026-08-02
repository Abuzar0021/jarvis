"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { HoverDistortImage } from "@/components/canvas/HoverDistortImage";
import { Magnetic } from "@/components/motion/Magnetic";
import { coverGradient } from "@/lib/utils";
import type { Project } from "@/lib/types";
import { useSafeReducedMotion } from "@/components/motion/useSafeReducedMotion";

/**
 * The design's pinned case-study track: the section sticks while the row of
 * cards slides sideways, each card rotating and dimming as it leaves centre.
 *
 * The design hardcodes a 340vh wrapper for its three cards. Real project count
 * varies, so the scroll distance is derived instead - otherwise two projects
 * would scrub against a mostly empty track.
 */
export function WorkTrack({ projects }: { projects: Project[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const reduce = useSafeReducedMotion();

  // +1 for the closing "see all work" panel.
  const panels = projects.length + 1;

  useEffect(() => {
    if (reduce) return;
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    // Everything here only changes on resize. Reading it inside the frame loop
    // instead forces a synchronous layout on every single frame, which is what
    // makes a scrub like this feel heavy on a mid-range laptop.
    let wrapTop = 0;
    let len = 1;
    let dist = 0;
    let vw = 1;
    let cards: { el: HTMLElement; centre: number }[] = [];

    const measure = () => {
      vw = window.innerWidth;
      wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
      len = Math.max(1, wrap.offsetHeight - window.innerHeight);
      dist = Math.max(0, track.scrollWidth - vw + 40);
      cards = Array.from(
        track.querySelectorAll<HTMLElement>("[data-case]"),
      ).map((el) => ({
        // Centre in track-local coordinates. The track's offset parent is the
        // full-width sticky wrapper, so screen x is just this plus the shift.
        el,
        centre: el.offsetLeft + el.offsetWidth / 2,
      }));
    };

    measure();

    // Scroll velocity, in px per frame, smoothed so a single jumpy wheel event
    // cannot snap the whole track. It decays to zero on its own once scrolling
    // stops, because the raw delta it chases is then zero.
    let lastY = window.scrollY;
    let vel = 0;

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const y = window.scrollY;
      const t = Math.max(0, Math.min(1, (y - wrapTop) / len));
      const shift = -dist * t;

      vel += (y - lastY - vel) * 0.12;
      lastY = y;
      // 0.09 deg per px/frame, so an ordinary wheel notch (~20px) leans about
      // 1.8deg and only a hard flick reaches the 5deg cap. skewX rather than
      // skewY: the track travels sideways, so leaning the vertical edges reads
      // as weight behind the movement instead of the row tipping over.
      const skew = Math.max(-5, Math.min(5, vel * 0.09));

      track.style.transform = `translate3d(${shift.toFixed(1)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      if (barRef.current) barRef.current.style.width = `${(t * 100).toFixed(1)}%`;

      for (const card of cards) {
        const cx = (card.centre + shift) / vw;
        const off = Math.max(-1, Math.min(1, (cx - 0.46) * 1.5));
        card.el.style.opacity = String(Math.max(0.16, 1 - Math.abs(off) * 0.85));
        card.el.style.transform = `perspective(1300px) rotateY(${(off * -16).toFixed(
          2,
        )}deg) scale(${(1 - Math.abs(off) * 0.08).toFixed(3)}) translateZ(${(
          -Math.abs(off) * 90
        ).toFixed(1)}px)`;
      }
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [reduce]);

  // Reduced motion: a plain readable grid, no pinning, no sideways scrub.
  if (reduce) {
    return (
      <section id="work" className="px-5 py-24 sm:px-8 lg:px-16">
        <Header />
        <div className="mx-auto mt-10 grid max-w-[1240px] gap-6 sm:grid-cols-2">
          {projects.map((p) => (
            <CaseCard key={p.id} project={p} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="work" className="relative">
      <div
        ref={wrapRef}
        style={{ height: `${100 + panels * 60}vh` }}
        className="relative"
      >
        <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
          <div className="px-5 pb-[clamp(24px,4vh,44px)] sm:px-8 lg:px-16">
            <Header>
              <div className="flex items-center gap-3.5 pb-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                  Scroll
                </span>
                <span className="relative block h-px w-[clamp(80px,14vw,180px)] bg-gold/20">
                  <span
                    ref={barRef}
                    className="absolute inset-y-0 left-0 w-0 bg-gold shadow-[0_0_14px_rgba(198,161,91,.8)]"
                  />
                </span>
              </div>
            </Header>
          </div>

          <div
            ref={trackRef}
            className="flex gap-[clamp(18px,2.4vw,34px)] px-5 will-change-transform sm:px-8 lg:px-16"
          >
            {projects.map((p) => (
              <CaseCard key={p.id} project={p} tracked />
            ))}

            <div className="flex w-[clamp(240px,30vw,420px)] shrink-0 flex-col justify-center gap-5 pl-[clamp(10px,2vw,30px)]">
              <p className="m-0 font-serif text-[clamp(24px,2.6vw,40px)] leading-[1.14] text-fg">
                Yours could sit here next.
              </p>
              <Magnetic className="self-start">
                <Link
                  href="/work"
                  className="inline-flex items-center gap-2.5 border-b border-gold/40 pb-1.5 font-mono text-xs uppercase tracking-[0.2em] text-gold transition-colors hover:border-gold-bright hover:text-gold-bright"
                >
                  See all work <span aria-hidden>&rarr;</span>
                </Link>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Header({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-4">
      <div>
        <div className="eyebrow mb-3.5">Selected work</div>
        <h2 className="display-serif m-0 text-[clamp(30px,4.4vw,58px)] text-fg">
          Work we put our name on.
        </h2>
      </div>
      {children}
    </div>
  );
}

function CaseCard({
  project,
  tracked = false,
}: {
  project: Project;
  tracked?: boolean;
}) {
  // The design shows two metric chips. Real projects may carry no `results`,
  // so fall back to the facts we do have rather than render empty chips.
  const chips = project.results.length
    ? project.results.slice(0, 2).map((r) => `${r.value} ${r.label}`)
    : [project.category, project.year].filter(Boolean).map(String);

  return (
    <article
      {...(tracked ? { "data-case": "1" } : {})}
      className={`overflow-hidden rounded-[4px] border border-hair bg-card ${
        tracked
          ? "w-[clamp(280px,42vw,560px)] shrink-0 opacity-0 [transform-style:preserve-3d] will-change-transform"
          : ""
      }`}
    >
      <Link href={`/work/${project.slug}`} className="group block">
        <div
          className="relative h-[clamp(220px,34vh,380px)] overflow-hidden"
          style={{ background: coverGradient(project.slug) }}
        >
          {project.cover ? (
            <HoverDistortImage
              src={project.cover}
              alt={`${project.title} - ${project.category}`}
              sizes="(max-width: 768px) 100vw, 560px"
              className="absolute inset-0"
              imageClassName="transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-3.5 p-[clamp(20px,2.4vw,34px)]">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0 font-serif text-[clamp(24px,2.6vw,38px)] font-normal text-fg">
              {project.title}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-gold">
              {project.category}
            </span>
          </div>
          <p className="m-0 text-pretty text-sm leading-[1.7] text-muted">
            {project.summary}
          </p>
          {chips.length ? (
            <div className="flex gap-6 border-t border-hair pt-1.5">
              {chips.map((c) => (
                <span
                  key={c}
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
