import { describe, expect, it } from "vitest";
import {
  evaluateCampaignPolicy,
  evaluateChannelEntitlement,
  evaluateUsageEntitlement,
} from "../src/policy";

describe("evaluateCampaignPolicy", () => {
  it("allows approved campaigns within plan limits", () => {
    expect(
      evaluateCampaignPolicy({
        approved: true,
        campaignStage: "approved",
        firstAction: false,
        highRiskChannel: false,
        monthlyUsage: 10,
        planLimit: 100,
      }),
    ).toEqual({
      allowed: true,
      reason: "Campaign execution permitted",
      nextStage: "approved",
    });
  });

  it("pauses over-limit campaigns", () => {
    expect(
      evaluateCampaignPolicy({
        approved: true,
        campaignStage: "running",
        firstAction: false,
        highRiskChannel: false,
        monthlyUsage: 100,
        planLimit: 100,
      }),
    ).toEqual({
      allowed: false,
      reason: "Monthly plan limit reached",
      nextStage: "paused",
    });
  });
});

describe("evaluateUsageEntitlement", () => {
  it("allows lead usage inside the plan limit", () => {
    expect(
      evaluateUsageEntitlement({
        metric: "leads_created",
        planKey: "starter",
        subscriptionStatus: "active",
        currentUsage: 99,
        usageLimit: 100,
        requestedQuantity: 1,
        enforceLimit: true,
      }),
    ).toMatchObject({
      allowed: true,
      remainingQuantity: 1,
    });
  });

  it("blocks lead usage that exceeds the plan limit", () => {
    expect(
      evaluateUsageEntitlement({
        metric: "leads_created",
        planKey: "free",
        subscriptionStatus: "trialing",
        currentUsage: 100,
        usageLimit: 100,
        requestedQuantity: 1,
        enforceLimit: true,
      }),
    ).toMatchObject({
      allowed: false,
      reason: "Monthly leads created limit reached for free.",
      remainingQuantity: 0,
    });
  });

  it("blocks outreach dispatches that exceed the plan limit", () => {
    expect(
      evaluateUsageEntitlement({
        metric: "outreach_dispatches",
        planKey: "starter",
        subscriptionStatus: "active",
        currentUsage: 100,
        usageLimit: 100,
        requestedQuantity: 1,
        enforceLimit: true,
      }),
    ).toMatchObject({
      allowed: false,
      reason: "Monthly outreach dispatches limit reached for starter.",
      remainingQuantity: 0,
    });
  });

  it("allows voice calls while usage remains", () => {
    expect(
      evaluateUsageEntitlement({
        metric: "voice_calls",
        planKey: "pro",
        subscriptionStatus: "active",
        currentUsage: 49,
        usageLimit: 100,
        requestedQuantity: 1,
        enforceLimit: true,
      }),
    ).toMatchObject({
      allowed: true,
      remainingQuantity: 51,
    });
  });

  it("blocks provider cost when the plan has no remaining budget", () => {
    expect(
      evaluateUsageEntitlement({
        metric: "provider_cost_cents",
        planKey: "free",
        subscriptionStatus: "trialing",
        currentUsage: 0,
        usageLimit: 0,
        requestedQuantity: 1,
        enforceLimit: true,
      }),
    ).toMatchObject({
      allowed: false,
      reason: "Monthly provider cost budget limit reached for free.",
      remainingQuantity: 0,
    });
  });

  it("blocks billable work for past-due subscriptions even when usage remains", () => {
    expect(
      evaluateUsageEntitlement({
        metric: "ai_worker_task_proposals",
        planKey: "pro",
        subscriptionStatus: "past_due",
        currentUsage: 0,
        usageLimit: 5000,
        requestedQuantity: 1,
        enforceLimit: false,
      }),
    ).toMatchObject({
      allowed: false,
      reason: "Subscription is past due. Resolve billing before creating new billable work.",
    });
  });

  it("blocks AI worker task proposals when the proposal quota is exhausted", () => {
    expect(
      evaluateUsageEntitlement({
        metric: "ai_worker_task_proposals",
        planKey: "free",
        subscriptionStatus: "trialing",
        currentUsage: 0,
        usageLimit: 0,
        requestedQuantity: 1,
        enforceLimit: true,
      }),
    ).toMatchObject({
      allowed: false,
      reason: "Monthly AI worker task proposals limit reached for free.",
      remainingQuantity: 0,
    });
  });

  it("blocks AI worker execution cost when the plan dry-run budget is exhausted", () => {
    expect(
      evaluateUsageEntitlement({
        metric: "ai_worker_execution_cents",
        planKey: "starter",
        subscriptionStatus: "active",
        currentUsage: 2500,
        usageLimit: 2500,
        requestedQuantity: 1,
        enforceLimit: true,
      }),
    ).toMatchObject({
      allowed: false,
      reason: "Monthly AI worker execution budget limit reached for starter.",
      remainingQuantity: 0,
    });
  });
});

describe("evaluateChannelEntitlement", () => {
  it("allows included outbound channels", () => {
    expect(
      evaluateChannelEntitlement({
        planKey: "pro",
        subscriptionStatus: "active",
        channel: "call",
        includedChannels: ["email", "call"],
      }),
    ).toMatchObject({
      allowed: true,
      reason: "Call channel is available for pro.",
    });
  });

  it("blocks outbound channels that are not included in the plan", () => {
    expect(
      evaluateChannelEntitlement({
        planKey: "starter",
        subscriptionStatus: "active",
        channel: "call",
        includedChannels: ["email"],
      }),
    ).toMatchObject({
      allowed: false,
      reason: "Call channel is not included in starter. Upgrade or choose an included channel.",
    });
  });

  it("blocks channels for past-due subscriptions", () => {
    expect(
      evaluateChannelEntitlement({
        planKey: "elite",
        subscriptionStatus: "past_due",
        channel: "linkedin",
        includedChannels: ["email", "call", "linkedin"],
      }),
    ).toMatchObject({
      allowed: false,
      reason: "Subscription is past due. Resolve billing before using outbound channels.",
    });
  });
});
