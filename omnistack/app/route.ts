import { HOME_HTML } from "@/lib/home-html";

// The homepage is a self-contained scroll film (see home-src/ and public/home/). It owns its
// whole document, so it is served as a route handler rather than inside the app layout.
export const dynamic = "force-static";

export function GET() {
  return new Response(HOME_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
