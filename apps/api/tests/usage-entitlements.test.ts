import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("../src/storage");
  vi.unstubAllEnvs();
});

async function loadAppWithStorage(storage: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock("../src/storage", () => ({
    createStorageAccessContext: vi.fn(() => undefined),
    getStorage: vi.fn(async () => storage),
  }));

  const { createApp } = await import("../src/app");
  return createApp();
}

function allowedChannelEntitlement(channel = "email") {
  return {
    allowed: true,
    reason: `${channel} channel is available.`,
    channel,
    planKey: "pro",
    subscriptionStatus: "active",
    includedChannels: ["email", "call"],
  };
}

function stubSourceProviderGovernanceConfigured() {
  vi.stubEnv("SOURCE_PROVIDER_TERMS_POLICY_CONFIGURED", "true");
  vi.stubEnv("SOURCE_PROVIDER_RATE_LIMIT_POLICY_CONFIGURED", "true");
  vi.stubEnv("SOURCE_PROVIDER_CONSENT_POLICY_CONFIGURED", "true");
  vi.stubEnv("SOURCE_PROVIDER_INVOICE_RECONCILIATION_CONFIGURED", "true");
  vi.stubEnv("SOURCE_PROVIDER_QUALITY_GOVERNANCE_CONFIGURED", "true");
}

