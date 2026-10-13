import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/billing",
        "/dashboard",
        "/settings",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
      ],
    },
    host: getSiteUrl().origin,
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
