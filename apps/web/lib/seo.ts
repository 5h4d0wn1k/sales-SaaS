import { resourceArticleRoutes } from "./resources";
import { solutionSegmentRoutes } from "./solution-segments";

export const siteConfig = {
  name: "salesxgrowth",
  url: "https://salesxgrowth.com",
  contentUpdatedAt: "2026-06-06T00:00:00.000Z",
  description:
    "AI-assisted revenue execution workspace for business context capture, lead planning, approval-gated outreach, meetings, and billing.",
  socialImage: {
    path: "/opengraph-image",
    twitterPath: "/twitter-image",
    alt: "salesxgrowth AI-assisted sales workspace preview",
    width: 1200,
    height: 630,
  },
  keywords: [
    "AI sales software",
    "sales automation platform",
    "AI sales automation platform",
    "AI SDR software",
    "AI sales agent",
    "AI outbound sales automation",
    "AI sales meeting scheduler",
    "Telegram sales command center",
    "AI lead generation software",
    "lead generation software",
    "outbound sales workspace",
    "approval-gated outreach",
    "sales SaaS",
    "revenue execution platform",
    "AI sales CRM",
    "B2B lead generation platform",
    "sales workflow automation",
    "outbound sales software",
    "sales automation security",
    "sales compliance workflow",
    "managed sales service",
    "sales implementation support",
    "AI sales ROI calculator",
    "sales ROI calculator",
    "AI sales blueprint",
    "sales blueprint builder",
    "lead generation strategy template",
    "AI lead generation channels",
    "multi-channel lead generation",
    "lead source planning",
    "AI sales software for founders",
    "AI sales software for agencies",
    "AI sales software for small business",
    "sales operations platform for SMB",
    "AI sales software for local service business",
    "local lead generation software",
    "AI sales software for B2B SaaS",
    "B2B SaaS outbound sales platform",
    "AI sales software for professional services",
    "consulting lead generation software",
    "AI sales platform comparison",
    "compare sales automation tools",
    "AI sales software vs CRM",
    "sales agency alternative",
    "sales meeting scheduler software",
    "lead to meeting conversion software",
    "Telegram sales bot",
    "AI sales operations bot",
  ],
};

export type PublicSiteRoute = {
  path: `/${string}`;
  label: string;
  priority: number;
  lastModified?: string | Date;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
  | "never";
};

export type VisibleAnswerListItem = {
  question: string;
  answer: string;
};

export function buildVisibleAnswerListJsonLd(
  name: string,
  items: readonly VisibleAnswerListItem[],
) {
  return {
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Thing",
        name: item.question,
        description: item.answer,
      },
    })),
  };
}

export const publicSiteRoutes = [
  { path: "/", label: "Home", priority: 1, changeFrequency: "weekly" },
  { path: "/solutions", label: "Solutions", priority: 0.95, changeFrequency: "weekly" },
  {
    path: "/ai-sales-automation-platform",
    label: "AI Sales Automation Platform",
    priority: 0.94,
    changeFrequency: "weekly",
  },
  { path: "/ai-sdr-software", label: "AI SDR Software", priority: 0.92, changeFrequency: "weekly" },
  {
    path: "/ai-lead-generation-software",
    label: "AI Lead Generation Software",
    priority: 0.93,
    changeFrequency: "weekly",
  },
  {
    path: "/ai-outbound-sales-automation",
    label: "AI Outbound Sales Automation",
    priority: 0.92,
    changeFrequency: "weekly",
  },
  {
    path: "/ai-sales-meeting-scheduler",
    label: "AI Sales Meeting Scheduler",
    priority: 0.92,
    changeFrequency: "weekly",
  },
  {
    path: "/telegram-sales-command-center",
    label: "Telegram Sales Command Center",
    priority: 0.91,
    changeFrequency: "weekly",
  },
  {
    path: "/compare-sales-tools",
    label: "Compare Sales Tools",
    priority: 0.91,
    changeFrequency: "weekly",
  },
  { path: "/integrations", label: "Integrations", priority: 0.88, changeFrequency: "weekly" },
  { path: "/trust", label: "Trust", priority: 0.85, changeFrequency: "monthly" },
  {
    path: "/managed-services",
    label: "Managed Services",
    priority: 0.82,
    changeFrequency: "monthly",
  },
  { path: "/resources", label: "Resources", priority: 0.8, changeFrequency: "weekly" },
  { path: "/sales-blueprint", label: "Sales Blueprint", priority: 0.87, changeFrequency: "weekly" },
  { path: "/roi-calculator", label: "ROI Calculator", priority: 0.86, changeFrequency: "weekly" },
  { path: "/pricing", label: "Pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/contact", label: "Contact", priority: 0.7, changeFrequency: "monthly" },
  { path: "/privacy", label: "Privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", label: "Terms", priority: 0.3, changeFrequency: "yearly" },
] as const satisfies readonly PublicSiteRoute[];

export const allPublicSiteRoutes = [
  ...publicSiteRoutes,
  ...solutionSegmentRoutes,
  ...resourceArticleRoutes,
] as const satisfies readonly PublicSiteRoute[];

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || siteConfig.url;

  try {
    return new URL(
      configuredUrl.startsWith("http") ? configuredUrl : `https://${configuredUrl}`,
    );
  } catch {
    return new URL(siteConfig.url);
  }
}

export function getPublicSiteContentUpdatedAt() {
  const configuredDate =
    process.env.SITE_CONTENT_UPDATED_AT ||
    process.env.NEXT_PUBLIC_SITE_CONTENT_UPDATED_AT ||
    siteConfig.contentUpdatedAt;
  const parsed = new Date(configuredDate);

  return Number.isNaN(parsed.getTime())
    ? new Date(siteConfig.contentUpdatedAt)
    : parsed;
}

function parseSitemapDate(value: string | Date | undefined) {
  if (!value) {
    return null;
  }

  const parsed =
    value instanceof Date
      ? value
      : new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getPublicSiteRouteLastModified(route: PublicSiteRoute) {
  return parseSitemapDate(route.lastModified) ?? getPublicSiteContentUpdatedAt();
}

export function absoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}

export function getDefaultOpenGraphImage() {
  return {
    url: siteConfig.socialImage.path,
    width: siteConfig.socialImage.width,
    height: siteConfig.socialImage.height,
    alt: siteConfig.socialImage.alt,
  };
}

export function getDefaultTwitterImage() {
  return {
    url: siteConfig.socialImage.twitterPath,
    alt: siteConfig.socialImage.alt,
  };
}

export function getDefaultTwitterCard(title: string, description: string) {
  return {
    card: "summary_large_image" as const,
    title,
    description,
    images: [getDefaultTwitterImage()],
  };
}

export function jsonLd(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
