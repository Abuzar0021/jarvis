import type { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { siteSchema } from "@/lib/validation";
import { saveSite } from "@/lib/content";
import type { SiteContent } from "@/lib/types";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = siteSchema.safeParse(body?.site);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return Response.json(
      {
        ok: false,
        error: `${first?.path.join(".") || "site"}: ${first?.message || "Invalid data"}`,
      },
      { status: 400 },
    );
  }
  await saveSite(parsed.data as SiteContent);
  return Response.json({ ok: true });
}
