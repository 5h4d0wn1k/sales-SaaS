import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));

async function loadSeo() {
  vi.resetModules();
  return import("../lib/seo");
}

async function loadManifestRoute() {
  vi.resetModules();
  return import("../app/manifest");
}

async function loadRobotsRoute() {
  vi.resetModules();
  return import("../app/robots");
}

async function loadSitemapRoute() {
  vi.resetModules();
  return import("../app/sitemap");
}

function readAppSource(path: string) {
  return readFileSync(join(currentDir, "..", path), "utf8");
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("seo url helpers", () => {
  it("uses the branded site URL instead of auth callback URLs for public canonicals", async () => {
    vi.stubEnv("NEXTAUTH_URL", "http://127.0.0.1:3100");

    const { absoluteUrl, getSiteUrl } = await loadSeo();

    expect(getSiteUrl().origin).toBe("https://salesxgrowth.com");
    expect(absoluteUrl("/sitemap.xml")).toBe("https://salesxgrowth.com/sitemap.xml");
  });

  it("allows an explicit public site URL override", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.salesxgrowth.com");

    const { absoluteUrl, getSiteUrl } = await loadSeo();

    expect(getSiteUrl().origin).toBe("https://app.salesxgrowth.com");
    expect(absoluteUrl("/pricing")).toBe("https://app.salesxgrowth.com/pricing");
  });

  it("exposes branded social preview image metadata", async () => {
    const {
      absoluteUrl,
      getDefaultTwitterCard,
      getDefaultOpenGraphImage,
      getDefaultTwitterImage,
      siteConfig,
    } = await loadSeo();

    expect(siteConfig.socialImage).toMatchObject({
      path: "/opengraph-image",
      twitterPath: "/twitter-image",
      alt: "salesxgrowth AI-assisted sales workspace preview",
      width: 1200,
      height: 630,
    });
    expect(siteConfig.contentUpdatedAt).toBe("2026-06-06T00:00:00.000Z");
    expect(getDefaultOpenGraphImage()).toEqual({
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      alt: "salesxgrowth AI-assisted sales workspace preview",
    });
    expect(getDefaultTwitterImage()).toEqual({
      url: "/twitter-image",
      alt: "salesxgrowth AI-assisted sales workspace preview",
    });
    expect(
      getDefaultTwitterCard("salesxgrowth Pricing", "Compare beta plans."),
    ).toMatchObject({
      card: "summary_large_image",
      title: "salesxgrowth Pricing",
      description: "Compare beta plans.",
      images: [
        {
          url: "/twitter-image",
          alt: "salesxgrowth AI-assisted sales workspace preview",
        },
      ],
    });
    expect(absoluteUrl(siteConfig.socialImage.path)).toBe(
      "https://salesxgrowth.com/opengraph-image",
    );
  });

  it("serves claim-safe branded app manifest metadata", async () => {
    const { default: manifestRoute } = await loadManifestRoute();
    const manifest = manifestRoute();
    const copy = JSON.stringify(manifest).toLowerCase();

    expect(manifest).toMatchObject({
      name: "salesxgrowth AI-assisted sales workspace",
      short_name: "salesxgrowth",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0f172a",
      categories: ["business", "productivity"],
      icons: [
        {
          src: "/icon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any",
        },
      ],
    });
    expect(manifest.description).toContain("approval-gated outreach");
    expect(copy).not.toContain("guaranteed");
    expect(copy).not.toContain("fully autonomous");
    expect(copy).not.toContain("universal scraping");
  });

  it("publishes the sitemap while excluding private account and product surfaces from robots", async () => {
    const { default: robotsRoute } = await loadRobotsRoute();
    const robots = robotsRoute();
    const firstRule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    const disallow = Array.isArray(firstRule.disallow)
      ? firstRule.disallow
      : [firstRule.disallow];

    expect(firstRule.userAgent).toBe("*");
    expect(firstRule.allow).toBe("/");
    expect(disallow).toEqual(
      expect.arrayContaining([
        "/api/",
        "/billing",
        "/dashboard",
        "/settings",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
      ]),
    );
    expect(robots.sitemap).toBe("https://salesxgrowth.com/sitemap.xml");
    expect(robots.host).toBe("https://salesxgrowth.com");
  });

  it("uses a stable public content freshness date for sitemap lastmod", async () => {
    vi.stubEnv("SITE_CONTENT_UPDATED_AT", "2026-05-15T00:00:00.000Z");
    const { default: sitemapRoute } = await loadSitemapRoute();
    const sitemap = sitemapRoute();
    const pricingEntry = sitemap.find((entry) => entry.url.endsWith("/pricing"));
    const telegramResourceEntry = sitemap.find((entry) =>
      entry.url.endsWith("/resources/telegram-sales-command-center"),
    );

    expect(pricingEntry).toMatchObject({
      url: "https://salesxgrowth.com/pricing",
      changeFrequency: "weekly",
      priority: 0.9,
    });
    expect(pricingEntry?.lastModified).toEqual(
      new Date("2026-05-15T00:00:00.000Z"),
    );
    expect(telegramResourceEntry).toMatchObject({
      url: "https://salesxgrowth.com/resources/telegram-sales-command-center",
      changeFrequency: "monthly",
      priority: 0.74,
    });
    expect(telegramResourceEntry?.lastModified).toEqual(
      new Date("2026-06-06T00:00:00.000Z"),
    );
  });

  it("falls back to the configured public content freshness date when sitemap env is invalid", async () => {
    vi.stubEnv("SITE_CONTENT_UPDATED_AT", "not-a-date");
    const { getPublicSiteContentUpdatedAt, siteConfig } = await loadSeo();

    expect(getPublicSiteContentUpdatedAt()).toEqual(
      new Date(siteConfig.contentUpdatedAt),
    );
  });

  it("sets page-specific Twitter metadata on high-intent conversion pages", async () => {
    const highIntentPages = [
      ["app/pricing/page.tsx", "salesxgrowth Pricing"],
      [
        "app/contact/page.tsx",
        "Contact salesxgrowth for AI sales onboarding and managed rollout",
      ],
      ["app/sales-blueprint/page.tsx", "AI Sales Blueprint Builder"],
      ["app/roi-calculator/page.tsx", "AI Sales ROI Calculator"],
    ] as const;

    for (const [path, title] of highIntentPages) {
      const source = readAppSource(path);

      expect(source).toContain("twitter: getDefaultTwitterCard(");
      expect(source).toContain(`"${title}"`);
      expect(source.toLowerCase()).not.toContain("fully autonomous");
      expect(source.toLowerCase()).not.toContain("universal live scraping");
    }
  });

  it("keeps the claim-safe public growth pages in the sitemap registry", async () => {
    const { publicSiteRoutes } = await loadSeo();
    const paths = publicSiteRoutes.map((route) => route.path);

    expect(paths).toEqual([
      "/",
      "/solutions",
      "/ai-sales-automation-platform",
      "/ai-sdr-software",
      "/ai-lead-generation-software",
      "/ai-outbound-sales-automation",
      "/ai-sales-meeting-scheduler",
      "/telegram-sales-command-center",
      "/compare-sales-tools",
      "/integrations",
      "/trust",
      "/managed-services",
      "/resources",
      "/sales-blueprint",
      "/roi-calculator",
      "/pricing",
      "/contact",
      "/privacy",
      "/terms",
    ]);
    expect(paths).not.toContain("/dashboard");
    expect(paths).not.toContain("/get-started");
    expect(publicSiteRoutes.find((route) => route.path === "/solutions")).toMatchObject({
      label: "Solutions",
      priority: 0.95,
      changeFrequency: "weekly",
    });
    expect(
      publicSiteRoutes.find((route) => route.path === "/ai-sales-automation-platform"),
    ).toMatchObject({
      label: "AI Sales Automation Platform",
      priority: 0.94,
      changeFrequency: "weekly",
    });
    expect(publicSiteRoutes.find((route) => route.path === "/ai-sdr-software")).toMatchObject({
      label: "AI SDR Software",
      priority: 0.92,
      changeFrequency: "weekly",
    });
    expect(
      publicSiteRoutes.find((route) => route.path === "/ai-lead-generation-software"),
    ).toMatchObject({
      label: "AI Lead Generation Software",
      priority: 0.93,
      changeFrequency: "weekly",
    });
    expect(
      publicSiteRoutes.find((route) => route.path === "/ai-outbound-sales-automation"),
    ).toMatchObject({
      label: "AI Outbound Sales Automation",
      priority: 0.92,
      changeFrequency: "weekly",
    });
    expect(
      publicSiteRoutes.find((route) => route.path === "/ai-sales-meeting-scheduler"),
    ).toMatchObject({
      label: "AI Sales Meeting Scheduler",
      priority: 0.92,
      changeFrequency: "weekly",
    });
    expect(
      publicSiteRoutes.find((route) => route.path === "/telegram-sales-command-center"),
    ).toMatchObject({
      label: "Telegram Sales Command Center",
      priority: 0.91,
      changeFrequency: "weekly",
    });
    expect(publicSiteRoutes.find((route) => route.path === "/compare-sales-tools")).toMatchObject({
      label: "Compare Sales Tools",
      priority: 0.91,
      changeFrequency: "weekly",
    });
    expect(publicSiteRoutes.find((route) => route.path === "/trust")).toMatchObject({
      label: "Trust",
      priority: 0.85,
      changeFrequency: "monthly",
    });
    expect(publicSiteRoutes.find((route) => route.path === "/integrations")).toMatchObject({
      label: "Integrations",
      priority: 0.88,
      changeFrequency: "weekly",
    });
    expect(publicSiteRoutes.find((route) => route.path === "/managed-services")).toMatchObject({
      label: "Managed Services",
      priority: 0.82,
      changeFrequency: "monthly",
    });
    expect(publicSiteRoutes.find((route) => route.path === "/resources")).toMatchObject({
      label: "Resources",
      priority: 0.8,
      changeFrequency: "weekly",
    });
    expect(publicSiteRoutes.find((route) => route.path === "/sales-blueprint")).toMatchObject({
      label: "Sales Blueprint",
      priority: 0.87,
      changeFrequency: "weekly",
    });
    expect(publicSiteRoutes.find((route) => route.path === "/roi-calculator")).toMatchObject({
      label: "ROI Calculator",
      priority: 0.86,
      changeFrequency: "weekly",
    });
  });

  it("adds static resource articles to the sitemap registry", async () => {
    const { allPublicSiteRoutes } = await loadSeo();
    const paths = allPublicSiteRoutes.map((route) => route.path);
    const telegramRoute = allPublicSiteRoutes.find(
      (route) => route.path === "/resources/telegram-sales-command-center",
    );

    expect(paths).toEqual(
      expect.arrayContaining([
        "/resources",
        "/resources/approval-gated-sales-automation",
        "/resources/telegram-sales-command-center",
        "/resources/sales-blueprint-for-lead-generation",
        "/resources/ai-lead-generation-channels-source-plan",
        "/resources/ai-sales-crm-vs-outbound-workspace",
        "/resources/ai-sdr-software-evaluation-checklist",
      ]),
    );
    expect(telegramRoute).toMatchObject({
      lastModified: "2026-06-06T00:00:00.000Z",
      changeFrequency: "monthly",
    });
    expect(paths).not.toContain("/dashboard");
    expect(paths).not.toContain("/settings");
  });

  it("adds static segment solution pages to the sitemap registry", async () => {
    const { allPublicSiteRoutes } = await loadSeo();
    const paths = allPublicSiteRoutes.map((route) => route.path);

    expect(paths).toEqual(
      expect.arrayContaining([
        "/solutions/founders-validating-outbound",
        "/solutions/agencies-running-client-pipeline",
        "/solutions/smb-sales-teams-modernizing-ops",
        "/solutions/local-service-businesses-booking-jobs",
        "/solutions/b2b-saas-teams-scaling-pipeline",
        "/solutions/professional-services-selling-retainers",
      ]),
    );
    expect(paths).not.toContain("/dashboard");
    expect(paths).not.toContain("/settings");
  });

  it("escapes json-ld payloads before injecting them into metadata scripts", async () => {
    const { jsonLd } = await loadSeo();

    expect(jsonLd({ name: "salesxgrowth <script>" })).toBe(
      '{"name":"salesxgrowth \\u003cscript>"}',
    );
  });

  it("represents visible commercial answers without FAQPage rich-result markup", async () => {
    const { buildVisibleAnswerListJsonLd } = await loadSeo();
    const answerList = buildVisibleAnswerListJsonLd("Buyer questions answered on this page", [
      {
        question: "Does this start live outreach?",
        answer: "No. Live outreach remains approval-gated.",
      },
    ]);
    const copy = JSON.stringify(answerList);

    expect(answerList).toMatchObject({
      "@type": "ItemList",
      name: "Buyer questions answered on this page",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@type": "Thing",
            name: "Does this start live outreach?",
            description: "No. Live outreach remains approval-gated.",
          },
        },
      ],
    });
    expect(copy).not.toContain("FAQPage");
    expect(copy).not.toContain('"@type":"Question"');
    expect(copy).not.toContain('"@type":"Answer"');
  });
});
