import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep production builds deterministic in this monorepo and Cloudflare packaging flow.
    webpackBuildWorker: false,
  },
};

export default nextConfig;
