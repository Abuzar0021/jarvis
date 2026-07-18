import { randomBytes } from "node:crypto";

/** Join class names, dropping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .toString()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Short stable id for content records. */
export function genId(prefix = "id"): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

/** wa.me link from a digits-only number. */
export function whatsappLink(digits: string, message?: string): string {
  const clean = (digits || "").replace(/[^0-9]/g, "");
  const q = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${clean}${q}`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Estimated reading time in minutes from body text. */
export function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Deterministic gold-tinted gradient for project covers without an image. */
export function coverGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const a = h;
  const b = (h + 40) % 360;
  // Muted warm-light wash so fallback covers sit naturally on parchment.
  return `linear-gradient(135deg, hsl(${a} 22% 88%) 0%, hsl(${b} 26% 80%) 60%, #ddd5c2 100%)`;
}
