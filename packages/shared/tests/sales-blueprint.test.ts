import { describe, expect, it } from "vitest";
import { upsertSalesBlueprintInputSchema } from "../src/domain";

const validInput = {
  businessName: "SignalForge AI",
  website: "https://signalforge.example",
  industry: "B2B SaaS",
  offerSummary:
    "AI-assisted outbound operations for founder-led software teams that need qualified pipeline.",
  targetAudience: "Founder-led B2B SaaS companies with 10 to 100 employees",
  regions: "US, UK\nIndia",
  goals: "Increase qualified pipeline\nBook demos",
  channels: "email, linkedin, call",
  constraints: "No cold SMS without consent",
  voice: "Direct, consultative, and grounded in business context.",
  summary:
    "SignalForge needs a governed sales workspace that can find accounts, draft outreach, and convert interest into meetings.",
  icpSummary: "Founder-led B2B SaaS teams hiring sales or RevOps support.",
  buyerRoles: "Founder\nHead of Sales",
  painPoints: "Manual prospecting, Fragmented outbound",
  disqualifiers: "No B2B motion, Outside target regions",
  qualificationRules: "Match target regions\nAvoid suppressed contacts",
  sourceChannels: "website, search, directory",
  outreachChannels: "email, linkedin",
  searchKeywords: "B2B SaaS hiring SDR, founder-led SaaS revenue operations",
  monthlyLeadTarget: "250",
  meetingTarget: "20",
  averageContractValue: "8000",
  automationMode: "approval_gated",
  approvalRequiredFor: "first outreach, phone calls",
  complianceNotes: "Respect unsubscribe, do-not-contact, and sender reputation rules.",
};

describe("sales blueprint contract", () => {
  it("normalizes comma and newline form values into bounded lists", () => {
    const parsed = upsertSalesBlueprintInputSchema.parse(validInput);

    expect(parsed.regions).toEqual(["US", "UK", "India"]);
    expect(parsed.channels).toEqual(["email", "linkedin", "call"]);
    expect(parsed.buyerRoles).toEqual(["Founder", "Head of Sales"]);
    expect(parsed.monthlyLeadTarget).toBe(250);
    expect(parsed.meetingTarget).toBe(20);
  });

  it("rejects incomplete core business context", () => {
    expect(() =>
      upsertSalesBlueprintInputSchema.parse({
        ...validInput,
        businessName: "A",
        offerSummary: "too short",
      }),
    ).toThrow();
  });
});
