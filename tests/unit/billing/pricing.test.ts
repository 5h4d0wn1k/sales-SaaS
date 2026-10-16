import { describe, it, expect } from "vitest";
import {
  PRICING_PLANS,
  getPlanAiWorkerExecutionBudgetCents,
  getPlanAiWorkerTaskProposalLimit,
  getPlanByKey,
  getPlanOutreachDispatchLimit,
  getPlanProviderCostBudgetCents,
  getPlanVoiceCallLimit,
  getUpgradeRecommendation,
} from "@sales/shared";

describe("Billing Pricing Plans", () => {
  it("should have 4 pricing tiers", () => {
    expect(PRICING_PLANS).toHaveLength(4);
  });

  it("should have increasing prices", () => {
    const free = getPlanByKey("free");
    const starter = getPlanByKey("starter");
    const pro = getPlanByKey("pro");
    const elite = getPlanByKey("elite");

    expect(free?.price.usd).toBe(0);
    expect(starter?.price.usd).toBe(20);
    expect(pro?.price.usd).toBe(45);
    expect(elite?.price.usd).toBe(100);
  });

  it("should have increasing usage limits", () => {
    const free = getPlanByKey("free");
    const starter = getPlanByKey("starter");
    const pro = getPlanByKey("pro");
    const elite = getPlanByKey("elite");

    expect(free?.usageLimit).toBe(100);
    expect(starter?.usageLimit).toBe(1000);
    expect(pro?.usageLimit).toBe(5000);
    expect(elite?.usageLimit).toBe(20000);
  });

  it("should expose provider-cost budgets by plan", () => {
    expect(getPlanProviderCostBudgetCents("free")).toBe(0);
    expect(getPlanProviderCostBudgetCents("starter")).toBe(1500);
    expect(getPlanProviderCostBudgetCents("pro")).toBe(5000);
    expect(getPlanProviderCostBudgetCents("elite")).toBe(15000);
    expect(getPlanProviderCostBudgetCents("missing")).toBe(0);
  });

  it("should expose outreach and voice dispatch limits by plan", () => {
    expect(getPlanOutreachDispatchLimit("free")).toBe(0);
    expect(getPlanOutreachDispatchLimit("starter")).toBe(100);
    expect(getPlanOutreachDispatchLimit("pro")).toBe(1000);
    expect(getPlanOutreachDispatchLimit("elite")).toBe(5000);
    expect(getPlanOutreachDispatchLimit("missing")).toBe(0);

    expect(getPlanVoiceCallLimit("free")).toBe(0);
    expect(getPlanVoiceCallLimit("starter")).toBe(0);
    expect(getPlanVoiceCallLimit("pro")).toBe(250);
    expect(getPlanVoiceCallLimit("elite")).toBe(1000);
    expect(getPlanVoiceCallLimit("missing")).toBe(0);
  });

  it("should expose AI worker task proposal limits by plan", () => {
    expect(getPlanAiWorkerTaskProposalLimit("free")).toBe(0);
    expect(getPlanAiWorkerTaskProposalLimit("starter")).toBe(10);
    expect(getPlanAiWorkerTaskProposalLimit("pro")).toBe(50);
    expect(getPlanAiWorkerTaskProposalLimit("elite")).toBe(250);
    expect(getPlanAiWorkerTaskProposalLimit("missing")).toBe(0);
  });

  it("should expose AI worker execution budgets by plan", () => {
    expect(getPlanAiWorkerExecutionBudgetCents("free")).toBe(0);
    expect(getPlanAiWorkerExecutionBudgetCents("starter")).toBe(2500);
    expect(getPlanAiWorkerExecutionBudgetCents("pro")).toBe(15000);
    expect(getPlanAiWorkerExecutionBudgetCents("elite")).toBe(50000);
    expect(getPlanAiWorkerExecutionBudgetCents("missing")).toBe(0);
  });

  it("should expose included outbound channels by plan", () => {
    expect(getPlanByKey("free")?.includedChannels).toEqual(["email"]);
    expect(getPlanByKey("starter")?.includedChannels).toEqual(["email"]);
    expect(getPlanByKey("pro")?.includedChannels).toEqual(["email", "call"]);
    expect(getPlanByKey("elite")?.includedChannels).toEqual(["email", "call", "linkedin"]);
  });

  it("should recommend the cheapest plan that unlocks a blocked channel", () => {
    expect(getUpgradeRecommendation({
      currentPlanKey: "starter",
      requiredChannel: "call",
    })?.planKey).toBe("pro");

    expect(getUpgradeRecommendation({
      currentPlanKey: "starter",
      requiredChannel: "linkedin",
    })?.planKey).toBe("elite");
  });

  it("should recommend a plan that satisfies every required outbound channel", () => {
    expect(getUpgradeRecommendation({
      currentPlanKey: "starter",
      requiredChannels: ["call", "linkedin"],
    })?.planKey).toBe("elite");
  });

  it("should not recommend an upgrade when no concrete requirement is provided", () => {
    expect(getUpgradeRecommendation({
      currentPlanKey: "pro",
    })).toBeNull();
  });

  it("should recommend upgrades for usage and provider-cost budget boundaries", () => {
    expect(getUpgradeRecommendation({
      currentPlanKey: "free",
      minUsageLimit: 101,
    })?.planKey).toBe("starter");

    expect(getUpgradeRecommendation({
      currentPlanKey: "starter",
      minProviderCostBudgetCents: 1501,
    })?.planKey).toBe("pro");

    expect(getUpgradeRecommendation({
      currentPlanKey: "free",
      minOutreachDispatchLimit: 1,
    })?.planKey).toBe("starter");

    expect(getUpgradeRecommendation({
      currentPlanKey: "starter",
      minVoiceCallLimit: 1,
    })?.planKey).toBe("pro");

    expect(getUpgradeRecommendation({
      currentPlanKey: "free",
      minAiWorkerTaskProposalLimit: 1,
    })?.planKey).toBe("starter");

    expect(getUpgradeRecommendation({
      currentPlanKey: "starter",
      minAiWorkerExecutionBudgetCents: 2501,
    })?.planKey).toBe("pro");
  });

  it("should not recommend an upgrade when no higher plan satisfies the need", () => {
    expect(getUpgradeRecommendation({
      currentPlanKey: "elite",
      minUsageLimit: 20001,
    })).toBeNull();
  });

  it("should have Razorpay plan IDs for India", () => {
    PRICING_PLANS.forEach(plan => {
      expect(plan.razorpayPlanId).toBeTruthy();
      expect(typeof plan.razorpayPlanId).toBe("string");
    });
  });

  it("should have Stripe price IDs for global", () => {
    PRICING_PLANS.forEach(plan => {
      expect(plan.stripePriceId).toBeTruthy();
      expect(typeof plan.stripePriceId).toBe("string");
    });
  });
});
