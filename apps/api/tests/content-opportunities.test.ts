import { afterEach, describe, expect, it, vi } from "vitest";
import { contentOpportunityPlanSchema, type SalesBlueprint } from "@sales/shared";

async function loadApp() {
  vi.resetModules();
  const { createApp } = await import("../src/app");
  return createApp();
}

const blueprint: SalesBlueprint = {
  id: "blueprint_no_source",
  status: "ready",
  businessProfile: {
    businessName: "Evidence First Growth",
    website: "https://evidence-first.example",
    industry: "B2B services",
    offerSummary: "Reviewable lead planning for service businesses.",
    targetAudience: "Founder-led service companies",
    regions: ["US"],
    goals: ["Book qualified calls"],
    channels: ["email"],
    constraints: ["Use only reviewable public evidence"],
    voice: "Operational and precise.",
    summary: "Evidence First Growth needs claim-safe demand planning.",
  },
  icpSummary: "Founder-led B2B service companies",
  buyerRoles: ["Founder"],
  painPoints: ["Untrusted outsourced prospecting"],
  disqualifiers: ["No B2B motion"],
  qualificationRules: ["Match target regions"],
  sourceChannels: ["website", "directory"],
  outreachChannels: ["email"],
  searchKeywords: ["B2B services lead generation"],
  monthlyLeadTarget: 200,
  meetingTarget: 20,
  averageContractValue: 5000,
  automationMode: "approval_gated",
  approvalRequiredFor: ["first outreach"],
  complianceNotes: "Review all claims and suppression posture before publishing.",
  readinessScore: 100,
  readinessGaps: [],
  lastUpdatedAt: "2026-06-04T00:00:00.000Z",
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("../src/storage");
});

describe("content opportunity routes", () => {
  it("returns blueprint-informed content opportunities for the active workspace", async () => {
    const app = await loadApp();
    const response = await app.request("/v1/content/opportunities?limit=2");
    const body = contentOpportunityPlanSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.blueprintId).toBeTruthy();
    expect(body.workspaceBusinessName).toBe("Northstar Labs");
    expect(body.publishingBlocked).toBe(false);
    expect(body.opportunities).toHaveLength(2);
    expect(body.opportunities.every((item) => item.status === "ready_for_brief")).toBe(true);
    expect(body.opportunities[0]?.targetKeywords.length).toBeGreaterThan(0);
    expect(body.opportunities[0]?.guardrails).toEqual(
      expect.arrayContaining([
        "Do not claim full autonomy, guaranteed meetings, or universal scraping.",
      ]),
    );
  });

  it("keeps API content opportunities in review when source-plan evidence is missing", async () => {
    vi.doMock("../src/storage", async () => {
      const actual = await vi.importActual<typeof import("../src/storage")>("../src/storage");

      return {
        ...actual,
        getStorage: vi.fn(async () => ({
          getSalesBlueprint: vi.fn(async () => blueprint),
          getSourcePlan: vi.fn(async () => null),
          audit: vi.fn(async () => null),
        })),
      };
    });
    const app = await loadApp();
    const response = await app.request("/v1/content/opportunities?limit=2");
    const body = contentOpportunityPlanSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.publishingBlocked).toBe(true);
    expect(body.blockers).toContain(
      "Source-plan evidence is required before marking generated content brief-ready.",
    );
    expect(body.opportunities).toHaveLength(2);
    expect(body.opportunities.every((item) => item.status === "needs_review")).toBe(true);
  });

  it("validates the opportunity limit", async () => {
    const app = await loadApp();
    const response = await app.request("/v1/content/opportunities?limit=99");

    expect(response.status).toBe(400);
  });
});
