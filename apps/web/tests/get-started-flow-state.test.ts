import { describe, expect, it } from "vitest";
import {
  buildDashboardUrl,
  buildGetStartedUrl,
  normalizePlanKey,
  normalizeRequestedStep,
  resolveInitialGetStartedStep,
} from "../app/get-started/flow-state";

describe("get-started flow state helpers", () => {
  it("normalizes unknown plans back to free", () => {
    expect(normalizePlanKey("starter")).toBe("starter");
    expect(normalizePlanKey("nope")).toBe("free");
    expect(normalizePlanKey(undefined)).toBe("free");
  });

  it("restores checkout when a signed-in user returns from cancellation", () => {
    const step = resolveInitialGetStartedStep({
      hasSession: true,
      planKey: "pro",
      requestedStep: normalizeRequestedStep("plan_selection"),
      checkoutState: "canceled",
    });

    expect(step).toBe("checkout");
  });

  it("keeps unauthenticated users on auth even with deep-link params", () => {
    const step = resolveInitialGetStartedStep({
      hasSession: false,
      planKey: "pro",
      requestedStep: normalizeRequestedStep("checkout"),
      checkoutState: "canceled",
    });

    expect(step).toBe("auth");
  });

  it("builds stable return URLs for get-started and dashboard", () => {
    expect(
      buildGetStartedUrl({
        planKey: "starter",
        step: "checkout",
        checkout: "canceled",
      }),
    ).toBe("/get-started?plan=starter&step=checkout&checkout=canceled");

    expect(buildDashboardUrl("success")).toBe("/dashboard?checkout=success");
    expect(buildDashboardUrl()).toBe("/dashboard");
  });
});
