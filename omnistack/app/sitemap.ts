import type { MetadataRoute } from "next";
import { getProjects, getServices } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const [projects, services] = await Promise.all([getProjects(), getServices()]);
  const now = new Date();

  const staticRoutes = ["", "/work", "/services", "/about", "/contact", "/privacy", "/terms"].map(
    (path) => ({ url: `${base}${path}`, lastModified: now }),
  );

  const projectRoutes = projects.map((p) => ({
    url: `${base}/work/${p.slug}`,
    lastModified: now,
  }));

  const serviceRoutes = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    lastModified: now,
  }));

  return [...staticRoutes, ...projectRoutes, ...serviceRoutes];
}
