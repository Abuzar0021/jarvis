import type { MetadataRoute } from "next";
import {
  contentUpdatedAt,
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

  // `lastmod` is per source file, not `new Date()`. Stamping every URL with the
  // current time on every crawl told Google the entire site had changed that
  // second, every single time, which is noise it learns to discard. The CMS
  // rewrites these JSON files on save, so their mtime is the real answer, and a
  // genuine edit now stands out instead of being lost among 37 false positives.
  const [siteAt, projectsAt, servicesAt, industriesAt] = await Promise.all([
    contentUpdatedAt("site.json"),
    contentUpdatedAt("projects.json"),
    contentUpdatedAt("services.json"),
    contentUpdatedAt("industries.json"),
  ]);

  // Static routes render copy out of site.json, so that file's mtime is what
  // actually dates them. The two index pages that list a collection are dated
  // by the collection instead, since that is what changes their content.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}`, lastModified: siteAt },
    { url: `${base}/work`, lastModified: projectsAt },
    { url: `${base}/templates`, lastModified: projectsAt },
    { url: `${base}/services`, lastModified: servicesAt },
    { url: `${base}/industries`, lastModified: industriesAt },
    { url: `${base}/pricing`, lastModified: siteAt },
    { url: `${base}/insights`, lastModified: siteAt },
    { url: `${base}/reviews`, lastModified: siteAt },
    { url: `${base}/about`, lastModified: siteAt },
    { url: `${base}/contact`, lastModified: siteAt },
    { url: `${base}/book`, lastModified: siteAt },
    { url: `${base}/privacy`, lastModified: siteAt },
    { url: `${base}/terms`, lastModified: siteAt },
  ];

  const projectRoutes = projects.map((p) => ({
    url: `${base}/work/${p.slug}`,
    lastModified: projectsAt,
  }));

  const serviceRoutes = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    lastModified: servicesAt,
  }));

  // Posts are the one collection carrying a real per-record date, so they keep
  // using it rather than the file mtime.
  const postRoutes = posts.map((p) => ({
    url: `${base}/insights/${p.slug}`,
    lastModified: p.publishedAt ? new Date(p.publishedAt) : siteAt,
  }));

  const industryRoutes = industries.map((i) => ({
    url: `${base}/industries/${i.slug}`,
    lastModified: industriesAt,
  }));

  // The gallery pages only. /preview/[slug] is the full bleed demo surface and
  // is noindexed, so listing it here would ask Google to crawl something the
  // page itself tells it to ignore.
  const templateRoutes = templates.map((t) => ({
    url: `${base}/templates/${t.slug}`,
    lastModified: projectsAt,
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