describe("usage entitlement routes", () => {
  it("blocks source runs when the lead plan limit is exhausted", async () => {
    const runLeadSource = vi.fn();
    const app = await loadAppWithStorage({
      checkUsageEntitlement: vi.fn(async () => ({
        allowed: false,
        reason: "Monthly leads created limit reached for free.",
        metric: "leads_created",
        planKey: "free",
        subscriptionStatus: "trialing",
        currentUsage: 100,
        usageLimit: 100,
        requestedQuantity: 1,
        remainingQuantity: 0,
      })),
      runLeadSource,
    });

    const response = await app.request("/v1/leads/source-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        source: "website-crawler",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: "Monthly leads created limit reached for free.",
      entitlement: {
        allowed: false,
        metric: "leads_created",
        remainingQuantity: 0,
      },
      upgrade: {
        planKey: "starter",
        checkoutPath: "/get-started?plan=starter",
      },
    });
    expect(runLeadSource).not.toHaveBeenCalled();
  });

  it("blocks configured source runs when source-provider governance is incomplete", async () => {
    vi.stubEnv("SOURCE_PROVIDER_API_KEY", "secret-value");
    const runLeadSource = vi.fn();
    const checkUsageEntitlement = vi.fn(async (metric: string, requestedQuantity = 1) => ({
      allowed: true,
      reason: "Usage entitlement available.",
      metric,
      planKey: "pro",
      subscriptionStatus: "active",
      currentUsage: 0,
      usageLimit: 5000,
      requestedQuantity,
      remainingQuantity: 5000,
    }));
    const app = await loadAppWithStorage({
      checkUsageEntitlement,
      runLeadSource,
    });

    const response = await app.request("/v1/leads/source-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        source: "website-crawler",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      code: "source_provider_governance_required",
      providerMode: "configured",
      sources: ["website-crawler"],
    });
    expect(body.missingControls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "provider_terms_policy",
          env: "SOURCE_PROVIDER_TERMS_POLICY_CONFIGURED",
        }),
        expect.objectContaining({
          id: "rate_limit_policy",
          env: "SOURCE_PROVIDER_RATE_LIMIT_POLICY_CONFIGURED",
        }),
        expect.objectContaining({
          id: "consent_policy",
          env: "SOURCE_PROVIDER_CONSENT_POLICY_CONFIGURED",
        }),
      ]),
    );
    expect(checkUsageEntitlement).toHaveBeenCalledWith("leads_created", 1);
    expect(checkUsageEntitlement).not.toHaveBeenCalledWith(
      "provider_cost_cents",
      expect.any(Number),
    );
    expect(runLeadSource).not.toHaveBeenCalled();
  });

  it("blocks configured multi-source discovery when source-provider governance is incomplete", async () => {
    vi.stubEnv("SOURCE_PROVIDER_API_KEY", "secret-value");
    const runLeadSource = vi.fn();
    const checkUsageEntitlement = vi.fn(async (metric: string, requestedQuantity = 1) => ({
      allowed: true,
      reason: "Usage entitlement available.",
      metric,
      planKey: "pro",
      subscriptionStatus: "active",
      currentUsage: 0,
      usageLimit: 5000,
      requestedQuantity,
      remainingQuantity: 5000,
    }));
    const app = await loadAppWithStorage({
      getSourcePlan: vi.fn(async () => ({
        id: "plan_1",
        summary: "Find leads from configured source providers.",
        sources: ["website", "search"],
        contactTargets: ["email"],
        searchTerms: ["b2b founders"],
        rationale: "Use bounded source evidence before outreach.",
      })),
      checkUsageEntitlement,
      runLeadSource,
    });

    const response = await app.request("/v1/leads/discover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        limitSources: 2,
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      code: "source_provider_governance_required",
      providerMode: "configured",
      sources: ["website-crawler", "search-intelligence"],
    });
    expect(checkUsageEntitlement).toHaveBeenCalledWith("leads_created", 2);
    expect(checkUsageEntitlement).not.toHaveBeenCalledWith(
      "provider_cost_cents",
      expect.any(Number),
    );
    expect(runLeadSource).not.toHaveBeenCalled();
  });

  it("blocks configured source runs when the provider-cost budget is exhausted", async () => {
    vi.stubEnv("SOURCE_PROVIDER_API_KEY", "secret-value");
    stubSourceProviderGovernanceConfigured();
    const runLeadSource = vi.fn();
    const checkUsageEntitlement = vi.fn(async (metric: string, requestedQuantity = 1) => {
      if (metric === "provider_cost_cents") {
        return {
          allowed: false,
          reason: "Monthly provider cost budget limit reached for free.",
          metric: "provider_cost_cents",
          planKey: "free",
          subscriptionStatus: "trialing",
          currentUsage: 0,
          usageLimit: 0,
          requestedQuantity,
          remainingQuantity: 0,
        };
      }

      return {
        allowed: true,
        reason: "Usage entitlement available.",
        metric,
        planKey: "free",
        subscriptionStatus: "trialing",
        currentUsage: 0,
        usageLimit: 100,
        requestedQuantity,
        remainingQuantity: 100,
      };
    });
    const app = await loadAppWithStorage({
      checkUsageEntitlement,
      runLeadSource,
    });

    const response = await app.request("/v1/leads/source-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        source: "website-crawler",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: "Monthly provider cost budget limit reached for free.",
      entitlement: {
        allowed: false,
        metric: "provider_cost_cents",
        requestedQuantity: 50,
      },
      upgrade: {
        planKey: "starter",
        checkoutPath: "/get-started?plan=starter",
      },
    });
    expect(checkUsageEntitlement).toHaveBeenCalledWith("leads_created", 1);
    expect(checkUsageEntitlement).toHaveBeenCalledWith("provider_cost_cents", 50);
    expect(runLeadSource).not.toHaveBeenCalled();
  });

  it("blocks configured multi-source discovery when combined source-provider budget is exhausted", async () => {
    vi.stubEnv("SOURCE_PROVIDER_API_KEY", "secret-value");
    stubSourceProviderGovernanceConfigured();
    const runLeadSource = vi.fn();
    const checkUsageEntitlement = vi.fn(async (metric: string, requestedQuantity = 1) => {
      if (metric === "provider_cost_cents") {
        return {
          allowed: false,
          reason: "Monthly provider cost budget limit reached for starter.",
          metric: "provider_cost_cents",
          planKey: "starter",
          subscriptionStatus: "active",
          currentUsage: 1450,
          usageLimit: 1500,
          requestedQuantity,
          remainingQuantity: 50,
        };
      }

      return {
        allowed: true,
        reason: "Usage entitlement available.",
        metric,
        planKey: "starter",
        subscriptionStatus: "active",
        currentUsage: 0,
        usageLimit: 1000,
        requestedQuantity,
        remainingQuantity: 1000,
      };
    });
    const app = await loadAppWithStorage({
      getSourcePlan: vi.fn(async () => ({
        id: "plan_1",
        summary: "Find leads from configured source providers.",
        sources: ["website", "search"],
        contactTargets: ["email"],
        searchTerms: ["b2b founders"],
        rationale: "Use bounded source evidence before outreach.",
      })),
      checkUsageEntitlement,
      runLeadSource,
    });

    const response = await app.request("/v1/leads/discover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        limitSources: 2,
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: "Monthly provider cost budget limit reached for starter.",
      entitlement: {
        allowed: false,
        metric: "provider_cost_cents",
        requestedQuantity: 125,
      },
    });
    expect(checkUsageEntitlement).toHaveBeenCalledWith("leads_created", 2);
    expect(checkUsageEntitlement).toHaveBeenCalledWith("provider_cost_cents", 125);
    expect(runLeadSource).not.toHaveBeenCalled();
  });

  it("passes configured source provider cost into source-run storage when budget is available", async () => {
    vi.stubEnv("SOURCE_PROVIDER_API_KEY", "secret-value");
    stubSourceProviderGovernanceConfigured();
    const runLeadSource = vi.fn(async () => ({
      run: {
        id: "run_1",
        source: "website-crawler",
        status: "completed",
        providerMode: "configured",
      },
      accepted: [],
      rejected: [],
    }));
    const checkUsageEntitlement = vi.fn(async (metric: string, requestedQuantity = 1) => ({
      allowed: true,
      reason: "Usage entitlement available.",
      metric,
      planKey: "pro",
      subscriptionStatus: "active",
      currentUsage: 0,
      usageLimit: 5000,
      requestedQuantity,
      remainingQuantity: 5000,
    }));
    const app = await loadAppWithStorage({
      checkUsageEntitlement,
      runLeadSource,
    });

    const response = await app.request("/v1/leads/source-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        source: "website-crawler",
      }),
    });

    expect(response.status).toBe(201);
    expect(checkUsageEntitlement).toHaveBeenCalledWith("leads_created", 1);
    expect(checkUsageEntitlement).toHaveBeenCalledWith("provider_cost_cents", 50);
    expect(runLeadSource).toHaveBeenCalledWith("website-crawler", {
      providerMode: "configured",
      providerCostCents: 50,
    });
  });

  it("blocks campaign dispatch before creating provider work when outreach quota is exhausted", async () => {
    const runCampaign = vi.fn();
    const app = await loadAppWithStorage({
      getCampaign: vi.fn(async () => ({
        id: "camp_1",
        channel: "email",
      })),
      checkChannelEntitlement: vi.fn(async () => allowedChannelEntitlement("email")),
      checkUsageEntitlement: vi.fn(async () => ({
        allowed: false,
        reason: "Monthly outreach dispatches limit reached for starter.",
        metric: "outreach_dispatches",
        planKey: "starter",
        subscriptionStatus: "active",
        currentUsage: 100,
        usageLimit: 100,
        requestedQuantity: 1,
        remainingQuantity: 0,
      })),
      runCampaign,
    });

    const response = await app.request("/v1/campaigns/camp_1/dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: "Monthly outreach dispatches limit reached for starter.",
      entitlement: {
        allowed: false,
        metric: "outreach_dispatches",
        remainingQuantity: 0,
      },
      upgrade: {
        planKey: "pro",
      },
    });
    expect(runCampaign).not.toHaveBeenCalled();
  });

  it("blocks unsupported campaign dispatch channels before quota or provider work", async () => {
    const checkChannelEntitlement = vi.fn();
    const checkUsageEntitlement = vi.fn();
    const runCampaign = vi.fn();
    const app = await loadAppWithStorage({
      getCampaign: vi.fn(async () => ({
        id: "camp_1",
        channel: "call",
      })),
      checkChannelEntitlement,
      checkUsageEntitlement,
      runCampaign,
    });

    const response = await app.request("/v1/campaigns/camp_1/dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: "campaign_dispatch_channel_unsupported",
      channel: "call",
    });
    expect(body.error).toContain("/v1/calls/dispatch");
    expect(checkChannelEntitlement).not.toHaveBeenCalled();
    expect(checkUsageEntitlement).not.toHaveBeenCalled();
    expect(runCampaign).not.toHaveBeenCalled();
  });

  it("blocks unsupported campaign run channels before creating outreach activity", async () => {
    const checkChannelEntitlement = vi.fn();
    const runCampaign = vi.fn();
    const app = await loadAppWithStorage({
      getCampaign: vi.fn(async () => ({
        id: "camp_1",
        channel: "sms",
      })),
      checkChannelEntitlement,
      runCampaign,
    });

    const response = await app.request("/v1/campaigns/camp_1/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: "campaign_dispatch_channel_unsupported",
      channel: "sms",
    });
    expect(body.error).toContain("SMS campaign dispatch is not implemented");
    expect(checkChannelEntitlement).not.toHaveBeenCalled();
    expect(runCampaign).not.toHaveBeenCalled();
  });

  it("blocks voice dispatch before creating a call when voice quota is exhausted", async () => {
    const createCall = vi.fn();
    const app = await loadAppWithStorage({
      checkChannelEntitlement: vi.fn(async () => allowedChannelEntitlement("call")),
      getLead: vi.fn(async () => ({
        id: "lead_1",
        email: "buyer@example.com",
        phone: "+15551234567",
        score: 95,
      })),
      checkUsageEntitlement: vi.fn(async () => ({
        allowed: false,
        reason: "Monthly voice calls limit reached for starter.",
        metric: "voice_calls",
        planKey: "starter",
        subscriptionStatus: "active",
        currentUsage: 0,
        usageLimit: 0,
        requestedQuantity: 1,
        remainingQuantity: 0,
      })),
      createCall,
    });

    const response = await app.request("/v1/calls/dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId: "lead_1",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: "Monthly voice calls limit reached for starter.",
      entitlement: {
        allowed: false,
        metric: "voice_calls",
        remainingQuantity: 0,
      },
      upgrade: {
        planKey: "pro",
      },
    });
    expect(createCall).not.toHaveBeenCalled();
  });

  it("blocks AI worker task proposals when the plan proposal quota is exhausted", async () => {
    const createAiWorkerTaskProposal = vi.fn();
    const app = await loadAppWithStorage({
      checkUsageEntitlement: vi.fn(async () => ({
        allowed: false,
        reason: "Monthly AI worker task proposals limit reached for free.",
        metric: "ai_worker_task_proposals",
        planKey: "free",
        subscriptionStatus: "trialing",
        currentUsage: 0,
        usageLimit: 0,
        requestedQuantity: 1,
        remainingQuantity: 0,
      })),
      createAiWorkerTaskProposal,
    });

    const response = await app.request("/v1/ai-workers/tasks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        workerId: "worker_1",
        title: "Prepare governed source batch",
        detail: "Create a bounded worker task proposal for operator review.",
        proposedAction: "Research source evidence and wait for approval.",
        riskLevel: "medium",
        expectedCostCents: 1500,
        requiredRole: "admin",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: "Monthly AI worker task proposals limit reached for free.",
      entitlement: {
        allowed: false,
        metric: "ai_worker_task_proposals",
        remainingQuantity: 0,
      },
      upgrade: {
        planKey: "starter",
        checkoutPath: "/get-started?plan=starter",
      },
    });
    expect(createAiWorkerTaskProposal).not.toHaveBeenCalled();
  });

  it("blocks AI worker dry-run result capture when the plan AI execution budget is exhausted", async () => {
    const completeAiWorkerRun = vi.fn();
    const app = await loadAppWithStorage({
      checkUsageEntitlement: vi.fn(async () => ({
        allowed: false,
        reason: "Monthly AI worker execution budget limit reached for starter.",
        metric: "ai_worker_execution_cents",
        planKey: "starter",
        subscriptionStatus: "active",
        currentUsage: 2500,
        usageLimit: 2500,
        requestedQuantity: 1200,
        remainingQuantity: 0,
      })),
      completeAiWorkerRun,
    });

    const response = await app.request("/v1/ai-workers/runs/run_1/result", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        resultSummary: "Dry-run result should not be recorded after budget exhaustion.",
        actualCostCents: 1200,
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: "Monthly AI worker execution budget limit reached for starter.",
      entitlement: {
        allowed: false,
        metric: "ai_worker_execution_cents",
        remainingQuantity: 0,
      },
      upgrade: {
        planKey: "pro",
        checkoutPath: "/get-started?plan=pro",
      },
    });
    expect(completeAiWorkerRun).not.toHaveBeenCalled();
  });

  it("blocks campaign creation when the outbound channel is not included in the plan", async () => {
    const createCampaign = vi.fn();
    const app = await loadAppWithStorage({
      checkChannelEntitlement: vi.fn(async () => ({
        allowed: false,
        reason: "LinkedIn channel is not included in starter. Upgrade or choose an included channel.",
        channel: "linkedin",
        planKey: "starter",
        subscriptionStatus: "active",
        includedChannels: ["email"],
      })),
      createCampaign,
    });

    const response = await app.request("/v1/campaigns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "LinkedIn nurture",
        channel: "linkedin",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: "LinkedIn channel is not included in starter. Upgrade or choose an included channel.",
      entitlement: {
        allowed: false,
        channel: "linkedin",
      },
      upgrade: {
        planKey: "elite",
        checkoutPath: "/get-started?plan=elite",
      },
    });
    expect(createCampaign).not.toHaveBeenCalled();
  });

  it("blocks voice dispatch before lead lookup when calls are not included in the plan", async () => {
    const getLead = vi.fn();
    const createCall = vi.fn();
    const app = await loadAppWithStorage({
      checkChannelEntitlement: vi.fn(async () => ({
        allowed: false,
        reason: "Call channel is not included in starter. Upgrade or choose an included channel.",
        channel: "call",
        planKey: "starter",
        subscriptionStatus: "active",
        includedChannels: ["email"],
      })),
      getLead,
      createCall,
    });

    const response = await app.request("/v1/calls/dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId: "lead_1",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: "Call channel is not included in starter. Upgrade or choose an included channel.",
      entitlement: {
        allowed: false,
        channel: "call",
      },
      upgrade: {
        planKey: "pro",
        checkoutPath: "/get-started?plan=pro",
      },
    });
    expect(getLead).not.toHaveBeenCalled();
    expect(createCall).not.toHaveBeenCalled();
  });

  it("blocks configured campaign dispatch when the provider-cost budget is exhausted", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.test.local");
    const runCampaign = vi.fn();
    const checkUsageEntitlement = vi.fn(async (metric: string) => {
      if (metric === "provider_cost_cents") {
        return {
          allowed: false,
          reason: "Monthly provider cost budget limit reached for free.",
          metric: "provider_cost_cents",
          planKey: "free",
          subscriptionStatus: "trialing",
          currentUsage: 0,
          usageLimit: 0,
          requestedQuantity: 1,
          remainingQuantity: 0,
        };
      }

      return {
        allowed: true,
        reason: "Usage entitlement available.",
        metric,
        planKey: "free",
        subscriptionStatus: "trialing",
        currentUsage: 0,
        usageLimit: 100,
        requestedQuantity: 1,
        remainingQuantity: 100,
      };
    });
    const app = await loadAppWithStorage({
      getCampaign: vi.fn(async () => ({
        id: "camp_1",
        channel: "email",
      })),
      checkChannelEntitlement: vi.fn(async () => allowedChannelEntitlement("email")),
      checkUsageEntitlement,
      runCampaign,
    });

    const response = await app.request("/v1/campaigns/camp_1/dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: "Monthly provider cost budget limit reached for free.",
      entitlement: {
        allowed: false,
        metric: "provider_cost_cents",
        requestedQuantity: 1,
      },
      upgrade: {
        planKey: "starter",
        checkoutPath: "/get-started?plan=starter",
      },
    });
    expect(checkUsageEntitlement).toHaveBeenCalledWith("provider_cost_cents", 1);
    expect(runCampaign).not.toHaveBeenCalled();
  });

  it("blocks configured voice dispatch when the provider-cost budget is exhausted", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_test");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token");
    vi.stubEnv("TWILIO_FROM_NUMBER", "+15550001111");
    vi.stubEnv("TWILIO_TWIML_URL", "https://example.com/twiml");
    const createCall = vi.fn();
    const checkUsageEntitlement = vi.fn(async (metric: string, requestedQuantity = 1) => {
      if (metric === "provider_cost_cents") {
        return {
          allowed: false,
          reason: "Monthly provider cost budget limit reached for free.",
          metric: "provider_cost_cents",
          planKey: "free",
          subscriptionStatus: "trialing",
          currentUsage: 0,
          usageLimit: 0,
          requestedQuantity,
          remainingQuantity: 0,
        };
      }

      return {
        allowed: true,
        reason: "Usage entitlement available.",
        metric,
        planKey: "free",
        subscriptionStatus: "trialing",
        currentUsage: 0,
        usageLimit: 100,
        requestedQuantity,
        remainingQuantity: 100,
      };
    });
    const app = await loadAppWithStorage({
      checkChannelEntitlement: vi.fn(async () => allowedChannelEntitlement("call")),
      getLead: vi.fn(async () => ({
        id: "lead_1",
        email: "buyer@example.com",
        phone: "+15551234567",
        score: 95,
      })),
      checkSuppression: vi.fn(async () => ({
        suppressed: false,
        matchedSuppression: null,
        detail: "No suppression matched.",
      })),
      checkUsageEntitlement,
      createCall,
    });

    const response = await app.request("/v1/calls/dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId: "lead_1",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: "Monthly provider cost budget limit reached for free.",
      entitlement: {
        allowed: false,
        metric: "provider_cost_cents",
        requestedQuantity: 25,
      },
      upgrade: {
        planKey: "starter",
        checkoutPath: "/get-started?plan=starter",
      },
    });
    expect(checkUsageEntitlement).toHaveBeenCalledWith("provider_cost_cents", 25);
    expect(createCall).not.toHaveBeenCalled();
  });
});
