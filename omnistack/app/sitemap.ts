import type { MetadataRoute } from "next";
import {
  getIndustries,
  getPosts,
  getTemplates,
  getWork,
  getServices,
} from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const [projects, services, posts, industries, templates] = await Promise.all([
    getWork(),
    getServices(),
    getPosts(),
    getIndustries(),
    getTemplates(),
  ]);
  const now = new Date();

  const staticRoutes = [
    "",
    "/work",
    "/templates",
    "/services",
    "/industries",
    "/pricing",
    "/insights",
    "/reviews",
    "/about",
    "/contact",
    "/book",
    "/privacy",
    "/terms",
  ].map((path) => ({ url: `${base}${path}`, lastModified: now }));

  const projectRoutes = projects.map((p) => ({
    url: `${base}/work/${p.slug}`,
    lastModified: now,
  }));

  const serviceRoutes = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    lastModified: now,
  }));

  const postRoutes = posts.map((p) => ({
    url: `${base}/insights/${p.slug}`,
    lastModified: new Date(p.publishedAt || now),
  }));

  const industryRoutes = industries.map((i) => ({
    url: `${base}/industries/${i.slug}`,
    lastModified: now,
  }));

  // The gallery pages only. /preview/[slug] is the full bleed demo surface and
  // is noindexed, so listing it here would ask Google to crawl something the
  // page itself tells it to ignore.
  const templateRoutes = templates.map((t) => ({
    url: `${base}/templates/${t.slug}`,
    lastModified: now,
  }));

  return [
    ...staticRoutes,
    ...projectRoutes,
    ...serviceRoutes,
    ...postRoutes,
    ...industryRoutes,
    ...templateRoutes,
  ];
}
