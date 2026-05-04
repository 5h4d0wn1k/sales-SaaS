import { describe, it, expect } from "vitest";
import { PRICING_PLANS, getPlanByKey } from "@sales/shared";

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
    expect(starter?.price.usd).toBe(49);
    expect(pro?.price.usd).toBe(99);
    expect(elite?.price.usd).toBe(249);
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
