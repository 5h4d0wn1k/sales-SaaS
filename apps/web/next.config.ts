import type { NextConfig } from "next";

export type WebSecurityHeader = {
  key: string;
  value: string;
};

export function buildWebSecurityHeaders(
  options: { allowUnsafeEval?: boolean } = {},
): WebSecurityHeader[] {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "https://checkout.razorpay.com",
    ...(options.allowUnsafeEval ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  return [
    {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
  ];
}

export const webSecurityHeaders: WebSecurityHeader[] = buildWebSecurityHeaders({
  allowUnsafeEval: process.env.NODE_ENV === "development",
});

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
