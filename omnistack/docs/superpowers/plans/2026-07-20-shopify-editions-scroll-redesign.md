# Homepage Scroll-Mechanics Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the homepage's flagship "selected-work" scene a real scroll-driven case-study deep-dive, add an original "modern twist" SVG overlay to two scenes, and reorder the scene run so Work is the flagship right after the hero — matching the approved design spec at `docs/superpowers/specs/2026-07-20-shopify-editions-scroll-redesign-design.md`.

**Architecture:** The homepage already implements the hybrid architecture the spec asked for — every scene is a GSAP-ScrollTrigger-pinned `<ScrollScene>` with its own `StardustPlane` WebGL shader reveal, and Lenis is already correctly bridged to ScrollTrigger in `SmoothScroll.tsx`. This plan does NOT rebuild that infrastructure. It extends it: (1) `ScrollScene` starts forwarding its real scroll progress into `StageContext` instead of a dummy value, so child acts can react to it, (2) `WorkAct` is rebuilt to consume that progress and reveal each project's challenge/approach/outcome stage by stage as the pinned scene scrolls, (3) two scenes get an original SVG "modern object" overlay using the `tech`/`techPosition` fields the `Scene` type already supports, (4) the Work scene moves to immediately follow the hero.

**Tech Stack:** Next.js 16 (App Router), React 19, `motion` (Framer Motion) v12, GSAP 3 + ScrollTrigger, Lenis, Three.js/`@react-three/fiber`, Tailwind v4. No new dependencies.

## Global Constraints

- Next.js 16 has breaking API/convention changes vs. training data — `omnistack/AGENTS.md` requires checking `node_modules/next/dist/docs/` before writing anything that touches Next.js APIs/conventions not already demonstrated in the files this plan quotes.
- No new npm dependencies. Everything needed (gsap, lenis, motion, three) is already installed.
- No new copywriting. All project/service/site copy comes from `content/*.json` via `lib/content.ts`, unchanged.
- No new test framework. This repo has none (no test script, no test runner in `package.json`), and the prior 20+ commits of homepage work were verified the same way this plan uses: `pnpm typecheck`, `pnpm lint`, and manual dev-server browser verification. Do not introduce Vitest/Jest/Playwright as part of this plan — out of scope.
- Preserve the existing `useStage().fallback` reduced-motion/narrow-viewport static-rendering pattern in every act touched.
- SVG icon assets must be original (hand-authored in this plan, not sourced from anywhere) — no Higgsfield credits available, no reproduction of the reference site's actual imagery.
- Working directory for all commands in this plan: `C:\Users\elahi\jarvis\omnistack`.

---

## Task 1: Feed real scroll progress into `StageContext`

**Files:**
- Modify: `components/canvas/ScrollScene.tsx:58` (declaration), `:90` (useMemo), `:116-119` (onUpdate)

**Interfaces:**
- Produces: `useStage().progress` (from `components/canvas/StageContext.tsx`, already typed as `MotionValue<number>`) now emits the pinned scene's real 0..1 scroll progress instead of always 0. Any act rendered as a `<ScrollScene>`'s `children` can read it via `useStage()`.

- [ ] **Step 1: Rename `dummyProgress` to `progressValue` and update its comment**

In `components/canvas/ScrollScene.tsx`, change:

```tsx
  const dummyProgress = useMotionValue(0);
```

to:

```tsx
  const progressValue = useMotionValue(0);
```

- [ ] **Step 2: Update the `stageValue` memo to use the renamed value**

Change:

```tsx
  // Existing act components (WorkAct, AIAct, ProofAct) read useStage().fallback
  // to switch between animated and static rendering; the shared progress value
  // is unused by any of them, so a stable dummy MotionValue is sufficient here.
  const stageValue = useMemo(() => ({ progress: dummyProgress, fallback }), [dummyProgress, fallback]);
```

to:

```tsx
  // progressValue carries this scene's own 0..1 pin progress (set below, in the
  // ScrollTrigger onUpdate) so a scene's children (e.g. WorkAct) can drive their
  // own scroll-linked reveals off the same timeline the background shader uses.
  const stageValue = useMemo(() => ({ progress: progressValue, fallback }), [progressValue, fallback]);
```

- [ ] **Step 3: Set the real progress inside the existing `onUpdate` callback**

Change:

```tsx
      onUpdate: (self) => {
        const p = self.progress;
        stardustRef.current?.setProgress(p);
```

to:

