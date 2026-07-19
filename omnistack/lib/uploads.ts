import path from "node:path";

/**
 * Directory where user-uploaded media is stored.
 *
 * Defaults to `public/uploads` (keeps existing uploads working). In production
 * you can point this at a dedicated persistent volume, e.g. UPLOADS_DIR=/data/uploads,
 * so media lives outside the build output.
 *
 * Files here are served at runtime by the /uploads/[file] route handler - NOT by
 * Next's static `public/` handler, which only serves files present at build time.
 */
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
  ico: "image/x-icon",
};

export function contentTypeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return MIME_TYPES[ext] || "application/octet-stream";
}
