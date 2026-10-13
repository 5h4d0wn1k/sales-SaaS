import { describe, expect, it } from "vitest";
import {
  formatSolutionSegmentContactMessage,
  getSolutionSegmentContactDefaults,
  getSolutionSegmentPage,
  parseSolutionSegmentContactContext,
  solutionSegmentPages,
  solutionSegmentRoutes,
} from "../lib/solution-segments";

const forbiddenClaims = [
  "fully autonomous",
  "guaranteed meetings",
  "guaranteed revenue",
  "universal live lead scraping",
  "auto-dm",
  "auto-connect",
];

describe("solution segment registry", () => {
  it("keeps high-intent segment pages routable and search-focused", () => {
    expect(solutionSegmentPages).toHaveLength(6);
    expect(solutionSegmentRoutes).toHaveLength(solutionSegmentPages.length);

    for (const page of solutionSegmentPages) {
      expect(page.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(page.title).toContain("AI sales workspace");
      expect(page.keywords.length).toBeGreaterThanOrEqual(4);
      expect(page.fitSignals.length).toBeGreaterThanOrEqual(4);
      expect(page.guardrails.length).toBeGreaterThanOrEqual(4);
      expect(page.workflow.length).toBeGreaterThanOrEqual(4);
      expect(page.commercialPath.length).toBeGreaterThanOrEqual(3);
      expect(page.contactDefaults.channels.length).toBeGreaterThanOrEqual(2);
      expect(page.contactDefaults.goals.length).toBeGreaterThanOrEqual(2);
      expect(page.faq.length).toBeGreaterThanOrEqual(3);
      expect(page.contactHref).toContain("/contact?");
      expect(page.contactHref).toContain("utm_source=solution_segment");
      expect(page.contactHref).toContain(`solutionSegment=${page.slug}`);
      expect(page.startHref).toContain("/get-started?");
      expect(page.startHref).toContain("utm_source=solution_segment");
      expect(page.startHref).toContain(`solutionSegment=${page.slug}`);

      const promotionalCopy = [
        page.title,
        page.description,
        page.intent,
        page.current,
        page.expansion,
        page.fitSignals.join(" "),
        page.workflow.map((step) => step.description).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      for (const claim of forbiddenClaims) {
        expect(promotionalCopy).not.toContain(claim);
      }

      expect(page.guardrails.join(" ").toLowerCase()).toMatch(/no |not |remain/);
    }
  });

  it("looks up segment pages by slug", () => {
    expect(getSolutionSegmentPage("founders-validating-outbound")).toMatchObject({
      segmentLabel: "Founders",
      cardTitle: "Founders validating outbound",
    });
    expect(getSolutionSegmentPage("missing-segment")).toBeNull();
  });

  it("parses and formats segment acquisition context for reviewed handoff", () => {
    const context = parseSolutionSegmentContactContext({
      utm_source: "solution_segment",
      utm_campaign: "founders_validating_outbound",
      segment: "founder",
    });

    expect(context).toMatchObject({
      slug: "founders-validating-outbound",
      segmentLabel: "Founders",
      campaign: "founders_validating_outbound",
    });

    const message = formatSolutionSegmentContactMessage(context!);

    expect(message).toContain("Solution segment context attached for review");
    expect(message).toContain("Segment: Founders");
    expect(message).toContain("review fit");
    expect(message.toLowerCase()).toContain("before any lead sourcing or outreach starts");
  });

  it("parses newer buyer-segment aliases into contact context", () => {
    const localServices = parseSolutionSegmentContactContext({
      utm_source: "solution_segment",
      utm_campaign: "local_service_businesses_booking_jobs",
      segment: "local_services",
    });
    const b2bSaas = parseSolutionSegmentContactContext({
      utm_source: "solution_segment",
      segment: "b2b_saas",
    });
    const professionalServices = parseSolutionSegmentContactContext({
      utm_source: "solution_segment",
      segment: "professional_services",
    });

    expect(localServices).toMatchObject({
      slug: "local-service-businesses-booking-jobs",
      segmentLabel: "Local services",
    });
    expect(b2bSaas).toMatchObject({
      slug: "b2b-saas-teams-scaling-pipeline",
      segmentLabel: "B2B SaaS",
    });
    expect(professionalServices).toMatchObject({
      slug: "professional-services-selling-retainers",
      segmentLabel: "Professional services",
    });
  });

  it("provides segment-specific contact defaults for intake prefill", () => {
    const localServices = parseSolutionSegmentContactContext({
      utm_source: "solution_segment",
      segment: "local_services",
    });
    const b2bSaas = parseSolutionSegmentContactContext({
      utm_source: "solution_segment",
      segment: "b2b_saas",
    });

    expect(getSolutionSegmentContactDefaults(localServices!)).toEqual({
      budgetRange: "500_1500",
      channels: ["email", "call", "website", "directory"],
      goals: [
        "Generate qualified leads",
        "Launch approval-gated outreach",
        "Improve meetings and conversion",
      ],
    });
    expect(getSolutionSegmentContactDefaults(b2bSaas!)).toMatchObject({
      budgetRange: "1500_5000",
      channels: expect.arrayContaining(["email", "call", "linkedin review"]),
      goals: expect.arrayContaining(["Build a Sales Blueprint", "Generate qualified leads"]),
    });
  });

  it("adds high-intent local service, SaaS, and professional-services keywords", () => {
    const allKeywords = solutionSegmentPages.flatMap((page) => page.keywords);

    expect(allKeywords).toEqual(
      expect.arrayContaining([
        "AI sales software for local service business",
        "B2B SaaS outbound sales platform",
        "AI sales software for professional services",
      ]),
    );
  });

  it("keeps segment sitemap entries aligned with canonical paths", () => {
    expect(solutionSegmentRoutes.map((route) => route.path)).toEqual([
      "/solutions/founders-validating-outbound",
      "/solutions/agencies-running-client-pipeline",
      "/solutions/smb-sales-teams-modernizing-ops",
      "/solutions/local-service-businesses-booking-jobs",
      "/solutions/b2b-saas-teams-scaling-pipeline",
      "/solutions/professional-services-selling-retainers",
    ]);

    for (const route of solutionSegmentRoutes) {
      expect(route.changeFrequency).toBe("monthly");
      expect(route.priority).toBeGreaterThanOrEqual(0.77);
      expect(route.priority).toBeLessThanOrEqual(0.81);
    }
  });
});
