import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_NAMES = [
  "SMTP_HOST",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "TWILIO_TWIML_URL",
] as const;

const previousEnv = Object.fromEntries(
  ENV_NAMES.map((name) => [name, process.env[name]]),
) as Record<(typeof ENV_NAMES)[number], string | undefined>;

async function loadAppWithProviderEnv(overrides: Partial<Record<(typeof ENV_NAMES)[number], string>>) {
  for (const name of ENV_NAMES) {
    const value = overrides[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }

  vi.resetModules();
  const { createApp } = await import("../src/app");
  return createApp();
}

afterEach(() => {
  for (const name of ENV_NAMES) {
    const value = previousEnv[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }

  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("configured provider dispatch failures", () => {
  it("keeps failed Resend email dispatch review-required without advancing the lead", async () => {
    const providerBody = "raw provider failure body with internal details";
    const fetchMock = vi.fn(async () =>
      new Response(providerBody, {
        status: 503,
        statusText: "Provider Down",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const app = await loadAppWithProviderEnv({
      RESEND_API_KEY: "resend-secret",
      RESEND_FROM_EMAIL: "sales@example.com",
    });

    const createdCampaignResponse = await app.request("/v1/campaigns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Provider failure safety campaign",
        channel: "email",
      }),
    });
    const createdCampaign = await createdCampaignResponse.json();
    const campaignId = createdCampaign.campaign.id;

    const leadsBeforeDispatchResponse = await app.request("/v1/leads");
    const leadsBeforeDispatch = await leadsBeforeDispatchResponse.json();
    const targetLead = leadsBeforeDispatch.find((lead: any) => lead.status === "qualified");
    expect(targetLead).toBeTruthy();

    const dispatchResponse = await app.request(`/v1/campaigns/${campaignId}/dispatch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const dispatch = await dispatchResponse.json();

    expect(dispatchResponse.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(dispatch).toMatchObject({
      provider: "resend-fallback",
      mode: "configured",
      externalId: null,
      deliveryStatus: "review_required",
      providerCostCents: 0,
    });
    expect(dispatch.detail).toContain("Resend email dispatch failed (503)");
    expect(dispatch.detail).not.toContain(providerBody);
    expect(dispatch.campaign.stage).toBe("approved");
    expect(dispatch.campaign.firstActionCompleted).toBe(false);
    expect(dispatch.activity.status).toBe("review_required");

    const leadsAfterDispatchResponse = await app.request("/v1/leads");
    const leadsAfterDispatch = await leadsAfterDispatchResponse.json();
    expect(leadsAfterDispatch.find((lead: any) => lead.id === targetLead.id)?.status).toBe("qualified");
  });

  it("keeps failed Twilio voice dispatch review-required without creating conversion state", async () => {
    const providerBody = "twilio raw response with internal request data";
    const fetchMock = vi.fn(async () =>
      new Response(providerBody, {
        status: 502,
        statusText: "Bad Gateway",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const app = await loadAppWithProviderEnv({
      TWILIO_ACCOUNT_SID: "AC_provider_failure_test",
      TWILIO_AUTH_TOKEN: "twilio-secret",
      TWILIO_FROM_NUMBER: "+15550101010",
      TWILIO_TWIML_URL: "https://example.com/twiml.xml",
    });

    const createdLeadResponse = await app.request("/v1/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fullName: "Morgan Fields",
        email: "morgan@example.com",
        company: "Fieldstone Ops",
        source: "manual-provider-failure-test",
        score: 94,
        phone: "+15550109999",
      }),
    });
    const createdLead = await createdLeadResponse.json();

    const dispatchResponse = await app.request("/v1/calls/dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId: createdLead.id,
      }),
    });
    const dispatch = await dispatchResponse.json();

    expect(dispatchResponse.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.twilio.com/2010-04-01/Accounts/AC_provider_failure_test/Calls.json",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(dispatch).toMatchObject({
      provider: "twilio-voice",
      mode: "configured",
      externalId: null,
      providerCostCents: 0,
    });
    expect(dispatch.detail).toContain("Twilio voice dispatch failed (502)");
    expect(dispatch.detail).not.toContain(providerBody);
    expect(dispatch.call).toMatchObject({
      leadId: createdLead.id,
      status: "review_required",
      provider: "twilio-voice",
      providerCallId: null,
      disposition: "provider_failed",
      reviewRequired: true,
    });

    const leadsAfterDispatchResponse = await app.request("/v1/leads");
    const leadsAfterDispatch = await leadsAfterDispatchResponse.json();
    expect(leadsAfterDispatch.find((lead: any) => lead.id === createdLead.id)?.status).toBe("qualified");
  });
});
