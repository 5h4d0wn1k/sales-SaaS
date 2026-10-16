import { describe, expect, it } from "vitest";
import { buildContactStatusView } from "../lib/contact-status";

describe("contact status view", () => {
  it("builds priority submit feedback with operational next steps", () => {
    const status = buildContactStatusView(
      "submitted",
      "Your request was captured for priority founder or managed-services review.",
      "high",
    );

    expect(status).toMatchObject({
      title: "Priority request captured",
      message: "Your request was captured for priority founder or managed-services review.",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      nextSteps: expect.arrayContaining([
        "Review company fit, sales goals, budget posture, and rollout blockers.",
        "Confirm plan, provider, approval, and managed-service boundaries before live work starts.",
        "Follow up through hello@salesxgrowth.com with the safest onboarding or rollout path.",
      ]),
    });
  });

  it("builds recovery feedback when intake capture fails", () => {
    const status = buildContactStatusView("error");

    expect(status).toMatchObject({
      title: "Request was not captured",
      tone: "border-red-200 bg-red-50 text-red-800",
      nextSteps: expect.arrayContaining([
        "Send the same details to hello@salesxgrowth.com.",
        "Include company, goal, monthly lead target, timeline, budget posture, and channels.",
        "Avoid sending secrets, provider keys, or private customer data in the first email.",
      ]),
    });
    expect(status?.message).toContain("hello@salesxgrowth.com");
  });

  it("ignores unknown status values and stays claim-safe", () => {
    expect(buildContactStatusView("unknown")).toBeNull();

    const copy = JSON.stringify([
      buildContactStatusView("submitted", undefined, "medium"),
      buildContactStatusView("error"),
    ]).toLowerCase();

    expect(copy).not.toContain("guaranteed meetings");
    expect(copy).not.toContain("guaranteed revenue");
    expect(copy).not.toContain("fully autonomous");
    expect(copy).not.toContain("universal scraping");
  });
});
