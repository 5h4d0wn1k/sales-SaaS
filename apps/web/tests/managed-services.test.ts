import { describe, expect, it } from "vitest";
import {
  buildManagedServiceContactUrl,
  formatManagedServiceContactMessage,
  managedServicePackages,
  parseManagedServiceContactContext,
} from "../lib/managed-services";

describe("managed services acquisition context", () => {
  it("keeps managed service packages bounded and commercially useful", () => {
    expect(managedServicePackages).toHaveLength(3);
    expect(managedServicePackages.map((managedPackage) => managedPackage.key)).toEqual([
      "setup-sprint",
      "operator-assist",
      "managed-revops",
    ]);

    const packageCopy = managedServicePackages
      .map((managedPackage) =>
        [
          managedPackage.tier,
          managedPackage.bestFor,
          managedPackage.includes,
          managedPackage.outcome,
        ]
          .join(" ")
          .toLowerCase(),
      );

    for (const copy of packageCopy) {
      expect(copy).not.toContain("guaranteed meetings");
      expect(copy).not.toContain("full autonomy");
      expect(copy).not.toContain("universal scraping");
    }
  });

  it("builds structured contact URLs for managed service packages", () => {
    expect(buildManagedServiceContactUrl("operator-assist")).toBe(
      "/contact?intent=managed_services&utm_source=managed_services&utm_medium=service_page&utm_campaign=operator-assist&managedPackage=operator-assist&managedIntent=fit_call",
    );
    expect(buildManagedServiceContactUrl("managed-revops", "rollout_scope")).toContain(
      "managedIntent=rollout_scope",
    );
  });

  it("parses and formats claim-safe managed service contact context", () => {
    const context = parseManagedServiceContactContext({
      utm_source: "managed_services",
      utm_campaign: "operator-assist",
      managedPackage: "operator-assist",
      managedIntent: "package_scope",
    });

    expect(context).toMatchObject({
      key: "operator-assist",
      tier: "Operator Assist",
      budgetRange: "1500_5000",
      goals: expect.arrayContaining([
        "Launch approval-gated outreach",
        "Add managed rollout support",
      ]),
    });
    expect(formatManagedServiceContactMessage(context!)).toContain(
      "Managed services fit-call context attached for review: Operator Assist.",
    );
    expect(formatManagedServiceContactMessage(context!)).toContain(
      "managed support does not bypass approval gates, suppression checks, provider readiness, or customer-owned decisions",
    );
  });

  it("accepts explicit package context from other acquisition sources", () => {
    const context = parseManagedServiceContactContext({
      utm_source: "pricing",
      utm_campaign: "managed_services_setup_sprint",
      managedPackage: "setup-sprint",
      managedIntent: "pricing_setup_review",
    });

    expect(context).toMatchObject({
      key: "setup-sprint",
      tier: "Setup Sprint",
      budgetRange: "500_1500",
    });
  });
});
