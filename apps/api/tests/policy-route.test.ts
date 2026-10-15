import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("sales api flow", () => {
  it("requires approval for the first outbound action", async () => {
    const app = createApp();
    const response = await app.request("/v1/policies/campaign", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        approved: false,
        campaignStage: "draft",
        firstAction: true,
        highRiskChannel: false,
        monthlyUsage: 12,
        planLimit: 100,
      }),
    });
    const result = await response.json();

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("approval");
  });

  it("rejects malformed campaign action JSON before campaign work", async () => {
    const app = createApp();

    for (const path of [
      "/v1/campaigns/campaign_does_not_exist/approve",
      "/v1/campaigns/campaign_does_not_exist/run",
      "/v1/campaigns/campaign_does_not_exist/dispatch",
    ] as const) {
      const response = await app.request(path, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{",
      });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result).toMatchObject({
        error: "Invalid JSON payload.",
        code: "invalid_json",
        requestId: expect.any(String),
      });
      expect(response.headers.get("x-request-id")).toBe(result.requestId);
    }
  });

  it("returns a seeded dashboard with onboarding and source data", async () => {
    const app = createApp();
    const response = await app.request("/v1/dashboard");
    const result = await response.json();

    expect(result.workspace.organizationName).toBe("Northstar Labs");
    expect(result.onboarding).toBeTruthy();
    expect(result.sourceRuns.length).toBeGreaterThan(0);
    expect(result.campaigns.length).toBeGreaterThan(0);
  });

  it("finalizes onboarding and creates a source plan", async () => {
    const app = createApp();

    const sessionResponse = await app.request("/v1/onboarding/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ownerName: "Riya",
        businessName: "SignalPilot",
      }),
    });
    const session = await sessionResponse.json();

    await app.request(`/v1/onboarding/session/${session.id}/message`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        content: "We help SaaS founders automate outbound in India and the US using email and calls.",
      }),
    });

    const finalizedResponse = await app.request(`/v1/onboarding/session/${session.id}/finalize`, {
      method: "POST",
    });
    const finalized = await finalizedResponse.json();

    expect(finalized.status).toBe("completed");

    const profileResponse = await app.request("/v1/onboarding/profile");
    const profile = await profileResponse.json();

    expect(profile.profile.targetAudience).toContain("Founder");
  });

  it("runs source discovery and creates a call record", async () => {
    const app = createApp();

    const sourceRunResponse = await app.request("/v1/leads/source-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        source: "search",
      }),
    });
    const sourceRun = await sourceRunResponse.json();
    expect(sourceRun.accepted.length).toBeGreaterThan(0);

    const dashboardResponse = await app.request("/v1/dashboard");
    const dashboard = await dashboardResponse.json();
    const leadId = dashboard.leads[0].id;

    const callResponse = await app.request("/v1/calls", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId,
        provider: "twilio",
      }),
    });
    const call = await callResponse.json();

    expect(call.provider).toBe("twilio");
    expect(call.disposition).toBeTruthy();
  });

  it("returns provider summary and lead discovery plan execution", async () => {
    const app = createApp();

    const providersResponse = await app.request("/v1/providers");
    const providers = await providersResponse.json();
    expect(providers.sources.length).toBeGreaterThan(0);
    expect(providers.outreach.length).toBeGreaterThan(0);

    const discoverResponse = await app.request("/v1/leads/discover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        limitSources: 2,
      }),
    });
    const discover = await discoverResponse.json();

    expect(discover.selectedSources.length).toBeGreaterThan(0);
    expect(discover.runs.length).toBeGreaterThan(0);
  });

  it("dispatches a campaign and a call through provider adapters", async () => {
    const app = createApp();

    const campaignsResponse = await app.request("/v1/campaigns");
    const campaigns = await campaignsResponse.json();
    const campaignId = campaigns[0].id;

    const dispatchCampaignResponse = await app.request(`/v1/campaigns/${campaignId}/dispatch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const dispatchedCampaign = await dispatchCampaignResponse.json();

    expect(dispatchedCampaign.provider).toBeTruthy();
    expect(dispatchedCampaign.deliveryStatus).toBeTruthy();

    const leadsResponse = await app.request("/v1/leads");
    const leads = await leadsResponse.json();

    const dispatchCallResponse = await app.request("/v1/calls/dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId: leads[0].id,
      }),
    });
    const dispatchedCall = await dispatchCallResponse.json();

    expect(dispatchedCall.provider).toBe("twilio-voice");
    expect(dispatchedCall.call.id).toBeTruthy();
  });

  it("creates draft campaigns from qualified leads only", async () => {
    const app = createApp();

    const leadsResponse = await app.request("/v1/leads");
    const leads = await leadsResponse.json();
    const qualifiedLeadCount = leads.filter((lead: any) => lead.status === "qualified").length;

    const createdCampaignResponse = await app.request("/v1/campaigns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Qualified-only draft campaign",
        channel: "email",
      }),
    });
    const createdCampaign = await createdCampaignResponse.json();

    expect(createdCampaignResponse.status).toBe(201);
    expect(createdCampaign.campaign.leadsEnrolled).toBe(qualifiedLeadCount);
    expect(createdCampaign.campaign.approved).toBe(false);
  });

  it("keeps a campaign approved until dispatch acceptance updates customer-facing state", async () => {
    const app = createApp();

    const createdCampaignResponse = await app.request("/v1/campaigns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Dispatch safety campaign",
        channel: "email",
      }),
    });
    const createdCampaign = await createdCampaignResponse.json();
    const campaignId = createdCampaign.campaign.id;

    const leadsBeforeRunResponse = await app.request("/v1/leads");
    const leadsBeforeRun = await leadsBeforeRunResponse.json();
    const targetLeadBeforeRun = leadsBeforeRun.find((lead: any) => lead.status === "qualified");
    expect(targetLeadBeforeRun).toBeTruthy();

    const runResponse = await app.request(`/v1/campaigns/${campaignId}/run`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const runResult = await runResponse.json();

    expect(runResult.campaign.stage).toBe("approved");
    expect(runResult.campaign.firstActionCompleted).toBe(false);
    expect(runResult.activities[0].status).toBe("queued");

    const leadsAfterRunResponse = await app.request("/v1/leads");
    const leadsAfterRun = await leadsAfterRunResponse.json();
    expect(leadsAfterRun.find((lead: any) => lead.id === targetLeadBeforeRun.id)?.status).toBe("qualified");

    const dispatchResponse = await app.request(`/v1/campaigns/${campaignId}/dispatch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const dispatched = await dispatchResponse.json();

    expect(dispatched.campaign.stage).toBe("running");
    expect(dispatched.campaign.firstActionCompleted).toBe(true);
    expect(dispatched.campaign.nextActionAt).toMatch(/approved touch/i);
    expect(dispatched.campaign.nextActionAt.toLowerCase()).not.toContain(
      "autonomous",
    );
    expect(["queued", "sent"]).toContain(dispatched.activity.status);

    const leadsAfterDispatchResponse = await app.request("/v1/leads");
    const leadsAfterDispatch = await leadsAfterDispatchResponse.json();
    expect(leadsAfterDispatch.find((lead: any) => lead.id === targetLeadBeforeRun.id)?.status).toBe("contacted");
  });

  it("does not complete calls until dispatch succeeds", async () => {
    const app = createApp();
    const leadsResponse = await app.request("/v1/leads");
    const leads = await leadsResponse.json();
    const targetLead = leads.find((lead: any) => lead.status === "qualified");
    expect(targetLead).toBeTruthy();
    const leadId = targetLead.id;

    const createdCallResponse = await app.request("/v1/calls", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId,
        provider: "twilio",
      }),
    });
    const createdCall = await createdCallResponse.json();

    expect(createdCall.status).toBe("queued");

    const leadsAfterCreateResponse = await app.request("/v1/leads");
    const leadsAfterCreate = await leadsAfterCreateResponse.json();
    expect(leadsAfterCreate.find((lead: any) => lead.id === leadId)?.status).toBe("qualified");

    const dispatchCallResponse = await app.request("/v1/calls/dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId,
      }),
    });
    const dispatchedCall = await dispatchCallResponse.json();

    expect(dispatchedCall.call.status).toBe("completed");

    const leadsAfterDispatchResponse = await app.request("/v1/leads");
    const leadsAfterDispatch = await leadsAfterDispatchResponse.json();
    const updatedLead = leadsAfterDispatch.find((lead: any) => lead.id === leadId);
    const lastTouchpoint = String(updatedLead?.lastTouchpoint ?? "");
    expect(updatedLead?.status).toBe("meeting_booked");
    expect(lastTouchpoint).toContain("AI-assisted call");
    expect(lastTouchpoint.toLowerCase()).not.toContain("autonomous");

    const dashboardAfterDispatchResponse = await app.request("/v1/dashboard");
    const dashboardAfterDispatch = await dashboardAfterDispatchResponse.json();
    const assistedMeeting = dashboardAfterDispatch.meetings.find(
      (meeting: any) =>
        meeting.leadId === leadId && meeting.owner === "Guarded AI assistant",
    );
    expect(assistedMeeting).toBeTruthy();
    expect(assistedMeeting?.notes).toContain("AI-assisted call");
    expect(JSON.stringify(assistedMeeting ?? {}).toLowerCase()).not.toContain(
      "autonomous",
    );
  });

  it("moves leads through meeting conversion outcomes", async () => {
    const app = createApp();

    const wonLeadResponse = await app.request("/v1/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fullName: "Priya Raman",
        email: "priya@example.com",
        company: "Northstar Buying Committee",
        source: "manual-conversion-test",
        score: 92,
      }),
    });
    const wonLead = await wonLeadResponse.json();

    const scheduledResponse = await app.request("/v1/meetings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId: wonLead.id,
        scheduledFor: "2026-06-03T10:30:00.000Z",
        owner: "sales-ops",
        notes: "Manual meeting booked from dashboard conversion workflow.",
      }),
    });
    const scheduledMeeting = await scheduledResponse.json();

    expect(scheduledResponse.status).toBe(201);

    const leadsAfterScheduleResponse = await app.request("/v1/leads");
    const leadsAfterSchedule = await leadsAfterScheduleResponse.json();
    expect(leadsAfterSchedule.find((lead: any) => lead.id === wonLead.id)?.status).toBe("meeting_booked");

    const completedResponse = await app.request(`/v1/meetings/${scheduledMeeting.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: "completed",
        notes: "Meeting completed with clear next steps.",
        dealValueCents: 1250000,
        dealCurrency: "USD",
      }),
    });
    const completedMeeting = await completedResponse.json();

    expect(completedResponse.status).toBe(200);
    expect(completedMeeting).toMatchObject({
      status: "completed",
      dealValueCents: 1250000,
      dealCurrency: "USD",
    });

    const leadsAfterCompletedResponse = await app.request("/v1/leads");
    const leadsAfterCompleted = await leadsAfterCompletedResponse.json();
    expect(leadsAfterCompleted.find((lead: any) => lead.id === wonLead.id)?.status).toBe("won");

    const lostLeadResponse = await app.request("/v1/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fullName: "Arjun Mehta",
        email: "arjun@example.com",
        company: "Canceled Opportunity Co",
        source: "manual-conversion-test",
        score: 88,
      }),
    });
    const lostLead = await lostLeadResponse.json();

    const canceledMeetingResponse = await app.request("/v1/meetings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId: lostLead.id,
        scheduledFor: "2026-06-04T10:30:00.000Z",
        owner: "sales-ops",
        notes: "Manual meeting booked from dashboard conversion workflow.",
      }),
    });
    const canceledMeeting = await canceledMeetingResponse.json();

    const canceledResponse = await app.request(`/v1/meetings/${canceledMeeting.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: "canceled",
        notes: "Lead canceled the meeting and declined follow-up.",
      }),
    });

    expect(canceledResponse.status).toBe(200);

    const leadsAfterCanceledResponse = await app.request("/v1/leads");
    const leadsAfterCanceled = await leadsAfterCanceledResponse.json();
    expect(leadsAfterCanceled.find((lead: any) => lead.id === lostLead.id)?.status).toBe("lost");
  });

  it("uses the authenticated actor for campaign approval instead of trusting request input", async () => {
    const app = createApp();

    const campaignsResponse = await app.request("/v1/campaigns");
    const campaigns = await campaignsResponse.json();
    const campaignId = campaigns[0].id;

    const approveResponse = await app.request(`/v1/campaigns/${campaignId}/approve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        approvedBy: "mallory",
      }),
    });
    const approvedCampaign = await approveResponse.json();

    expect(approveResponse.status).toBe(200);
    expect(approvedCampaign.nextActionAt).toContain("Test User");
    expect(approvedCampaign.nextActionAt).not.toContain("mallory");
  });

  it("records unconfigured provider webhooks safely", async () => {
    const app = createApp();

    const resendResponse = await app.request("/v1/webhooks/resend", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        type: "email.delivered",
      }),
    });
    const resendEvent = await resendResponse.json();

    expect(resendResponse.status).toBe(400);
    expect(resendEvent.provider).toBe("resend");
    expect(resendEvent.verified).toBe(false);

    const twilioResponse = await app.request("/v1/webhooks/twilio/voice-status", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        CallStatus: "completed",
        CallSid: "CA123",
      }).toString(),
    });
    const twilioEvent = await twilioResponse.json();

    expect(twilioResponse.status).toBe(400);
    expect(twilioEvent.provider).toBe("twilio");
    expect(twilioEvent.verified).toBe(false);
  });
});
