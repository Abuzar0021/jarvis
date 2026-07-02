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
  if (!file.type.startsWith("image/")) {
    return Response.json({ ok: false, error: "Images only" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ ok: false, error: "Max file size is 5MB" }, { status: 400 });
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
