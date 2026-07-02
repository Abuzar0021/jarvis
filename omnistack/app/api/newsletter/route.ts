import type { NextRequest } from "next/server";
import { newsletterSchema } from "@/lib/validation";
import { addLead } from "@/lib/content";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { genId } from "@/lib/utils";
import type { Lead } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`newsletter:${ip}`, 5, 60_000);
    if (!rl.ok) {
      return Response.json({ ok: false, error: "Too many requests." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.website) return Response.json({ ok: true });

    const parsed = newsletterSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
    }

    const lead: Lead = {
      id: genId("sub"),
      name: "Newsletter subscriber",
      email: parsed.data.email,
      company: "",
      service: "Newsletter",
      budget: "",
      message: "Subscribed to the newsletter.",
      source: "newsletter",
      page: "",
      utm: "",
      status: "new",
      createdAt: new Date().toISOString(),
    };
    await addLead(lead);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
