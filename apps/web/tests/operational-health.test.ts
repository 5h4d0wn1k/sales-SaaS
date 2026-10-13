import { describe, expect, it } from "vitest";
import { buildAuditLogResponse, type DashboardResponse } from "@sales/shared";
import { buildOperationalHealth } from "../lib/operational-health";

const baseDashboard = {
  activities: [
    {
      id: "activity_1",
      campaignId: "campaign_1",
      leadId: "lead_1",
      type: "email",
      provider: "resend",
      providerMessageId: "message_1",
      status: "sent",
      subject: "Intro",
      preview: "Short operator-reviewed intro.",
      personalizedFor: "Nina Carter",
    },
  ],
  calls: [
    {
      id: "call_1",
      leadId: "lead_1",
      status: "completed",
      provider: "twilio",
      providerCallId: "call_provider_1",
      summary: "Qualified call completed.",
      transcript: "Operator-reviewed transcript.",
      disposition: "interested",
      reviewRequired: false,
    },
  ],
  campaigns: [
    {
      id: "campaign_1",
      name: "Founder follow-up",
      channel: "email",
      stage: "approved",
      approved: true,
      firstActionCompleted: false,
      nextActionAt: "Ready now",
      leadsEnrolled: 4,
    },
  ],
  meetings: [
    {
      id: "meeting_1",
      leadId: "lead_1",
      status: "scheduled",
      scheduledFor: "2026-06-06T15:00:00.000Z",
      owner: "owner@example.com",
      notes: "Prep before call.",
      dealValueCents: 0,
      dealCurrency: "USD",
    },
  ],
} satisfies Pick<DashboardResponse, "activities" | "calls" | "campaigns" | "meetings">;

const readyAuditLog = buildAuditLogResponse({
  generatedAt: "2026-06-05T12:00:00.000Z",
  events: [
    {
      id: "event_provider_verified",
      organizationId: "org_1",
      actorType: "system",
      actorId: null,
      eventType: "stripe.webhook.received",
      payload: {
        provider: "stripe",
        verified: true,
        status: 200,
        workspaceId: "workspace_1",
        requestId: "req_provider_1",
      },
      createdAt: "2026-06-05T11:59:00.000Z",
    },
    {
      id: "event_api_success",
      organizationId: "org_1",
      actorType: "user",
      actorId: "user_1",
      eventType: "api.request",
      payload: {
        method: "GET",
        path: "/v1/dashboard",
        status: 200,
        workspaceId: "workspace_1",
        requestId: "req_api_1",
        durationMs: 42,
      },
      createdAt: "2026-06-05T11:58:00.000Z",
    },
  ],
});

describe("operational health model", () => {
  it("summarizes clear recent evidence without claiming full observability", () => {
    const health = buildOperationalHealth({
      dashboard: baseDashboard,
      auditLog: readyAuditLog,
      pendingProposalCount: 0,
      highRiskProposalCount: 0,
      canReviewProposals: true,
    });

    expect(health).toMatchObject({
      posture: "good",
      label: "healthy",
      latestEvidenceAt: "2026-06-05T11:59:00.000Z",
    });
    expect(health.metrics).toEqual([
      { label: "Dispatch blockers", value: "0" },
      { label: "Webhook/provider issues", value: "0" },
      { label: "Pending approvals", value: "0" },
      { label: "API failures", value: "0" },
    ]);
    expect(health.guardrails[0]).toContain("recent sanitized");
    expect(health.signals.find((signal) => signal.id === "provider-webhooks")).toMatchObject({
      tone: "good",
      value: "0",
    });
  });

  it("blocks the posture when dispatch gates, webhook failures, approvals, and API failures stack up", () => {
    const auditLog = buildAuditLogResponse({
      generatedAt: "2026-06-05T12:00:00.000Z",
      events: [
        {
          id: "event_provider_unverified",
          organizationId: "org_1",
          actorType: "system",
          actorId: null,
          eventType: "razorpay.webhook.received",
          payload: {
            provider: "razorpay",
            verified: false,
            status: 401,
            workspaceId: "workspace_1",
            requestId: "req_provider_2",
          },
          createdAt: "2026-06-05T11:59:00.000Z",
        },
        {
          id: "event_api_failure",
          organizationId: "org_1",
          actorType: "user",
          actorId: "user_1",
          eventType: "api.request",
          payload: {
            method: "POST",
            path: "/v1/campaigns/campaign_1/dispatch",
            status: 503,
            workspaceId: "workspace_1",
            requestId: "req_api_2",
            durationMs: 91,
          },
          createdAt: "2026-06-05T11:58:00.000Z",
        },
      ],
    });

    const health = buildOperationalHealth({
      dashboard: {
        ...baseDashboard,
        activities: [
          {
            ...baseDashboard.activities[0],
            status: "review_required",
          },
        ],
        calls: [
          {
            ...baseDashboard.calls[0],
            status: "review_required",
            reviewRequired: true,
          },
        ],
      },
      auditLog,
      pendingProposalCount: 2,
      highRiskProposalCount: 1,
      canReviewProposals: false,
    });

    expect(health.posture).toBe("blocked");
    expect(health.metrics).toEqual([
      { label: "Dispatch blockers", value: "2" },
      { label: "Webhook/provider issues", value: "1" },
      { label: "Pending approvals", value: "2" },
      { label: "API failures", value: "1" },
    ]);
    expect(health.signals.map((signal) => [signal.id, signal.tone])).toEqual([
      ["dispatch-review", "blocked"],
      ["provider-webhooks", "blocked"],
      ["approval-queue", "blocked"],
      ["api-failures", "blocked"],
    ]);
  });
});
