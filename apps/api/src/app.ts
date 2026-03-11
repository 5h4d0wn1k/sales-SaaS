import { Hono } from "hono";
import {
  approveCampaignInputSchema,
  campaignPolicyInputSchema,
  createCallInputSchema,
  createCampaignInputSchema,
  createLeadInputSchema,
  createMeetingInputSchema,
  dashboardResponseSchema,
  dashboardSnapshot,
  discoverLeadsInputSchema,
  dispatchCallInputSchema,
  dispatchCampaignInputSchema,
  evaluateCampaignPolicy,
  onboardingMessageInputSchema,
  onboardingSessionInputSchema,
  platformModules,
  reviewCallInputSchema,
  runCampaignInputSchema,
  sourcePlanInputSchema,
  sourceRunInputSchema,
  updateMeetingInputSchema,
} from "@sales/shared";
import {
  chooseSourceProviders,
  dispatchCampaignActivity,
  dispatchVoiceCall,
  getProviderSummary,
  summarizeSourceRun,
} from "./providers";
import { getStorage } from "./storage";
import { verifyResendWebhook, verifyTwilioVoiceWebhook } from "./webhooks";
import { billingRoutes } from "./routes/billing";

export function createApp() {
  const app = new Hono();

  app.get("/health", async (c) => {
    const storage = await getStorage();
    return c.json({
      status: "ok",
      service: "sales-api",
      storage: storage.mode,
    });
  });

  app.get("/v1/foundation/summary", (c) => {
    return c.json({
      product: "Sales AaaS Platform",
      modules: platformModules,
      snapshot: dashboardSnapshot,
    });
  });

  app.get("/v1/dashboard", async (c) => {
    const storage = await getStorage();
    return c.json(dashboardResponseSchema.parse(await storage.getDashboard()));
  });

  app.get("/v1/providers", (c) => {
    return c.json(getProviderSummary());
  });

  app.post("/v1/webhooks/resend", async (c) => {
    const storage = await getStorage();
    const rawBody = await c.req.text();
    const result = await verifyResendWebhook(rawBody, c.req.raw.headers);
    const event = await storage.recordProviderEvent({
      provider: "resend",
      eventType: result.eventType,
      verified: result.verified,
      detail: result.detail,
      payload: result.payload,
    });

    if (result.verified) {
      await storage.applyProviderEvent({
        provider: "resend",
        eventType: result.eventType,
        payload: result.payload,
      });
    }

    return c.json(event, result.verified ? 200 : 400);
  });

  app.post("/v1/webhooks/twilio/voice-status", async (c) => {
    const storage = await getStorage();
    const rawBody = await c.req.text();
    const formData = new URLSearchParams(rawBody);
    const result = await verifyTwilioVoiceWebhook(
      c.req.url,
      formData,
      c.req.header("x-twilio-signature") ?? null,
    );
    const event = await storage.recordProviderEvent({
      provider: "twilio",
      eventType: result.eventType,
      verified: result.verified,
      detail: result.detail,
      payload: result.payload,
    });

    if (result.verified) {
      await storage.applyProviderEvent({
        provider: "twilio",
        eventType: result.eventType,
        payload: result.payload,
      });
    }

    return c.json(event, result.verified ? 200 : 400);
  });

  app.post("/v1/onboarding/session", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = onboardingSessionInputSchema.parse(payload);
    return c.json(await storage.createOnboardingSession(input), 201);
  });

  app.post("/v1/onboarding/session/:id/message", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = onboardingMessageInputSchema.parse(payload);
    const session = await storage.appendOnboardingMessage(c.req.param("id"), input);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json(session);
  });

  app.post("/v1/onboarding/session/:id/finalize", async (c) => {
    const storage = await getStorage();
    const session = await storage.finalizeOnboarding(c.req.param("id"));

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json(session);
  });

  app.get("/v1/onboarding/profile", async (c) => {
    const storage = await getStorage();
    return c.json({
      session: (await storage.getDashboard()).onboarding,
      profile: await storage.getBusinessProfile(),
    });
  });

  app.post("/v1/leads", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = createLeadInputSchema.parse(payload);
    return c.json(await storage.createLead(input), 201);
  });

  app.get("/v1/leads", async (c) => {
    const storage = await getStorage();
    return c.json(await storage.getLeads());
  });

  app.get("/v1/leads/:id", async (c) => {
    const storage = await getStorage();
    const lead = await storage.getLead(c.req.param("id"));
    if (!lead) {
      return c.json({ error: "Lead not found" }, 404);
    }

    return c.json(lead);
  });

  app.post("/v1/leads/search-plan", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    sourcePlanInputSchema.parse(payload);
    return c.json(await storage.getSourcePlan());
  });

  app.post("/v1/leads/source-run", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = sourceRunInputSchema.parse(payload);
    return c.json(await storage.runLeadSource(input.source), 201);
  });

  app.post("/v1/leads/discover", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = discoverLeadsInputSchema.parse(payload);
    const sourcePlan = await storage.getSourcePlan();
    const adapters = chooseSourceProviders(sourcePlan, input.limitSources);

    const runs = [];
    for (const adapter of adapters) {
      const result = await storage.runLeadSource(adapter.provider);
      runs.push({
        source: adapter.provider,
        run: result.run,
        accepted: result.accepted,
        rejected: result.rejected,
        summary: summarizeSourceRun(adapter.provider, {
          source: adapter.provider,
          run: result.run,
          accepted: result.accepted,
          rejected: result.rejected,
        }),
      });
    }

    return c.json({
      sourcePlan,
      selectedSources: adapters.map((adapter) => adapter.provider),
      runs,
    });
  });

  app.post("/v1/campaigns", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = createCampaignInputSchema.parse(payload);
    return c.json(await storage.createCampaign(input), 201);
  });

  app.get("/v1/campaigns", async (c) => {
    const storage = await getStorage();
    return c.json(await storage.getCampaigns());
  });

  app.get("/v1/campaigns/:id", async (c) => {
    const storage = await getStorage();
    const campaign = await storage.getCampaign(c.req.param("id"));
    if (!campaign) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    return c.json(campaign);
  });

  app.post("/v1/campaigns/:id/approve", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = approveCampaignInputSchema.parse(payload);
    const campaign = await storage.approveCampaign(c.req.param("id"), input.approvedBy);

    if (!campaign) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    return c.json(campaign);
  });

  app.post("/v1/campaigns/:id/run", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = runCampaignInputSchema.parse(payload);
    const result = await storage.runCampaign(c.req.param("id"), input.approvedBy);

    if (!result) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    return c.json(result);
  });

  app.post("/v1/campaigns/:id/dispatch", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = dispatchCampaignInputSchema.parse(payload);
    const result = await storage.runCampaign(c.req.param("id"), input.approvedBy);

    if (!result) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    const activity = result.activities[0] ?? null;
    const lead = activity ? await storage.getLead(activity.leadId) : null;
    const dispatch = await dispatchCampaignActivity({
      campaign: result.campaign,
      activity,
      lead,
    });

    if (activity && dispatch.externalId !== undefined) {
      await storage.updateOutreachProviderResult(activity.id, {
        provider: dispatch.provider,
        providerMessageId: dispatch.externalId,
        status: dispatch.deliveryStatus,
        detail: dispatch.detail,
      });
    }

    return c.json({
      campaign: result.campaign,
      activity,
      ...dispatch,
    });
  });

  app.get("/v1/campaigns/:id/activity", async (c) => {
    const storage = await getStorage();
    return c.json(await storage.getCampaignActivity(c.req.param("id")));
  });

  app.post("/v1/calls", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = createCallInputSchema.parse(payload);
    const call = await storage.createCall(input);

    if (!call) {
      return c.json({ error: "Lead not found" }, 404);
    }

    return c.json(call, 201);
  });

  app.post("/v1/calls/dispatch", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = dispatchCallInputSchema.parse(payload);
    const call = await storage.createCall({
      leadId: input.leadId,
      provider: input.provider ?? "twilio",
    });

    if (!call) {
      return c.json({ error: "Lead not found" }, 404);
    }

    const lead = await storage.getLead(call.leadId);

    const dispatch = await dispatchVoiceCall({
      call,
      lead,
    });

    if (dispatch.externalId !== undefined) {
      await storage.updateCallProviderResult(call.id, {
        provider: dispatch.provider,
        providerCallId: dispatch.externalId,
        detail: dispatch.detail,
      });
    }

    return c.json({
      call,
      ...dispatch,
    });
  });

  app.get("/v1/calls/:id", async (c) => {
    const storage = await getStorage();
    const call = await storage.getCall(c.req.param("id"));
    if (!call) {
      return c.json({ error: "Call not found" }, 404);
    }

    return c.json(call);
  });

  app.post("/v1/calls/:id/review", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = reviewCallInputSchema.parse(payload);
    const call = await storage.reviewCall(c.req.param("id"), input.approved, input.notes);

    if (!call) {
      return c.json({ error: "Call not found" }, 404);
    }

    return c.json(call);
  });

  app.post("/v1/meetings", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = createMeetingInputSchema.parse(payload);
    const meeting = await storage.createMeeting(input);

    if (!meeting) {
      return c.json({ error: "Lead not found" }, 404);
    }

    return c.json(meeting, 201);
  });

  app.patch("/v1/meetings/:id", async (c) => {
    const storage = await getStorage();
    const payload = await c.req.json();
    const input = updateMeetingInputSchema.parse(payload);
    const meeting = await storage.updateMeeting(c.req.param("id"), input);

    if (!meeting) {
      return c.json({ error: "Meeting not found" }, 404);
    }

    return c.json(meeting);
  });

  app.get("/v1/subscription", async (c) => {
    const storage = await getStorage();
    return c.json((await storage.getDashboard()).subscription);
  });

  app.post("/v1/policies/campaign", async (c) => {
    const payload = await c.req.json();
    const input = campaignPolicyInputSchema.parse(payload);
    return c.json(evaluateCampaignPolicy(input));
  });

  app.route("/v1/billing", billingRoutes);

  return app;
}
