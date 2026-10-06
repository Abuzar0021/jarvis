import type { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { UPLOADS_DIR, contentTypeFor } from "@/lib/uploads";

export const runtime = "nodejs";
// Always read from disk so newly uploaded files are served immediately.
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ file: string }> },
) {
  const { file } = await ctx.params;
  // Prevent path traversal - only allow a bare filename.
  const safe = path.basename(file);
  if (safe !== file || file.includes("..") || file.startsWith(".")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await fs.readFile(path.join(UPLOADS_DIR, safe));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeFor(safe),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
