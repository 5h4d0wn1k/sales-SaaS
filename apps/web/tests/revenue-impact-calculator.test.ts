import { describe, expect, it } from "vitest";
import {
  calculateRevenueImpact,
  defaultRevenueImpactInput,
  formatCurrency,
  normalizeRevenueImpactInput,
} from "../lib/revenue-impact-calculator";

describe("revenue impact calculator", () => {
  it("models revenue, efficiency value, net impact, and ROI without claiming guarantees", () => {
    const result = calculateRevenueImpact(defaultRevenueImpactInput);

    expect(result.qualifiedLeads).toBeCloseTo(72);
    expect(result.meetings).toBeCloseTo(11.52);
    expect(result.customers).toBeCloseTo(2.7648);
    expect(result.monthlyRevenue).toBeCloseTo(9676.8);
    expect(result.monthlyEfficiencyValue).toBe(1170);
    expect(result.netMonthlyImpact).toBeCloseTo(10597.8);
    expect(result.annualNetImpact).toBeCloseTo(127173.6);
    expect(result.roiMultiple).toBeCloseTo(43.56, 2);
    expect(result.paybackDays).toBeCloseTo(0.69, 2);
  });

  it("clamps unsafe or impossible input values before calculating", () => {
    const normalized = normalizeRevenueImpactInput({
      monthlyLeads: -10,
      qualifiedRate: 140,
      meetingRate: Number.NaN,
      closeRate: -12,
      averageContractValue: 12_000_000,
      monthlyPlatformCost: -1,
      hoursSaved: 20_000,
      hourlyCost: 50_000,
    });

    expect(normalized).toEqual({
      monthlyLeads: 0,
      qualifiedRate: 100,
      meetingRate: 0,
      closeRate: 0,
      averageContractValue: 10_000_000,
      monthlyPlatformCost: 0,
      hoursSaved: 10_000,
      hourlyCost: 10_000,
    });
    expect(calculateRevenueImpact(normalized).roiMultiple).toBeNull();
  });

  it("formats currency consistently for public calculator output", () => {
    expect(formatCurrency(127173.6)).toBe("$127,174");
  });
});
