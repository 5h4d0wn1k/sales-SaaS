import { describe, expect, it } from "vitest";
import { dashboardSnapshot } from "@sales/shared";

describe("dashboard snapshot", () => {
  it("exposes the core platform pillars", () => {
    expect(dashboardSnapshot.pillars).toContain("Approval-gated autonomy");
    expect(dashboardSnapshot.metrics).toHaveLength(3);
  });
});

