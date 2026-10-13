import { describe, expect, it } from "vitest";
import {
  buildLeadGenerationContactUrl,
  buildLeadGenerationGetStartedUrl,
  buildLeadGenerationPricingUrl,
  formatLeadGenerationContactMessage,
  parseLeadGenerationContactContext,
} from "../lib/lead-generation-context";

describe("lead generation software context", () => {
  it("builds attributed lead-generation URLs", () => {
    expect(buildLeadGenerationContactUrl("rollout_review")).toBe(
      "/contact?intent=managed_services&utm_source=ai_lead_generation_software&utm_medium=seo_landing&utm_campaign=lead_generation_software&leadGenIntent=rollout_review",
    );
    expect(buildLeadGenerationGetStartedUrl("source_plan")).toBe(
      "/get-started?utm_source=ai_lead_generation_software&utm_medium=seo_landing&utm_campaign=lead_generation_software&leadGenIntent=source_plan",
    );
    expect(buildLeadGenerationPricingUrl()).toBe(
      "/pricing?utm_source=ai_lead_generation_software&utm_medium=seo_landing&utm_campaign=lead_generation_software&leadGenIntent=pricing_review",
    );
  });

  it("parses lead-generation acquisition context", () => {
    const context = parseLeadGenerationContactContext({
      utm_source: "ai_lead_generation_software",
      leadGenIntent: "blueprint_review",
    });

    expect(context).toMatchObject({
      label: "AI lead generation software",
      intent: "blueprint_review",
      intentLabel: "Blueprint review",
      sourcePath: "/ai-lead-generation-software",
      budgetRange: "1500_5000",
      monthlyLeadGoal: 750,
    });
    expect(context?.channels).toEqual(
      expect.arrayContaining(["website", "directory", "email", "call", "telegram"]),
    );
    expect(context?.goals).toEqual(
      expect.arrayContaining([
        "Build a Sales Blueprint",
        "Generate qualified leads",
        "Improve meetings and conversion",
      ]),
    );
  });

  it("keeps the formatted intake message claim-safe", () => {
    const context = parseLeadGenerationContactContext({
      utm_source: "ai_lead_generation_software",
      leadGenIntent: "surprise",
    });

    expect(context?.intent).toBe("source_plan");

    const message = formatLeadGenerationContactMessage(context!);

    expect(message).toContain("AI lead generation software context attached for review");
    expect(message).toContain("Intent: Source plan");
    expect(message).toContain("No live scraping");
    expect(message.toLowerCase()).not.toContain("guaranteed meetings");
    expect(message.toLowerCase()).not.toContain("fully autonomous");
  });

  it("ignores unsupported acquisition sources", () => {
    expect(
      parseLeadGenerationContactContext({
        utm_source: "ai_sdr_software",
        leadGenIntent: "source_plan",
      }),
    ).toBeNull();
  });
});
