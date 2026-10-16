import { describe, expect, it } from "vitest";
import {
  buildRoiContactUrl,
  buildRoiGetStartedUrl,
  deriveBudgetRange,
  formatRoiContactMessage,
  parseRoiContactContext,
  roiContactUtm,
} from "../lib/roi-contact-context";
import {
  calculateRevenueImpact,
  defaultRevenueImpactInput,
} from "../lib/revenue-impact-calculator";

describe("ROI contact context", () => {
  it("derives contact budget posture from modeled monthly spend", () => {
    expect(deriveBudgetRange(0)).toBe("not_sure");
    expect(deriveBudgetRange(249)).toBe("under_500");
    expect(deriveBudgetRange(500)).toBe("500_1500");
    expect(deriveBudgetRange(1500)).toBe("1500_5000");
    expect(deriveBudgetRange(5000)).toBe("5000_plus");
  });

  it("builds a compact contact URL with attribution and scenario fields", () => {
    const result = calculateRevenueImpact(defaultRevenueImpactInput);
    const contactUrl = buildRoiContactUrl(defaultRevenueImpactInput, result);
    const getStartedUrl = buildRoiGetStartedUrl(defaultRevenueImpactInput, result);
    const url = new URL(contactUrl, "https://salesxgrowth.com");
    const getStarted = new URL(getStartedUrl, "https://salesxgrowth.com");

    expect(url.pathname).toBe("/contact");
    expect(getStarted.pathname).toBe("/get-started");
    expect(getStarted.searchParams.get("utm_source")).toBe(roiContactUtm.source);
    expect(getStarted.searchParams.get("monthlyLeadGoal")).toBe("400");
    expect(url.searchParams.get("intent")).toBe("managed_services");
    expect(url.searchParams.get("utm_source")).toBe(roiContactUtm.source);
    expect(url.searchParams.get("utm_medium")).toBe(roiContactUtm.medium);
    expect(url.searchParams.get("utm_campaign")).toBe(roiContactUtm.campaign);
    expect(url.searchParams.get("monthlyLeadGoal")).toBe("400");
    expect(url.searchParams.get("budgetRange")).toBe("under_500");
    expect(url.searchParams.get("roiAnnualNet")).toBe("127174");
  });

  it("parses calculator context and formats a claim-safe intake message", () => {
    const context = parseRoiContactContext({
      utm_source: roiContactUtm.source,
      monthlyLeadGoal: "1200",
      budgetRange: "5000_plus",
      roiQualifiedRate: "14",
      roiMeetingRate: "12",
      roiCloseRate: "18",
      roiAcv: "5200",
      roiBudget: "5000",
      roiHoursSaved: "36",
      roiAnnualNet: "157000",
    });

    expect(context).toMatchObject({
      monthlyLeadGoal: 1200,
      budgetRange: "5000_plus",
      annualNetImpact: 157000,
    });
    expect(formatRoiContactMessage(context!)).toContain(
      "scenario only, not a guarantee",
    );
    expect(formatRoiContactMessage(context!)).toContain("Monthly lead goal: 1,200");
  });

  it("ignores stray ROI-looking fields without the calculator attribution source", () => {
    expect(
      parseRoiContactContext({
        monthlyLeadGoal: "400",
        roiAnnualNet: "127174",
      }),
    ).toBeNull();
  });
});
