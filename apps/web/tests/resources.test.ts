import { describe, expect, it } from "vitest";
import {
  buildResourceContactUrl,
  buildResourceGetStartedUrl,
  formatResourceArticleDate,
  formatResourceContactMessage,
  getResourceArticle,
  getResourceArticleUpdatedAt,
  parseResourceContactContext,
  resourceArticleAuthorName,
  resourceArticleRoutes,
  resourceArticles,
} from "../lib/resources";

describe("resource article registry", () => {
  it("keeps public resource articles routable and search-focused", () => {
    expect(resourceArticles.length).toBeGreaterThanOrEqual(3);
    expect(resourceArticleRoutes).toHaveLength(resourceArticles.length);

    for (const article of resourceArticles) {
      const publicText = [
        article.description,
        ...article.summaryPoints,
        ...article.sections.flatMap((section) => [
          section.heading,
          section.body,
          ...(section.bullets ?? []),
        ]),
        ...article.checklist,
      ]
        .join(" ")
        .toLowerCase();

      expect(article.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(article.keywords.length).toBeGreaterThanOrEqual(3);
      expect(article.summaryPoints.length).toBeGreaterThanOrEqual(3);
      expect(article.sections.length).toBeGreaterThanOrEqual(3);
      expect(article.checklist.length).toBeGreaterThanOrEqual(5);
      expect(article.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(article.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(article.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(article.publishedAt).getTime(),
      );
      expect(publicText).not.toContain("guaranteed meetings");
      expect(publicText).not.toContain("guaranteed outcomes");
      expect(publicText).not.toContain("fully autonomous");
      expect(publicText).not.toContain("universal live scraping");
      expect(publicText).not.toContain("control everything from telegram");
    }
  });

  it("looks up resource articles by slug", () => {
    expect(getResourceArticle("approval-gated-sales-automation")).toMatchObject({
      title: "Approval-gated sales automation: the safer path to AI-assisted outbound",
      funnelStage: "consideration",
    });
    expect(getResourceArticle("ai-lead-generation-channels-source-plan")).toMatchObject({
      title: "AI lead generation channels: build a source plan before outreach",
      category: "Lead source strategy",
      funnelStage: "awareness",
    });
    expect(getResourceArticle("ai-sdr-software-evaluation-checklist")).toMatchObject({
      title: "AI SDR software evaluation checklist: what to inspect before scaling outreach",
      category: "AI SDR evaluation",
      funnelStage: "conversion",
    });
    expect(
      resourceArticleRoutes.find(
        (route) => route.path === "/resources/telegram-sales-command-center",
      ),
    ).toMatchObject({
      label: "Telegram sales command center: operate AI sales without losing approval control",
      lastModified: "2026-06-06T00:00:00.000Z",
      changeFrequency: "monthly",
    });
    expect(getResourceArticle("missing-resource")).toBeNull();
  });

  it("exposes article freshness and author metadata for resource SEO", () => {
    const article = getResourceArticle("telegram-sales-command-center");

    if (!article) {
      throw new Error("Expected the Telegram command-center resource article to exist");
    }

    expect(resourceArticleAuthorName).toBe("salesxgrowth Revenue Systems Team");
    expect(getResourceArticleUpdatedAt(article)).toBe("2026-06-06");
    expect(formatResourceArticleDate(article.publishedAt)).toBe("Jun 4, 2026");
    expect(formatResourceArticleDate(getResourceArticleUpdatedAt(article))).toBe(
      "Jun 6, 2026",
    );
    expect(formatResourceArticleDate("not-a-date")).toBe("not-a-date");
  });

  it("keeps the multi-channel lead generation guide tied to source evidence guardrails", () => {
    const article = getResourceArticle("ai-lead-generation-channels-source-plan");

    if (!article) {
      throw new Error("Expected the multi-channel source-planning resource article to exist");
    }

    const publicText = [
      article.description,
      ...article.summaryPoints,
      ...article.sections.flatMap((section) => [
        section.heading,
        section.body,
        ...(section.bullets ?? []),
      ]),
      ...article.checklist,
    ].join(" ");

    expect(article.keywords).toEqual(
      expect.arrayContaining([
        "AI lead generation channels",
        "multi-channel lead generation",
        "lead source planning",
      ]),
    );
    expect(publicText).toContain("accepted and rejected evidence");
    expect(publicText).toContain("Deduplication and rejection reason");
    expect(publicText).toContain("provider-cost posture");
    expect(publicText.toLowerCase()).not.toContain("every possible contact");
  });

  it("keeps the Telegram command-center article aligned with current product guardrails", () => {
    const article = getResourceArticle("telegram-sales-command-center");

    expect(article).toMatchObject({
      title: "Telegram sales command center: operate AI sales without losing approval control",
      category: "Sales command center",
      funnelStage: "consideration",
    });

    if (!article) {
      throw new Error("Expected the Telegram command-center resource article to exist");
    }

    const publicText = [
      article.description,
      ...article.summaryPoints,
      ...article.sections.flatMap((section) => [
        section.heading,
        section.body,
        ...(section.bullets ?? []),
      ]),
      ...article.checklist,
    ].join(" ");

    expect(publicText).toContain(
      "Safe now: status, operator brief, sequence readiness, forecast, provider readiness, and suppression checks",
    );
    expect(publicText).toContain(
      "Approval-gated: pause requests that create a pending proposal for in-app review",
    );
    expect(publicText).toContain(
      "Blocked today: approving campaigns, changing billing, configuring providers, or mutating outreach from Telegram",
    );
    expect(publicText).toContain(
      "creates an Approval Inbox proposal instead of changing outreach state directly",
    );
    expect(publicText.toLowerCase()).not.toContain("approve campaigns from telegram");
    expect(publicText.toLowerCase()).not.toContain("change billing from telegram");
  });

  it("keeps the AI SDR evaluation guide tied to approval and evidence guardrails", () => {
    const article = getResourceArticle("ai-sdr-software-evaluation-checklist");

    expect(article).toMatchObject({
      title: "AI SDR software evaluation checklist: what to inspect before scaling outreach",
      category: "AI SDR evaluation",
      funnelStage: "conversion",
    });

    if (!article) {
      throw new Error("Expected the AI SDR evaluation resource article to exist");
    }

    const publicText = [
      article.description,
      ...article.summaryPoints,
      ...article.sections.flatMap((section) => [
        section.heading,
        section.body,
        ...(section.bullets ?? []),
      ]),
      ...article.checklist,
    ].join(" ");

    expect(article.keywords).toEqual(
      expect.arrayContaining([
        "AI SDR software",
        "AI sales agent",
        "AI outbound sales automation",
      ]),
    );
    expect(publicText).toContain("Sales Blueprint context");
    expect(publicText).toContain("Accepted and rejected evidence is visible");
    expect(publicText).toContain("role checks, verified-email posture, entitlements");
    expect(publicText).toContain("directly approving campaigns, changing billing");
    expect(publicText.toLowerCase()).not.toContain("unattended outreach across every channel");
    expect(publicText.toLowerCase()).not.toContain("guaranteed outcomes");
  });

  it("builds resource-to-onboarding attribution links", () => {
    expect(buildResourceGetStartedUrl("telegram-sales-command-center", "article_sidebar")).toBe(
      "/get-started?utm_source=resources&utm_medium=seo_article&utm_campaign=telegram-sales-command-center&resource=telegram-sales-command-center&resourceIntent=article_sidebar",
    );
    expect(
      buildResourceGetStartedUrl("ai-lead-generation-channels-source-plan", "article_sidebar"),
    ).toBe(
      "/get-started?utm_source=resources&utm_medium=seo_article&utm_campaign=ai-lead-generation-channels-source-plan&resource=ai-lead-generation-channels-source-plan&resourceIntent=article_sidebar",
    );
    expect(
      buildResourceGetStartedUrl("ai-sdr-software-evaluation-checklist", "article_sidebar"),
    ).toBe(
      "/get-started?utm_source=resources&utm_medium=seo_article&utm_campaign=ai-sdr-software-evaluation-checklist&resource=ai-sdr-software-evaluation-checklist&resourceIntent=article_sidebar",
    );
  });

  it("builds resource-to-contact attribution for reviewed rollout requests", () => {
    expect(buildResourceContactUrl("telegram-sales-command-center")).toBe(
      "/contact?intent=managed_services&utm_source=resources&utm_medium=seo_article&utm_campaign=telegram-sales-command-center&resource=telegram-sales-command-center&resourceIntent=rollout_review",
    );

    const context = parseResourceContactContext({
      utm_source: "resources",
      utm_medium: "seo_article",
      utm_campaign: "telegram-sales-command-center",
      resource: "telegram-sales-command-center",
      resourceIntent: "telegram_rollout_review",
    });

    expect(context).toMatchObject({
      slug: "telegram-sales-command-center",
      category: "Sales command center",
      intentLabel: "Telegram rollout review",
      budgetRange: "1500_5000",
      sourcePath: "/resources/telegram-sales-command-center",
      channels: ["telegram", "email"],
      goals: ["Connect Telegram command center", "Launch approval-gated outreach"],
    });
    expect(formatResourceContactMessage(context!)).toContain(
      "Resource guide context attached for review: Telegram sales command center",
    );
    expect(formatResourceContactMessage(context!)).toContain(
      "No lead sourcing, outreach, provider work, billing change, AI-worker execution",
    );
    expect(parseResourceContactContext({ utm_source: "pricing" })).toBeNull();
    expect(
      parseResourceContactContext({
        utm_source: "resources",
        resource: "missing-resource",
      }),
    ).toBeNull();
  });
});
