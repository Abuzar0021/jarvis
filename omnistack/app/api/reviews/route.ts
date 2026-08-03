import type { NextRequest } from "next/server";
import { reviewSubmissionSchema } from "@/lib/validation";
import { addTestimonial } from "@/lib/content";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { genId } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { Testimonial } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Public review intake. Everything that arrives here lands as "pending" and
 * waits for a human in /admin/testimonials. Status, featured, verifiedBy and
 * both timestamps are set on this side of the wire and never read from the
 * request body, so a crafted POST cannot publish itself or claim to be
 * verified. The limit is tighter than /api/contact: nobody has three genuine
 * reviews to file in ten minutes.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`review:${ip}`, 3, 600_000);
    if (!rl.ok) {
      return Response.json(
        { ok: false, error: "Too many submissions. Please try again later." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));

    // Honeypot: pretend success, store nothing.
    if (body?.website) return Response.json({ ok: true });

    const parsed = reviewSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errors[key]) errors[key] = issue.message;
      }
      return Response.json({ ok: false, errors }, { status: 400 });
    }

    const d = parsed.data;
    const now = new Date().toISOString();
    const review: Testimonial = {
      id: genId("tst"),
      quote: d.quote,
      authorName: d.name,
      authorRole: d.role,
      company: d.company,
      featured: false,
      status: "pending",
      projectScope: d.projectScope,
      deliveredOn: "",
      verifiedBy: "",
      nameWithheld: d.nameWithheld,
      contactEmail: d.email,
      submittedAt: now,
      consentAt: now,
    };

    await addTestimonial(review);

    logger.info("review.received", { withheld: String(review.nameWithheld) });
    return Response.json({ ok: true });
  } catch (err) {
    logger.error("review.failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
