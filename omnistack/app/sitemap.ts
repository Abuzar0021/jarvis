import type { MetadataRoute } from "next";

// One page, one entry. The old per-page entries are gone with the pages themselves.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://omnistacksdigital.com";
  return [{ url: `${base}/`, changeFrequency: "monthly", priority: 1 }];
}
