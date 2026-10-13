import { describe, expect, it } from "vitest";
import {
  buildOutboundChannelReadiness,
  outboundChannelReadinessResponseSchema,
} from "../src/outbound-channel-readiness";
import { evaluateChannelEntitlement, evaluateUsageEntitlement } from "../src/policy";
import type { DashboardResponse, ProviderSummary } from "../src/domain";
import { getPlanIncludedChannels } from "../src/billing/pricing";

const now = "2026-06-05T12:00:00.000Z";

function dashboard(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    workspace: {
      organizationName: "Northstar Labs",
      workspaceName: "Growth OS",
      region: "global",
      primaryChannel: "email",
    },
    metrics: [],
    leads: [],
    campaigns: [],
    subscription: {
      planKey: "pro",
      status: "active",
      seats: 3,
      usageLimit: 5000,
      monthlyUsage: 120,
    },
    actionItems: [],
    onboarding: {
      id: "onboarding-1",
      status: "completed",
      currentStep: "complete",
      transcript: [],
      extractedProfile: null,
      scraperBrief: null,
      outreachBrief: null,
    },
    sourcePlan: null,
    sourceRuns: [],
    activities: [],
    calls: [],
    meetings: [],
    ...overrides,
  };
}

function providerSummary(overrides: Partial<ProviderSummary> = {}): ProviderSummary {
  return {
    sources: [],
    outreach: [
      {
        provider: "resend-fallback",
        kind: "outreach",
        mode: "configured",
        channels: ["email"],
        detail: "Outbound delivery adapter is available for campaign dispatch.",
        readiness: "configured",
        requiredSecrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
        missingSecrets: [],
        liveAction: "Email dispatch can use configured delivery after approvals.",
        guardrails: ["Approval required before first outbound action"],
        lastVerifiedAt: now,
        productionBlockers: [],
      },
      {
        provider: "linkedin-outreach",
        kind: "outreach",
        mode: "mock",
        channels: ["linkedin"],
        detail: "LinkedIn remains review-only.",
        readiness: "guarded",
        requiredSecrets: [],
        missingSecrets: [],
        liveAction: "Review-only drafting; no automated social-platform sending.",
        guardrails: ["No auto-connect", "No auto-DM"],
        lastVerifiedAt: now,
        productionBlockers: [
          "LinkedIn remains review-gated; auto-connect or auto-DM is not supported.",
        ],
      },
    ],
    voice: [
      {
        provider: "twilio-voice",
        kind: "voice",
        mode: "configured",
        channels: ["call"],
        detail: "Voice dispatch adapter is available for AI call workflows.",
        readiness: "configured",
        requiredSecrets: [
          "TWILIO_ACCOUNT_SID",
          "TWILIO_AUTH_TOKEN",
          "TWILIO_FROM_NUMBER",
          "TWILIO_TWIML_URL",
        ],
        missingSecrets: [],
        liveAction: "Voice calls can dispatch after call review and suppression checks.",
        guardrails: ["Call review posture"],
        lastVerifiedAt: now,
        productionBlockers: [],
      },
    ],
    billing: [],
    webhooks: [],
    chat: [],
    summary: {
      configured: 2,
      guarded: 1,
      blocked: 0,
      disabled: 0,
      productionBlockers: [],
    },
    ...overrides,
  };
}

function channelEntitlement(planKey: string, channel: "email" | "call" | "linkedin" | "sms") {
  return evaluateChannelEntitlement({
    planKey,
    subscriptionStatus: "active",
    channel,
    includedChannels: getPlanIncludedChannels(planKey),
  });
}

function usage(metric: "outreach_dispatches" | "voice_calls" | "provider_cost_cents") {
  return evaluateUsageEntitlement({
    metric,
    planKey: "pro",
    subscriptionStatus: "active",
    currentUsage: 10,
    usageLimit: 100,
    requestedQuantity: 1,
    enforceLimit: true,
  });
}

describe("outbound channel readiness", () => {
  it("shows email and voice as live-ready while SMS stays roadmap", () => {
    const response = outboundChannelReadinessResponseSchema.parse(
      buildOutboundChannelReadiness({
        dashboard: dashboard(),
        providers: providerSummary(),
        channelEntitlements: {
          email: channelEntitlement("pro", "email"),
          call: channelEntitlement("pro", "call"),
          linkedin: channelEntitlement("pro", "linkedin"),
          sms: channelEntitlement("pro", "sms"),
        },
        usage: {
          outreachDispatch: usage("outreach_dispatches"),
          voiceCall: usage("voice_calls"),
          emailProviderCost: usage("provider_cost_cents"),
          voiceProviderCost: usage("provider_cost_cents"),
        },
        generatedAt: now,
      }),
    );

    expect(response).toMatchObject({
      surface: "outbound-channel-readiness",
      posture: "guarded",
      summary: {
        readyChannels: ["email", "call"],
        blockedChannels: ["linkedin"],
        roadmapChannels: ["sms"],
        liveDispatchChannels: ["email", "call"],
      },
    });
    expect(response.channels.find((channel) => channel.channel === "sms"))
      .toMatchObject({
        status: "roadmap",
        liveDispatchImplemented: false,
      });
    expect(response.unavailableClaims[0]).toContain("Live SMS dispatch");
  });

  it("keeps social review-only and SMS roadmap even when future readiness flags are declared", () => {
    const response = buildOutboundChannelReadiness({
      dashboard: dashboard({
        subscription: {
          planKey: "elite",
          status: "active",
          seats: 10,
          usageLimit: 20000,
          monthlyUsage: 120,
        },
      }),
      providers: providerSummary(),
      channelEntitlements: {
        email: channelEntitlement("elite", "email"),
        call: channelEntitlement("elite", "call"),
        linkedin: channelEntitlement("elite", "linkedin"),
        sms: channelEntitlement("elite", "sms"),
      },
      usage: {
        outreachDispatch: usage("outreach_dispatches"),
        voiceCall: usage("voice_calls"),
        emailProviderCost: usage("provider_cost_cents"),
        voiceProviderCost: usage("provider_cost_cents"),
      },
      config: {
        smsProviderConfigured: true,
        smsConsentPolicyConfigured: true,
        smsOptOutConfigured: true,
        smsCostCurveConfigured: true,
        socialProviderConfigured: true,
        socialPlatformPolicyConfigured: true,
        socialHumanReviewConfigured: true,
        socialCostCurveConfigured: true,
      },
      generatedAt: now,
    });

    expect(response.summary.reviewOnlyChannels).toEqual(["linkedin"]);
    expect(response.channels.find((channel) => channel.channel === "linkedin"))
      .toMatchObject({
        status: "needs_review",
        liveDispatchImplemented: false,
        blockers: [],
      });
    expect(response.channels.find((channel) => channel.channel === "sms"))
      .toMatchObject({
        status: "roadmap",
        blockers: ["Plan channel", "Live SMS dispatch endpoint"],
      });
  });
});
