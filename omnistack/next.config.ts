import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server output for Docker / VPS deploys.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
