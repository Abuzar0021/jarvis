import type { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isAuthenticated } from "@/lib/auth";
import { UPLOADS_DIR } from "@/lib/uploads";

export const runtime = "nodejs";

const DIR = UPLOADS_DIR;

export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  let names: string[] = [];
  try {
    names = await fs.readdir(DIR);
  } catch {
    names = [];
  }
  const items: { name: string; url: string; size: number; mtime: number }[] = [];
  for (const name of names) {
    if (name.startsWith(".")) continue;
    try {
      const st = await fs.stat(path.join(DIR, name));
      if (st.isFile()) {
        items.push({ name, url: `/uploads/${name}`, size: st.size, mtime: st.mtimeMs });
      }
    } catch {
      // ignore unreadable entries
    }
  }
  items.sort((a, b) => b.mtime - a.mtime);
  return Response.json({ items });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { name } = await req.json().catch(() => ({ name: "" }));
  if (typeof name !== "string" || name !== path.basename(name) || name.includes("..")) {
    return Response.json({ ok: false, error: "Invalid filename" }, { status: 400 });
  }
  try {
    await fs.unlink(path.join(DIR, name));
  } catch {
    // already gone — treat as success
  }
  return Response.json({ ok: true });
}
