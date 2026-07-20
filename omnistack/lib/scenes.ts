// Typed manifest for the "Living Renaissance" cinematic scenes: one pinned
// <ScrollScene> per section, each resolving a public-domain painting out of
// scroll-driven stardust. Only entries actually mounted on a page are
// rendered; this file is the single source of truth for asset paths and copy
// so a scene's content lives in one place.

export type TechPosition = { x: number; y: number };

export type RevealDirection = "center" | "up" | "down" | "left" | "right";

export interface Scene {
  slug: string;
  /** Full painting, used as the shader's base texture. */
  bg: string;
  /** Optional cutout of the figure alone (transparent), for future subject-only compositing. */
  subject?: string;
  /** Optional modern tech object composited at techPosition (transparent). */
  tech?: string;
  /** Optional 2-3s seamless blink/breathe loop, cross-faded in past ~60% progress. */
  loop?: string;
  eyebrow?: string;
  headline: string;
  body?: string;
  techPosition?: TechPosition;
  revealDirection: RevealDirection;
  /** Hero-only: draw the golden-ratio vanishing-point grid before the painting resolves. */
  golden?: boolean;
  /** Rotation (degrees) applied to the `tech` overlay image, for a stuck-on collage feel. */
  techRotate?: number;
}

export const scenes: Scene[] = [
  {
    slug: "hero",
    bg: "/art/forest-landscape.webp",
    headline: "Products that feel inevitable.",
    revealDirection: "center",
    techPosition: { x: 38, y: 64 },
    golden: true,
  },
  {
    slug: "what-we-do",
    bg: "/art/woodcut-horn.webp",
    headline: "Everything you need to design, build, and grow a modern digital product - under one roof.",
    revealDirection: "up",
  },
  {
    slug: "selected-work",
    bg: "/art/letter-scene.webp",
    tech: "/tech/headphones.svg",
    techPosition: { x: 84, y: 14 },
    techRotate: 6,
    headline: "Work we're proud to put our name on.",
    revealDirection: "left",
  },
  {
    slug: "ai-native",
    bg: "/art/armor-portrait.webp",
    tech: "/tech/aviator-goggles.svg",
    techPosition: { x: 47, y: 26 },
    techRotate: -4,
    headline: "AI that does the work - not demos.",
    revealDirection: "right",
  },
  {
    slug: "by-the-numbers",
    bg: "/art/portrait-mother.webp",
    headline: "Trusted by founders, agencies, and teams shipping at scale.",
    revealDirection: "center",
  },
  {
    slug: "how-we-work",
    bg: "/art/portrait-dinner.webp",
    headline: "A clear path, every time.",
    revealDirection: "up",
  },
  {
    slug: "industries",
    bg: "/art/portrait-reading.webp",
    headline: "Depth across the verticals we serve.",
    revealDirection: "up",
  },
];

export function getScene(slug: string): Scene {
  const scene = scenes.find((s) => s.slug === slug);
  if (!scene) throw new Error(`Unknown scene: ${slug}`);
  return scene;
}
