// Pure, client-safe search types + matching. No server/content imports here,
// so this can be bundled into client components.

export type SearchType = "Work" | "Service" | "Industry" | "Insight" | "FAQ";

export interface SearchItem {
  type: SearchType;
  title: string;
  excerpt: string;
  href: string;
  keywords: string;
}

/** Case-insensitive substring scoring across title, excerpt, keywords. */
export function searchIndex(index: SearchItem[], query: string): SearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  return index
    .map((item) => {
      const haystack =
        `${item.title} ${item.excerpt} ${item.keywords} ${item.type}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (!haystack.includes(t)) return { item, score: -1 };
        if (item.title.toLowerCase().includes(t)) score += 3;
        else score += 1;
      }
      return { item, score };
    })
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}