```tsx
      onUpdate: (self) => {
        const p = self.progress;
        stardustRef.current?.setProgress(p);
        progressValue.set(p);
```

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `pnpm dev`, open `http://localhost:3000`. No visible change is expected yet (no act consumes `progress` until Task 3) — this step only confirms the app still boots and scenes still pin/scrub/reveal exactly as before (scroll through all 7 scenes, confirm no console errors, confirm the stardust reveal and headline/body/cta fades still work).

- [ ] **Step 6: Commit**

```bash
git add components/canvas/ScrollScene.tsx
git commit -m "Feed real scroll progress into StageContext instead of a dummy value"
```

---

## Task 2: Add original "modern twist" SVG overlays to two scenes

**Files:**
- Create: `public/tech/aviator-goggles.svg`
- Create: `public/tech/headphones.svg`
- Modify: `lib/scenes.ts` (add `techRotate` to the `Scene` type; set `tech`/`techPosition`/`techRotate` on the `ai-native` and `selected-work` entries)
- Modify: `components/canvas/ScrollScene.tsx` (apply `techRotate` to the tech-image transform)

**Interfaces:**
- Produces: `Scene.techRotate?: number` (degrees), consumed by `ScrollScene`'s existing `scene.tech` rendering block.

- [ ] **Step 1: Create the goggles SVG (for the `ai-native` scene's armor portrait)**

Create `public/tech/aviator-goggles.svg`:

```svg
<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
  <g fill="none" stroke="#f4f1ea" stroke-width="4">
    <ellipse cx="55" cy="50" rx="42" ry="34" fill="#2fe0ee" fill-opacity="0.55" />
    <ellipse cx="145" cy="50" rx="42" ry="34" fill="#2fe0ee" fill-opacity="0.55" />
    <path d="M97 50h6" />
    <path d="M13 46c-10-6-10 18 0 14" stroke-linecap="round" />
    <path d="M187 46c10-6 10 18 0 14" stroke-linecap="round" />
  </g>
</svg>
```

- [ ] **Step 2: Create the headphones SVG (for the `selected-work` letter scene)**

Create `public/tech/headphones.svg`:

```svg
<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
  <g fill="none" stroke="#f4f1ea" stroke-width="5" stroke-linecap="round">
    <path d="M20 90V70a60 60 0 0 1 120 0v20" />
    <rect x="8" y="82" width="26" height="46" rx="12" fill="#2fe0ee" fill-opacity="0.55" />
    <rect x="126" y="82" width="26" height="46" rx="12" fill="#2fe0ee" fill-opacity="0.55" />
  </g>
</svg>
```

- [ ] **Step 3: Add `techRotate` to the `Scene` type**

In `lib/scenes.ts`, change:

```tsx
  /** Hero-only: draw the golden-ratio vanishing-point grid before the painting resolves. */
  golden?: boolean;
}
```

to:

```tsx
  /** Hero-only: draw the golden-ratio vanishing-point grid before the painting resolves. */
  golden?: boolean;
  /** Rotation (degrees) applied to the `tech` overlay image, for a stuck-on collage feel. */
  techRotate?: number;
}
```

- [ ] **Step 4: Wire the goggles onto the `ai-native` scene**

In `lib/scenes.ts`, change:

```tsx
  {
    slug: "ai-native",
    bg: "/art/armor-portrait.webp",
    headline: "AI that does the work - not demos.",
    revealDirection: "right",
  },
```

to:

```tsx
  {
    slug: "ai-native",
    bg: "/art/armor-portrait.webp",
    tech: "/tech/aviator-goggles.svg",
    techPosition: { x: 47, y: 26 },
    techRotate: -4,
    headline: "AI that does the work - not demos.",
    revealDirection: "right",
  },
```

- [ ] **Step 5: Wire the headphones onto the `selected-work` scene**

In `lib/scenes.ts`, change:

```tsx
  {
    slug: "selected-work",
    bg: "/art/letter-scene.webp",
    headline: "Work we're proud to put our name on.",
    revealDirection: "left",
  },
```

to:

```tsx
  {
    slug: "selected-work",
    bg: "/art/letter-scene.webp",
    tech: "/tech/headphones.svg",
    techPosition: { x: 58, y: 22 },
    techRotate: 6,
    headline: "Work we're proud to put our name on.",
    revealDirection: "left",
  },
```

- [ ] **Step 6: Apply `techRotate` in the render**

In `components/canvas/ScrollScene.tsx`, change:

```tsx
            style={{
              left: `${scene.techPosition?.x ?? 50}%`,
              top: `${scene.techPosition?.y ?? 50}%`,
              transform: "translate3d(-50%,-50%,0)",
            }}
```

to:

```tsx
            style={{
              left: `${scene.techPosition?.x ?? 50}%`,
              top: `${scene.techPosition?.y ?? 50}%`,
              transform: `translate3d(-50%,-50%,0) rotate(${scene.techRotate ?? 0}deg)`,
            }}
```

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run: `pnpm dev`, open `http://localhost:3000`. Scroll to the `ai-native` scene (4th pinned scene) and confirm the goggles fade in over the portrait's eyes past ~60% of that scene's pin, rotated slightly, with a soft glow. Scroll to the `selected-work` scene and confirm the headphones fade in near the seated figure's head at the same point. Take a screenshot of each for the record.

- [ ] **Step 9: Commit**

```bash
git add public/tech/aviator-goggles.svg public/tech/headphones.svg lib/scenes.ts components/canvas/ScrollScene.tsx
git commit -m "Add original SVG modern-twist overlays to the ai-native and selected-work scenes"
```

---

## Task 3: Rebuild WorkAct into the flagship case-study deep-dive

**Files:**
- Modify: `components/sections/WorkAct.tsx` (full rewrite)
- Modify: `app/(site)/page.tsx:41` (fetch limit)

**Interfaces:**
- Consumes: `useStage()` from `components/canvas/StageContext.tsx` — `{ progress: MotionValue<number>, fallback: boolean }` (Task 1). `Project` type from `lib/types.ts` (`challenge`, `approach`, `outcome`, `cover`, `results`, `slug`, `category`, `title`, `id` fields used).
- Produces: `WorkAct({ projects: Project[] })` — same external signature as today, so `app/(site)/page.tsx`'s `<WorkAct projects={projects} />` call site needs no change beyond the fetch limit below.

- [ ] **Step 1: Raise the featured-projects fetch limit from 4 to 3**

In `app/(site)/page.tsx`, change:

```tsx
      getFeaturedProjects(4),
```

to:

```tsx
      getFeaturedProjects(3),
```

(Only 2 projects are currently marked `featured` in `content/projects.json`; this raises the ceiling to the spec's "2-3 case studies" without hardcoding a count that content editors can't change from `/admin`.)

- [ ] **Step 2: Rewrite `components/sections/WorkAct.tsx`**

Replace the entire file with:

```tsx
"use client";

import Link from "next/link";
import { motion, useTransform } from "motion/react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { useStage } from "@/components/canvas/StageContext";
import { coverGradient } from "@/lib/utils";
import type { Project } from "@/lib/types";

const EYEBROW = "Selected work";
const HEADLINE = "Work we're proud to put our name on.";
const INTRO = "A few of the products we've designed and shipped end to end.";

const ROTATIONS = [-6, 5];
const STAGE_LABELS = ["Challenge", "Approach", "Outcome"] as const;
const STAGE_KEYS = ["challenge", "approach", "outcome"] as const;
type StageKey = (typeof STAGE_KEYS)[number];

/** Cover image + client/category header, shared by every project spread. */
function CoverCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/work/${project.slug}`}
      className="group block overflow-hidden rounded-2xl border border-white/15 bg-[#100e0a]/80 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-md transition-colors hover:border-white/40"
    >
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ background: coverGradient(project.slug) }}
      >
        {project.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.cover}
            alt={`${project.title} - ${project.category}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-end p-4">
            <span className="text-lg font-semibold text-white/90">{project.title}</span>
          </div>
        )}
        {project.results.length > 0 ? (
          <span className="absolute bottom-3 right-3 rounded-full border border-white/30 bg-black/50 px-2.5 py-1 font-mono text-[10px] text-white backdrop-blur">
            {project.results[0].value} {project.results[0].label}
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--neon-cyan)]">
          {project.category}
        </p>
        <h3 className="mt-1 text-base font-semibold tracking-tight text-white">
          {project.title}
        </h3>
      </div>
    </Link>
  );
}

/** One challenge/approach/outcome stage card. */
function StageCard({ label, text, index }: { label: string; text: string; index: number }) {
  return (
    <div
      className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-sm"
      style={{ transform: `rotate(${ROTATIONS[index % ROTATIONS.length]}deg)` }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--neon-magenta)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/80">{text}</p>
    </div>
  );
}

/**
 * One project's case-study spread: a cover card plus a challenge/approach/
 * outcome stack. When animated, each stage fades in as the pinned scene's own
 * scroll progress moves through this project's [start, end) slice of the run;
 * under reduced motion / narrow viewports everything renders at once.
 */
function ProjectSpread({
  project,
  range,
  reduceOnly,
}: {
  project: Project;
  range: [number, number];
  reduceOnly: boolean;
}) {
  const { progress } = useStage();
  const [start, end] = range;
  const step = (end - start) / STAGE_KEYS.length;

  const challengeOpacity = useTransform(progress, [start, start + step * 0.6], [0, 1]);
  const approachOpacity = useTransform(progress, [start + step, start + step * 1.6], [0, 1]);
  const outcomeOpacity = useTransform(progress, [start + step * 2, start + step * 2.6], [0, 1]);
  const opacities: Record<StageKey, typeof challengeOpacity> = {
    challenge: challengeOpacity,
    approach: approachOpacity,
    outcome: outcomeOpacity,
  };

  if (reduceOnly) {
    return (
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <CoverCard project={project} />
        <div className="grid gap-3 sm:grid-cols-3">
          {STAGE_KEYS.map((key, i) => (
            <StageCard key={key} label={STAGE_LABELS[i]} text={project[key]} index={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <CoverCard project={project} />
      <div className="grid gap-3 sm:grid-cols-3">
        {STAGE_KEYS.map((key, i) => (
          <motion.div key={key} style={{ opacity: opacities[key] }}>
            <StageCard label={STAGE_LABELS[i]} text={project[key]} index={i} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * Work act: the flagship deep-dive. Each real case study (up to three, from
 * /admin) gets its own scroll-revealed challenge/approach/outcome spread,
 * each owning an equal slice of the pinned scene's scroll progress.
 */
export function WorkAct({ projects }: { projects: Project[] }) {
  const { fallback } = useStage();
  const deck = projects.slice(0, 3);
  const slice = 1 / Math.max(deck.length, 1);

  return (
    <Container className="relative w-full text-[#f4f1ea]">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-cyan)]" aria-hidden />
          {EYEBROW}
        </span>
        <h2 className="display-serif mt-6 text-balance text-[clamp(2.25rem,4.4vw,4rem)]">
          {HEADLINE}
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">{INTRO}</p>
      </div>

      <div className="mt-10 space-y-10">
        {deck.map((p, i) => (
          <ProjectSpread
            key={p.id}
            project={p}
            range={[i * slice, (i + 1) * slice]}
            reduceOnly={fallback}
          />
        ))}
      </div>

      <div className="mt-10">
        <Button href="/work" variant="lightOutline" size="lg" withArrow>
          View all work
        </Button>
      </div>
    </Container>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck`
Expected: no errors. If `project[key]` indexing errors, confirm `STAGE_KEYS` is typed `readonly StageKey[]` via `as const` (already written above) — this is required for TS to narrow the index type.

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 4: Manual verification — desktop**

Run: `pnpm dev`, open `http://localhost:3000`, scroll into the `selected-work` scene (now still 3rd in DOM order until Task 4). Confirm: the cover card and challenge/approach/outcome cards for the first project (Clovey Restaurant) reveal in sequence as you scroll through roughly the first half of the scene's pin, then the second project (FitPlanCoach) reveals the same way through the second half. Confirm no stats badge renders on either cover (both have empty `results`).

- [ ] **Step 5: Manual verification — reduced motion / mobile fallback**

In Chrome DevTools, enable "Emulate CSS prefers-reduced-motion: reduce" (or resize below 1024px width), reload, and confirm both project spreads render fully visible immediately (no scroll-gated opacity), stacked in a plain grid.

- [ ] **Step 6: Commit**

```bash
git add components/sections/WorkAct.tsx "app/(site)/page.tsx"
git commit -m "Rebuild WorkAct into a scroll-revealed case-study deep-dive"
```

---

## Task 4: Move the Work scene to immediately follow the hero

**Files:**
- Modify: `app/(site)/page.tsx:71-77` (reorder + relabel two `<ScrollScene>` blocks)

**Interfaces:**
- None (JSX reorder only; no prop/type changes).

- [ ] **Step 1: Swap the `what-we-do` and `selected-work` blocks**

In `app/(site)/page.tsx`, change:

```tsx
      <ScrollScene scene={getScene("what-we-do")} coord="SYS_REF // 00.02">
        <ServicesAct intro={site.servicesIntro} services={featuredServices} />
      </ScrollScene>

      <ScrollScene scene={getScene("selected-work")} coord="SYS_REF // 00.03">
        <WorkAct projects={projects} />
      </ScrollScene>
```

to:

```tsx
      <ScrollScene scene={getScene("selected-work")} coord="SYS_REF // 00.02">
        <WorkAct projects={projects} />
      </ScrollScene>

      <ScrollScene scene={getScene("what-we-do")} coord="SYS_REF // 00.03">
        <ServicesAct intro={site.servicesIntro} services={featuredServices} />
      </ScrollScene>
```

(`ai-native` through `industries` keep their existing `coord` labels — their position in the run doesn't change, only what now precedes them.)

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `pnpm dev`, open `http://localhost:3000`. Scroll the full homepage top to bottom and confirm: hero → Work (case-study deep-dive) → Services → AI → Proof → How We Work → Industries → Closing → coda. Confirm the `SideRail` on the right shows 7 numbered stops and that clicking stop "02" jumps to the Work scene (not Services).

- [ ] **Step 4: Commit**

```bash
git add "app/(site)/page.tsx"
git commit -m "Move Work to immediately follow the hero as the flagship scene"
```

---

## Task 5: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck, lint, and build**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: all three succeed with no errors.

- [ ] **Step 2: Full breakpoint scroll-through**

Run: `pnpm dev`. Using the browser's device toolbar, scroll the entire homepage at three widths: 390px (mobile), 834px (tablet), and 1440px (desktop). At each, confirm:
- The Work scene's case-study reveal (Task 3) behaves correctly (scroll-scrubbed at desktop width where `fallback` is false since `narrow` is only true below 1024px in `ScrollScene`; static/all-at-once below 1024px).
- The goggles/headphones overlays (Task 2) appear positioned sensibly at all widths (re-check `techPosition` percentages don't place them off-frame on narrow crops — adjust `techPosition` values in `lib/scenes.ts` if they do, and re-run this step).
- No layout shift, no console errors, no dropped frames that read as jank while scrolling.

- [ ] **Step 3: Confirm Lenis/ScrollTrigger are still in sync**

While scrolling fast with the mouse wheel through the pinned scene run, confirm the pin release points feel locked to scroll position (no lag or overshoot). This exercises the existing `lenis.on("scroll", ScrollTrigger.update)` bridge in `SmoothScroll.tsx` under the new real-progress load from Task 1 — it was already correct before this plan, this step only confirms Task 1-4 didn't regress it.

- [ ] **Step 4: Confirm the shader hero still degrades gracefully**

In Chrome DevTools, use "Rendering → Disable WebGL" (or throttle CPU heavily), reload, and confirm `CanvasErrorBoundary`'s fallback (`<Image src={scene.bg} ... />`) renders instead of a broken canvas, on both the hero and the `ai-native`/`selected-work` scenes carrying the new tech overlays.

- [ ] **Step 5: Final commit (if any fixes were made during verification)**

```bash
git add -A
git commit -m "Fix issues found during full breakpoint verification pass"
```

(Skip this step if Steps 1-4 found nothing to fix.)

---

## Plan Self-Review

**Spec coverage:**
- Narrative structure (Hero → flagship Work → rest, lighter reveal kept as-is elsewhere): Task 4 (reorder) + Task 3 (Work rebuild). ✓
- Hybrid architecture (WebGL hero-class shader, DOM/GSAP/Motion elsewhere): already in place pre-plan; confirmed unchanged and extended correctly (Task 1). ✓
- Asset pipeline / modern-twist SVG overlay: Task 2. ✓
- Content wiring (no new copy, reuse `content/*.json`): Task 3 reuses `getFeaturedProjects`; no JSON files touched. ✓
- Testing/verification approach (manual scroll-through, Lenis/ScrollTrigger bridge check, shader fallback check): Task 5. ✓
- Out-of-scope items from the spec (catalog/changelog zone, inner pages, new copywriting, reproducing Shopify's actual assets): not touched by any task. ✓

**Placeholder scan:** No TBD/TODO/"add appropriate X" phrasing in any step; every code step has complete, runnable code.

**Type consistency:** `Scene.techRotate` (Task 2) used consistently in `lib/scenes.ts` and `ScrollScene.tsx`. `useStage().progress` (Task 1) consumed with the same `MotionValue<number>` type in `WorkAct.tsx` (Task 3). `WorkAct({ projects: Project[] })` signature unchanged from the current file, so the `app/(site)/page.tsx` call site needs only the fetch-limit edit in Task 3, not a prop-shape change.
