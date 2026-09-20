"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Mostar: a cinematic scroll story, ported from the Claude Design export.
 *
 * Two deliberate departures from that export.
 *
 * The original re-rendered on every animation frame by bumping a counter in
 * state and interpolating roughly thirty style strings through the template.
 * That is fine for a design preview and wasteful in production, so the scroll
 * driven values are written straight onto elements through refs instead. React
 * state is kept only for the slider index, which changes on a click.
 *
 * The original also pulled Ogg Medium, a commercial Sharp Type face, from a
 * CDN. Hotlinking a licensed font on a commercial site is both fragile and a
 * licensing exposure, so the site's own serif is used.
 */

const A = "/templates/mostar/assets";

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const smoothstep = (e0: number, e1: number, v: number) => {
  const x = clamp((v - e0) / (e1 - e0));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Enter and exit ramps for a scene, and the window where it is fully present. */
function segment(s: number, a: number, b: number, c: number, d: number) {
  const enter = smoothstep(a, b, s);
  const exit = smoothstep(c, d, s);
  return { enter, exit, active: enter * (1 - exit) };
}

const SIGHTS = [
  {
    kicker: "Old Bridge",
    h3: "Stari Most",
    p: "The stone arch over the Neretva and Mostar's main landmark.",
    pin: `${A}/pin-bridge.webp`,
  },
  {
    kicker: "Bazaar Street",
    h3: "Kujundziluk",
    p: "Copper shops, souvenirs, and the old bazaar lane by the bridge.",
    pin: `${A}/pin-bazaar.webp`,
  },
  {
    kicker: "Viewpoint",
    h3: "Koski Mehmed Pasha Mosque",
    p: "A classic minaret view back toward Stari Most and the river.",
    pin: `${A}/pin-mosque.webp`,
  },
  {
    kicker: "Ottoman House",
    h3: "Kajtaz House",
    p: "A preserved residential house showing Mostar's Ottoman layers.",
    pin: `${A}/pin-bridge.webp`,
  },
  {
    kicker: "Museum",
    h3: "War Photo Exhibition",
    p: "A compact, moving stop for context on the city's recent history.",
    pin: `${A}/pin-bazaar.webp`,
  },
];

export function Mostar() {
  const scene = useRef<HTMLElement>(null);
  const sky = useRef<HTMLImageElement>(null);
  const parallax = useRef<HTMLDivElement>(null);
  const haze = useRef<HTMLImageElement>(null);
  const bazaar = useRef<HTMLImageElement>(null);
  const bridge = useRef<HTMLImageElement>(null);
  const splitL = useRef<HTMLImageElement>(null);
  const splitR = useRef<HTMLImageElement>(null);
  const frame2 = useRef<HTMLImageElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const intro = useRef<HTMLElement>(null);
  const panel2 = useRef<HTMLElement>(null);
  const panel3 = useRef<HTMLElement>(null);
  const slider = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const controls = useRef<HTMLDivElement>(null);

  // Start in the middle copy so the first move in either direction has a
  // neighbour to slide to.
  const [active, setActive] = useState(SIGHTS.length);
  const [jumping, setJumping] = useState(false);

  /**
   * Three copies of the list. Reaching the end of one silently snaps back to
   * the equivalent card in the middle copy with the transition disabled, so the
   * slider reads as endless without ever running out of cards.
   */
  const normalize = useCallback(() => {
    const n = SIGHTS.length;
    setActive((a) => {
      if (a >= n * 2) {
        setJumping(true);
        return a - n;
      }
      if (a < n) {
        setJumping(true);
        return a + n;
      }
      return a;
    });
  }, []);

  useEffect(() => {
    if (!jumping) return;
    // Two frames: one for React to paint the snapped position with transitions
    // off, one before turning them back on.
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setJumping(false)),
    );
    return () => cancelAnimationFrame(id);
  }, [jumping]);

  useEffect(() => {
    const el = scene.current;
    if (!el) return;

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let smooth = 0;
    let started = false;
    let mx = 0;
    let my = 0;
    let tmx = 0;
    let tmy = 0;
    let raf = 0;
    let pending = false;

    const set = (
      node: HTMLElement | null,
      style: Partial<CSSStyleDeclaration> & Record<string, string>,
    ) => {
      if (!node) return;
      Object.assign(node.style, style);
    };

    const draw = () => {
      pending = false;
      const reduced = reduceQuery.matches;
      const rect = el.getBoundingClientRect();
      const target = clamp(-rect.top, 0, el.offsetHeight - window.innerHeight);

      if (!started || reduced) {
        smooth = target;
        started = true;
      } else {
        smooth = lerp(smooth, target, 0.14);
      }
      if (Math.abs(smooth - target) < 0.08) smooth = target;

      mx = reduced ? 0 : lerp(mx, tmx, 0.12);
      my = reduced ? 0 : lerp(my, tmy, 0.12);

      const s = smooth;
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const isSm = winW <= 640;
      const isMd = winW <= 1100 && !isSm;
      const isLg = winW <= 1500 && !isMd && !isSm;

      const f2 = segment(s, 560, 900, 1300, 1620);
      const f3 = segment(s, 1760, 2140, 2540, 2700);
      const progress = clamp(s / 2700);
      const introExit = smoothstep(90, 650, s);
      const sightsEnter = Math.pow(smoothstep(2760, 3560, s), 1.55);
      const controlsEnter = smoothstep(3360, 3660, s);
      const blurActive = clamp(f2.active + f3.active);
      const splitDrift = Math.pow(f2.enter, 1.5);
      const backScale =
        0.76 + progress * 0.2 + f2.enter * 0.18 + f3.enter * 0.16;
      const heroY = progress * -74;
      const heroScale = progress * 0.23;
      const blurPx = blurActive * 14;
      const backBright = 1 - blurActive * 0.255;

      set(sky.current, {
        filter: `blur(${blurPx.toFixed(2)}px) brightness(${backBright.toFixed(3)})`,
      });

      set(parallax.current, {
        opacity: (1 - f2.active * 0.06).toFixed(3),
        transform: `translate3d(${(mx * -12).toFixed(2)}px, ${(my * -4).toFixed(2)}px, 0) scale(${backScale.toFixed(4)})`,
      });

      set(haze.current, {
        filter: `blur(${blurPx.toFixed(2)}px) brightness(${backBright.toFixed(3)})`,
        transform: `translate3d(-50%, calc(${(10 + progress * 10).toFixed(2)}vh - 110px), 0) scale(${(0.78 + progress * 0.16).toFixed(4)})`,
      });

      set(bazaar.current, {
        filter: `blur(${(f2.active * 14).toFixed(2)}px) brightness(${(1 - f2.active * 0.255 - f3.active * 0.06).toFixed(3)}) saturate(${(1 + f3.active * 0.18).toFixed(3)})`,
        transform: `translate3d(-50%, ${(20 - progress * 8).toFixed(2)}vh, 0) scale(0.86)`,
      });

      const bridgeBottom = isSm ? 2 : 5 - f2.enter * 13;
      const bridgeWidth = isSm
        ? 190
        : isMd
          ? 138
          : Math.min(67.2 + f2.enter * 37.8, (2140 / winW) * 100);
      set(bridge.current, {
        bottom: `${bridgeBottom.toFixed(2)}vh`,
        width: `min(${bridgeWidth.toFixed(2)}vw, 2140px)`,
        transform: `translate3d(calc(-50% + ${(mx * 18).toFixed(2)}px), ${(my * 8 + heroY - f2.exit * 760).toFixed(2)}px, 0) scale(${(1.02 + heroScale + f2.exit * 0.46).toFixed(4)})`,
      });

      const splitY = my * 10 + heroY - splitDrift * 180;
      const splitScale = 1 + heroScale + f2.enter * 0.74;
      set(splitL.current, {
        transform: `translate3d(calc(-50% + ${(-splitDrift * 46).toFixed(2)}vw + ${(mx * 22).toFixed(2)}px), ${splitY.toFixed(2)}px, 0) scale(${splitScale.toFixed(4)})`,
      });
      set(splitR.current, {
        transform: `translate3d(calc(-50% + ${(splitDrift * 46).toFixed(2)}vw + ${(mx * 22).toFixed(2)}px), ${splitY.toFixed(2)}px, 0) scale(${splitScale.toFixed(4)})`,
      });

      set(frame2.current, {
        width: `min(${isSm ? 176 : isMd ? 132 : 122}vw, 2160px)`,
        opacity: (f2.active * (1 - f3.enter)).toFixed(3),
        transform: `translate3d(calc(-50% + ${(mx * 10).toFixed(2)}px), calc(-50% + ${(my * 8 - f2.exit * 150).toFixed(2)}px), 0) scale(${(1.06 + f2.enter * 0.08 + f2.exit * 0.08).toFixed(4)})`,
      });

      set(shade.current, {
        zIndex: f2.active > 0.02 ? "2" : "0",
        background: `linear-gradient(180deg, rgba(74,181,224,${(blurActive * 0.465).toFixed(3)}) 0%, rgba(74,181,224,${(blurActive * 0.42).toFixed(3)}) 48%, rgba(74,181,224,${(blurActive * 0.51).toFixed(3)}) 100%)`,
      });

      set(title.current, {
        fontSize: `${isSm ? 4.5 : isMd ? 7.5 : isLg ? 11 : 14}rem`,
        top: isSm ? "16vh" : isMd ? "15vh" : "clamp(122px, 19vh, 205px)",
        opacity: (1 - introExit).toFixed(3),
        transform: `translate3d(-50%, ${(introExit * -210).toFixed(2)}px, 0) scale(${(1 - introExit * 0.08).toFixed(4)})`,
      });

      set(intro.current, {
        bottom: isSm ? "42px" : "clamp(56px, 28vh, 400px)",
        opacity: (1 - introExit).toFixed(3),
        transform: `translate3d(-50%, ${(introExit * 90).toFixed(2)}px, 0)`,
      });

      set(panel2.current, {
        opacity: (f2.active * (1 - f2.exit)).toFixed(3),
        transform: `translate3d(-50%, calc(-50% + ${(-f2.exit * 86 + (1 - f2.enter) * 58).toFixed(2)}px), 0)`,
      });
      set(panel3.current, {
        top: `${isSm ? 26 : 29}%`,
        opacity: (f3.active * (1 - f3.exit)).toFixed(3),
        transform: `translate3d(-50%, calc(-50% + ${(-f3.exit * 86 + (1 - f3.enter) * 58).toFixed(2)}px), 0)`,
      });

      // The slider sits inside the scaled parallax layer, so it is counter
      // scaled to stay the intended size on screen, and its top is solved in
      // that layer's coordinates rather than the viewport's.
      const screenTop = Math.min(220, Math.max(112, winH * 0.19)) - 50;
      set(slider.current, {
        top: `${(winH - (winH - screenTop) / backScale).toFixed(2)}px`,
        visibility: sightsEnter > 0.01 ? "visible" : "hidden",
        transform: `translate3d(${((1 - sightsEnter) * 420).toFixed(2)}vw, 0, 0) scale(${(1 / backScale).toFixed(4)})`,
      });
      set(controls.current, {
        top: `${(screenTop + (isSm ? 236 : 236)).toFixed(2)}px`,
        opacity: controlsEnter.toFixed(3),
        pointerEvents: controlsEnter > 0.98 ? "auto" : "none",
      });

      const more =
        Math.abs(smooth - target) > 0.08 ||
        Math.abs(mx - tmx) > 0.001 ||
        Math.abs(my - tmy) > 0.001;
      if (more) request();
    };

    const request = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(draw);
    };

    const onPointer = (e: PointerEvent) => {
      tmx = e.clientX / window.innerWidth - 0.5;
      tmy = e.clientY / window.innerHeight - 0.5;
      request();
    };

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    window.addEventListener("pointermove", onPointer, { passive: true });
    request();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  const cards = [0, 1, 2].flatMap((set) =>
    SIGHTS.map((c, i) => ({ ...c, idx: set * SIGHTS.length + i })),
  );

  const plate =
    "pointer-events-none absolute block h-auto select-none";

  return (
    <main className="min-h-screen bg-[#0b1110] font-sans text-[#fdf1e1]">
      <section
        ref={scene}
        aria-label="Mostar cinematic scroll story"
        className="relative"
        style={{ height: "calc(100vh + 3700px)" }}
      >
        <div className="sticky top-0 h-screen min-h-[620px] overflow-hidden bg-[#7fb4d4] [isolation:isolate]">
          <div className="absolute inset-0 overflow-hidden bg-[#79b7dd]">
            {/* eslint-disable @next/next/no-img-element */}
            <img
              ref={sky}
              alt=""
              src={`${A}/sky.webp`}
              className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover"
            />

            <header className="absolute inset-x-0 top-0 z-10 grid grid-cols-[1fr_auto] items-center gap-4 p-6 sm:grid-cols-[minmax(200px,1fr)_auto_minmax(200px,1fr)] sm:gap-8 sm:p-8">
              <a
                href="#top"
                className="justify-self-start whitespace-nowrap font-serif text-2xl leading-none text-[#fdf1e1]/90 no-underline"
              >
                Bosnia and Herzegovina
              </a>
              <nav
                aria-label="Main menu"
                className="col-span-full row-start-2 flex gap-5 overflow-x-auto sm:col-span-1 sm:row-start-auto sm:justify-center sm:gap-[clamp(24px,2.2vw,44px)] sm:overflow-visible"
              >
                {["Intro", "Bridge", "Bazaar", "Routes"].map((l) => (
                  <a
                    key={l}
                    href={`#${l.toLowerCase()}`}
                    className="text-xl leading-none text-[#fdf1e1]/85 no-underline [text-shadow:0_2px_16px_rgba(0,0,0,.2)]"
                  >
                    {l}
                  </a>
                ))}
              </nav>
              <button
                type="button"
                aria-label="Change language"
                className="inline-flex items-center justify-center gap-1.5 justify-self-end bg-transparent text-base font-bold leading-none text-[#fdf1e1]/85 [text-shadow:0_2px_16px_rgba(0,0,0,.2)]"
              >
                EN <span aria-hidden>&#8964;</span>
              </button>
            </header>

            <div
              ref={parallax}
              className="absolute inset-y-0 -left-[3vw] -right-[3vw] origin-[50%_100%]"
            >
              <img
                ref={haze}
                alt=""
                src={`${A}/haze.webp`}
                className={`${plate} bottom-0 left-[48%] z-[1] w-[112%] object-contain opacity-[0.72] mix-blend-screen`}
              />

              <section
                id="routes"
                ref={slider}
                aria-label="Mostar sights slider"
                className="absolute inset-x-0 z-[2] origin-top-left will-change-transform"
              >
                <div
                  ref={track}
                  onTransitionEnd={normalize}
                  className="flex items-stretch gap-3 will-change-transform sm:gap-[clamp(16px,1.15vw,24px)]"
                  style={{
                    transform: `translate3d(calc(${-(390 + 20) * active}px - 18vw), 0, 0)`,
                    transition: jumping
                      ? "none"
                      : "transform 640ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  {cards.map((card) => (
                    <article
                      key={card.idx}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open ${card.h3} card`}
                      onClick={() => setActive(card.idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActive(card.idx);
                        }
                      }}
                      className="relative h-[220px] shrink-0 basis-[min(82vw,330px)] cursor-pointer select-none overflow-hidden rounded-3xl border border-[#fdf1e1]/40 bg-[#fdf1e1] p-6 text-black shadow-[0_18px_52px_rgba(2,47,64,.12)] sm:basis-[390px]"
                    >
                      <span className="relative z-[1] mb-14 block text-xs font-medium uppercase leading-none">
                        {card.kicker}
                      </span>
                      <img
                        alt=""
                        src={card.pin}
                        className="pointer-events-none absolute right-6 top-6 h-[67px] w-[67px]"
                      />
                      <h3 className="absolute inset-x-6 bottom-[calc(24px+(16px*1.16*2)+12px)] z-[1] m-0 overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-extrabold leading-[0.95]">
                        {card.h3}
                      </h3>
                      <p className="absolute inset-x-6 bottom-6 z-[1] m-0 line-clamp-2 text-base leading-[1.16]">
                        {card.p}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <img
                ref={bazaar}
                alt=""
                src={`${A}/bazaar.webp`}
                className={`${plate} bottom-0 left-[48%] z-[3] w-[112%] object-contain`}
              />
            </div>

            <div
              ref={controls}
              aria-label="Slider controls"
              className="absolute left-12 z-[5] flex gap-3.5 will-change-[transform,opacity]"
            >
              <button
                type="button"
                aria-label="Previous sight"
                onClick={() => setActive((a) => a - 1)}
                className="inline-flex h-[54px] w-[54px] cursor-pointer items-center justify-center rounded-full bg-[#fdf1e1]/95 text-[#111411] shadow-[0_18px_36px_rgba(0,0,0,.2)]"
              >
                &larr;
              </button>
              <button
                type="button"
                aria-label="Next sight"
                onClick={() => setActive((a) => a + 1)}
                className="inline-flex h-[54px] w-[54px] cursor-pointer items-center justify-center rounded-full bg-[#fdf1e1]/95 text-[#111411] shadow-[0_18px_36px_rgba(0,0,0,.2)]"
              >
                &rarr;
              </button>
            </div>

            <h1
              ref={title}
              id="intro"
              className="absolute left-1/2 z-[3] m-0 w-[min(94vw,1780px)] text-center font-serif leading-[0.78] text-[#fdf1e1]"
            >
              MOSTAR
            </h1>

            <img ref={splitL} alt="" src={`${A}/split-left.webp`} className={`${plate} -bottom-[2vh] left-1/2 z-[6] w-[min(118vw,2240px)] origin-[21%_52%]`} />
            <img ref={splitR} alt="" src={`${A}/split-right.webp`} className={`${plate} -bottom-[2vh] left-1/2 z-[6] w-[min(118vw,2240px)] origin-[79%_52%]`} />
            <img ref={bridge} alt="" src={`${A}/bridge.webp`} className={`${plate} left-1/2 z-[4] origin-[50%_48%]`} />
            <img ref={frame2} alt="" src={`${A}/frame2.webp`} className={`${plate} left-1/2 top-1/2 z-[5] origin-[50%_48%]`} />
            {/* eslint-enable @next/next/no-img-element */}

            <div ref={shade} className="pointer-events-none absolute inset-0" />
          </div>

          <section
            ref={intro}
            aria-label="Mostar overview"
            className="absolute left-1/2 z-[9] w-[min(560px,calc(100vw-40px))] text-center"
          >
            <p className="mx-auto max-w-[560px] text-base font-medium leading-[1.18] [text-shadow:0_2px_18px_rgba(0,0,0,.42)] sm:text-[1.18rem]">
              A stone arch, emerald water, and a compact old city made for slow
              mornings, late light, and one unforgettable crossing.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {["Old Bridge", "Neretva River", "UNESCO old city"].map((t) => (
                <span
                  key={t}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-[#fdf1e1] px-6 text-[0.98rem] font-medium text-[#111411] shadow-[0_12px_30px_rgba(0,0,0,.18)]"
                >
                  {t}
                </span>
              ))}
            </div>
          </section>

          <section
            id="bridge"
            ref={panel2}
            aria-label="Old Bridge details"
            className="pointer-events-none absolute left-1/2 top-[60%] z-10 w-[min(760px,calc(100vw-42px))] text-center"
          >
            <h2 className="m-0 font-serif text-[clamp(2.45rem,4vw,4.75rem)] font-medium leading-[0.95] [text-shadow:0_16px_38px_rgba(0,0,0,.32)]">
              The bridge is the city&apos;s compass.
            </h2>
            <p className="mx-auto mt-6 w-[min(520px,100%)] text-base font-medium leading-[1.18] [text-shadow:0_2px_18px_rgba(0,0,0,.42)] sm:text-[1.14rem]">
              Stari Most links the banks of the Neretva and anchors a historic
              quarter shaped by Ottoman, Mediterranean, and European layers.
            </p>
            <dl className="mx-auto mt-9 grid w-[min(470px,100%)] grid-cols-2 gap-x-8 gap-y-4 sm:mt-[72px] sm:gap-x-[86px]">
              {[
                { dt: "1566", dd: "Original bridge completed" },
                { dt: "2005", dd: "Old Bridge Area inscribed by UNESCO" },
              ].map((f) => (
                <div key={f.dt}>
                  <dt className="font-serif text-[clamp(2.5rem,3.4vw,4.2rem)] font-medium leading-[0.9] [text-shadow:0_14px_34px_rgba(0,0,0,.32)]">
                    {f.dt}
                  </dt>
                  <dd className="m-0 mt-4 text-base font-medium leading-[1.14] [text-shadow:0_2px_18px_rgba(0,0,0,.42)]">
                    {f.dd}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section
            id="bazaar"
            ref={panel3}
            aria-label="Old town details"
            className="pointer-events-none absolute left-1/2 z-10 w-[min(760px,calc(100vw-42px))] text-center"
          >
            <h2 className="m-0 font-serif text-[clamp(2.45rem,4vw,4.75rem)] font-medium leading-[0.95] [text-shadow:0_16px_38px_rgba(0,0,0,.32)]">
              The bazaar keeps Mostar close.
            </h2>
            <p className="mx-auto mt-6 w-[min(520px,100%)] text-base font-medium leading-[1.18] [text-shadow:0_2px_18px_rgba(0,0,0,.42)] sm:text-[1.14rem]">
              Stone lanes, mosque courtyards, copper stalls, and riverside coffee
              stay within a short walk of Stari Most.
            </p>
            <button
              type="button"
              className="pointer-events-auto mt-7 inline-flex min-h-[50px] cursor-pointer items-center justify-center gap-3 rounded-full bg-[#fdf1e1] px-7 text-[#111411] shadow-[0_16px_34px_rgba(0,0,0,.18)]"
            >
              <span aria-hidden className="text-xl leading-none">
                &#8599;
              </span>
              <span>Open old town notes</span>
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}
