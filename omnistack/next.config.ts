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
  // Redirects are managed in the CMS (/admin → Redirects) and applied at build.
  async redirects() {
    // The single-page redesign replaced every old page, so each old address lands on the
    // homepage (contact and booking land on the brief form). CMS redirects still win.
    const gone = [
      "/about", "/pricing", "/reviews", "/search", "/privacy", "/terms", "/thank-you",
      "/work", "/work/:slug*", "/services", "/services/:slug*", "/industries", "/industries/:slug*",
      "/locations", "/locations/:slug*", "/insights", "/insights/:slug*", "/templates", "/templates/:slug*",
      "/feed.xml",
    ].map((source) => ({ source, destination: "/", permanent: true }));
    const brief = ["/contact", "/book"].map((source) => ({ source, destination: "/#brief", permanent: true }));
    return [...cmsRedirects(), ...gone, ...brief];
  },
  async headers() {
    // The scroll film is ~1,600 files that never change under the same name.
    return [{ source: "/home/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }] }];
  },
};

export default nextConfig;
