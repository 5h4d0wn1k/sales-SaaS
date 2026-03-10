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
      body: JSON.stringify({
        approvedBy: "ops-user",
      }),
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
