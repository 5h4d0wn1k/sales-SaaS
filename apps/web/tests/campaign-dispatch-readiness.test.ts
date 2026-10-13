import { describe, expect, it } from "vitest";
import type { CampaignRecord, OutboundChannelReadinessResponse } from "@sales/shared";
import { buildCampaignDispatchReadinessGate } from "../lib/campaign-dispatch-readiness";

function campaign(
  overrides: Partial<CampaignRecord> = {},
): CampaignRecord {
  return {
    id: "camp_1",
    name: "Qualified lead first touch",
    channel: "email",
    stage: "approved",
    approved: true,
    firstActionCompleted: false,
    nextActionAt: "Approved by Riya",
    leadsEnrolled: 4,
    ...overrides,
  };
}

function readinessChannel(
  overrides: Partial<OutboundChannelReadinessResponse["channels"][number]> = {},
): OutboundChannelReadinessResponse["channels"][number] {
  return {
    channel: "email",
    label: "Email",
    status: "ready",
    tone: "good",
    liveDispatchImplemented: true,
    entitlementAllowed: true,
    providerConfigured: true,
    costCurveConfigured: true,
    quotaMetric: "outreach_dispatches",
    quotaRemaining: 20,
    detail: "Email can use guarded dispatch.",
    controls: [],
    blockers: [],
    recommendedPlan: null,
    ...overrides,
  };
}

function readiness(
  channels: OutboundChannelReadinessResponse["channels"],
): Pick<OutboundChannelReadinessResponse, "channels"> {
  return { channels };
}

describe("campaign dispatch readiness gate", () => {
  it("allows approved email campaigns only when email is live-ready", () => {
    expect(
      buildCampaignDispatchReadinessGate(
        campaign(),
        readiness([readinessChannel()]),
      ),
    ).toBeNull();
  });

  it("blocks email campaign dispatch when provider readiness is blocked", () => {
    const gate = buildCampaignDispatchReadinessGate(
      campaign(),
      readiness([
        readinessChannel({
          status: "blocked",
          tone: "blocked",
          liveDispatchImplemented: true,
          providerConfigured: false,
          detail: "Email live dispatch is blocked.",
          blockers: ["Email provider"],
        }),
      ]),
    );

    expect(gate).toMatchObject({
      title: "Email dispatch is not live-ready",
      tone: "blocked",
      actionHref: "/settings#provider-readiness",
    });
    expect(gate?.blockerSummary).toContain("Email provider");
  });

  it("keeps LinkedIn campaigns review-only instead of dispatchable", () => {
    const gate = buildCampaignDispatchReadinessGate(
      campaign({ channel: "linkedin" }),
      readiness([
        readinessChannel({
          channel: "linkedin",
          label: "LinkedIn",
          status: "needs_review",
          tone: "warn",
          liveDispatchImplemented: false,
          quotaMetric: null,
          quotaRemaining: null,
          detail: "LinkedIn is available only as a human-reviewed planning lane.",
          blockers: ["Live social dispatch endpoint"],
        }),
      ]),
    );

    expect(gate).toMatchObject({
      title: "LinkedIn dispatch is not live-ready",
      tone: "warn",
      actionHref: "/dashboard#outreach-operations",
    });
  });

  it("routes voice campaigns to the dedicated call workflow even when voice readiness is ready", () => {
    const gate = buildCampaignDispatchReadinessGate(
      campaign({ channel: "call" }),
      readiness([
        readinessChannel({
          channel: "call",
          label: "Voice",
          status: "ready",
          liveDispatchImplemented: true,
          quotaMetric: "voice_calls",
          detail: "Voice calls can dispatch after review.",
        }),
      ]),
    );

    expect(gate).toMatchObject({
      title: "Voice campaigns use the call workflow",
      tone: "warn",
      actionHref: "/dashboard#calls-and-meetings",
    });
  });

  it("fails closed when readiness is unavailable for an approved campaign", () => {
    const gate = buildCampaignDispatchReadinessGate(campaign(), null);

    expect(gate).toMatchObject({
      title: "Channel readiness unavailable",
      tone: "blocked",
    });
  });

  it("does not gate drafts or completed first touches", () => {
    expect(
      buildCampaignDispatchReadinessGate(
        campaign({ approved: false }),
        readiness([]),
      ),
    ).toBeNull();
    expect(
      buildCampaignDispatchReadinessGate(
        campaign({ firstActionCompleted: true }),
        readiness([]),
      ),
    ).toBeNull();
  });
});
