import {
  getFaqs,
  getIndustries,
  getPosts,
  getWork,
  getServices,
} from "./content";
import type { SearchItem } from "./search-core";

export type { SearchItem, SearchType } from "./search-core";
export { searchIndex } from "./search-core";

/** Build a flat, searchable index across all public content (server-only). */
export async function buildSearchIndex(): Promise<SearchItem[]> {
  const [projects, services, posts, industries, faqs] = await Promise.all([
    getWork(),
    getServices(),
    getPosts(),
    getIndustries(),
    getFaqs(),
  ]);

  const items: SearchItem[] = [];

  for (const p of projects) {
    items.push({
      type: "Work",
      title: p.title,
      excerpt: p.summary,
      href: `/work/${p.slug}`,
      keywords: [p.category, p.client, ...p.tags, ...p.services].join(" "),
    });
  }
  for (const s of services) {
    items.push({
      type: "Service",
      title: s.name,
      excerpt: s.summary,
      href: `/services/${s.slug}`,
      keywords: [s.group, ...s.deliverables].join(" "),
    });
  }
  for (const i of industries) {
    items.push({
      type: "Industry",
      title: i.name,
      excerpt: i.summary,
      href: `/industries/${i.slug}`,
      keywords: i.painPoints.join(" "),
    });
  }
  for (const p of posts) {
    items.push({
      type: "Insight",
      title: p.title,
      excerpt: p.excerpt,
      href: `/insights/${p.slug}`,
      keywords: [p.category, p.author].join(" "),
    });
  }
  for (const f of faqs) {
    items.push({
      type: "FAQ",
      title: f.question,
      excerpt: f.answer,
      href: "/#faq",
      keywords: f.category,
    });
  }

  return items;
}
