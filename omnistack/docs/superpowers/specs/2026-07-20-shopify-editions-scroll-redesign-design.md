# Homepage Redesign: Shopify-Editions-style Scroll Mechanics

Date: 2026-07-20
Status: Approved by user, pending spec review

## Goal

Rebuild the existing "Living Renaissance" homepage (`app/(site)/page.tsx` and its
act components) in place so it scrolls and functions like Shopify's Editions
Winter '26 announcement page (https://www.shopify.com/editions/winter2026),
populated entirely with our own content, using our own Renaissance painting
assets given a "modern twist" treatment. This is a mechanics/technique
replication, not a literal copy: no Shopify text, code, or artwork is reused —
only the scroll-choreography *technique* (smooth-scroll + pinned sections +
staggered card reveals + a shader-driven hero) is replicated.

## Reference site structure (for context, not to be copied)

The reference page has two distinct zones:
1. An elaborate cinematic **hero + one flagship feature deep-dive**
   (space/particle background, a product video, a fanned stack of preview
   cards, pinned demo-style panels that swap content as you scroll).
2. A long **changelog-style catalog** of ~200 smaller feature entries in
   repeatable, lighter-weight cards.

Decision (confirmed with user): only zone 1's pattern applies here. Zone 2
doesn't fit an agency site's content shape and is explicitly out of scope.

## Scope

- Rebuild `app/(site)/page.tsx` and its act components in place (not a new
  route). This supersedes the current "Living Renaissance" implementation.
- Homepage only. Inner pages (about, services, work, industries, etc.) are
  out of scope for this pass — they already carry the dark-editorial re-skin
  from the prior redesign and are untouched here.

## Narrative structure

Reorder the existing acts so there's one elaborate opening and one elaborate
flagship deep-dive, then a lighter run through the rest:

1. **Hero** — shader-driven painting reveal (rebuilt from `StardustPlane.tsx`),
   tagline, filmic entry.
2. **Work (flagship, elaborate)** — deep-dive into 2-3 real case studies from
   `content/projects.json` (e.g. Clovey Restaurant, FitPlanCoach). A fanned-card
   reveal walks through each project's `challenge` → `approach` → `outcome`
   fields; a pinned "results" panel swaps between projects as the user
   scrolls, showing real project screenshots/gallery images and metrics in
   place of Shopify's code-editor/chat demo panels.
3. **Services, Industries, AI, How We Work, Proof** — existing acts, kept,
   re-skinned with the lighter GSAP/DOM reveal system (staggered fades,
   scale-ins, sticky mini-pins) rather than bespoke one-off treatments.
4. **Closing** — existing CTA act, filmic exit transition (reuse
   `PageTransition.tsx`).

## Technical architecture — Hybrid (WebGL hero only)

Confirmed approach: WebGL is used only where it already exists and adds the
most value (the hero). Every other section is DOM + GSAP + Motion. This
mirrors the reference site's own actual balance (it uses only 2 `<canvas>`
elements across a ~23,000px-tall page — most of its choreography is DOM-based
too) and minimizes new-shader risk/maintenance cost while reusing what the
prior session already built.

- **Hero**: R3F canvas + `components/canvas/StardustPlane.tsx`, extended to
  interpolate across multiple paintings keyed to scroll progress (currently
  takes a single `src`; needs a multi-source blend mode).
- **Scroll driver**: `Lenis`, already wired via `components/motion/SmoothScroll.tsx`.
- **Timelines**: GSAP ScrollTrigger for pin/fan-out/cross-fade sequences.
  Framer Motion (`motion` package) for component-level reveal variants.
- **Route transitions**: reuse/extend `components/motion/PageTransition.tsx`.
- **New shared primitives**:
  - `useScrollTimeline` hook — wraps ScrollTrigger setup/cleanup for a pinned
    section, used by the Work act and any other act that needs pinning.
  - `FannedCards` component — the case-study card-stack reveal, built once
    and reused wherever a fanned-card pattern is needed.
- **Known integration risk**: Lenis and GSAP ScrollTrigger must be bridged
  (ScrollTrigger needs to hear Lenis's scroll events, not the native
  scrollbar) — a standard but easy-to-get-wrong integration; the plan must
  include an explicit verification step for this.

## Asset pipeline (7 provided paintings)

Revised approach (no paid image-generation credits available): rather than
pre-baking flattened AI-composited raster images, the "modern twist" is built
as a **live layered overlay in the browser** — an homage to the reference
site's technique of classical portrait + anachronistic modern object, applied
to our own images, with zero external generation dependency:

- Each of the 7 paintings in `C:\Users\elahi\Downloads\assets` is used as-is
  (no pixel editing) as a base image/texture.
- A small set of original, hand-authored SVG icon assets (sunglasses/goggles,
  headphones, a laptop outline, a camera, a skateboard — designed from
  scratch, not sourced) is built once and reused across paintings.
- Each painting placement gets one SVG icon absolutely positioned over it,
  with a drop-shadow, slight rotation, and a scroll-triggered pop/settle
  animation (via the same GSAP/Motion system driving the rest of the page) —
  a deliberate sticker/collage look rather than seamless photo-blended
  compositing. This trade-off was confirmed with the user.
- Originals are used untouched for non-hero placements (section dividers,
  card backgrounds) where the plain painting reads better.
- This removes the "asset batch" pre-step entirely — the SVG icon set and
  overlay component are built as part of the hero/component implementation
  work, no separate generation pass required.

## Content wiring

No new copy. Reuses existing CMS-backed content via `lib/content.ts`:
`content/projects.json`, `content/services.json`, `content/industries.json`,
`content/testimonials.json`, `content/site.json`.

## Testing / verification

- `npm run dev`, manual scroll-through at mobile/tablet/desktop breakpoints.
- Explicit check that Lenis and ScrollTrigger are correctly bridged (see risk
  above) — pins and fan-outs must track the Lenis-smoothed scroll position,
  not raw native scroll.
- Shader hero already has `CanvasErrorBoundary`; confirm it still degrades
  gracefully with the multi-painting blend change.
- `npm run lint` / `npm run typecheck` before considering any increment done.

## Out of scope

- The changelog/catalog zone pattern (explicitly declined).
- Inner pages beyond the homepage.
- Any new copywriting — content is reused as-is.
- Reproducing Shopify's actual text, code, or imagery.
