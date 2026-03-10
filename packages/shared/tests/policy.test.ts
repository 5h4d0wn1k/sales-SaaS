import { describe, expect, it } from "vitest";
import { evaluateCampaignPolicy } from "../src/policy";

describe("evaluateCampaignPolicy", () => {
  it("allows approved campaigns within plan limits", () => {
    expect(
      evaluateCampaignPolicy({
        approved: true,
        campaignStage: "approved",
        firstAction: false,
        highRiskChannel: false,
        monthlyUsage: 10,
        planLimit: 100,
      }),
    ).toEqual({
      allowed: true,
      reason: "Campaign execution permitted",
      nextStage: "approved",
    });
  });

  it("pauses over-limit campaigns", () => {
    expect(
      evaluateCampaignPolicy({
        approved: true,
        campaignStage: "running",
        firstAction: false,
        highRiskChannel: false,
        monthlyUsage: 100,
        planLimit: 100,
      }),
    ).toEqual({
      allowed: false,
      reason: "Monthly plan limit reached",
      nextStage: "paused",
    });
  });
});

