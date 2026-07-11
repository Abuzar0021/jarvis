import { getPosts, getSite } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(s: string): string {
  return String(s).replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
  );
}

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const [site, posts] = await Promise.all([getSite(), getPosts()]);

  const items = posts
    .map((p) => {
      const url = `${base}/insights/${p.slug}`;
      let pub = "";
      try {
        pub = new Date(p.publishedAt).toUTCString();
      } catch {
        pub = "";
      }
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${pub ? `<pubDate>${pub}</pubDate>` : ""}
      <category>${esc(p.category)}</category>
      <description>${esc(p.excerpt)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.brand)} - Insights</title>
    <link>${base}/insights</link>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${esc(site.description)}</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
