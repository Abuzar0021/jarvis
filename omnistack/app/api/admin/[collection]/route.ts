import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import {
  faqSchema,
  industrySchema,
  postSchema,
  projectSchema,
  redirectSchema,
  serviceSchema,
  testimonialSchema,
} from "@/lib/validation";
import {
  addActivity,
  saveFaqs,
  saveIndustries,
  saveLeads,
  savePosts,
  saveProjects,
  saveRedirects,
  saveServices,
  saveTestimonials,
} from "@/lib/content";
import { canPublish, genId, slugify } from "@/lib/utils";
import type {
  Faq,
  Industry,
  Lead,
  Post,
  Project,
  Redirect,
  Service,
  Testimonial,
} from "@/lib/types";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ collection: string }> },
) {
  if (!(await isAuthenticated())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { collection } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const items: unknown[] = Array.isArray(body?.items) ? body.items : [];

  try {
    switch (collection) {
      case "projects": {
        const out: Project[] = items.map((raw, i) => {
          const p = projectSchema.parse(raw);
          return {
            ...p,
            id: p.id || genId("prj"),
            slug: p.slug || slugify(p.title),
            sortOrder: Number.isFinite(p.sortOrder) && p.sortOrder ? p.sortOrder : i + 1,
          };
        });
        await saveProjects(out);
        break;
      }
      case "services": {
        const out: Service[] = items.map((raw) => {
          const s = serviceSchema.parse(raw);
          return { ...s, id: s.id || genId("svc"), slug: s.slug || slugify(s.name) };
        });
        await saveServices(out);
        break;
      }
      case "testimonials": {
        const out: Testimonial[] = items.map((raw) => {
          const t = testimonialSchema.parse(raw);
          const record: Testimonial = { ...t, id: t.id || genId("tst") };
          // The attribution ladder, enforced server side as well as in the
          // editor UI. A quote nobody can be attributed to, or one with no
          // stated scope of work, cannot be approved by any route.
          if (record.status === "approved" && !canPublish(record)) {
            throw new Error(
              "A review needs a name, role or company, plus a project scope, before it can be approved.",
            );
          }
          return record;
        });
        await saveTestimonials(out);
        break;
      }
      case "faqs": {
        const out: Faq[] = items.map((raw) => {
          const f = faqSchema.parse(raw);
          return { ...f, id: f.id || genId("faq") };
        });
        await saveFaqs(out);
        break;
      }
      case "posts": {
        const today = new Date().toISOString().slice(0, 10);
        const out: Post[] = items.map((raw) => {
          const p = postSchema.parse(raw);
          return {
            ...p,
            id: p.id || genId("post"),
            slug: p.slug || slugify(p.title),
            publishedAt: p.publishedAt || today,
          };
        });
        await savePosts(out);
        break;
      }
      case "industries": {
        const out: Industry[] = items.map((raw, i) => {
          const v = industrySchema.parse(raw);
          return {
            ...v,
            id: v.id || genId("ind"),
            slug: v.slug || slugify(v.name),
            sortOrder: Number.isFinite(v.sortOrder) && v.sortOrder ? v.sortOrder : i + 1,
          };
        });
        await saveIndustries(out);
        break;
      }
      case "leads": {
        const allowed = ["new", "contacted", "qualified", "won", "lost"];
        const out = (items as Lead[]).map((l) => ({
          ...l,
          status: allowed.includes(l.status) ? l.status : "new",
        }));
        await saveLeads(out as Lead[]);
        break;
      }
      case "redirects": {
        const out: Redirect[] = items.map((raw) => {
          const r = redirectSchema.parse(raw);
          return { ...r, id: r.id || genId("rdr") };
        });
        await saveRedirects(out);
        break;
      }
      default:
        return Response.json({ ok: false, error: "Unknown collection" }, { status: 404 });
    }
    await addActivity("save", `${collection} (${items.length})`);
    revalidatePath("/", "layout");
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid data" },
      { status: 400 },
    );
  }
}
