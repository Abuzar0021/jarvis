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
    return cmsRedirects();
  },
};

export default nextConfig;
