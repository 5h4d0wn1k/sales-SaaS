import { describe, expect, it } from "vitest";
import { salesBlueprintResponseSchema } from "@sales/shared";
import { createApp } from "../src/app";

const completeBlueprintInput = {
  businessName: "SignalForge AI",
  website: "https://signalforge.example",
  industry: "B2B SaaS",
  offerSummary:
    "AI-assisted outbound operations for founder-led software teams that need qualified pipeline.",
  targetAudience: "Founder-led B2B SaaS companies with 10 to 100 employees",
  regions: "US, UK, India",
  goals: "Increase qualified pipeline, Book demos, Improve outbound visibility",
  channels: "email, linkedin, call",
  constraints: "No cold SMS without consent, Keep first-touch approval",
  voice: "Direct, consultative, specific, and grounded in business context.",
  summary:
    "SignalForge needs a governed sales workspace that can find relevant accounts, draft outreach, and convert interest into meetings.",
  icpSummary: "Founder-led B2B SaaS companies hiring sales or RevOps support.",
  buyerRoles: "Founder, Head of Sales, Revenue Operations",
  painPoints: "Manual prospecting, Fragmented outbound, Slow demo booking",
  disqualifiers: "No B2B motion, Outside target regions, No public business signal",
  qualificationRules:
    "Match target regions, Show a revenue operations signal, Avoid suppressed contacts",
  sourceChannels: "website, search, directory, csv",
  outreachChannels: "email, linkedin, call",
  searchKeywords: "B2B SaaS hiring SDR, founder-led SaaS revenue operations",
  monthlyLeadTarget: 400,
  meetingTarget: 30,
  averageContractValue: 8000,
  automationMode: "approval_gated",
  approvalRequiredFor: "first outreach, phone calls, new channels",
  complianceNotes:
    "Respect unsubscribe, do-not-contact, sender reputation, and local outreach rules.",
};

describe("sales blueprint routes", () => {
  it("returns the current workspace sales blueprint", async () => {
    const app = createApp();
    const response = await app.request("/v1/sales-blueprint");
    const body = salesBlueprintResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.blueprint).toMatchObject({
      businessProfile: {
        businessName: "Northstar Labs",
      },
      automationMode: "approval_gated",
    });
    expect(body.blueprint?.readinessScore).toBeGreaterThan(70);
  });

  it("saves a governed blueprint and refreshes source planning", async () => {
    const app = createApp();
    const response = await app.request("/v1/sales-blueprint", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(completeBlueprintInput),
    });
    const body = salesBlueprintResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.blueprint).toMatchObject({
      status: "ready",
      readinessGaps: [],
      monthlyLeadTarget: 400,
      meetingTarget: 30,
      businessProfile: {
        businessName: "SignalForge AI",
        regions: ["US", "UK", "India"],
      },
      sourceChannels: ["website", "search", "directory", "csv"],
      outreachChannels: ["email", "linkedin", "call"],
    });

    const planResponse = await app.request("/v1/leads/search-plan", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ goal: "Refresh from blueprint" }),
    });
    const plan = await planResponse.json();

    expect(plan.summary).toContain("Founder-led B2B SaaS");
    expect(plan.sources).toEqual(["website", "search", "directory", "csv"]);
    expect(plan.contactTargets).toEqual(["email", "linkedin", "call"]);
  });

  it("keeps incomplete blueprints in review instead of claiming launch readiness", async () => {
    const app = createApp();
    const response = await app.request("/v1/sales-blueprint", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...completeBlueprintInput,
        website: "",
        regions: "",
        sourceChannels: "",
        searchKeywords: "",
        complianceNotes: "",
      }),
    });
    const body = salesBlueprintResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.blueprint).toMatchObject({
      status: "needs_review",
    });
    expect(body.blueprint?.readinessGaps).toEqual(
      expect.arrayContaining([
        expect.stringContaining("company website"),
        expect.stringContaining("region"),
        expect.stringContaining("source channel"),
        expect.stringContaining("search keywords"),
        expect.stringContaining("compliance notes"),
      ]),
    );
  });
});
