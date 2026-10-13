import { describe, expect, it } from "vitest";
import {
  buildContentOpportunityPlan,
  contentOpportunityPlanSchema,
  type SalesBlueprint,
  type SourcePlan,
} from "../src";

const blueprint: SalesBlueprint = {
  id: "blueprint_1",
  status: "ready",
  businessProfile: {
    businessName: "SignalForge AI",
    website: "https://signalforge.example",
    industry: "B2B SaaS",
    offerSummary:
      "AI-assisted outbound operations for founder-led software teams that need qualified pipeline.",
    targetAudience: "Founder-led B2B SaaS companies with 10 to 100 employees",
    regions: ["US", "India"],
    goals: ["Increase qualified pipeline", "Book demos"],
    channels: ["email", "linkedin"],
    constraints: ["Keep first-touch approval"],
    voice: "Direct, consultative, and grounded in business context.",
    summary:
      "SignalForge needs a governed sales workspace that can find accounts, draft outreach, and convert interest into meetings.",
  },
  icpSummary: "Founder-led B2B SaaS teams hiring sales or RevOps support",
  buyerRoles: ["Founder", "Head of Sales"],
  painPoints: ["Manual prospecting", "Fragmented outbound"],
  disqualifiers: ["No B2B motion", "Outside target regions"],
  qualificationRules: ["Match selected regions", "Avoid suppressed contacts"],
  sourceChannels: ["website", "search", "directory"],
  outreachChannels: ["email", "linkedin"],
  searchKeywords: ["B2B SaaS hiring SDR", "founder-led SaaS revenue operations"],
  monthlyLeadTarget: 250,
  meetingTarget: 20,
  averageContractValue: 8000,
  automationMode: "approval_gated",
  approvalRequiredFor: ["first outreach", "phone calls"],
  complianceNotes: "Respect unsubscribe, do-not-contact, and sender reputation rules.",
  readinessScore: 100,
  readinessGaps: [],
  lastUpdatedAt: "2026-06-02T00:00:00.000Z",
};

const sourcePlan: SourcePlan = {
  id: "plan_1",
  summary: "Prioritize founder-led SaaS accounts.",
  sources: ["website", "directory"],
  contactTargets: ["email", "linkedin"],
  searchTerms: ["B2B SaaS revenue operations", "founder-led SaaS outbound"],
  rationale: "The blueprint needs public business evidence before outreach.",
};

describe("content opportunity engine", () => {
  it("generates reviewable content opportunities from the Sales Blueprint", () => {
    const plan = contentOpportunityPlanSchema.parse(
      buildContentOpportunityPlan({
        blueprint,
        sourcePlan,
        limit: 3,
        now: new Date("2026-06-04T00:00:00.000Z"),
      }),
    );

    expect(plan).toMatchObject({
      blueprintId: "blueprint_1",
      workspaceBusinessName: "SignalForge AI",
      publishingBlocked: false,
      blockers: [],
    });
    expect(plan.opportunities).toHaveLength(3);
    expect(plan.opportunities[0]).toMatchObject({
      status: "ready_for_brief",
      intent: "seo_landing_page",
      funnelStage: "consideration",
    });
    expect(plan.opportunities[0]?.targetKeywords).toEqual(
      expect.arrayContaining(["B2B SaaS hiring SDR"]),
    );
    expect(plan.guardrails).toEqual(
      expect.arrayContaining([
        "Do not claim full autonomy, guaranteed meetings, or universal scraping.",
      ]),
    );
  });

  it("blocks content planning until a blueprint exists", () => {
    const plan = buildContentOpportunityPlan({
      blueprint: null,
      now: new Date("2026-06-04T00:00:00.000Z"),
    });

    expect(plan.publishingBlocked).toBe(true);
    expect(plan.opportunities).toEqual([]);
    expect(plan.blockers).toEqual(["Sales Blueprint is required before content planning."]);
  });

  it("keeps incomplete blueprints in review instead of marking content publish-ready", () => {
    const plan = buildContentOpportunityPlan({
      blueprint: {
        ...blueprint,
        status: "needs_review",
        readinessScore: 78,
        readinessGaps: ["Add compliance notes before widening live outreach."],
      },
      sourcePlan,
      limit: 2,
      now: new Date("2026-06-04T00:00:00.000Z"),
    });

    expect(plan.publishingBlocked).toBe(true);
    expect(plan.blockers).toEqual(["Add compliance notes before widening live outreach."]);
    expect(plan.opportunities).toHaveLength(2);
    expect(plan.opportunities.every((item) => item.status === "needs_review")).toBe(true);
  });

  it("requires source-plan evidence before marking content briefs ready", () => {
    const plan = buildContentOpportunityPlan({
      blueprint,
      sourcePlan: null,
      limit: 2,
      now: new Date("2026-06-04T00:00:00.000Z"),
    });

    expect(plan.publishingBlocked).toBe(true);
    expect(plan.blockers).toContain(
      "Source-plan evidence is required before marking generated content brief-ready.",
    );
    expect(plan.opportunities).toHaveLength(2);
    expect(plan.opportunities.every((item) => item.status === "needs_review")).toBe(true);
  });
});
