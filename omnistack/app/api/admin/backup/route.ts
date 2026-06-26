import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { addActivity, getContentBundle, restoreContentBundle } from "@/lib/content";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const bundle = await getContentBundle();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="omnistack-backup-${date}.json"`,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "Invalid backup file" }, { status: 400 });
  }
  try {
    await restoreContentBundle(body);
    await addActivity("restore", "content bundle");
    revalidatePath("/", "layout");
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Restore failed" },
      { status: 400 },
    );
  }
}
