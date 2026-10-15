import { describe, it, expect } from "vitest";
import { PRICING_PLANS, getPlanByKey } from "@sales/shared";

describe("Pricing Plans", () => {
  it("should have all required plans", () => {
    expect(PRICING_PLANS).toHaveLength(4);
    
    const keys = PRICING_PLANS.map(p => p.key);
    expect(keys).toContain("free");
    expect(keys).toContain("starter");
    expect(keys).toContain("pro");
    expect(keys).toContain("elite");
  });

  it("should have valid pricing for all tiers", () => {
    for (const plan of PRICING_PLANS) {
      expect(plan.price.usd).toBeGreaterThanOrEqual(0);
      expect(plan.price.inr).toBeGreaterThanOrEqual(0);
      expect(plan.usageLimit).toBeGreaterThan(0);
      expect(plan.outreachDispatchLimit).toBeGreaterThanOrEqual(0);
      expect(plan.voiceCallLimit).toBeGreaterThanOrEqual(0);
      expect(plan.providerCostBudgetCents).toBeGreaterThanOrEqual(0);
      expect(plan.aiWorkerTaskProposalLimit).toBeGreaterThanOrEqual(0);
      expect(plan.aiWorkerExecutionBudgetCents).toBeGreaterThanOrEqual(0);
      expect(plan.includedChannels.length).toBeGreaterThan(0);
      expect(plan.seats).toBeGreaterThan(0);
      expect(plan.stripePriceId).toBeTruthy();
      expect(plan.razorpayPlanId).toBeTruthy();
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it("should have ascending prices and limits", () => {
    const free = getPlanByKey("free");
    const starter = getPlanByKey("starter");
    const pro = getPlanByKey("pro");
    const elite = getPlanByKey("elite");

    expect(free?.price.usd).toBe(0);
    expect(starter?.price.usd).toBeLessThan(pro?.price.usd ?? Infinity);
    expect(pro?.price.usd).toBeLessThan(elite?.price.usd ?? Infinity);

    expect(free?.usageLimit).toBeLessThan(starter?.usageLimit ?? Infinity);
    expect(starter?.usageLimit).toBeLessThan(pro?.usageLimit ?? Infinity);
    expect(pro?.usageLimit).toBeLessThan(elite?.usageLimit ?? Infinity);

    expect(free?.outreachDispatchLimit).toBeLessThan(starter?.outreachDispatchLimit ?? Infinity);
    expect(starter?.outreachDispatchLimit).toBeLessThan(pro?.outreachDispatchLimit ?? Infinity);
    expect(pro?.outreachDispatchLimit).toBeLessThan(elite?.outreachDispatchLimit ?? Infinity);

    expect(free?.voiceCallLimit).toBeLessThanOrEqual(starter?.voiceCallLimit ?? Infinity);
    expect(starter?.voiceCallLimit).toBeLessThan(pro?.voiceCallLimit ?? Infinity);
    expect(pro?.voiceCallLimit).toBeLessThan(elite?.voiceCallLimit ?? Infinity);

    expect(free?.providerCostBudgetCents).toBeLessThan(starter?.providerCostBudgetCents ?? Infinity);
    expect(starter?.providerCostBudgetCents).toBeLessThan(pro?.providerCostBudgetCents ?? Infinity);
    expect(pro?.providerCostBudgetCents).toBeLessThan(elite?.providerCostBudgetCents ?? Infinity);

    expect(free?.aiWorkerTaskProposalLimit).toBeLessThan(starter?.aiWorkerTaskProposalLimit ?? Infinity);
    expect(starter?.aiWorkerTaskProposalLimit).toBeLessThan(pro?.aiWorkerTaskProposalLimit ?? Infinity);
    expect(pro?.aiWorkerTaskProposalLimit).toBeLessThan(elite?.aiWorkerTaskProposalLimit ?? Infinity);

    expect(free?.aiWorkerExecutionBudgetCents).toBeLessThan(starter?.aiWorkerExecutionBudgetCents ?? Infinity);
    expect(starter?.aiWorkerExecutionBudgetCents).toBeLessThan(pro?.aiWorkerExecutionBudgetCents ?? Infinity);
    expect(pro?.aiWorkerExecutionBudgetCents).toBeLessThan(elite?.aiWorkerExecutionBudgetCents ?? Infinity);
  });

  it("should calculate correct INR amounts", () => {
    const starter = getPlanByKey("starter");
    expect(starter?.price.inr).toBe(3999); // $49 ≈ ₹3999
  });

  it("should have pro marked as popular", () => {
    const pro = getPlanByKey("pro");
    expect(pro?.popular).toBe(true);
  });
});

describe("getPlanByKey", () => {
  it("should return undefined for invalid key", () => {
    expect(getPlanByKey("invalid")).toBeUndefined();
  });

  it("should return correct plan for valid keys", () => {
    expect(getPlanByKey("free")).toBeDefined();
    expect(getPlanByKey("free")?.key).toBe("free");
  });
});
