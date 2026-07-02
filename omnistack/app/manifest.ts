import type { MetadataRoute } from "next";
import { getSite } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await getSite();
  return {
    name: site.brand,
    short_name: site.brand.split(" ")[0] || site.brand,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
