import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";

function cmsRedirects() {
  try {
    const raw = readFileSync(
      path.join(process.cwd(), "content", "redirects.json"),
      "utf8",
    );
    const list = JSON.parse(raw) as {
      from: string;
      to: string;
      permanent?: boolean;
    }[];
    return list
      .filter((r) => r.from && r.to)
      .map((r) => ({
        source: r.from,
        destination: r.to,
        permanent: r.permanent !== false,
      }));
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // Self-contained server output for Docker / VPS deploys.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Redirects are managed in the CMS (/admin â†’ Redirects) and applied at build.
  async redirects() {
    // The studio serves /, /work, /about, /contact and /privacy. Every other old address lands on
    // the closest of those. CMS redirects still win.
    const gone = [
      "/pricing", "/reviews", "/search", "/terms", "/thank-you",
      "/services", "/services/:slug*", "/industries", "/industries/:slug*",
      "/locations", "/locations/:slug*", "/insights", "/insights/:slug*", "/templates", "/templates/:slug*",
      "/feed.xml",
    ].map((source) => ({ source, destination: "/", permanent: true }));
    const moved = [
      { source: "/work/:slug+", destination: "/work", permanent: true },
      { source: "/book", destination: "/contact", permanent: true },
    ];
    return [...cmsRedirects(), ...gone, ...moved];
  },
  async headers() {
    // Studio files are content-hashed or never change under the same name.
    return [{ source: "/home/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }] }];
  },
};

export default nextConfig;
