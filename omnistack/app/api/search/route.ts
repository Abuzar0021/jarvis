import type { NextRequest } from "next/server";
import { buildSearchIndex, searchIndex } from "@/lib/search";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") || "";
  const index = await buildSearchIndex();
  const results = q ? searchIndex(index, q) : index;
  return Response.json({ count: results.length, results });
}
