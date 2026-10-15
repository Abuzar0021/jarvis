import { STUDIO_PAGES, type StudioPage } from "@/lib/home-html";

// The studio is a self-contained 3D page (see home-src/ and public/home/). It owns its whole
// document, so each of its routes is served as a route handler rather than inside the app layout.
export function studioResponse(page: StudioPage) {
  return new Response(STUDIO_PAGES[page], {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
