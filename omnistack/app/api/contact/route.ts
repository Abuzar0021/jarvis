import type { NextRequest } from "next/server";
import { contactSchema } from "@/lib/validation";
import { addLead, getSite } from "@/lib/content";
import { sendLeadEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { genId } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { Lead } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`contact:${ip}`, 5, 60_000);
    if (!rl.ok) {
      return Response.json(
        { ok: false, error: "Too many requests. Please try again shortly." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));

    // Honeypot: pretend success, store nothing.
    if (body?.website) return Response.json({ ok: true });

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errors[key]) errors[key] = issue.message;
      }
      return Response.json({ ok: false, errors }, { status: 400 });
    }

    const d = parsed.data;
    const lead: Lead = {
      id: genId("lead"),
      name: d.name,
      email: d.email,
      company: d.company || "",
      service: d.service || "",
      budget: d.budget || "",
      message: d.message,
      source: d.source || "contact",
      page: d.page || "",
      utm: d.utm || "",
      status: "new",
      createdAt: new Date().toISOString(),
    };

    await addLead(lead);

    const site = await getSite();
    // Best-effort email notification - never fails the request.
    await sendLeadEmail(lead, site).catch(() => undefined);

    logger.info("lead.received", { source: lead.source, page: lead.page });
    return Response.json({ ok: true });
  } catch (err) {
    logger.error("contact.failed", { error: err instanceof Error ? err.message : "unknown" });
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
