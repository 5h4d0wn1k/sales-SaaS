import type { MetadataRoute } from "next";
import {
  absoluteUrl,
  allPublicSiteRoutes,
  getPublicSiteRouteLastModified,
} from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return allPublicSiteRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: getPublicSiteRouteLastModified(route),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
