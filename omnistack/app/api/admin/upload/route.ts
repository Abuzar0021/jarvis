import type { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { isAuthenticated } from "@/lib/auth";
import { UPLOADS_DIR } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file provided" }, { status: 400 });
  }
  // Videos only in the two formats the cards actually play. An allow list, not
  // a "video/" prefix check: this writes to a public directory, so the set of
  // things that can land there stays small and known.
  const VIDEO_TYPES = ["video/mp4", "video/webm"];
  const isVideo = VIDEO_TYPES.includes(file.type);
  const isImage = file.type.startsWith("image/");
  if (!isImage && !isVideo) {
    return Response.json(
      { ok: false, error: "Images, or mp4 and webm video" },
      { status: 400 },
    );
  }

  // Motion previews are a few seconds of muted screen capture, so 25MB is
  // generous. Images stay at 5MB.
  const limitMb = isVideo ? 25 : 5;
  if (file.size > limitMb * 1024 * 1024) {
    return Response.json(
      { ok: false, error: `Max file size is ${limitMb}MB` },
      { status: 400 },
    );
  }

  const ext =
    (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) ||
    "png";
  const name = `${randomBytes(8).toString("hex")}.${ext}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOADS_DIR, name), buffer);

  return Response.json({ ok: true, url: `/uploads/${name}` });
}
