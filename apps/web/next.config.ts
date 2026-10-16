import type { NextConfig } from "next";

export type WebSecurityHeader = {
  key: string;
  value: string;
};

export function buildWebSecurityHeaders(): WebSecurityHeader[] {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'", // Required for JSON-LD structured data (<script type="application/ld+json">) on SEO pages
    "https://checkout.razorpay.com",
  ].join(" ");

  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self'", // No 'unsafe-inline'; Next.js CSS-in-JS uses class-based styling
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://checkout.razorpay.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  return [
    {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains; preload",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "no-referrer" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
  ];
}

export const webSecurityHeaders: WebSecurityHeader[] = buildWebSecurityHeaders();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep production builds deterministic in this monorepo and Cloudflare packaging flow.
    webpackBuildWorker: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: webSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
