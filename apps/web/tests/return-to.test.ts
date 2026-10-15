import { describe, expect, it } from "vitest";
import { appendStatusParam, resolveReturnTo } from "../lib/return-to";
import {
  appendUpgradeSearchParams,
  normalizeUpgradeRecommendation,
  readUpgradeSearchParams,
} from "../lib/upgrade-recommendation";

describe("return-to helpers", () => {
  it("keeps relative in-app return targets and rejects unsafe redirects", () => {
    expect(resolveReturnTo("/billing?tab=history", "/dashboard")).toBe("/billing?tab=history");
    expect(resolveReturnTo("https://evil.example.com", "/dashboard")).toBe("/dashboard");
    expect(resolveReturnTo("//evil.example.com", "/dashboard")).toBe("/dashboard");
  });

  it("appends status parameters without dropping the existing path", () => {
    expect(appendStatusParam("/billing?tab=history", "workspace", "switched")).toBe(
      "/billing?tab=history&workspace=switched",
    );
  });

  it("preserves dashboard section anchors when appending status parameters", () => {
    expect(appendStatusParam("/dashboard#ai-workers", "workerStatus", "completed")).toBe(
      "/dashboard?workerStatus=completed#ai-workers",
    );
  });

  it("carries safe upgrade recommendation parameters across redirects", () => {
    const upgrade = normalizeUpgradeRecommendation({
      planKey: "pro",
      planName: "Pro",
      description: "Unlock calling and a larger provider budget.",
      checkoutPath: "/get-started?plan=pro",
    });

    expect(upgrade).toEqual({
      planKey: "pro",
      planName: "Pro",
      description: "Unlock calling and a larger provider budget.",
      checkoutPath: "/get-started?plan=pro",
    });

    const redirectPath = appendUpgradeSearchParams(
      "/dashboard?workerStatus=error",
      upgrade!,
    );

    expect(redirectPath).toBe(
      "/dashboard?workerStatus=error&upgradePlan=pro&upgradeName=Pro&upgradeDescription=Unlock+calling+and+a+larger+provider+budget.&upgradeCheckout=%2Fget-started%3Fplan%3Dpro",
    );
    expect(
      readUpgradeSearchParams({
        upgradePlan: "pro",
        upgradeName: "Pro",
        upgradeDescription: "Unlock calling and a larger provider budget.",
        upgradeCheckout: "/get-started?plan=pro",
      }),
    ).toEqual(upgrade);
  });

  it("rejects unsafe upgrade checkout paths", () => {
    expect(
      normalizeUpgradeRecommendation({
        planKey: "pro",
        planName: "Pro",
        description: "Unsafe external redirect.",
        checkoutPath: "https://evil.example.com/pay",
      }),
    ).toBeNull();
    expect(
      readUpgradeSearchParams({
        upgradePlan: "pro",
        upgradeName: "Pro",
        upgradeDescription: "Unsafe external redirect.",
        upgradeCheckout: "//evil.example.com/pay",
      }),
    ).toBeNull();
  });
});
