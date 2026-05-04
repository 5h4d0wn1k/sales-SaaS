import { Hono, type Context } from "hono";
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
import { createStorageAccessContext, getStorage } from "./storage";
import { verifyResendWebhook, verifyTwilioVoiceWebhook } from "./webhooks";
import { billingRoutes } from "./routes/billing";
import { authRoutes } from "./routes/auth";
import {
  securityHeadersMiddleware,
  requestIdMiddleware,
  rateLimitMiddleware,
  validateJsonMiddleware,
  requestSizeLimitMiddleware,
  auditLogMiddleware,
} from "./middleware/security";
import { authMiddleware, requireRole, type AuthUser } from "./middleware/auth";

export function createApp() {
  const app = new Hono();
  const allowedOrigins = process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"];
  const storageFor = (c: Context) =>
    getStorage(
      createStorageAccessContext(
        c.get("user") as {
          organizationId?: string | null;
          workspaceId?: string | null;
        } | undefined,
      ),
    );
  const actorNameFor = (c: Context): string => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      throw new Error("Authenticated actor is required");
    }

    return user.name ?? user.email ?? user.id;
  };
  const requiredParam = (c: Context, key: string): string => {
    const value = c.req.param(key);
    if (!value) {
      throw new Error(`Missing route param: ${key}`);
    }

    return value;
  };

  // Global security middleware (order matters)
  app.use("*", requestIdMiddleware);
  app.use("*", securityHeadersMiddleware);
  app.use("*", rateLimitMiddleware);
  app.use("*", validateJsonMiddleware);
  app.use("*", requestSizeLimitMiddleware);
  // Authentication for protected routes
  app.use("*", authMiddleware);
  app.use("*", async (c, next) => {
    if (c.req.path === "/health" || c.req.method === "OPTIONS") {
      return next();
    }

    return auditLogMiddleware(c, next);
  });

  // CORS preflight handler
  app.options("*", async (c) => {
    const origin = c.req.header("Origin");

    if (origin && allowedOrigins.includes(origin)) {
      c.res.headers.set("Access-Control-Allow-Origin", origin);
      c.res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      c.res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      c.res.headers.set("Access-Control-Allow-Credentials", "true");
      c.res.headers.set("Access-Control-Max-Age", "86400");
    }
    return c.text("", 200);
  });

  // Also add CORS headers to all actual responses
  app.use("*", async (c, next) => {
    await next();
    const origin = c.req.header("Origin");

    if (origin && allowedOrigins.includes(origin)) {
      c.res.headers.set("Access-Control-Allow-Origin", origin);
      c.res.headers.set("Access-Control-Allow-Credentials", "true");
      c.res.headers.set("Access-Control-Expose-Headers", "Content-Length, X-Content-Type-Options");
    }
  });

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
    const storage = await storageFor(c);
    return c.json(dashboardResponseSchema.parse(await storage.getDashboard()));
  });

  app.get("/v1/providers", (c) => {
    return c.json(getProviderSummary());
  });

  app.post("/v1/webhooks/resend", async (c) => {
    const storage = await storageFor(c);
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
    const storage = await storageFor(c);
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
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = onboardingSessionInputSchema.parse(payload);
    return c.json(await storage.createOnboardingSession(input), 201);
  });

  app.post("/v1/onboarding/session/:id/message", async (c) => {
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = onboardingMessageInputSchema.parse(payload);
    const session = await storage.appendOnboardingMessage(requiredParam(c, "id"), input);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json(session);
  });

  app.post("/v1/onboarding/session/:id/finalize", async (c) => {
    const storage = await storageFor(c);
    const session = await storage.finalizeOnboarding(requiredParam(c, "id"));

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json(session);
  });

  app.get("/v1/onboarding/profile", async (c) => {
    const storage = await storageFor(c);
    return c.json({
      session: (await storage.getDashboard()).onboarding,
      profile: await storage.getBusinessProfile(),
    });
  });

  app.post("/v1/leads", async (c) => {
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = createLeadInputSchema.parse(payload);
    return c.json(await storage.createLead(input), 201);
  });

  app.get("/v1/leads", async (c) => {
    const storage = await storageFor(c);
    return c.json(await storage.getLeads());
  });

  app.get("/v1/leads/:id", async (c) => {
    const storage = await storageFor(c);
    const lead = await storage.getLead(requiredParam(c, "id"));
    if (!lead) {
      return c.json({ error: "Lead not found" }, 404);
    }

    return c.json(lead);
  });

  app.post("/v1/leads/search-plan", async (c) => {
    const storage = await storageFor(c);
    const payload = await c.req.json();
    sourcePlanInputSchema.parse(payload);
    return c.json(await storage.getSourcePlan());
  });

  app.post("/v1/leads/source-run", async (c) => {
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = sourceRunInputSchema.parse(payload);
    return c.json(await storage.runLeadSource(input.source), 201);
  });

  app.post("/v1/leads/discover", async (c) => {
    const storage = await storageFor(c);
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
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = createCampaignInputSchema.parse(payload);
    return c.json(await storage.createCampaign(input), 201);
  });

  app.get("/v1/campaigns", async (c) => {
    const storage = await storageFor(c);
    return c.json(await storage.getCampaigns());
  });

  app.get("/v1/campaigns/:id", async (c) => {
    const storage = await storageFor(c);
    const campaign = await storage.getCampaign(requiredParam(c, "id"));
    if (!campaign) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    return c.json(campaign);
  });

  app.post("/v1/campaigns/:id/approve", requireRole("owner", "admin"), async (c) => {
    const storage = await storageFor(c);
    const campaignId = requiredParam(c, "id");
    const payload = await c.req.json().catch(() => ({}));
    approveCampaignInputSchema.parse(payload);
    const campaign = await storage.approveCampaign(campaignId, actorNameFor(c));

    if (!campaign) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    return c.json(campaign);
  });

  app.post("/v1/campaigns/:id/run", requireRole("owner", "admin"), async (c) => {
    const storage = await storageFor(c);
    const campaignId = requiredParam(c, "id");
    const payload = await c.req.json().catch(() => ({}));
    runCampaignInputSchema.parse(payload);
    const result = await storage.runCampaign(campaignId, actorNameFor(c));

    if (!result) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    return c.json(result);
  });

  app.post("/v1/campaigns/:id/dispatch", requireRole("owner", "admin"), async (c) => {
    const storage = await storageFor(c);
    const campaignId = requiredParam(c, "id");
    const payload = await c.req.json().catch(() => ({}));
    dispatchCampaignInputSchema.parse(payload);
    const result = await storage.runCampaign(campaignId, actorNameFor(c));

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

    let updatedActivity = activity;
    if (activity && dispatch.externalId !== undefined) {
      updatedActivity = await storage.updateOutreachProviderResult(activity.id, {
        provider: dispatch.provider,
        providerMessageId: dispatch.externalId,
        status: dispatch.deliveryStatus,
        detail: dispatch.detail,
      }) ?? activity;
    }

    const updatedCampaign = await storage.getCampaign(campaignId);

    return c.json({
      campaign: updatedCampaign ?? result.campaign,
      activity: updatedActivity,
      ...dispatch,
    });
  });

  app.get("/v1/campaigns/:id/activity", async (c) => {
    const storage = await storageFor(c);
    return c.json(await storage.getCampaignActivity(requiredParam(c, "id")));
  });

  app.post("/v1/calls", async (c) => {
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = createCallInputSchema.parse(payload);
    const call = await storage.createCall(input);

    if (!call) {
      return c.json({ error: "Lead not found" }, 404);
    }

    return c.json(call, 201);
  });

  app.post("/v1/calls/dispatch", async (c) => {
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = dispatchCallInputSchema.parse(payload);
    const call = await storage.createCall({
      leadId: input.leadId,
      provider: input.provider ?? "twilio",
    });

    if (!call) {
      return c.json({ error: "Lead not found" }, 404);
    }

    if (call.reviewRequired) {
      return c.json({
        call,
        provider: call.provider,
        mode: "mock",
        externalId: null,
        detail: "Call requires operator review before provider dispatch.",
      });
    }

    const lead = await storage.getLead(call.leadId);

    const dispatch = await dispatchVoiceCall({
      call,
      lead,
    });

    let updatedCall = call;
    if (dispatch.externalId !== undefined) {
      updatedCall = await storage.updateCallProviderResult(call.id, {
        provider: dispatch.provider,
        providerCallId: dispatch.externalId,
        detail: dispatch.detail,
      }) ?? call;
    }

    return c.json({
      call: updatedCall,
      ...dispatch,
    });
  });

  app.get("/v1/calls/:id", async (c) => {
    const storage = await storageFor(c);
    const call = await storage.getCall(requiredParam(c, "id"));
    if (!call) {
      return c.json({ error: "Call not found" }, 404);
    }

    return c.json(call);
  });

  app.post("/v1/calls/:id/review", requireRole("owner", "admin"), async (c) => {
    const storage = await storageFor(c);
    const callId = requiredParam(c, "id");
    const payload = await c.req.json();
    const input = reviewCallInputSchema.parse(payload);
    const call = await storage.reviewCall(callId, input.approved, input.notes);

    if (!call) {
      return c.json({ error: "Call not found" }, 404);
    }

    return c.json(call);
  });

  app.post("/v1/meetings", async (c) => {
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = createMeetingInputSchema.parse(payload);
    const meeting = await storage.createMeeting(input);

    if (!meeting) {
      return c.json({ error: "Lead not found" }, 404);
    }

    return c.json(meeting, 201);
  });

  app.patch("/v1/meetings/:id", async (c) => {
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = updateMeetingInputSchema.parse(payload);
    const meeting = await storage.updateMeeting(requiredParam(c, "id"), input);

    if (!meeting) {
      return c.json({ error: "Meeting not found" }, 404);
    }

    return c.json(meeting);
  });

  app.get("/v1/subscription", async (c) => {
    const storage = await storageFor(c);
    return c.json((await storage.getDashboard()).subscription);
  });

  app.post("/v1/policies/campaign", async (c) => {
    const payload = await c.req.json();
    const input = campaignPolicyInputSchema.parse(payload);
    return c.json(evaluateCampaignPolicy(input));
  });

  app.route("/v1/billing", billingRoutes);
  app.route("/v1/auth", authRoutes);

  return app;
}
