import { and, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import {
  db,
  organizations,
  workspaces,
  subscriptions,
  leads,
  campaigns,
  meetings,
  onboardingSessions,
  contactIntakeSubmissions,
  salesBlueprints,
  actionProposals,
  aiWorkers,
  aiWorkerRuns,
  sourcePlans,
  sourceRuns,
  outreachActivities,
  callTasks,
  auditEvents,
  contactSuppressions,
  telegramIntegrations,
  telegramNotificationDeliveries,
  usageEvents,
} from "@sales/database";
import type {
  AiWorker,
  AiWorkerControlPlaneResponse,
  AiWorkerRun,
  CheckSuppressionInput,
  ConfigureTelegramIntegrationInput,
  ContactIntakeRecord,
  ActionProposal,
  ActionProposalStatus,
  AuditLogEvent,
  CompleteAiWorkerRunInput,
  CreateAiWorkerTaskInput,
  CreateActionProposalInput,
  CreateContactIntakeInput,
  CreateSuppressionInput,
  DashboardResponse,
  CreateCallInput,
  CreateCampaignInput,
  CreateLeadInput,
  CreateMeetingInput,
  OnboardingMessageInput,
  OnboardingSessionInput,
  OutboundChannel,
  ProviderEvent,
  SalesBlueprint,
  SourceRunProviderMode,
  SuppressionCheckResponse,
  SuppressionRecord,
  TelegramCommandAudit,
  TelegramCommandResult,
  TelegramIntegration,
  TelegramNotificationDeliveryResponse,
  ReviewActionProposalInput,
  UpdateMeetingInput,
  UpsertSalesBlueprintInput,
  ChannelEntitlementResult,
  UsageEntitlementMetric,
  UsageEntitlementResult,
} from "@sales/shared";
import {
  aiWorkerControlPlaneResponseSchema,
  aiWorkerRunSchema,
  aiWorkerSchema,
  actionProposalSchema,
  contactIntakeRecordSchema,
  evaluateChannelEntitlement,
  evaluateUsageEntitlement,
  getPlanAiWorkerExecutionBudgetCents,
  getPlanAiWorkerTaskProposalLimit,
  getPlanIncludedChannels,
  getPlanOutreachDispatchLimit,
  getPlanProviderCostBudgetCents,
  getPlanVoiceCallLimit,
  normalizeSuppressionContactValue,
  scoreContactIntake,
  salesBlueprintSchema,
  sourceRunSchema,
  telegramCommandResultSchema,
  telegramCommandSchema,
  telegramDefaultAllowedCommands,
  suppressionLookupChannels,
  sanitizeAuditLogEvent,
} from "@sales/shared";
import {
  buildSalesBlueprintFromInput,
  buildSalesBlueprintFromProfile,
  buildSourcePlan,
  DemoStore,
  aiWorkerTaskBlockReason,
  inferProfile,
  personalizedPreview,
} from "./demo-store";
import {
  checkTelegramCommandRateLimit,
  hashTelegramChatId,
  maskTelegramChatId,
  telegramCommandRateLimitConfig,
  type TelegramCommandRateLimitResult,
} from "./telegram";
import { hasOrganizationsTable } from "./storage-readiness";
import {
  findUniqueResendWebhookTarget,
  findUniqueTwilioWebhookTarget,
} from "./provider-event-targets";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TELEGRAM_RATE_LIMIT_CLAIM_EVENT = "telegram.rate_limit.claim";
const AI_ASSISTED_MEETING_BOOKING_SOURCE = "guarded-ai-assistant";
const LEGACY_AUTONOMOUS_MEETING_BOOKING_SOURCE = "autonomous-agent";
const AI_ASSISTED_MEETING_OWNER = "Guarded AI assistant";
const AI_ASSISTED_MEETING_BOOKING_SOURCES = [
  AI_ASSISTED_MEETING_BOOKING_SOURCE,
  LEGACY_AUTONOMOUS_MEETING_BOOKING_SOURCE,
] as const;

type TelegramResolvedIntegration = {
  integration: TelegramIntegration;
  organizationId: string;
  workspaceId: string;
};

type TelegramCommandAuditInput = {
  organizationId?: string | null;
  workspaceId?: string | null;
  integrationId?: string | null;
  command: string;
  chatIdMask: string;
  result: TelegramCommandResult;
  detail: string;
  actor?: string | null;
};

type TelegramNotificationDeliveryClaimInput = {
  workspaceId?: string | null;
  integrationId?: string | null;
  actorId?: string | null;
  notificationType: string;
  chatIdMask: string | null;
  dryRun: boolean;
  targetChatConfigured: boolean;
  targetChatMatchesWorkspace: boolean;
  maxNotificationsPerHour: number;
};

type TelegramNotificationDeliveryClaim = {
  allowed: boolean;
  deliveryId: string | null;
  enforcedLimit: number;
  used: number;
  remaining: number;
  retryAfterSeconds: number;
  windowSeconds: number;
  detail: string;
};

type CompleteTelegramNotificationDeliveryInput = {
  deliveryId: string;
  mode: TelegramNotificationDeliveryResponse["mode"];
  messagePreview: string;
  detail: string;
  guardrails: string[];
};

type AiWorkerRunResultWrite =
  | { run: AiWorkerRun; error?: never; status?: never }
  | { run: null; error: string; status: 404 | 409 };

export interface SalesStorage {
  mode: "memory" | "postgres";
  createContactIntake(
    input: CreateContactIntakeInput,
    metadata?: Record<string, unknown>,
  ): Promise<ContactIntakeRecord>;
  getDashboard(): Promise<DashboardResponse>;
  getLeads(): Promise<ReturnType<DemoStore["getLeads"]>>;
  getLead(id: string): Promise<ReturnType<DemoStore["getLead"]>>;
  listSuppressions(): Promise<SuppressionRecord[]>;
  createSuppression(
    input: CreateSuppressionInput,
    actorId?: string,
  ): Promise<SuppressionRecord>;
  checkSuppression(
    input: CheckSuppressionInput,
  ): Promise<SuppressionCheckResponse>;
  getTelegramIntegration(): Promise<TelegramIntegration>;
  upsertTelegramIntegration(
    input: ConfigureTelegramIntegrationInput,
    actorId?: string,
  ): Promise<TelegramIntegration>;
  resolveTelegramIntegrationByChatIdHash(
    chatIdHash: string,
  ): Promise<TelegramResolvedIntegration | null>;
  claimTelegramWebhookUpdate(
    chatIdHash: string,
    updateId: number | null,
  ): Promise<boolean>;
  claimTelegramCommandRateLimit(
    chatIdHash: string,
  ): Promise<TelegramCommandRateLimitResult>;
  markTelegramIntegrationVerified(
    chatIdHash: string,
  ): Promise<TelegramIntegration | null>;
  disableTelegramIntegration(actorId?: string): Promise<TelegramIntegration>;
  listTelegramCommandAudits(): Promise<TelegramCommandAudit[]>;
  recordTelegramCommandAudit(
    input: TelegramCommandAuditInput,
  ): Promise<TelegramCommandAudit>;
  claimTelegramNotificationDelivery(
    input: TelegramNotificationDeliveryClaimInput,
  ): Promise<TelegramNotificationDeliveryClaim>;
  completeTelegramNotificationDelivery(
    input: CompleteTelegramNotificationDeliveryInput,
  ): Promise<void>;
  createOnboardingSession(
    input: OnboardingSessionInput,
  ): Promise<ReturnType<DemoStore["createOnboardingSession"]>>;
  appendOnboardingMessage(
    id: string,
    input: OnboardingMessageInput,
  ): Promise<ReturnType<DemoStore["appendOnboardingMessage"]>>;
  finalizeOnboarding(
    id: string,
  ): Promise<ReturnType<DemoStore["finalizeOnboarding"]>>;
  getBusinessProfile(): Promise<ReturnType<DemoStore["getBusinessProfile"]>>;
  getSalesBlueprint(): Promise<SalesBlueprint | null>;
  upsertSalesBlueprint(
    input: UpsertSalesBlueprintInput,
    actorId?: string,
  ): Promise<SalesBlueprint>;
  checkUsageEntitlement(
    metric: UsageEntitlementMetric,
    requestedQuantity?: number,
  ): Promise<UsageEntitlementResult>;
  checkChannelEntitlement(
    channel: OutboundChannel,
  ): Promise<ChannelEntitlementResult>;
  listActionProposals(status?: ActionProposalStatus): Promise<ActionProposal[]>;
  createActionProposal(
    input: CreateActionProposalInput,
    actorId?: string,
  ): Promise<ActionProposal>;
  reviewActionProposal(
    id: string,
    input: ReviewActionProposalInput,
    reviewer: { id?: string; name: string },
  ): Promise<ActionProposal | null>;
  getAiWorkerControlPlane(): Promise<AiWorkerControlPlaneResponse>;
  createAiWorkerTaskProposal(
    input: CreateAiWorkerTaskInput,
    actorId?: string,
  ): Promise<AiWorkerRun | null>;
  completeAiWorkerRun(
    id: string,
    input: CompleteAiWorkerRunInput,
    actor: { id?: string; name: string },
  ): Promise<AiWorkerRunResultWrite>;
  getSourcePlan(): Promise<ReturnType<DemoStore["getSourcePlan"]>>;
  runLeadSource(
    source: string,
    options?: {
      providerMode?: SourceRunProviderMode;
      providerCostCents?: number;
    },
  ): Promise<ReturnType<DemoStore["runLeadSource"]>>;
  createLead(
    input: CreateLeadInput,
  ): Promise<ReturnType<DemoStore["createLead"]>>;
  getCampaigns(): Promise<ReturnType<DemoStore["getCampaigns"]>>;
  getCampaign(id: string): Promise<ReturnType<DemoStore["getCampaign"]>>;
  createCampaign(
    input: CreateCampaignInput,
  ): Promise<ReturnType<DemoStore["createCampaign"]>>;
  approveCampaign(
    id: string,
    approvedBy: string,
  ): Promise<ReturnType<DemoStore["approveCampaign"]>>;
  runCampaign(
    id: string,
    approvedBy: string,
  ): Promise<ReturnType<DemoStore["runCampaign"]>>;
  getCampaignActivity(
    id: string,
  ): Promise<ReturnType<DemoStore["getCampaignActivity"]>>;
  createCall(
    input: CreateCallInput,
  ): Promise<ReturnType<DemoStore["createCall"]>>;
  getCall(id: string): Promise<ReturnType<DemoStore["getCall"]>>;
  reviewCall(
    id: string,
    approved: boolean,
    notes: string,
  ): Promise<ReturnType<DemoStore["reviewCall"]>>;
  createMeeting(
    input: CreateMeetingInput,
  ): Promise<ReturnType<DemoStore["createMeeting"]>>;
  updateMeeting(
    id: string,
    input: UpdateMeetingInput,
  ): Promise<ReturnType<DemoStore["updateMeeting"]>>;
  updateOutreachProviderResult(
    activityId: string,
    update: {
      provider: string;
      providerMessageId: string | null;
      status: "queued" | "sent" | "review_required";
      providerCostCents?: number;
      detail: string;
    },
  ): Promise<DashboardResponse["activities"][number] | null>;
  updateCallProviderResult(
    callId: string,
    update: {
      provider: string;
      providerCallId: string | null;
      providerCostCents?: number;
      detail: string;
    },
  ): Promise<DashboardResponse["calls"][number] | null>;
  updateCallProviderFailure(
    callId: string,
    update: {
      provider: string;
      detail: string;
    },
  ): Promise<DashboardResponse["calls"][number] | null>;
  updateCallSuppressionResult(
    callId: string,
    detail: string,
  ): Promise<DashboardResponse["calls"][number] | null>;
  applyProviderEvent(event: {
    provider: string;
    eventType: string;
    payload: unknown;
  }): Promise<{ kind: "activity" | "call"; id: string } | null>;
  recordProviderEvent(
    event: Omit<ProviderEvent, "id" | "receivedAt"> & { payload: unknown },
  ): Promise<ProviderEvent>;
  audit(event: {
    organizationId: string | null;
    actorType: string;
    actorId?: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
  listAuditEvents(
    limit?: number,
    options?: { since?: Date },
  ): Promise<AuditLogEvent[]>;
}

export interface StorageScope {
  organizationId?: string;
  workspaceId?: string;
}

export interface StorageAccessContext {
  organizationId?: string | null;
  workspaceId?: string | null;
}

export function createStorageAccessContext(user?: {
  organizationId?: string | null;
  workspaceId?: string | null;
}) {
  if (!user?.organizationId && !user?.workspaceId) {
    return undefined;
  }

  return {
    organizationId: user.organizationId ?? null,
    workspaceId: user.workspaceId ?? null,
  } satisfies StorageAccessContext;
}

class MemoryStorage implements SalesStorage {
  readonly mode: "memory" | "postgres" = "memory";
  private readonly store = new DemoStore();
  private auditLogEvents: AuditLogEvent[] = [];
  private telegramNotificationDeliveryLedger: Array<{
    id: string;
    workspaceId: string;
    integrationId: string | null;
    actorId: string | null;
    notificationType: string;
    mode: string;
    provider: "telegram";
    chatIdMask: string | null;
    dryRun: boolean;
    targetChatConfigured: boolean;
    targetChatMatchesWorkspace: boolean;
    rateLimitLimit: number;
    rateLimitWindowSeconds: number;
    messagePreview: string | null;
    detail: string | null;
    guardrails: string[];
    createdAt: string;
    updatedAt: string;
  }> = [];

  async createContactIntake(input: CreateContactIntakeInput) {
    return this.store.createContactIntake(input);
  }
  async getDashboard() {
    return this.store.getDashboard();
  }
  async getLeads() {
    return this.store.getLeads();
  }
  async getLead(id: string) {
    return this.store.getLead(id);
  }
  async listSuppressions() {
    return this.store.listSuppressions();
  }
  async createSuppression(input: CreateSuppressionInput) {
    return this.store.createSuppression(input);
  }
  async checkSuppression(input: CheckSuppressionInput) {
    return this.store.checkSuppression(input);
  }
  async getTelegramIntegration() {
    return this.store.getTelegramIntegration();
  }
  async upsertTelegramIntegration(input: ConfigureTelegramIntegrationInput) {
    return this.store.upsertTelegramIntegration(input);
  }
  async resolveTelegramIntegrationByChatIdHash(chatIdHash: string) {
    return this.store.resolveTelegramIntegrationByChatIdHash(chatIdHash);
  }
  async claimTelegramWebhookUpdate(
    chatIdHash: string,
    updateId: number | null,
  ) {
    return this.store.claimTelegramWebhookUpdate(chatIdHash, updateId);
  }
  async claimTelegramCommandRateLimit(chatIdHash: string) {
    return checkTelegramCommandRateLimit(chatIdHash);
  }
  async markTelegramIntegrationVerified(chatIdHash: string) {
    return this.store.markTelegramIntegrationVerified(chatIdHash);
  }
  async disableTelegramIntegration() {
    return this.store.disableTelegramIntegration();
  }
  async listTelegramCommandAudits() {
    return this.store.listTelegramCommandAudits();
  }
  async recordTelegramCommandAudit(input: TelegramCommandAuditInput) {
    return this.store.recordTelegramCommandAudit(input);
  }
  async claimTelegramNotificationDelivery(
    input: TelegramNotificationDeliveryClaimInput,
  ) {
    const enforcedLimit = Math.min(120, Math.max(1, input.maxNotificationsPerHour));
    const windowSeconds = 3600;
    const now = new Date();
    const windowStartMs = now.getTime() - windowSeconds * 1000;
    const workspaceId = input.workspaceId ?? "demo-workspace";
    const attempts = this.telegramNotificationDeliveryLedger.filter((delivery) => {
      const createdAtMs = Date.parse(delivery.createdAt);
      return (
        delivery.workspaceId === workspaceId &&
        delivery.provider === "telegram" &&
        !Number.isNaN(createdAtMs) &&
        createdAtMs >= windowStartMs
      );
    });
    const oldestAttemptMs = attempts.reduce<number | null>((oldest, delivery) => {
      const createdAtMs = Date.parse(delivery.createdAt);
      if (Number.isNaN(createdAtMs)) {
        return oldest;
      }

      return oldest === null ? createdAtMs : Math.min(oldest, createdAtMs);
    }, null);
    const allowed = attempts.length < enforcedLimit;
    const retryAfterSeconds = allowed
      ? 0
      : Math.max(
          1,
          Math.ceil(
            ((oldestAttemptMs ?? now.getTime()) +
              windowSeconds * 1000 -
              now.getTime()) /
              1000,
          ),
        );
    const deliveryId = `tg_delivery_${Math.random().toString(36).slice(2, 10)}`;
    const delivery: (typeof this.telegramNotificationDeliveryLedger)[number] = {
      id: deliveryId,
      workspaceId,
      integrationId: input.integrationId ?? null,
      actorId: input.actorId ?? null,
      notificationType: input.notificationType,
      mode: allowed ? "claimed" : "blocked",
      provider: "telegram",
      chatIdMask: input.chatIdMask,
      dryRun: input.dryRun,
      targetChatConfigured: input.targetChatConfigured,
      targetChatMatchesWorkspace: input.targetChatMatchesWorkspace,
      rateLimitLimit: enforcedLimit,
      rateLimitWindowSeconds: windowSeconds,
      messagePreview: null,
      detail: allowed
        ? "Telegram notification delivery claimed for rate-cap enforcement."
        : "Telegram notification delivery blocked before transport by the rate cap.",
      guardrails: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.telegramNotificationDeliveryLedger = [
      delivery,
      ...this.telegramNotificationDeliveryLedger,
    ].slice(0, 500);

    return {
      allowed,
      deliveryId,
      enforcedLimit,
      used: allowed ? attempts.length + 1 : attempts.length,
      remaining: allowed ? Math.max(0, enforcedLimit - attempts.length - 1) : 0,
      retryAfterSeconds,
      windowSeconds,
      detail: allowed
        ? `Telegram notification delivery ledger allows ${enforcedLimit} attempt${enforcedLimit === 1 ? "" : "s"} per hour.`
        : `Telegram notification delivery ledger rate cap reached: ${attempts.length}/${enforcedLimit} attempts in the last hour.`,
    } satisfies TelegramNotificationDeliveryClaim;
  }
  async completeTelegramNotificationDelivery(
    input: CompleteTelegramNotificationDeliveryInput,
  ) {
    const now = new Date().toISOString();
    this.telegramNotificationDeliveryLedger =
      this.telegramNotificationDeliveryLedger.map((delivery) =>
        delivery.id === input.deliveryId
          ? {
              ...delivery,
              mode: input.mode,
              messagePreview: input.messagePreview,
              detail: input.detail,
              guardrails: input.guardrails,
              updatedAt: now,
            }
          : delivery,
      );
  }
  async createOnboardingSession(input: OnboardingSessionInput) {
    return this.store.createOnboardingSession(input);
  }
  async appendOnboardingMessage(id: string, input: OnboardingMessageInput) {
    return this.store.appendOnboardingMessage(id, input);
  }
  async finalizeOnboarding(id: string) {
    return this.store.finalizeOnboarding(id);
  }
  async getBusinessProfile() {
    return this.store.getBusinessProfile();
  }
  async getSalesBlueprint() {
    return this.store.getSalesBlueprint();
  }
  async upsertSalesBlueprint(input: UpsertSalesBlueprintInput) {
    return this.store.upsertSalesBlueprint(input);
  }
  async checkUsageEntitlement(
    metric: UsageEntitlementMetric,
    requestedQuantity?: number,
  ) {
    return this.store.checkUsageEntitlement(metric, requestedQuantity);
  }
  async checkChannelEntitlement(channel: OutboundChannel) {
    return this.store.checkChannelEntitlement(channel);
  }
  async listActionProposals(status?: ActionProposalStatus) {
    return this.store.listActionProposals(status);
  }
  async createActionProposal(input: CreateActionProposalInput) {
    return this.store.createActionProposal(input);
  }
  async reviewActionProposal(
    id: string,
    input: ReviewActionProposalInput,
    reviewer: { id?: string; name: string },
  ) {
    return this.store.reviewActionProposal(id, input, reviewer);
  }
  async getAiWorkerControlPlane() {
    return this.store.getAiWorkerControlPlane();
  }
  async createAiWorkerTaskProposal(input: CreateAiWorkerTaskInput) {
    return this.store.createAiWorkerTaskProposal(input);
  }
  async completeAiWorkerRun(
    id: string,
    input: CompleteAiWorkerRunInput,
    actor: { id?: string; name: string },
  ) {
    return this.store.completeAiWorkerRun(id, input, actor);
  }
  async getSourcePlan() {
    return this.store.getSourcePlan();
  }
  async runLeadSource(
    source: string,
    options?: {
      providerMode?: SourceRunProviderMode;
      providerCostCents?: number;
    },
  ) {
    return this.store.runLeadSource(source, options);
  }
  async createLead(input: CreateLeadInput) {
    return this.store.createLead(input);
  }
  async getCampaigns() {
    return this.store.getCampaigns();
  }
  async getCampaign(id: string) {
    return this.store.getCampaign(id);
  }
  async createCampaign(input: CreateCampaignInput) {
    return this.store.createCampaign(input);
  }
  async approveCampaign(id: string, approvedBy: string) {
    return this.store.approveCampaign(id, approvedBy);
  }
  async runCampaign(id: string, approvedBy: string) {
    return this.store.runCampaign(id, approvedBy);
  }
  async getCampaignActivity(id: string) {
    return this.store.getCampaignActivity(id);
  }
  async createCall(input: CreateCallInput) {
    return this.store.createCall(input);
  }
  async getCall(id: string) {
    return this.store.getCall(id);
  }
  async reviewCall(id: string, approved: boolean, notes: string) {
    return this.store.reviewCall(id, approved, notes);
  }
  async createMeeting(input: CreateMeetingInput) {
    return this.store.createMeeting(input);
  }
  async updateMeeting(id: string, input: UpdateMeetingInput) {
    return this.store.updateMeeting(id, input);
  }
  async updateOutreachProviderResult(
    activityId: string,
    update: {
      provider: string;
      providerMessageId: string | null;
      status: "queued" | "sent" | "review_required";
      providerCostCents?: number;
      detail: string;
    },
  ) {
    return this.store.updateOutreachProviderResult(activityId, update);
  }
  async updateCallProviderResult(
    callId: string,
    update: {
      provider: string;
      providerCallId: string | null;
      providerCostCents?: number;
      detail: string;
    },
  ) {
    return this.store.updateCallProviderResult(callId, update);
  }
  async updateCallProviderFailure(
    callId: string,
    update: {
      provider: string;
      detail: string;
    },
  ) {
    return this.store.updateCallProviderFailure(callId, update);
  }
  async updateCallSuppressionResult(callId: string, detail: string) {
    return this.store.updateCallSuppressionResult(callId, detail);
  }
  async applyProviderEvent() {
    return null;
  }
  async recordProviderEvent(
    event: Omit<ProviderEvent, "id" | "receivedAt"> & { payload: unknown },
  ) {
    return {
      id: `evt_${Math.random().toString(36).slice(2, 10)}`,
      provider: event.provider,
      eventType: event.eventType,
      verified: event.verified,
      detail: event.detail,
      receivedAt: new Date().toISOString(),
    };
  }

  async audit(event: {
    organizationId: string | null;
    actorType: string;
    actorId?: string;
    eventType: string;
    payload: Record<string, unknown>;
  }) {
    const auditEvent = sanitizeAuditLogEvent({
      id: `audit_${Math.random().toString(36).slice(2, 10)}`,
      organizationId: event.organizationId ?? "demo-organization",
      actorType: event.actorType,
      actorId: event.actorId ?? null,
      eventType: event.eventType,
      payload: event.payload,
      createdAt: new Date().toISOString(),
    });
    this.auditLogEvents = [auditEvent, ...this.auditLogEvents].slice(0, 100);

    // Memory storage just logs to console
    console.log("[AUDIT]", {
      eventType: event.eventType,
      actorType: event.actorType,
      actorId: event.actorId,
      organizationId: event.organizationId,
      payload: event.payload,
      timestamp: new Date().toISOString(),
    });
  }

  async listAuditEvents(limit = 20, options?: { since?: Date }) {
    const normalizedLimit = Math.min(50, Math.max(1, Math.trunc(limit)));
    const sinceMs = options?.since?.getTime();
    const events = Number.isFinite(sinceMs)
      ? this.auditLogEvents.filter((event) => {
          const eventMs = Date.parse(event.createdAt);
          return !Number.isNaN(eventMs) && eventMs >= sinceMs!;
        })
      : this.auditLogEvents;
    return events.slice(0, normalizedLimit);
  }
}

class PostgresStorage implements SalesStorage {
  readonly mode: "memory" | "postgres" = "postgres";
  constructor(
    private readonly context?: StorageAccessContext,
    private readonly state: {
      initialized: boolean;
      seed: DemoStore;
      memory: DemoStore;
    } = {
      initialized: false,
      seed: new DemoStore(),
      memory: new DemoStore(),
    },
  ) {}

  scope(context?: StorageAccessContext) {
    if (!context?.organizationId && !context?.workspaceId) {
      return this;
    }

    return new PostgresStorage(context, this.state);
  }

  private async ensureInitialized() {
    if (this.state.initialized) {
      return;
    }

    if (process.env.ENABLE_POSTGRES_DEMO_SEED !== "true") {
      this.state.initialized = true;
      return;
    }

    const dashboard = this.state.seed.getDashboard();
    const seedProfile =
      dashboard.onboarding.extractedProfile ??
      inferProfile(dashboard.onboarding);
    const seedSourcePlan = dashboard.sourcePlan ?? buildSourcePlan(seedProfile);
    const existingOrg = await db.select().from(organizations).limit(1);

    if (existingOrg.length === 0) {
      const [organization] = await db
        .insert(organizations)
        .values({
          name: dashboard.workspace.organizationName,
          slug: "northstar-labs",
          region: dashboard.workspace.region,
        })
        .returning();

      const [workspace] = await db
        .insert(workspaces)
        .values({
          organizationId: organization.id,
          name: dashboard.workspace.workspaceName,
          industry:
            dashboard.onboarding.extractedProfile?.industry ?? "B2B SaaS",
        })
        .returning();

      await db.insert(subscriptions).values({
        organizationId: organization.id,
        planKey: dashboard.subscription.planKey,
        status: dashboard.subscription.status,
        usageLimit: dashboard.subscription.usageLimit,
        seats: dashboard.subscription.seats,
      });

      await db.insert(onboardingSessions).values({
        workspaceId: workspace.id,
        status: dashboard.onboarding.status,
        currentStep: dashboard.onboarding.currentStep,
        transcript: dashboard.onboarding.transcript,
        extractedProfile: dashboard.onboarding.extractedProfile,
        scraperBrief: dashboard.onboarding.scraperBrief,
        outreachBrief: dashboard.onboarding.outreachBrief,
      });

      if (dashboard.sourcePlan) {
        await db.insert(sourcePlans).values({
          workspaceId: workspace.id,
          summary: dashboard.sourcePlan.summary,
          sources: dashboard.sourcePlan.sources,
          contactTargets: dashboard.sourcePlan.contactTargets,
          searchTerms: dashboard.sourcePlan.searchTerms,
          rationale: dashboard.sourcePlan.rationale,
        });
      }

      const seedBlueprint = buildSalesBlueprintFromProfile(
        seedProfile,
        seedSourcePlan,
      );
      await db.insert(salesBlueprints).values({
        workspaceId: workspace.id,
        status: seedBlueprint.status,
        businessProfile: seedBlueprint.businessProfile,
        icpSummary: seedBlueprint.icpSummary,
        buyerRoles: seedBlueprint.buyerRoles,
        painPoints: seedBlueprint.painPoints,
        disqualifiers: seedBlueprint.disqualifiers,
        qualificationRules: seedBlueprint.qualificationRules,
        sourceChannels: seedBlueprint.sourceChannels,
        outreachChannels: seedBlueprint.outreachChannels,
        searchKeywords: seedBlueprint.searchKeywords,
        monthlyLeadTarget: seedBlueprint.monthlyLeadTarget,
        meetingTarget: seedBlueprint.meetingTarget,
        averageContractValue: seedBlueprint.averageContractValue,
        automationMode: seedBlueprint.automationMode,
        approvalRequiredFor: seedBlueprint.approvalRequiredFor,
        complianceNotes: seedBlueprint.complianceNotes,
        readinessScore: seedBlueprint.readinessScore,
        readinessGaps: seedBlueprint.readinessGaps,
      });

      await db.insert(sourceRuns).values(
        dashboard.sourceRuns.map((run) => ({
          workspaceId: workspace.id,
          source: run.source,
          status: run.status,
          providerMode: run.providerMode,
          candidatesFound: run.candidatesFound,
          dedupedCount: run.dedupedCount,
          qualifiedCount: run.qualifiedCount,
          rejectedCount: run.rejectedCount,
          qualityScore: run.qualityScore,
          evidence: run.evidence,
          rejectionReasons: run.rejectionReasons,
          complianceChecks: run.complianceChecks,
          freshness: run.freshness,
          nextAction: run.nextAction,
          summary: run.summary,
        })),
      );

      const leadRows = await db
        .insert(leads)
        .values(
          dashboard.leads.map((lead) => ({
            workspaceId: workspace.id,
            fullName: lead.fullName,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            source: lead.source,
            status: lead.status,
            score: lead.score,
            rejectionReason: lead.rejectionReason,
            metadata: { lastTouchpoint: lead.lastTouchpoint },
          })),
        )
        .returning();

      const leadIdByName = new Map(
        leadRows.map((lead) => [lead.fullName, lead.id]),
      );

      const campaignRows = await db
        .insert(campaigns)
        .values(
          dashboard.campaigns.map((campaign) => ({
            workspaceId: workspace.id,
            name: campaign.name,
            stage: campaign.stage,
            approved: campaign.approved,
            channel: campaign.channel,
            firstActionCompleted: campaign.firstActionCompleted,
            nextActionAt: campaign.nextActionAt,
            leadsEnrolled: campaign.leadsEnrolled,
          })),
        )
        .returning();

      const campaignIdByName = new Map(
        campaignRows.map((campaign) => [campaign.name, campaign.id]),
      );

      if (campaignRows[0]) {
        await db.insert(actionProposals).values({
          workspaceId: workspace.id,
          type: "campaign_dispatch",
          status: "pending",
          riskLevel: "high",
          title: "Approve first send for Founder outbound",
          detail:
            "The seeded draft email campaign has qualified leads enrolled and is waiting for an operator before the first outbound touch can leave the workspace.",
          proposedBy: "ai",
          targetKind: "campaign",
          targetId: campaignRows[0].id,
          targetLabel: campaignRows[0].name,
          payloadSummary:
            "Approve the first email send for the seeded outbound campaign.",
          payload: {
            campaignId: campaignRows[0].id,
            channel: campaignRows[0].channel,
            leadsEnrolled: campaignRows[0].leadsEnrolled,
          },
          guardrails: [
            "Suppression checks run before provider dispatch.",
            "Only the first touch is unlocked by this review.",
            "Provider failures keep the campaign in review.",
          ],
          expectedEffect:
            "Campaign moves from draft to approved so the first personalized outreach task can be queued.",
          rollbackPlan:
            "Pause the campaign from the approval inbox or campaign controls before provider dispatch.",
          requiredRole: "admin",
          requestedBy: "seed-ai-sales-operator",
        });
      }

      await this.ensureAiWorkersForWorkspace(workspace.id);
      const workerRows = await db
        .select()
        .from(aiWorkers)
        .where(eq(aiWorkers.workspaceId, workspace.id));
      const researcher = workerRows.find(
        (worker) => worker.name === "Sales researcher",
      );
      const outreachStrategist = workerRows.find(
        (worker) => worker.name === "Outreach strategist",
      );

      if (researcher) {
        const [proposal] = await db
          .insert(actionProposals)
          .values({
            workspaceId: workspace.id,
            type: "ai_worker_action",
            status: "pending",
            riskLevel: "medium",
            title: "Research 40 founder-led SaaS accounts",
            detail:
              "The Sales researcher worker wants to run a read-only source pass using configured business directories and public company websites. No outreach or contact mutation will occur from this approval.",
            proposedBy: "ai",
            targetKind: "ai_worker",
            targetId: researcher.id,
            targetLabel: researcher.name,
            payloadSummary:
              "Run one governed research task for 40 ICP-fit accounts.",
            payload: {
              workerId: researcher.id,
              proposedAction:
                "Collect public company evidence, dedupe candidates, and prepare a lead-source review batch.",
              expectedCostCents: 1800,
            },
            guardrails: [
              "Read-only tools only.",
              "No outreach, enrichment purchase, or CRM mutation.",
              "Every accepted lead must include source evidence.",
            ],
            expectedEffect:
              "Creates a reviewable lead-source batch for the approval-gated collection engine.",
            rollbackPlan:
              "Reject the proposal; no worker task runs and no workspace state changes.",
            requiredRole: "admin",
            requestedBy: "ai-worker-control-plane",
          })
          .returning();

        const [run] = await db
          .insert(aiWorkerRuns)
          .values({
            workspaceId: workspace.id,
            workerId: researcher.id,
            status: "proposed",
            title: "Research 40 founder-led SaaS accounts",
            detail:
              "Prepare a reviewable lead-source batch from public company pages and directories.",
            riskLevel: "medium",
            proposedAction:
              "Collect public company evidence, dedupe candidates, and prepare a lead-source review batch.",
            expectedCostCents: 1800,
            actualCostCents: 0,
            approvalProposalId: proposal.id,
          })
          .returning();

        await db
          .update(actionProposals)
          .set({
            payload: {
              workerId: researcher.id,
              runId: run.id,
              proposedAction:
                "Collect public company evidence, dedupe candidates, and prepare a lead-source review batch.",
              expectedCostCents: 1800,
            },
          })
          .where(eq(actionProposals.id, proposal.id));
      }

      if (outreachStrategist) {
        await db.insert(aiWorkerRuns).values({
          workspaceId: workspace.id,
          workerId: outreachStrategist.id,
          status: "blocked",
          title: "Draft first-touch sequence for Founder outbound",
          detail:
            "The worker can draft copy, but live provider dispatch is blocked until email readiness and first-touch approval are complete.",
          riskLevel: "high",
          proposedAction:
            "Draft a five-step email and call follow-up sequence using approved lead evidence.",
          expectedCostCents: 2400,
          actualCostCents: 0,
          blockedReason:
            "Email provider readiness and first-touch approval are required before dispatch.",
        });
      }

      await db.insert(outreachActivities).values(
        dashboard.activities
          .map((activity) => {
            const lead = dashboard.leads.find(
              (entry) => entry.id === activity.leadId,
            );
            const campaign = dashboard.campaigns.find(
              (entry) => entry.id === activity.campaignId,
            );
            if (!lead || !campaign) {
              return null;
            }

            return {
              campaignId: campaignIdByName.get(campaign.name)!,
              leadId: leadIdByName.get(lead.fullName)!,
              type: activity.type,
              status: activity.status,
              subject: activity.subject,
              preview: activity.preview,
              personalizedFor: activity.personalizedFor,
            };
          })
          .filter(
            (value): value is NonNullable<typeof value> => value !== null,
          ),
      );

      await db.insert(callTasks).values(
        dashboard.calls
          .map((call) => {
            const lead = dashboard.leads.find(
              (entry) => entry.id === call.leadId,
            );
            if (!lead) {
              return null;
            }

            return {
              campaignId: campaignRows[0]!.id,
              leadId: leadIdByName.get(lead.fullName)!,
              status: (call.reviewRequired ? "blocked" : "completed") as
                | "blocked"
                | "completed",
              provider: call.provider,
              summary: call.summary,
              transcript: call.transcript,
              disposition: call.disposition,
              reviewRequired: call.reviewRequired,
            };
          })
          .filter(
            (value): value is NonNullable<typeof value> => value !== null,
          ),
      );

      await db.insert(meetings).values(
        dashboard.meetings
          .map((meeting) => {
            const lead = dashboard.leads.find(
              (entry) => entry.id === meeting.leadId,
            );
            if (!lead) {
              return null;
            }

            return {
              leadId: leadIdByName.get(lead.fullName)!,
              scheduledFor: new Date(meeting.scheduledFor),
              status: meeting.status,
              bookingSource: AI_ASSISTED_MEETING_BOOKING_SOURCE,
              owner: meeting.owner,
              notes: meeting.notes,
              outcome: meeting.status,
              dealValueCents: meeting.dealValueCents,
              dealCurrency: meeting.dealCurrency,
            };
          })
          .filter(
            (value): value is NonNullable<typeof value> => value !== null,
          ),
      );
    }

    this.state.initialized = true;
  }

  private async workspaceContext() {
    await this.ensureInitialized();

    if (!this.context?.workspaceId) {
      throw new Error(
        "Scoped workspaceId is required for tenant storage access",
      );
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, this.context.workspaceId))
      .limit(1);

    if (!workspace) {
      throw new Error("Workspace not found for request context");
    }

    if (
      this.context.organizationId &&
      workspace.organizationId !== this.context.organizationId
    ) {
      throw new Error("Workspace does not belong to the request organization");
    }

    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, workspace.organizationId))
      .limit(1);

    if (!organization) {
      throw new Error("Organization not found for request context");
    }

    return { organization, workspace };
  }

  private defaultAiWorkerRows(
    workspaceId: string,
  ): Array<typeof aiWorkers.$inferInsert> {
    return [
      {
        workspaceId,
        name: "Sales researcher",
        role: "Lead discovery and evidence preparation",
        status: "active",
        riskLevel: "medium",
        ownerRole: "admin",
        description:
          "Finds reviewable public business signals, dedupes candidates, and prepares lead-source batches.",
        permissions: [
          "Read sales blueprint",
          "Read source plan",
          "Create approval proposals",
        ],
        allowedTools: [
          "website-source",
          "directory-source",
          "search-source",
          "csv-import",
        ],
        blockedTools: [
          "email-send",
          "voice-call",
          "billing-change",
          "crm-write",
        ],
        monthlyBudgetCents: 50000,
        budgetUsedCents: 12400,
        lastActionAt: new Date(),
        guardrails: [
          "Must include source evidence for accepted leads.",
          "Cannot dispatch outreach.",
          "Must respect suppression handoff before campaign enrollment.",
        ],
      },
      {
        workspaceId,
        name: "Outreach strategist",
        role: "Drafts channel-specific outreach for approved campaigns",
        status: "paused",
        riskLevel: "high",
        ownerRole: "admin",
        description:
          "Prepares personalized email, LinkedIn, SMS, and call scripts after lead evidence is reviewed.",
        permissions: [
          "Read leads",
          "Read campaigns",
          "Create approval proposals",
        ],
        allowedTools: ["message-draft", "campaign-read", "suppression-check"],
        blockedTools: ["email-send", "sms-send", "linkedin-send", "voice-call"],
        monthlyBudgetCents: 75000,
        budgetUsedCents: 21000,
        lastActionAt: new Date(),
        guardrails: [
          "First touch always requires approval.",
          "Suppression checks are required before any provider dispatch.",
          "Provider sends remain blocked until integration readiness is configured.",
        ],
      },
      {
        workspaceId,
        name: "Meeting coordinator",
        role: "Books and updates meetings after qualified replies",
        status: "active",
        riskLevel: "medium",
        ownerRole: "admin",
        description:
          "Turns qualified responses into meeting proposals and tracks follow-through.",
        permissions: ["Read leads", "Read calls", "Create meeting proposals"],
        allowedTools: ["calendar-read", "meeting-draft", "crm-read"],
        blockedTools: ["calendar-write", "crm-write", "payment-change"],
        monthlyBudgetCents: 35000,
        budgetUsedCents: 8200,
        guardrails: [
          "Meeting creation is proposal-gated until calendar write access is configured.",
          "Never overwrite existing booked times.",
        ],
      },
      {
        workspaceId,
        name: "CRM operator",
        role: "Maintains sales state after approved operator actions",
        status: "disabled",
        riskLevel: "critical",
        ownerRole: "owner",
        description:
          "Reserved for future CRM mutations once audit coverage, rollback, and provider mapping are complete.",
        permissions: ["Read workspace state"],
        allowedTools: ["crm-read", "audit-read"],
        blockedTools: [
          "crm-write",
          "billing-change",
          "team-admin",
          "provider-secret",
        ],
        monthlyBudgetCents: 0,
        budgetUsedCents: 0,
        guardrails: [
          "Mutation tools are disabled.",
          "Owner review required before enabling write access.",
          "Rollback plan required for every CRM state change.",
        ],
      },
    ];
  }

  private async ensureAiWorkersForWorkspace(workspaceId: string) {
    const existing = await db
      .select({ id: aiWorkers.id })
      .from(aiWorkers)
      .where(eq(aiWorkers.workspaceId, workspaceId))
      .limit(1);

    if (existing.length > 0) {
      return;
    }

    await db.insert(aiWorkers).values(this.defaultAiWorkerRows(workspaceId));
  }

  private async currentUsageQuantity(
    organizationId: string,
    metric: UsageEntitlementMetric,
  ) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rows = await db
      .select({ quantity: usageEvents.quantity })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.organizationId, organizationId),
          eq(usageEvents.metric, metric),
          gt(usageEvents.createdAt, thirtyDaysAgo),
        ),
      );

    return rows.reduce((total, row) => total + row.quantity, 0);
  }

  private async recordUsageEvent(
    organizationId: string,
    metric: UsageEntitlementMetric,
    quantity: number,
    metadata: Record<string, unknown>,
  ) {
    await db.insert(usageEvents).values({
      organizationId,
      metric,
      quantity,
      metadata,
    });
  }

  private async getScopedLeadRow(id: string) {
    const { workspace } = await this.workspaceContext();
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.workspaceId, workspace.id)))
      .limit(1);
    return lead ?? null;
  }

  private async getScopedCampaignRow(id: string) {
    const { workspace } = await this.workspaceContext();
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.workspaceId, workspace.id)))
      .limit(1);
    return campaign ?? null;
  }

  private async getScopedCallRow(id: string) {
    const { workspace } = await this.workspaceContext();
    const [row] = await db
      .select({ call: callTasks })
      .from(callTasks)
      .innerJoin(leads, eq(callTasks.leadId, leads.id))
      .where(and(eq(callTasks.id, id), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    return row?.call ?? null;
  }

  private async getScopedMeetingRow(id: string) {
    const { workspace } = await this.workspaceContext();
    const [row] = await db
      .select({ meeting: meetings })
      .from(meetings)
      .innerJoin(leads, eq(meetings.leadId, leads.id))
      .where(and(eq(meetings.id, id), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    return row?.meeting ?? null;
  }

  private async getScopedOutreachActivityRow(id: string) {
    const { workspace } = await this.workspaceContext();
    const [row] = await db
      .select({ activity: outreachActivities })
      .from(outreachActivities)
      .innerJoin(campaigns, eq(outreachActivities.campaignId, campaigns.id))
      .where(
        and(
          eq(outreachActivities.id, id),
          eq(campaigns.workspaceId, workspace.id),
        ),
      )
      .limit(1);

    return row?.activity ?? null;
  }

  private async resolveOrganizationIdForProviderEvent(event: {
    provider: string;
    payload: unknown;
  }) {
    if (event.provider === "resend") {
      const payload = event.payload as { data?: { email_id?: string } };
      const externalId = payload.data?.email_id;

      if (!externalId) {
        return null;
      }
      const target = await findUniqueResendWebhookTarget(externalId);
      return target?.organizationId ?? null;
    }

    if (event.provider === "twilio") {
      const payload = event.payload as { CallSid?: string };

      if (!payload.CallSid) {
        return null;
      }
      const target = await findUniqueTwilioWebhookTarget(payload.CallSid);
      return target?.organizationId ?? null;
    }

    return null;
  }

  private mapLead(
    lead: typeof leads.$inferSelect,
  ): DashboardResponse["leads"][number] {
    return {
      id: lead.id,
      fullName: lead.fullName,
      email: lead.email ?? undefined,
      phone: lead.phone ?? undefined,
      company: lead.company ?? undefined,
      source: lead.source,
      status: lead.status,
      score: lead.score,
      lastTouchpoint:
        (lead.metadata as { lastTouchpoint?: string } | null)?.lastTouchpoint ??
        "Imported",
      rejectionReason: lead.rejectionReason ?? null,
    };
  }

  private mapContactIntake(
    submission: typeof contactIntakeSubmissions.$inferSelect,
  ): ContactIntakeRecord {
    return contactIntakeRecordSchema.parse({
      id: submission.id,
      intent: submission.intent,
      name: submission.name,
      email: submission.email,
      companyName: submission.companyName,
      website: submission.website,
      role: submission.role,
      teamSize: submission.teamSize,
      monthlyLeadGoal: submission.monthlyLeadGoal,
      budgetRange: submission.budgetRange,
      timeline: submission.timeline,
      goals: submission.goals,
      channels: submission.channels,
      message: submission.message,
      sourcePath: submission.sourcePath,
      referrer: submission.referrer,
      utm: submission.utm,
      status: submission.status,
      priority: submission.priority,
      qualificationScore: submission.qualificationScore,
      routingRecommendation: submission.routingRecommendation,
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
    });
  }

  private mapCampaign(
    campaign: typeof campaigns.$inferSelect,
  ): DashboardResponse["campaigns"][number] {
    return {
      id: campaign.id,
      name: campaign.name,
      channel: campaign.channel,
      stage: campaign.stage,
      approved: campaign.approved,
      firstActionCompleted: campaign.firstActionCompleted,
      nextActionAt: campaign.nextActionAt,
      leadsEnrolled: campaign.leadsEnrolled,
    };
  }

  private mapCall(
    call: typeof callTasks.$inferSelect,
  ): DashboardResponse["calls"][number] {
    const statusMap: Record<
      typeof call.status,
      DashboardResponse["calls"][number]["status"]
    > = {
      blocked: "review_required",
      queued: "queued",
      running: "in_progress",
      failed: "review_required",
      completed: "completed",
    };

    return {
      id: call.id,
      leadId: call.leadId,
      status: statusMap[call.status] ?? "review_required",
      provider: call.provider ?? "twilio",
      providerCallId: call.providerCallId ?? null,
      summary: call.summary ?? "",
      transcript: call.transcript ?? "",
      disposition: call.disposition ?? "unknown",
      reviewRequired: call.reviewRequired,
    };
  }

  private mapMeeting(
    meeting: typeof meetings.$inferSelect,
  ): DashboardResponse["meetings"][number] {
    return {
      id: meeting.id,
      leadId: meeting.leadId,
      status: meeting.status,
      scheduledFor: meeting.scheduledFor?.toISOString() ?? "",
      owner: meeting.owner ?? "sales-ops",
      notes: meeting.notes ?? "",
      dealValueCents: meeting.dealValueCents ?? 0,
      dealCurrency: meeting.dealCurrency ?? "USD",
    };
  }

  private mapSuppression(
    suppression: typeof contactSuppressions.$inferSelect,
  ): SuppressionRecord {
    return {
      id: suppression.id,
      channel: suppression.channel as SuppressionRecord["channel"],
      contactValue: suppression.contactValue,
      normalizedContactValue: suppression.normalizedContactValue,
      reason: suppression.reason as SuppressionRecord["reason"],
      source: suppression.source,
      createdAt: suppression.createdAt.toISOString(),
      expiresAt: suppression.expiresAt?.toISOString() ?? null,
    };
  }

  private mapSalesBlueprint(
    blueprint: typeof salesBlueprints.$inferSelect,
  ): SalesBlueprint {
    return salesBlueprintSchema.parse({
      id: blueprint.id,
      status: blueprint.status,
      businessProfile: blueprint.businessProfile,
      icpSummary: blueprint.icpSummary,
      buyerRoles: blueprint.buyerRoles,
      painPoints: blueprint.painPoints,
      disqualifiers: blueprint.disqualifiers,
      qualificationRules: blueprint.qualificationRules,
      sourceChannels: blueprint.sourceChannels,
      outreachChannels: blueprint.outreachChannels,
      searchKeywords: blueprint.searchKeywords,
      monthlyLeadTarget: blueprint.monthlyLeadTarget,
      meetingTarget: blueprint.meetingTarget,
      averageContractValue: blueprint.averageContractValue,
      automationMode: blueprint.automationMode,
      approvalRequiredFor: blueprint.approvalRequiredFor,
      complianceNotes: blueprint.complianceNotes,
      readinessScore: blueprint.readinessScore,
      readinessGaps: blueprint.readinessGaps,
      lastUpdatedAt: blueprint.updatedAt.toISOString(),
    });
  }

  private mapSourceRun(
    run: typeof sourceRuns.$inferSelect,
  ): DashboardResponse["sourceRuns"][number] {
    return sourceRunSchema.parse({
      id: run.id,
      source: run.source,
      status: run.status,
      providerMode: run.providerMode,
      candidatesFound: run.candidatesFound,
      dedupedCount: run.dedupedCount,
      qualifiedCount: run.qualifiedCount,
      rejectedCount: run.rejectedCount,
      qualityScore: run.qualityScore,
      evidence: Array.isArray(run.evidence) ? run.evidence : [],
      rejectionReasons: Array.isArray(run.rejectionReasons)
        ? run.rejectionReasons
        : [],
      complianceChecks: Array.isArray(run.complianceChecks)
        ? run.complianceChecks
        : [],
      freshness: run.freshness,
      nextAction: run.nextAction,
      summary: run.summary,
    });
  }

  private mapActionProposal(
    proposal: typeof actionProposals.$inferSelect,
  ): ActionProposal {
    return actionProposalSchema.parse({
      id: proposal.id,
      type: proposal.type,
      status: proposal.status,
      riskLevel: proposal.riskLevel,
      title: proposal.title,
      detail: proposal.detail,
      proposedBy: proposal.proposedBy,
      targetKind: proposal.targetKind,
      targetId: proposal.targetId ?? null,
      targetLabel: proposal.targetLabel,
      payloadSummary: proposal.payloadSummary,
      payload: proposal.payload ?? {},
      guardrails: Array.isArray(proposal.guardrails) ? proposal.guardrails : [],
      expectedEffect: proposal.expectedEffect,
      rollbackPlan: proposal.rollbackPlan,
      requiredRole: proposal.requiredRole,
      requestedBy: proposal.requestedBy ?? null,
      reviewedBy: proposal.reviewedByName ?? null,
      reviewNote: proposal.reviewNote ?? null,
      auditEventId: proposal.auditEventId ?? null,
      createdAt: proposal.createdAt.toISOString(),
      reviewedAt: proposal.reviewedAt?.toISOString() ?? null,
      expiresAt: proposal.expiresAt?.toISOString() ?? null,
    });
  }

  private mapAiWorker(worker: typeof aiWorkers.$inferSelect): AiWorker {
    return aiWorkerSchema.parse({
      id: worker.id,
      name: worker.name,
      role: worker.role,
      status: worker.status,
      riskLevel: worker.riskLevel,
      ownerRole: worker.ownerRole,
      description: worker.description,
      permissions: Array.isArray(worker.permissions) ? worker.permissions : [],
      allowedTools: Array.isArray(worker.allowedTools)
        ? worker.allowedTools
        : [],
      blockedTools: Array.isArray(worker.blockedTools)
        ? worker.blockedTools
        : [],
      monthlyBudgetCents: worker.monthlyBudgetCents,
      budgetUsedCents: worker.budgetUsedCents,
      lastActionAt: worker.lastActionAt?.toISOString() ?? null,
      guardrails: Array.isArray(worker.guardrails) ? worker.guardrails : [],
      createdAt: worker.createdAt.toISOString(),
      updatedAt: worker.updatedAt.toISOString(),
    });
  }

  private mapAiWorkerRun(
    run: typeof aiWorkerRuns.$inferSelect,
    workerName: string,
  ): AiWorkerRun {
    return aiWorkerRunSchema.parse({
      id: run.id,
      workerId: run.workerId,
      workerName,
      status: run.status,
      title: run.title,
      detail: run.detail,
      riskLevel: run.riskLevel,
      proposedAction: run.proposedAction,
      expectedCostCents: run.expectedCostCents,
      actualCostCents: run.actualCostCents,
      approvalProposalId: run.approvalProposalId ?? null,
      resultSummary: run.resultSummary ?? null,
      blockedReason: run.blockedReason ?? null,
      createdAt: run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      updatedAt: run.updatedAt.toISOString(),
    });
  }

  private mapTelegramIntegration(
    integration: typeof telegramIntegrations.$inferSelect | null | undefined,
  ): TelegramIntegration {
    if (!integration) {
      return {
        id: null,
        status: "not_configured",
        botUsername: null,
        chatIdMask: null,
        allowedCommands: [...telegramDefaultAllowedCommands],
        lastUpdateId: null,
        lastVerifiedAt: null,
        createdAt: null,
        updatedAt: null,
      };
    }

    const allowedCommands = Array.isArray(integration.allowedCommands)
      ? integration.allowedCommands.filter(
          (command) => telegramCommandSchema.safeParse(command).success,
        )
      : [];

    return {
      id: integration.id,
      status: integration.status as TelegramIntegration["status"],
      botUsername: integration.botUsername ?? null,
      chatIdMask: integration.chatIdMask,
      allowedCommands:
        allowedCommands.length > 0
          ? (allowedCommands as TelegramIntegration["allowedCommands"])
          : [...telegramDefaultAllowedCommands],
      lastUpdateId: integration.lastUpdateId ?? null,
      lastVerifiedAt: integration.lastVerifiedAt?.toISOString() ?? null,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
    };
  }

  private async ensureAiAssistedMeeting(leadId: string, notes: string) {
    const [existingMeeting] = await db
      .select({ id: meetings.id })
      .from(meetings)
      .where(
        and(
          eq(meetings.leadId, leadId),
          inArray(
            meetings.bookingSource,
            AI_ASSISTED_MEETING_BOOKING_SOURCES,
          ),
        ),
      )
      .limit(1);

    if (existingMeeting) {
      return;
    }

    await db.insert(meetings).values({
      leadId,
      scheduledFor: new Date("2026-03-14T15:30:00Z"),
      status: "scheduled",
      bookingSource: AI_ASSISTED_MEETING_BOOKING_SOURCE,
      owner: AI_ASSISTED_MEETING_OWNER,
      notes,
      outcome: "scheduled",
    });
  }

  private async markLeadAsContacted(leadId: string, touchpoint: string) {
    await db
      .update(leads)
      .set({
        status: "contacted",
        metadata: sql`jsonb_set(coalesce(${leads.metadata}, '{}'::jsonb), '{lastTouchpoint}', ${JSON.stringify(touchpoint)}::jsonb)`,
      })
      .where(eq(leads.id, leadId));
  }

  private async markLeadAsMeetingBooked(
    leadId: string,
    touchpoint: string,
    notes: string,
  ) {
    await db
      .update(leads)
      .set({
        status: "meeting_booked",
        metadata: sql`jsonb_set(coalesce(${leads.metadata}, '{}'::jsonb), '{lastTouchpoint}', ${JSON.stringify(touchpoint)}::jsonb)`,
      })
      .where(eq(leads.id, leadId));

    await this.ensureAiAssistedMeeting(leadId, notes);
  }

  async createContactIntake(
    input: CreateContactIntakeInput,
    metadata: Record<string, unknown> = {},
  ): Promise<ContactIntakeRecord> {
    await this.ensureInitialized();
    const routing = scoreContactIntake(input);
    const [submission] = await db
      .insert(contactIntakeSubmissions)
      .values({
        intent: input.intent,
        status: "new",
        priority: routing.priority,
        qualificationScore: routing.qualificationScore,
        routingRecommendation: routing.routingRecommendation,
        name: input.name,
        email: input.email,
        companyName: input.companyName,
        website: input.website,
        role: input.role,
        teamSize: input.teamSize,
        monthlyLeadGoal: input.monthlyLeadGoal,
        budgetRange: input.budgetRange,
        timeline: input.timeline,
        goals: input.goals,
        channels: input.channels,
        message: input.message,
        sourcePath: input.sourcePath,
        referrer: input.referrer,
        utm: input.utm,
        metadata,
      })
      .returning();

    return this.mapContactIntake(submission);
  }

  async getDashboard(): Promise<DashboardResponse> {
    await this.ensureInitialized();
    const { organization, workspace } = await this.workspaceContext();
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organization.id))
      .limit(1);
    const [onboarding] = await db
      .select()
      .from(onboardingSessions)
      .where(eq(onboardingSessions.workspaceId, workspace.id))
      .orderBy(desc(onboardingSessions.createdAt))
      .limit(1);
    const [sourcePlan] = await db
      .select()
      .from(sourcePlans)
      .where(eq(sourcePlans.workspaceId, workspace.id))
      .orderBy(desc(sourcePlans.createdAt))
      .limit(1);
    const leadRows = await db
      .select()
      .from(leads)
      .where(eq(leads.workspaceId, workspace.id))
      .orderBy(desc(leads.createdAt));
    const campaignRows = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.workspaceId, workspace.id))
      .orderBy(desc(campaigns.createdAt));
    const sourceRunRows = await db
      .select()
      .from(sourceRuns)
      .where(eq(sourceRuns.workspaceId, workspace.id))
      .orderBy(desc(sourceRuns.createdAt));
    const pendingProposalRows = await db
      .select()
      .from(actionProposals)
      .where(
        and(
          eq(actionProposals.workspaceId, workspace.id),
          eq(actionProposals.status, "pending"),
        ),
      )
      .orderBy(desc(actionProposals.createdAt));
    const callRows = await db
      .select({ call: callTasks })
      .from(callTasks)
      .innerJoin(leads, eq(callTasks.leadId, leads.id))
      .where(eq(leads.workspaceId, workspace.id))
      .orderBy(desc(callTasks.createdAt));
    const meetingRows = await db
      .select({ meeting: meetings })
      .from(meetings)
      .innerJoin(leads, eq(meetings.leadId, leads.id))
      .where(eq(leads.workspaceId, workspace.id))
      .orderBy(desc(meetings.createdAt));
    const activityRows = await db
      .select({ activity: outreachActivities })
      .from(outreachActivities)
      .innerJoin(campaigns, eq(outreachActivities.campaignId, campaigns.id))
      .where(eq(campaigns.workspaceId, workspace.id))
      .orderBy(desc(outreachActivities.createdAt));
    const monthlyUsage = await this.currentUsageQuantity(
      organization.id,
      "leads_created",
    );

    return {
      workspace: {
        organizationName: organization.name,
        workspaceName: workspace.name,
        region: organization.region,
        primaryChannel: "email",
      },
      metrics: [
        {
          label: "Qualified leads",
          value: String(
            leadRows.filter((lead) => lead.status !== "lost").length,
          ),
          detail: "Leads that passed initial qualification and remain active.",
        },
        {
          label: "Campaigns running",
          value: String(
            campaignRows.filter((campaign) => campaign.stage === "running")
              .length,
          ),
          detail: "Autonomous workflows currently executing outbound actions.",
        },
        {
          label: "Meetings booked",
          value: String(
            meetingRows.filter(({ meeting }) => meeting.status === "scheduled")
              .length,
          ),
          detail: "Meetings created from outbound and voice workflows.",
        },
      ],
      leads: leadRows.map((lead) => this.mapLead(lead)),
      campaigns: campaignRows.map((campaign) => this.mapCampaign(campaign)),
      subscription: {
        planKey: subscription.planKey,
        status: subscription.status,
        seats: subscription.seats,
        usageLimit: subscription.usageLimit,
        monthlyUsage,
      },
      actionItems: [
        ...(pendingProposalRows.length > 0
          ? [
              {
                id: "db-approval-inbox",
                title: `${pendingProposalRows.length} approval proposal${pendingProposalRows.length === 1 ? "" : "s"} waiting`,
                detail:
                  "Review proposed campaign, Telegram, provider, or AI-worker actions before they mutate workspace state.",
                urgency: pendingProposalRows.some(
                  (proposal) =>
                    proposal.riskLevel === "high" ||
                    proposal.riskLevel === "critical",
                )
                  ? ("high" as const)
                  : ("medium" as const),
              },
            ]
          : []),
        {
          id: "db-approval",
          title: "Approve first send for draft campaigns",
          detail:
            "Postgres-backed campaign state is active and waiting for operator approval.",
          urgency: "high" as const,
        },
      ],
      onboarding: {
        id: onboarding.id,
        status: onboarding.status,
        currentStep: onboarding.currentStep,
        transcript:
          (onboarding.transcript as DashboardResponse["onboarding"]["transcript"]) ??
          [],
        extractedProfile:
          (onboarding.extractedProfile as DashboardResponse["onboarding"]["extractedProfile"]) ??
          null,
        scraperBrief: onboarding.scraperBrief,
        outreachBrief: onboarding.outreachBrief,
      },
      sourcePlan: sourcePlan
        ? {
            id: sourcePlan.id,
            summary: sourcePlan.summary,
            sources: (sourcePlan.sources as string[]) ?? [],
            contactTargets: (sourcePlan.contactTargets as string[]) ?? [],
            searchTerms: (sourcePlan.searchTerms as string[]) ?? [],
            rationale: sourcePlan.rationale,
          }
        : null,
      sourceRuns: sourceRunRows.map((run) => this.mapSourceRun(run)),
      activities: activityRows.map(({ activity }) => ({
        id: activity.id,
        campaignId: activity.campaignId,
        leadId: activity.leadId,
        type: activity.type as DashboardResponse["activities"][number]["type"],
        provider: activity.provider ?? null,
        providerMessageId: activity.providerMessageId ?? null,
        status: activity.status,
        subject: activity.subject,
        preview: activity.preview,
        personalizedFor: activity.personalizedFor,
      })),
      calls: callRows.map(({ call }) => this.mapCall(call)),
      meetings: meetingRows.map(({ meeting }) => this.mapMeeting(meeting)),
    };
  }

  async getLeads() {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const rows = await db
      .select()
      .from(leads)
      .where(eq(leads.workspaceId, workspace.id))
      .orderBy(desc(leads.createdAt));
    return rows.map((lead) => this.mapLead(lead));
  }

  async getLead(id: string) {
    await this.ensureInitialized();
    const lead = await this.getScopedLeadRow(id);
    return lead ? this.mapLead(lead) : null;
  }

  async listSuppressions() {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const rows = await db
      .select()
      .from(contactSuppressions)
      .where(eq(contactSuppressions.workspaceId, workspace.id))
      .orderBy(desc(contactSuppressions.createdAt));

    return rows.map((suppression) => this.mapSuppression(suppression));
  }

  async createSuppression(input: CreateSuppressionInput, actorId?: string) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const normalizedContactValue = normalizeSuppressionContactValue(
      input.contactValue,
      input.channel,
    );
    const [existing] = await db
      .select()
      .from(contactSuppressions)
      .where(
        and(
          eq(contactSuppressions.workspaceId, workspace.id),
          eq(contactSuppressions.channel, input.channel),
          eq(
            contactSuppressions.normalizedContactValue,
            normalizedContactValue,
          ),
        ),
      )
      .limit(1);

    if (existing) {
      return this.mapSuppression(existing);
    }

    const [suppression] = await db
      .insert(contactSuppressions)
      .values({
        workspaceId: workspace.id,
        channel: input.channel,
        contactValue: input.contactValue.trim(),
        normalizedContactValue,
        reason: input.reason,
        source: input.source,
        createdByUserId: UUID_PATTERN.test(actorId ?? "") ? actorId : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      })
      .returning();

    return this.mapSuppression(suppression);
  }

  async checkSuppression(
    input: CheckSuppressionInput,
  ): Promise<SuppressionCheckResponse> {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const lookupChannels = suppressionLookupChannels(input.channel);
    const normalizedValues = new Set<string>();

    if (input.contactValue) {
      normalizedValues.add(
        normalizeSuppressionContactValue(input.contactValue, input.channel),
      );
    }

    if (input.email) {
      normalizedValues.add(
        normalizeSuppressionContactValue(input.email, "email"),
      );
    }

    if (input.phone) {
      normalizedValues.add(
        normalizeSuppressionContactValue(input.phone, "phone"),
      );
    }

    if (normalizedValues.size === 0) {
      return {
        suppressed: false,
        matchedSuppression: null,
        detail: "No contact value was available for suppression lookup.",
      };
    }

    const rows = await db
      .select()
      .from(contactSuppressions)
      .where(
        and(
          eq(contactSuppressions.workspaceId, workspace.id),
          inArray(contactSuppressions.channel, lookupChannels),
          inArray(
            contactSuppressions.normalizedContactValue,
            Array.from(normalizedValues),
          ),
        ),
      )
      .orderBy(desc(contactSuppressions.createdAt));
    const now = Date.now();
    const matched = rows.find(
      (suppression) =>
        !suppression.expiresAt || suppression.expiresAt.getTime() > now,
    );
    const matchedSuppression = matched ? this.mapSuppression(matched) : null;

    return {
      suppressed: Boolean(matchedSuppression),
      matchedSuppression,
      detail: matchedSuppression
        ? `Suppressed by ${matchedSuppression.reason} rule from ${matchedSuppression.source}.`
        : "No active suppression matched this contact.",
    };
  }

  async getTelegramIntegration() {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const [integration] = await db
      .select()
      .from(telegramIntegrations)
      .where(eq(telegramIntegrations.workspaceId, workspace.id))
      .limit(1);

    return this.mapTelegramIntegration(integration);
  }

  async upsertTelegramIntegration(
    input: ConfigureTelegramIntegrationInput,
    actorId?: string,
  ) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const chatIdHash = hashTelegramChatId(input.chatId);
    const chatIdMask = maskTelegramChatId(input.chatId);
    const [existingChat] = await db
      .select({
        workspaceId: telegramIntegrations.workspaceId,
      })
      .from(telegramIntegrations)
      .where(eq(telegramIntegrations.chatIdHash, chatIdHash))
      .limit(1);

    if (existingChat && existingChat.workspaceId !== workspace.id) {
      throw new Error("Telegram chat is already bound to another workspace.");
    }

    const values = {
      workspaceId: workspace.id,
      botUsername: input.botUsername,
      chatIdHash,
      chatIdMask,
      status: "pending_verification",
      allowedCommands: input.allowedCommands,
      lastUpdateId: null,
      createdByUserId: UUID_PATTERN.test(actorId ?? "") ? actorId : null,
      lastVerifiedAt: null,
      updatedAt: new Date(),
    };
    const [integration] = await db
      .insert(telegramIntegrations)
      .values(values)
      .onConflictDoUpdate({
        target: telegramIntegrations.workspaceId,
        set: values,
      })
      .returning();

    return this.mapTelegramIntegration(integration);
  }

  async resolveTelegramIntegrationByChatIdHash(chatIdHash: string) {
    await this.ensureInitialized();
    const [row] = await db
      .select({
        integration: telegramIntegrations,
        workspaceId: telegramIntegrations.workspaceId,
        organizationId: workspaces.organizationId,
      })
      .from(telegramIntegrations)
      .innerJoin(
        workspaces,
        eq(telegramIntegrations.workspaceId, workspaces.id),
      )
      .where(eq(telegramIntegrations.chatIdHash, chatIdHash))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      integration: this.mapTelegramIntegration(row.integration),
      organizationId: row.organizationId,
      workspaceId: row.workspaceId,
    };
  }

  async claimTelegramWebhookUpdate(
    chatIdHash: string,
    updateId: number | null,
  ) {
    await this.ensureInitialized();

    if (updateId === null) {
      return true;
    }

    const [integration] = await db
      .update(telegramIntegrations)
      .set({
        lastUpdateId: updateId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(telegramIntegrations.chatIdHash, chatIdHash),
          sql`(${telegramIntegrations.lastUpdateId} is null or ${telegramIntegrations.lastUpdateId} < ${updateId})`,
        ),
      )
      .returning({
        id: telegramIntegrations.id,
      });

    return Boolean(integration);
  }

  async claimTelegramCommandRateLimit(chatIdHash: string) {
    await this.ensureInitialized();
    const { organization, workspace } = await this.workspaceContext();
    const { limit, windowSeconds, windowMs } = telegramCommandRateLimitConfig();
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${chatIdHash}, 0))`,
      );

      const [windowState] = await tx
        .select({
          count: sql<number>`count(*)::int`,
          oldestClaimedAt: sql<Date | null>`min(${auditEvents.createdAt})`,
        })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.organizationId, organization.id),
            eq(auditEvents.eventType, TELEGRAM_RATE_LIMIT_CLAIM_EVENT),
            gte(auditEvents.createdAt, windowStart),
            sql`${auditEvents.payload}->>'chatIdHash' = ${chatIdHash}`,
          ),
        );

      const claimCount = Number(windowState?.count ?? 0);

      if (claimCount >= limit) {
        const oldestClaimedAt = windowState?.oldestClaimedAt;
        const oldestClaimedMs =
          oldestClaimedAt instanceof Date
            ? oldestClaimedAt.getTime()
            : oldestClaimedAt
              ? new Date(oldestClaimedAt).getTime()
              : now.getTime();
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((oldestClaimedMs + windowMs - now.getTime()) / 1000),
        );

        return {
          allowed: false,
          limit,
          remaining: 0,
          retryAfterSeconds,
          windowSeconds,
          detail: `Telegram command rate limit reached for this chat. Retry after ${retryAfterSeconds} seconds.`,
        } satisfies TelegramCommandRateLimitResult;
      }

      await tx.insert(auditEvents).values({
        organizationId: organization.id,
        actorType: "telegram",
        eventType: TELEGRAM_RATE_LIMIT_CLAIM_EVENT,
        payload: {
          workspaceId: workspace.id,
          chatIdHash,
          limit,
          windowSeconds,
        },
      });

      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - claimCount - 1),
        retryAfterSeconds: 0,
        windowSeconds,
        detail: `Telegram command rate limit allows ${limit} command${limit === 1 ? "" : "s"} per ${windowSeconds} seconds.`,
      } satisfies TelegramCommandRateLimitResult;
    });
  }

  async markTelegramIntegrationVerified(chatIdHash: string) {
    await this.ensureInitialized();
    const now = new Date();
    const [integration] = await db
      .update(telegramIntegrations)
      .set({
        status: "active",
        lastVerifiedAt: now,
        updatedAt: now,
      })
      .where(eq(telegramIntegrations.chatIdHash, chatIdHash))
      .returning();

    return integration ? this.mapTelegramIntegration(integration) : null;
  }

  async disableTelegramIntegration(actorId?: string) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const [integration] = await db
      .update(telegramIntegrations)
      .set({
        status: "disabled",
        updatedAt: new Date(),
      })
      .where(eq(telegramIntegrations.workspaceId, workspace.id))
      .returning();

    if (integration) {
      return this.mapTelegramIntegration(integration);
    }

    await this.audit({
      organizationId: null,
      actorType: "user",
      actorId,
      eventType: "telegram.integration.disable.empty",
      payload: {
        workspaceId: workspace.id,
        detail: "Disable requested before a Telegram integration existed.",
      },
    });

    return this.mapTelegramIntegration(null);
  }

  async listTelegramCommandAudits() {
    await this.ensureInitialized();
    const { organization } = await this.workspaceContext();
    const rows = await db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.organizationId, organization.id),
          sql`${auditEvents.eventType} like 'telegram.command.%'`,
        ),
      )
      .orderBy(desc(auditEvents.createdAt))
      .limit(8);

    return rows.map((row) => {
      const payload = row.payload as Record<string, unknown>;
      const parsedResult = telegramCommandResultSchema.safeParse(
        payload.result,
      );

      return {
        id: row.id,
        command: String(
          payload.command ?? row.eventType.replace("telegram.command.", ""),
        ),
        chatIdMask: String(payload.chatIdMask ?? "unknown"),
        result: parsedResult.success ? parsedResult.data : "denied",
        detail: String(payload.detail ?? ""),
        createdAt: row.createdAt.toISOString(),
      } satisfies TelegramCommandAudit;
    });
  }

  async recordTelegramCommandAudit(input: TelegramCommandAuditInput) {
    await this.ensureInitialized();
    let organizationId = input.organizationId ?? null;

    if (
      !organizationId &&
      (this.context?.organizationId || this.context?.workspaceId)
    ) {
      try {
        const { organization } = await this.workspaceContext();
        organizationId = organization.id;
      } catch {
        // No scoped organization context available.
      }
    }

    if (!organizationId) {
      return {
        id: `tg_audit_${Math.random().toString(36).slice(2, 10)}`,
        command: input.command,
        chatIdMask: input.chatIdMask,
        result: input.result,
        detail: input.detail,
        createdAt: new Date().toISOString(),
      };
    }

    const [created] = await db
      .insert(auditEvents)
      .values({
        organizationId,
        actorType: "telegram",
        eventType: `telegram.command.${input.command}`,
        payload: {
          integrationId: input.integrationId ?? null,
          workspaceId: input.workspaceId ?? this.context?.workspaceId ?? null,
          actor: input.actor ?? null,
          command: input.command,
          chatIdMask: input.chatIdMask,
          result: input.result,
          detail: input.detail,
        },
      })
      .returning();

    return {
      id: created.id,
      command: input.command,
      chatIdMask: input.chatIdMask,
      result: input.result,
      detail: input.detail,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async claimTelegramNotificationDelivery(
    input: TelegramNotificationDeliveryClaimInput,
  ) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const enforcedLimit = Math.min(120, Math.max(1, input.maxNotificationsPerHour));
    const windowSeconds = 3600;
    const windowMs = windowSeconds * 1000;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${workspace.id}:telegram-notification-delivery`}, 0))`,
      );

      const [windowState] = await tx
        .select({
          count: sql<number>`count(*)::int`,
          oldestClaimedAt: sql<Date | null>`min(${telegramNotificationDeliveries.createdAt})`,
        })
        .from(telegramNotificationDeliveries)
        .where(
          and(
            eq(telegramNotificationDeliveries.workspaceId, workspace.id),
            eq(telegramNotificationDeliveries.provider, "telegram"),
            gte(telegramNotificationDeliveries.createdAt, windowStart),
          ),
        );

      const claimCount = Number(windowState?.count ?? 0);
      const allowed = claimCount < enforcedLimit;
      const oldestClaimedAt = windowState?.oldestClaimedAt;
      const oldestClaimedMs =
        oldestClaimedAt instanceof Date
          ? oldestClaimedAt.getTime()
          : oldestClaimedAt
            ? new Date(oldestClaimedAt).getTime()
            : now.getTime();
      const retryAfterSeconds = allowed
        ? 0
        : Math.max(
            1,
            Math.ceil((oldestClaimedMs + windowMs - now.getTime()) / 1000),
          );
      const integrationId =
        input.integrationId && UUID_PATTERN.test(input.integrationId)
          ? input.integrationId
          : null;
      const actorId =
        input.actorId && UUID_PATTERN.test(input.actorId) ? input.actorId : null;
      const [delivery] = await tx
        .insert(telegramNotificationDeliveries)
        .values({
          workspaceId: workspace.id,
          integrationId,
          actorId,
          notificationType: input.notificationType,
          mode: allowed ? "claimed" : "blocked",
          provider: "telegram",
          chatIdMask: input.chatIdMask,
          dryRun: input.dryRun,
          targetChatConfigured: input.targetChatConfigured,
          targetChatMatchesWorkspace: input.targetChatMatchesWorkspace,
          rateLimitLimit: enforcedLimit,
          rateLimitWindowSeconds: windowSeconds,
          detail: allowed
            ? "Telegram notification delivery claimed for rate-cap enforcement."
            : "Telegram notification delivery blocked before transport by the rate cap.",
          metadata: {
            deliveryKind: "test",
            requestedWorkspaceId: input.workspaceId ?? null,
            rateLimit: {
              enforcedLimit,
              usedBeforeClaim: claimCount,
              remainingBeforeClaim: Math.max(0, enforcedLimit - claimCount),
              windowSeconds,
            },
          },
        })
        .returning({
          id: telegramNotificationDeliveries.id,
        });

      return {
        allowed,
        deliveryId: delivery?.id ?? null,
        enforcedLimit,
        used: allowed ? claimCount + 1 : claimCount,
        remaining: allowed ? Math.max(0, enforcedLimit - claimCount - 1) : 0,
        retryAfterSeconds,
        windowSeconds,
        detail: allowed
          ? `Telegram notification delivery ledger allows ${enforcedLimit} attempt${enforcedLimit === 1 ? "" : "s"} per hour.`
          : `Telegram notification delivery ledger rate cap reached: ${claimCount}/${enforcedLimit} attempts in the last hour.`,
      } satisfies TelegramNotificationDeliveryClaim;
    });
  }

  async completeTelegramNotificationDelivery(
    input: CompleteTelegramNotificationDeliveryInput,
  ) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const now = new Date();
    await db
      .update(telegramNotificationDeliveries)
      .set({
        mode: input.mode,
        messagePreview: input.messagePreview,
        detail: input.detail,
        metadata: {
          guardrails: input.guardrails,
        },
        deliveredAt: input.mode === "queued" ? now : null,
        updatedAt: now,
      })
      .where(
        and(
          eq(telegramNotificationDeliveries.id, input.deliveryId),
          eq(telegramNotificationDeliveries.workspaceId, workspace.id),
        ),
      );
  }

  async createOnboardingSession(input: OnboardingSessionInput) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const seedSession = this.state.memory.createOnboardingSession(input);
    const [session] = await db
      .insert(onboardingSessions)
      .values({
        workspaceId: workspace.id,
        status: seedSession.status,
        currentStep: seedSession.currentStep,
        transcript: seedSession.transcript,
        extractedProfile: null,
        scraperBrief: null,
        outreachBrief: null,
      })
      .returning();

    return {
      ...seedSession,
      id: session.id,
    };
  }

  async appendOnboardingMessage(id: string, input: OnboardingMessageInput) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const [session] = await db
      .select()
      .from(onboardingSessions)
      .where(
        and(
          eq(onboardingSessions.id, id),
          eq(onboardingSessions.workspaceId, workspace.id),
        ),
      )
      .limit(1);
    if (!session) {
      return null;
    }

    const transcript = [
      ...((session.transcript as DashboardResponse["onboarding"]["transcript"]) ??
        []),
      { role: "user" as const, content: input.content },
      {
        role: "assistant" as const,
        content:
          "Noted. I am refining your ICP, channel mix, and compliance-safe outreach plan based on that detail.",
      },
    ];

    const [updated] = await db
      .update(onboardingSessions)
      .set({
        transcript,
        currentStep: "goals-and-channels",
      })
      .where(
        and(
          eq(onboardingSessions.id, id),
          eq(onboardingSessions.workspaceId, workspace.id),
        ),
      )
      .returning();

    return {
      id: updated.id,
      status: updated.status,
      currentStep: updated.currentStep,
      transcript:
        updated.transcript as DashboardResponse["onboarding"]["transcript"],
      extractedProfile:
        updated.extractedProfile as DashboardResponse["onboarding"]["extractedProfile"],
      scraperBrief: updated.scraperBrief,
      outreachBrief: updated.outreachBrief,
    };
  }

  async finalizeOnboarding(id: string) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const [session] = await db
      .select()
      .from(onboardingSessions)
      .where(
        and(
          eq(onboardingSessions.id, id),
          eq(onboardingSessions.workspaceId, workspace.id),
        ),
      )
      .limit(1);
    if (!session) {
      return null;
    }

    const transcript =
      (session.transcript as DashboardResponse["onboarding"]["transcript"]) ??
      [];
    const synthesizedSession = {
      id: session.id,
      status: session.status,
      currentStep: session.currentStep,
      transcript,
      extractedProfile: null,
      scraperBrief: null,
      outreachBrief: null,
    } as DashboardResponse["onboarding"];
    const extractedProfile = inferProfile(synthesizedSession);
    const sourcePlan = buildSourcePlan(extractedProfile);
    const scraperBrief =
      "Search websites, directories, and search results for founder-led SMBs matching the ICP; prioritize public email, phone, and contact pages.";
    const outreachBrief =
      "Start with tailored email, escalate to call for high-score leads, and convert interest into booked meetings with a consultative tone.";

    const [updated] = await db
      .update(onboardingSessions)
      .set({
        status: "completed",
        currentStep: "complete",
        extractedProfile,
        scraperBrief,
        outreachBrief,
      })
      .where(
        and(
          eq(onboardingSessions.id, id),
          eq(onboardingSessions.workspaceId, workspace.id),
        ),
      )
      .returning();

    if (sourcePlan) {
      await db.insert(sourcePlans).values({
        workspaceId: session.workspaceId,
        summary: sourcePlan.summary,
        sources: sourcePlan.sources,
        contactTargets: sourcePlan.contactTargets,
        searchTerms: sourcePlan.searchTerms,
        rationale: sourcePlan.rationale,
      });
    }

    const blueprint = buildSalesBlueprintFromProfile(
      extractedProfile,
      sourcePlan,
    );
    await db
      .insert(salesBlueprints)
      .values({
        workspaceId: session.workspaceId,
        status: blueprint.status,
        businessProfile: blueprint.businessProfile,
        icpSummary: blueprint.icpSummary,
        buyerRoles: blueprint.buyerRoles,
        painPoints: blueprint.painPoints,
        disqualifiers: blueprint.disqualifiers,
        qualificationRules: blueprint.qualificationRules,
        sourceChannels: blueprint.sourceChannels,
        outreachChannels: blueprint.outreachChannels,
        searchKeywords: blueprint.searchKeywords,
        monthlyLeadTarget: blueprint.monthlyLeadTarget,
        meetingTarget: blueprint.meetingTarget,
        averageContractValue: blueprint.averageContractValue,
        automationMode: blueprint.automationMode,
        approvalRequiredFor: blueprint.approvalRequiredFor,
        complianceNotes: blueprint.complianceNotes,
        readinessScore: blueprint.readinessScore,
        readinessGaps: blueprint.readinessGaps,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: salesBlueprints.workspaceId,
        set: {
          status: blueprint.status,
          businessProfile: blueprint.businessProfile,
          icpSummary: blueprint.icpSummary,
          buyerRoles: blueprint.buyerRoles,
          painPoints: blueprint.painPoints,
          disqualifiers: blueprint.disqualifiers,
          qualificationRules: blueprint.qualificationRules,
          sourceChannels: blueprint.sourceChannels,
          outreachChannels: blueprint.outreachChannels,
          searchKeywords: blueprint.searchKeywords,
          monthlyLeadTarget: blueprint.monthlyLeadTarget,
          meetingTarget: blueprint.meetingTarget,
          averageContractValue: blueprint.averageContractValue,
          automationMode: blueprint.automationMode,
          approvalRequiredFor: blueprint.approvalRequiredFor,
          complianceNotes: blueprint.complianceNotes,
          readinessScore: blueprint.readinessScore,
          readinessGaps: blueprint.readinessGaps,
          updatedAt: new Date(),
        },
      });

    return {
      id: updated.id,
      status: updated.status,
      currentStep: updated.currentStep,
      transcript:
        updated.transcript as DashboardResponse["onboarding"]["transcript"],
      extractedProfile:
        updated.extractedProfile as DashboardResponse["onboarding"]["extractedProfile"],
      scraperBrief: updated.scraperBrief,
      outreachBrief: updated.outreachBrief,
    };
  }

  async getBusinessProfile() {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const [session] = await db
      .select()
      .from(onboardingSessions)
      .where(eq(onboardingSessions.workspaceId, workspace.id))
      .orderBy(desc(onboardingSessions.createdAt))
      .limit(1);
    return (
      (session?.extractedProfile as DashboardResponse["onboarding"]["extractedProfile"]) ??
      null
    );
  }

  async getSalesBlueprint() {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const [blueprint] = await db
      .select()
      .from(salesBlueprints)
      .where(eq(salesBlueprints.workspaceId, workspace.id))
      .limit(1);

    if (blueprint) {
      return this.mapSalesBlueprint(blueprint);
    }

    const profile = await this.getBusinessProfile();
    if (!profile) {
      return null;
    }

    return buildSalesBlueprintFromProfile(profile, await this.getSourcePlan());
  }

  async upsertSalesBlueprint(
    input: UpsertSalesBlueprintInput,
    actorId?: string,
  ) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const [existing] = await db
      .select({ id: salesBlueprints.id })
      .from(salesBlueprints)
      .where(eq(salesBlueprints.workspaceId, workspace.id))
      .limit(1);
    const blueprint = buildSalesBlueprintFromInput(input, existing?.id);
    const values = {
      workspaceId: workspace.id,
      status: blueprint.status,
      businessProfile: blueprint.businessProfile,
      icpSummary: blueprint.icpSummary,
      buyerRoles: blueprint.buyerRoles,
      painPoints: blueprint.painPoints,
      disqualifiers: blueprint.disqualifiers,
      qualificationRules: blueprint.qualificationRules,
      sourceChannels: blueprint.sourceChannels,
      outreachChannels: blueprint.outreachChannels,
      searchKeywords: blueprint.searchKeywords,
      monthlyLeadTarget: blueprint.monthlyLeadTarget,
      meetingTarget: blueprint.meetingTarget,
      averageContractValue: blueprint.averageContractValue,
      automationMode: blueprint.automationMode,
      approvalRequiredFor: blueprint.approvalRequiredFor,
      complianceNotes: blueprint.complianceNotes,
      readinessScore: blueprint.readinessScore,
      readinessGaps: blueprint.readinessGaps,
      createdByUserId: UUID_PATTERN.test(actorId ?? "") ? actorId : null,
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(salesBlueprints)
      .values(values)
      .onConflictDoUpdate({
        target: salesBlueprints.workspaceId,
        set: values,
      })
      .returning();

    await db.insert(onboardingSessions).values({
      workspaceId: workspace.id,
      status: "completed",
      currentStep: "sales-blueprint",
      transcript: [
        {
          role: "assistant",
          content: "Sales blueprint saved from workspace settings.",
        },
      ],
      extractedProfile: blueprint.businessProfile,
      scraperBrief:
        "Use the sales blueprint source channels, search keywords, regions, and disqualifiers before accepting leads.",
      outreachBrief:
        "Use the sales blueprint voice, approval gates, outreach channels, and compliance notes before dispatch.",
    });

    await db.insert(sourcePlans).values({
      workspaceId: workspace.id,
      summary: `Prioritize ${blueprint.icpSummary} through ${blueprint.sourceChannels.join(", ")}.`,
      sources: blueprint.sourceChannels,
      contactTargets: blueprint.outreachChannels,
      searchTerms: blueprint.searchKeywords,
      rationale:
        "Generated from the workspace sales blueprint so lead discovery stays aligned with ICP, goals, regions, and governance.",
    });

    await this.audit({
      organizationId: workspace.organizationId,
      actorType: "user",
      actorId,
      eventType: "sales_blueprint.upsert",
      payload: {
        workspaceId: workspace.id,
        status: blueprint.status,
        readinessScore: blueprint.readinessScore,
        automationMode: blueprint.automationMode,
      },
    });

    return this.mapSalesBlueprint(row);
  }

  async checkUsageEntitlement(
    metric: UsageEntitlementMetric,
    requestedQuantity = 1,
  ) {
    await this.ensureInitialized();
    const { organization } = await this.workspaceContext();
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organization.id))
      .limit(1);

    if (!subscription) {
      return evaluateUsageEntitlement({
        metric,
        planKey: "none",
        subscriptionStatus: "canceled",
        currentUsage: 0,
        usageLimit: 1,
        requestedQuantity,
        enforceLimit: true,
      });
    }
    const usageLimit =
      metric === "provider_cost_cents"
        ? getPlanProviderCostBudgetCents(subscription.planKey)
        : metric === "outreach_dispatches"
          ? getPlanOutreachDispatchLimit(subscription.planKey)
          : metric === "voice_calls"
            ? getPlanVoiceCallLimit(subscription.planKey)
            : metric === "ai_worker_task_proposals"
              ? getPlanAiWorkerTaskProposalLimit(subscription.planKey)
              : metric === "ai_worker_execution_cents"
                ? getPlanAiWorkerExecutionBudgetCents(subscription.planKey)
                : subscription.usageLimit;

    return evaluateUsageEntitlement({
      metric,
      planKey: subscription.planKey,
      subscriptionStatus: subscription.status,
      currentUsage: await this.currentUsageQuantity(organization.id, metric),
      usageLimit,
      requestedQuantity,
      enforceLimit: true,
    });
  }

  async checkChannelEntitlement(channel: OutboundChannel) {
    await this.ensureInitialized();
    const { organization } = await this.workspaceContext();
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organization.id))
      .limit(1);

    if (!subscription) {
      return evaluateChannelEntitlement({
        channel,
        planKey: "none",
        subscriptionStatus: "canceled",
        includedChannels: [],
      });
    }

    return evaluateChannelEntitlement({
      channel,
      planKey: subscription.planKey,
      subscriptionStatus: subscription.status,
      includedChannels: getPlanIncludedChannels(subscription.planKey),
    });
  }

  async listActionProposals(status?: ActionProposalStatus) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const rows = await db
      .select()
      .from(actionProposals)
      .where(
        status
          ? and(
              eq(actionProposals.workspaceId, workspace.id),
              eq(actionProposals.status, status),
            )
          : eq(actionProposals.workspaceId, workspace.id),
      )
      .orderBy(desc(actionProposals.createdAt));

    return rows.map((proposal) => this.mapActionProposal(proposal));
  }

  async createActionProposal(
    input: CreateActionProposalInput,
    actorId?: string,
  ) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    const [proposal] = await db
      .insert(actionProposals)
      .values({
        workspaceId: workspace.id,
        type: input.type,
        status: "pending",
        riskLevel: input.riskLevel,
        title: input.title,
        detail: input.detail,
        proposedBy: input.proposedBy,
        targetKind: input.targetKind,
        targetId: input.targetId ?? null,
        targetLabel: input.targetLabel,
        payloadSummary: input.payloadSummary,
        payload: input.payload,
        guardrails: input.guardrails,
        expectedEffect: input.expectedEffect,
        rollbackPlan: input.rollbackPlan,
        requiredRole: input.requiredRole,
        requestedBy: input.requestedBy ?? null,
        createdByUserId: UUID_PATTERN.test(actorId ?? "") ? actorId : null,
        expiresAt:
          expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
      })
      .returning();

    return this.mapActionProposal(proposal);
  }

  async getAiWorkerControlPlane() {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    await this.ensureAiWorkersForWorkspace(workspace.id);

    const workerRows = await db
      .select()
      .from(aiWorkers)
      .where(eq(aiWorkers.workspaceId, workspace.id))
      .orderBy(desc(aiWorkers.updatedAt));
    const runRows = await db
      .select({
        run: aiWorkerRuns,
        worker: aiWorkers,
      })
      .from(aiWorkerRuns)
      .innerJoin(aiWorkers, eq(aiWorkerRuns.workerId, aiWorkers.id))
      .where(eq(aiWorkerRuns.workspaceId, workspace.id))
      .orderBy(desc(aiWorkerRuns.createdAt));
    const workers = workerRows.map((worker) => this.mapAiWorker(worker));
    const runs = runRows.map(({ run, worker }) =>
      this.mapAiWorkerRun(run, worker.name),
    );

    return aiWorkerControlPlaneResponseSchema.parse({
      workers,
      runs,
      summary: {
        active: workers.filter((worker) => worker.status === "active").length,
        paused: workers.filter((worker) => worker.status === "paused").length,
        disabled: workers.filter((worker) => worker.status === "disabled")
          .length,
        pendingApproval: runs.filter((run) => run.status === "proposed").length,
        blocked: runs.filter((run) => run.status === "blocked").length,
        budgetUsedCents: workers.reduce(
          (total, worker) => total + worker.budgetUsedCents,
          0,
        ),
        budgetLimitCents: workers.reduce(
          (total, worker) => total + worker.monthlyBudgetCents,
          0,
        ),
      },
    });
  }

  async createAiWorkerTaskProposal(
    input: CreateAiWorkerTaskInput,
    actorId?: string,
  ) {
    await this.ensureInitialized();
    const { organization, workspace } = await this.workspaceContext();
    await this.ensureAiWorkersForWorkspace(workspace.id);
    const createdByUserId = UUID_PATTERN.test(actorId ?? "") ? actorId : null;
    const now = new Date();

    const result = await db.transaction(async (tx) => {
      const [worker] = await tx
        .select()
        .from(aiWorkers)
        .where(
          and(
            eq(aiWorkers.id, input.workerId),
            eq(aiWorkers.workspaceId, workspace.id),
          ),
        )
        .limit(1);

      if (!worker) {
        return null;
      }

      const blockedReason = aiWorkerTaskBlockReason(
        worker,
        input.expectedCostCents,
      );

      if (blockedReason) {
        const [run] = await tx
          .insert(aiWorkerRuns)
          .values({
            workspaceId: workspace.id,
            workerId: worker.id,
            status: "blocked",
            title: input.title,
            detail: input.detail,
            riskLevel: input.riskLevel,
            proposedAction: input.proposedAction,
            expectedCostCents: input.expectedCostCents,
            actualCostCents: 0,
            approvalProposalId: null,
            blockedReason,
          })
          .returning();

        await tx
          .update(aiWorkers)
          .set({
            lastActionAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(aiWorkers.id, worker.id),
              eq(aiWorkers.workspaceId, workspace.id),
            ),
          );

        await tx.insert(auditEvents).values({
          organizationId: organization.id,
          actorType: "user",
          actorId: createdByUserId,
          eventType: "ai_worker_task.blocked",
          payload: {
            workspaceId: workspace.id,
            workerId: worker.id,
            workerName: worker.name,
            runId: run.id,
            riskLevel: input.riskLevel,
            expectedCostCents: input.expectedCostCents,
            blockedReason,
          },
        });

        return {
          run,
          workerName: worker.name,
        };
      }

      const [proposal] = await tx
        .insert(actionProposals)
        .values({
          workspaceId: workspace.id,
          type: "ai_worker_action",
          status: "pending",
          riskLevel: input.riskLevel,
          title: input.title,
          detail: input.detail,
          proposedBy: "ai",
          targetKind: "ai_worker",
          targetId: worker.id,
          targetLabel: worker.name,
          payloadSummary: `Propose ${worker.name} task with an expected budget of ${input.expectedCostCents} cents.`,
          payload: {
            workerId: worker.id,
            proposedAction: input.proposedAction,
            expectedCostCents: input.expectedCostCents,
            permissions: worker.permissions,
            allowedTools: worker.allowedTools,
          },
          guardrails: worker.guardrails,
          expectedEffect:
            "Creates a governed worker task record; no tool execution occurs until approved controls are implemented.",
          rollbackPlan:
            "Reject the proposal or pause the worker; proposed tasks do not mutate workspace state.",
          requiredRole: worker.ownerRole,
          requestedBy: "ai-worker-control-plane",
          createdByUserId,
        })
        .returning();

      const [run] = await tx
        .insert(aiWorkerRuns)
        .values({
          workspaceId: workspace.id,
          workerId: worker.id,
          status: "proposed",
          title: input.title,
          detail: input.detail,
          riskLevel: input.riskLevel,
          proposedAction: input.proposedAction,
          expectedCostCents: input.expectedCostCents,
          actualCostCents: 0,
          approvalProposalId: proposal.id,
        })
        .returning();

      await tx
        .update(actionProposals)
        .set({
          payload: {
            workerId: worker.id,
            runId: run.id,
            proposedAction: input.proposedAction,
            expectedCostCents: input.expectedCostCents,
            permissions: worker.permissions,
            allowedTools: worker.allowedTools,
          },
        })
        .where(eq(actionProposals.id, proposal.id));

      await tx
        .update(aiWorkers)
        .set({
          lastActionAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(aiWorkers.id, worker.id),
            eq(aiWorkers.workspaceId, workspace.id),
          ),
        );

      await tx.insert(usageEvents).values({
        organizationId: organization.id,
        metric: "ai_worker_task_proposals",
        quantity: 1,
        metadata: {
          workspaceId: workspace.id,
          workerId: worker.id,
          runId: run.id,
          proposalId: proposal.id,
          origin: "ai_worker_task_proposal",
        },
      });

      return {
        run,
        workerName: worker.name,
      };
    });

    return result ? this.mapAiWorkerRun(result.run, result.workerName) : null;
  }

  async reviewActionProposal(
    id: string,
    input: ReviewActionProposalInput,
    reviewer: { id?: string; name: string },
  ) {
    await this.ensureInitialized();
    const { organization, workspace } = await this.workspaceContext();
    const reviewedAt = new Date();
    const status = input.decision === "approve" ? "approved" : "rejected";
    const reviewerUserId = UUID_PATTERN.test(reviewer.id ?? "")
      ? reviewer.id!
      : null;

    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(actionProposals)
        .where(
          and(
            eq(actionProposals.id, id),
            eq(actionProposals.workspaceId, workspace.id),
          ),
        )
        .limit(1);

      if (!existing || existing.status !== "pending") {
        return null;
      }

      const [audit] = await tx
        .insert(auditEvents)
        .values({
          organizationId: organization.id,
          actorType: "user",
          actorId: reviewerUserId,
          eventType: `action_proposal.${status}`,
          payload: {
            workspaceId: workspace.id,
            proposalId: existing.id,
            type: existing.type,
            riskLevel: existing.riskLevel,
            targetKind: existing.targetKind,
            targetId: existing.targetId,
            decision: input.decision,
            reviewerName: reviewer.name,
          },
        })
        .returning();

      const [proposal] = await tx
        .update(actionProposals)
        .set({
          status,
          reviewedByUserId: reviewerUserId,
          reviewedByName: reviewer.name,
          reviewNote: input.note,
          auditEventId: audit.id,
          reviewedAt,
          updatedAt: reviewedAt,
        })
        .where(
          and(
            eq(actionProposals.id, id),
            eq(actionProposals.workspaceId, workspace.id),
          ),
        )
        .returning();

      if (
        status === "approved" &&
        existing.type === "campaign_dispatch" &&
        UUID_PATTERN.test(existing.targetId ?? "")
      ) {
        await tx
          .update(campaigns)
          .set({
            approved: true,
            stage: "approved",
            nextActionAt: `Approved by ${reviewer.name}`,
            updatedAt: reviewedAt,
          })
          .where(
            and(
              eq(campaigns.id, existing.targetId!),
              eq(campaigns.workspaceId, workspace.id),
            ),
          );
      }

      if (status === "approved" && existing.type === "telegram_pause") {
        await tx
          .update(campaigns)
          .set({
            stage: "paused",
            nextActionAt: `Paused by ${reviewer.name} from approval inbox`,
            updatedAt: reviewedAt,
          })
          .where(
            and(
              eq(campaigns.workspaceId, workspace.id),
              eq(campaigns.stage, "running"),
            ),
          );
      }

      if (existing.type === "ai_worker_action") {
        await tx
          .update(aiWorkerRuns)
          .set({
            status: status === "approved" ? "approved" : "rejected",
            resultSummary:
              status === "approved"
                ? `Approved by ${reviewer.name}; task is ready for a governed executor. No tool ran automatically.`
                : null,
            blockedReason:
              status === "rejected"
                ? `Rejected by ${reviewer.name}; no worker tools ran.`
                : null,
            updatedAt: reviewedAt,
          })
          .where(
            and(
              eq(aiWorkerRuns.workspaceId, workspace.id),
              eq(aiWorkerRuns.approvalProposalId, existing.id),
            ),
          );
      }

      return proposal;
    });

    return updated ? this.mapActionProposal(updated) : null;
  }

  async completeAiWorkerRun(
    id: string,
    input: CompleteAiWorkerRunInput,
    actor: { id?: string; name: string },
  ): Promise<AiWorkerRunResultWrite> {
    await this.ensureInitialized();
    const { organization, workspace } = await this.workspaceContext();
    const completedAt = new Date();
    const actorUserId = UUID_PATTERN.test(actor.id ?? "") ? actor.id! : null;

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          run: aiWorkerRuns,
          worker: aiWorkers,
        })
        .from(aiWorkerRuns)
        .innerJoin(aiWorkers, eq(aiWorkerRuns.workerId, aiWorkers.id))
        .where(
          and(
            eq(aiWorkerRuns.id, id),
            eq(aiWorkerRuns.workspaceId, workspace.id),
          ),
        )
        .limit(1);

      if (!existing) {
        return {
          run: null,
          status: 404 as const,
          error: "AI worker run not found in this workspace.",
        };
      }

      if (existing.run.status !== "approved") {
        return {
          run: null,
          status: 409 as const,
          error: "Only approved AI worker runs can receive dry-run results.",
        };
      }

      if (input.actualCostCents > existing.run.expectedCostCents) {
        return {
          run: null,
          status: 409 as const,
          error:
            "Actual dry-run cost cannot exceed the approved expected cost.",
        };
      }

      const remainingBudgetCents = Math.max(
        0,
        existing.worker.monthlyBudgetCents - existing.worker.budgetUsedCents,
      );
      if (input.actualCostCents > remainingBudgetCents) {
        return {
          run: null,
          status: 409 as const,
          error:
            "Actual dry-run cost exceeds the worker's remaining monthly budget.",
        };
      }

      const [run] = await tx
        .update(aiWorkerRuns)
        .set({
          status: "completed",
          actualCostCents: input.actualCostCents,
          resultSummary: `${input.resultSummary} Recorded by ${actor.name}; no external worker tool ran automatically.`,
          blockedReason: null,
          completedAt,
          updatedAt: completedAt,
        })
        .where(
          and(
            eq(aiWorkerRuns.id, id),
            eq(aiWorkerRuns.workspaceId, workspace.id),
          ),
        )
        .returning();

      await tx
        .update(aiWorkers)
        .set({
          budgetUsedCents:
            existing.worker.budgetUsedCents + input.actualCostCents,
          lastActionAt: completedAt,
          updatedAt: completedAt,
        })
        .where(
          and(
            eq(aiWorkers.id, existing.worker.id),
            eq(aiWorkers.workspaceId, workspace.id),
          ),
        );

      await tx.insert(auditEvents).values({
        organizationId: organization.id,
        actorType: "user",
        actorId: actorUserId,
        eventType: "ai_worker_task.completed",
        payload: {
          workspaceId: workspace.id,
          workerId: existing.worker.id,
          workerName: existing.worker.name,
          runId: run.id,
          expectedCostCents: existing.run.expectedCostCents,
          actualCostCents: input.actualCostCents,
          liveExecution: false,
          actorName: actor.name,
        },
      });

      if (input.actualCostCents > 0) {
        await tx.insert(usageEvents).values({
          organizationId: organization.id,
          metric: "ai_worker_execution_cents",
          quantity: input.actualCostCents,
          metadata: {
            workspaceId: workspace.id,
            workerId: existing.worker.id,
            workerName: existing.worker.name,
            runId: run.id,
            expectedCostCents: existing.run.expectedCostCents,
            origin: "ai_worker_dry_run_result",
            liveExecution: false,
          },
        });
      }

      return {
        run,
        workerName: existing.worker.name,
      };
    });

    if (!result.run) {
      return result;
    }

    return {
      run: this.mapAiWorkerRun(result.run, result.workerName),
    };
  }

  async getSourcePlan() {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const [plan] = await db
      .select()
      .from(sourcePlans)
      .where(eq(sourcePlans.workspaceId, workspace.id))
      .orderBy(desc(sourcePlans.createdAt))
      .limit(1);
    return plan
      ? {
          id: plan.id,
          summary: plan.summary,
          sources: (plan.sources as string[]) ?? [],
          contactTargets: (plan.contactTargets as string[]) ?? [],
          searchTerms: (plan.searchTerms as string[]) ?? [],
          rationale: plan.rationale,
        }
      : null;
  }

  async runLeadSource(
    source: string,
    options: {
      providerMode?: SourceRunProviderMode;
      providerCostCents?: number;
    } = {},
  ) {
    await this.ensureInitialized();
    const { organization, workspace } = await this.workspaceContext();
    const memoryResult = this.state.memory.runLeadSource(source, options);
    const [acceptedLead] = await db
      .insert(leads)
      .values({
        workspaceId: workspace.id,
        fullName: memoryResult.accepted[0]!.fullName,
        email: memoryResult.accepted[0]!.email,
        phone: memoryResult.accepted[0]!.phone,
        company: memoryResult.accepted[0]!.company,
        source,
        status: memoryResult.accepted[0]!.status,
        score: memoryResult.accepted[0]!.score,
        rejectionReason: null,
        metadata: { lastTouchpoint: memoryResult.accepted[0]!.lastTouchpoint },
      })
      .returning();

    const [run] = await db
      .insert(sourceRuns)
      .values({
        workspaceId: workspace.id,
        source,
        status: memoryResult.run.status,
        providerMode: memoryResult.run.providerMode,
        candidatesFound: memoryResult.run.candidatesFound,
        dedupedCount: memoryResult.run.dedupedCount,
        qualifiedCount: memoryResult.run.qualifiedCount,
        rejectedCount: memoryResult.run.rejectedCount,
        qualityScore: memoryResult.run.qualityScore,
        evidence: memoryResult.run.evidence,
        rejectionReasons: memoryResult.run.rejectionReasons,
        complianceChecks: memoryResult.run.complianceChecks,
        freshness: memoryResult.run.freshness,
        nextAction: memoryResult.run.nextAction,
        summary: memoryResult.run.summary,
      })
      .returning();

    await this.recordUsageEvent(organization.id, "leads_created", 1, {
      workspaceId: workspace.id,
      source,
      leadId: acceptedLead.id,
      origin: "source_run",
    });

    if ((options.providerCostCents ?? 0) > 0) {
      await this.recordUsageEvent(
        organization.id,
        "provider_cost_cents",
        options.providerCostCents!,
        {
          workspaceId: workspace.id,
          source,
          runId: run.id,
          providerMode: memoryResult.run.providerMode,
          origin: "configured_source_run",
        },
      );
    }

    return {
      run: this.mapSourceRun(run),
      accepted: [this.mapLead(acceptedLead)],
      rejected: memoryResult.rejected,
    };
  }

  async createLead(input: CreateLeadInput) {
    await this.ensureInitialized();
    const { organization, workspace } = await this.workspaceContext();
    const created = this.state.memory.createLead(input);
    const [lead] = await db
      .insert(leads)
      .values({
        workspaceId: workspace.id,
        fullName: created.fullName,
        email: created.email,
        phone: created.phone,
        company: created.company,
        source: created.source,
        status: created.status,
        score: created.score,
        rejectionReason: created.rejectionReason,
        metadata: { lastTouchpoint: created.lastTouchpoint },
      })
      .returning();

    await this.recordUsageEvent(organization.id, "leads_created", 1, {
      workspaceId: workspace.id,
      source: created.source,
      leadId: lead.id,
      origin: "manual_create",
    });

    return this.mapLead(lead);
  }

  async getCampaigns() {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const rows = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.workspaceId, workspace.id))
      .orderBy(desc(campaigns.createdAt));
    return rows.map((campaign) => this.mapCampaign(campaign));
  }

  async getCampaign(id: string) {
    await this.ensureInitialized();
    const campaign = await this.getScopedCampaignRow(id);
    return campaign ? this.mapCampaign(campaign) : null;
  }

  async createCampaign(input: CreateCampaignInput) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const memoryResult = this.state.memory.createCampaign(input);
    const leadCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(
        and(eq(leads.workspaceId, workspace.id), eq(leads.status, "qualified")),
      );
    const [campaign] = await db
      .insert(campaigns)
      .values({
        workspaceId: workspace.id,
        name: memoryResult.campaign.name,
        stage: memoryResult.campaign.stage,
        approved: false,
        channel: memoryResult.campaign.channel,
        firstActionCompleted: false,
        nextActionAt: memoryResult.campaign.nextActionAt,
        leadsEnrolled: leadCount[0]?.count ?? 0,
      })
      .returning();
    return {
      campaign: this.mapCampaign(campaign),
      policy: memoryResult.policy,
    };
  }

  async approveCampaign(id: string, approvedBy: string) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const [updated] = await db
      .update(campaigns)
      .set({
        approved: true,
        stage: "approved",
        nextActionAt: `Approved by ${approvedBy}`,
      })
      .where(and(eq(campaigns.id, id), eq(campaigns.workspaceId, workspace.id)))
      .returning();
    return updated ? this.mapCampaign(updated) : null;
  }

  async runCampaign(id: string, approvedBy: string) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const approved = await this.approveCampaign(id, approvedBy);
    if (!approved) {
      return null;
    }

    const [lead] = await db
      .select()
      .from(leads)
      .where(
        and(eq(leads.status, "qualified"), eq(leads.workspaceId, workspace.id)),
      )
      .orderBy(desc(leads.score))
      .limit(1);

    if (!lead) {
      return { campaign: approved, activities: [] };
    }

    const [activity] = await db
      .insert(outreachActivities)
      .values({
        campaignId: id,
        leadId: lead.id,
        type: approved.channel === "call" ? "call" : "email",
        status: "queued",
        subject: `Personalized ${approved.channel} for ${lead.company ?? lead.fullName}`,
        preview: personalizedPreview(this.mapLead(lead)),
        personalizedFor: lead.fullName,
      })
      .returning();

    return {
      campaign: approved,
      activities: [
        {
          id: activity.id,
          campaignId: activity.campaignId,
          leadId: activity.leadId,
          type: activity.type as DashboardResponse["activities"][number]["type"],
          provider: activity.provider ?? null,
          providerMessageId: activity.providerMessageId ?? null,
          status: activity.status,
          subject: activity.subject,
          preview: activity.preview,
          personalizedFor: activity.personalizedFor,
        },
      ],
    };
  }

  async getCampaignActivity(id: string) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const rows = await db
      .select({ activity: outreachActivities })
      .from(outreachActivities)
      .innerJoin(campaigns, eq(outreachActivities.campaignId, campaigns.id))
      .where(
        and(
          eq(outreachActivities.campaignId, id),
          eq(campaigns.workspaceId, workspace.id),
        ),
      )
      .orderBy(desc(outreachActivities.createdAt));
    return rows.map((activity) => ({
      id: activity.activity.id,
      campaignId: activity.activity.campaignId,
      leadId: activity.activity.leadId,
      type: activity.activity
        .type as DashboardResponse["activities"][number]["type"],
      provider: activity.activity.provider ?? null,
      providerMessageId: activity.activity.providerMessageId ?? null,
      status: activity.activity.status,
      subject: activity.activity.subject,
      preview: activity.activity.preview,
      personalizedFor: activity.activity.personalizedFor,
    }));
  }

  async createCall(input: CreateCallInput) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const lead = await this.getScopedLeadRow(input.leadId);
    if (!lead) {
      return null;
    }
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.workspaceId, workspace.id))
      .orderBy(desc(campaigns.createdAt))
      .limit(1);
    if (!campaign) {
      return null;
    }
    const reviewRequired = lead.score <= 85;
    const [call] = await db
      .insert(callTasks)
      .values({
        campaignId: campaign.id,
        leadId: lead.id,
        status: reviewRequired ? "blocked" : "queued",
        provider: input.provider,
        summary: reviewRequired
          ? "Lead requires operator review before AI calling."
          : "Call queued for AI voice dispatch.",
        transcript: "",
        disposition: reviewRequired ? "needs_review" : "pending",
        reviewRequired,
      })
      .returning();

    return this.mapCall(call);
  }

  async getCall(id: string) {
    await this.ensureInitialized();
    const call = await this.getScopedCallRow(id);
    return call ? this.mapCall(call) : null;
  }

  async reviewCall(id: string, approved: boolean, notes: string) {
    await this.ensureInitialized();
    const existing = await this.getScopedCallRow(id);
    if (!existing) {
      return null;
    }

    const [call] = await db
      .update(callTasks)
      .set({
        reviewRequired: approved ? false : true,
        status: approved ? "queued" : "blocked",
        disposition: approved ? "pending" : "needs_review",
        summary: sql`concat(${callTasks.summary}, ' Reviewer note: ', ${notes})`,
      })
      .where(eq(callTasks.id, id))
      .returning();
    return call ? this.mapCall(call) : null;
  }

  async createMeeting(input: CreateMeetingInput) {
    await this.ensureInitialized();
    const lead = await this.getScopedLeadRow(input.leadId);
    if (!lead) {
      return null;
    }

    const [meeting] = await db
      .insert(meetings)
      .values({
        leadId: input.leadId,
        scheduledFor: new Date(input.scheduledFor),
        status: "scheduled",
        bookingSource: "manual",
        owner: input.owner,
        notes: input.notes,
        outcome: "scheduled",
        dealValueCents: 0,
        dealCurrency: "USD",
      })
      .returning();
    await db
      .update(leads)
      .set({
        status: "meeting_booked",
        metadata: sql`jsonb_set(coalesce(${leads.metadata}, '{}'::jsonb), '{lastTouchpoint}', '"Meeting created"'::jsonb)`,
      })
      .where(eq(leads.id, input.leadId));
    return this.mapMeeting(meeting);
  }

  async updateMeeting(id: string, input: UpdateMeetingInput) {
    await this.ensureInitialized();
    const existing = await this.getScopedMeetingRow(id);
    if (!existing) {
      return null;
    }

    const dealValueCents =
      input.status === "completed" ? input.dealValueCents : 0;
    const dealCurrency = input.dealCurrency.toUpperCase();
    const [meeting] = await db
      .update(meetings)
      .set({
        status: input.status,
        notes: input.notes,
        outcome: input.status,
        dealValueCents,
        dealCurrency,
      })
      .where(eq(meetings.id, id))
      .returning();
    if (!meeting) {
      return null;
    }
    const nextLeadStatus =
      input.status === "completed"
        ? "won"
        : input.status === "canceled"
          ? "lost"
          : input.status === "scheduled"
            ? "meeting_booked"
            : null;

    if (nextLeadStatus) {
      await db
        .update(leads)
        .set({
          status: nextLeadStatus,
          metadata: sql`jsonb_set(coalesce(${leads.metadata}, '{}'::jsonb), '{lastTouchpoint}', ${JSON.stringify(`Meeting ${input.status}`)}::jsonb)`,
        })
        .where(eq(leads.id, meeting.leadId));
    }
    return this.mapMeeting(meeting);
  }

  async updateOutreachProviderResult(
    activityId: string,
    update: {
      provider: string;
      providerMessageId: string | null;
      status: "queued" | "sent" | "review_required";
      providerCostCents?: number;
      detail: string;
    },
  ) {
    await this.ensureInitialized();
    const { organization, workspace } = await this.workspaceContext();
    const existing = await this.getScopedOutreachActivityRow(activityId);
    if (!existing) {
      return null;
    }

    const [activity] = await db
      .update(outreachActivities)
      .set({
        provider: update.provider,
        providerMessageId: update.providerMessageId,
        status: update.status,
        preview: sql`concat(${outreachActivities.preview}, ' ', cast(${update.detail} as text))`,
      })
      .where(eq(outreachActivities.id, activityId))
      .returning();

    if (activity) {
      if (update.status === "review_required") {
        await db
          .update(campaigns)
          .set({
            firstActionCompleted: false,
            stage: "approved",
            nextActionAt: "Awaiting manual review before first outbound touch",
          })
          .where(eq(campaigns.id, activity.campaignId));
      } else {
        await db
          .update(campaigns)
          .set({
            firstActionCompleted: true,
            stage: "running",
            nextActionAt:
              update.status === "sent"
                ? "First approved touch sent"
                : "Queued first approved touch",
          })
          .where(eq(campaigns.id, activity.campaignId));

        await this.markLeadAsContacted(
          activity.leadId,
          `${activity.type} ${update.status} via ${update.provider}`,
        );
        await this.recordUsageEvent(organization.id, "outreach_dispatches", 1, {
          workspaceId: workspace.id,
          campaignId: activity.campaignId,
          leadId: activity.leadId,
          activityId: activity.id,
          provider: update.provider,
          status: update.status,
          origin: "campaign_dispatch",
        });

        if ((update.providerCostCents ?? 0) > 0) {
          await this.recordUsageEvent(
            organization.id,
            "provider_cost_cents",
            update.providerCostCents!,
            {
              workspaceId: workspace.id,
              campaignId: activity.campaignId,
              leadId: activity.leadId,
              activityId: activity.id,
              provider: update.provider,
              status: update.status,
              origin: "campaign_dispatch",
            },
          );
        }
      }
    }

    return activity
      ? {
          id: activity.id,
          campaignId: activity.campaignId,
          leadId: activity.leadId,
          type: activity.type as DashboardResponse["activities"][number]["type"],
          provider: activity.provider ?? null,
          providerMessageId: activity.providerMessageId ?? null,
          status: activity.status,
          subject: activity.subject,
          preview: activity.preview,
          personalizedFor: activity.personalizedFor,
        }
      : null;
  }

  async updateCallProviderResult(
    callId: string,
    update: {
      provider: string;
      providerCallId: string | null;
      providerCostCents?: number;
      detail: string;
    },
  ) {
    await this.ensureInitialized();
    const { organization, workspace } = await this.workspaceContext();
    const existing = await this.getScopedCallRow(callId);
    if (!existing) {
      return null;
    }

    const nextStatus = existing.reviewRequired
      ? "blocked"
      : update.providerCallId
        ? "running"
        : "completed";
    const [call] = await db
      .update(callTasks)
      .set({
        status: nextStatus,
        provider: update.provider,
        providerCallId: update.providerCallId,
        disposition:
          nextStatus === "completed"
            ? "meeting_requested"
            : (existing.disposition ?? "pending"),
        summary: sql`concat(${callTasks.summary}, ' ', cast(${update.detail} as text))`,
      })
      .where(eq(callTasks.id, callId))
      .returning();

    if (call && !call.reviewRequired && nextStatus === "completed") {
      await this.markLeadAsMeetingBooked(
        call.leadId,
        `AI-assisted call completed via ${update.provider}`,
        "Created after positive AI-assisted call disposition.",
      );
    }

    if (call && !call.reviewRequired) {
      await this.recordUsageEvent(organization.id, "voice_calls", 1, {
        workspaceId: workspace.id,
        callId: call.id,
        leadId: call.leadId,
        provider: update.provider,
        providerCallId: update.providerCallId,
        status: nextStatus,
        origin: "call_dispatch",
      });

      if ((update.providerCostCents ?? 0) > 0) {
        await this.recordUsageEvent(
          organization.id,
          "provider_cost_cents",
          update.providerCostCents!,
          {
            workspaceId: workspace.id,
            callId: call.id,
            leadId: call.leadId,
            provider: update.provider,
            providerCallId: update.providerCallId,
            status: nextStatus,
            origin: "call_dispatch",
          },
        );
      }
    }

    return call ? this.mapCall(call) : null;
  }

  async updateCallProviderFailure(
    callId: string,
    update: {
      provider: string;
      detail: string;
    },
  ) {
    await this.ensureInitialized();
    const existing = await this.getScopedCallRow(callId);
    if (!existing) {
      return null;
    }

    const [call] = await db
      .update(callTasks)
      .set({
        status: "failed",
        provider: update.provider,
        providerCallId: null,
        reviewRequired: true,
        disposition: "provider_failed",
        summary: sql`concat(${callTasks.summary}, ' ', cast(${update.detail} as text))`,
      })
      .where(eq(callTasks.id, callId))
      .returning();

    return call ? this.mapCall(call) : null;
  }

  async updateCallSuppressionResult(callId: string, detail: string) {
    await this.ensureInitialized();
    const existing = await this.getScopedCallRow(callId);
    if (!existing) {
      return null;
    }

    const [call] = await db
      .update(callTasks)
      .set({
        status: "blocked",
        reviewRequired: true,
        disposition: "suppressed",
        summary: sql`concat(${callTasks.summary}, ' ', cast(${detail} as text))`,
      })
      .where(eq(callTasks.id, callId))
      .returning();

    return call ? this.mapCall(call) : null;
  }

  async applyProviderEvent(event: {
    provider: string;
    eventType: string;
    payload: unknown;
  }) {
    await this.ensureInitialized();

    if (event.provider === "resend") {
      const payload = event.payload as {
        data?: { email_id?: string };
        type?: string;
      };
      const externalId = payload.data?.email_id;
      if (!externalId) {
        return null;
      }
      const target = await findUniqueResendWebhookTarget(externalId);
      if (!target) {
        return null;
      }

      const [activity] = await db
        .update(outreachActivities)
        .set({
          status: payload.type?.includes("delivered")
            ? "sent"
            : "review_required",
          preview: sql`concat(${outreachActivities.preview}, ' Webhook: ', ${String(payload.type ?? event.eventType)})`,
        })
        .where(eq(outreachActivities.id, target.id))
        .returning();

      return activity
        ? {
            kind: "activity" as const,
            id: activity.id,
          }
        : null;
    }

    if (event.provider === "twilio") {
      const payload = event.payload as {
        CallSid?: string;
        CallStatus?: string;
      };
      if (!payload.CallSid) {
        return null;
      }
      const target = await findUniqueTwilioWebhookTarget(payload.CallSid);
      if (!target) {
        return null;
      }

      const [call] = await db
        .update(callTasks)
        .set({
          status: payload.CallStatus === "completed" ? "completed" : "running",
          disposition:
            payload.CallStatus === "completed"
              ? "meeting_requested"
              : callTasks.disposition,
          summary: sql`concat(${callTasks.summary}, ' Status callback: ', ${String(payload.CallStatus ?? event.eventType)})`,
        })
        .where(eq(callTasks.id, target.id))
        .returning();

      if (call && payload.CallStatus === "completed" && !call.reviewRequired) {
        await this.markLeadAsMeetingBooked(
          call.leadId,
          "AI-assisted call completed via twilio",
          "Created after Twilio reported a completed AI-assisted call that passed review gates.",
        );
      }

      return call
        ? {
            kind: "call" as const,
            id: call.id,
          }
        : null;
    }

    return null;
  }

  async recordProviderEvent(
    event: Omit<ProviderEvent, "id" | "receivedAt"> & { payload: unknown },
  ) {
    await this.ensureInitialized();
    let organizationId =
      this.context?.organizationId ??
      (await this.resolveOrganizationIdForProviderEvent(event));

    if (
      !organizationId &&
      (this.context?.organizationId || this.context?.workspaceId)
    ) {
      try {
        const { organization } = await this.workspaceContext();
        organizationId = organization.id;
      } catch {
        // No scoped organization context available.
      }
    }

    if (!organizationId) {
      console.warn("Provider event without organization attribution:", event);
      return {
        id: `evt_${Math.random().toString(36).slice(2, 10)}`,
        provider: event.provider,
        eventType: event.eventType,
        verified: event.verified,
        detail: event.detail,
        receivedAt: new Date().toISOString(),
      };
    }

    const [created] = await db
      .insert(auditEvents)
      .values({
        organizationId,
        actorType: "provider",
        eventType: `${event.provider}.${event.eventType}`,
        payload: {
          verified: event.verified,
          detail: event.detail,
          body: event.payload,
        },
      })
      .returning();

    return {
      id: created.id,
      provider: event.provider,
      eventType: event.eventType,
      verified: event.verified,
      detail: event.detail,
      receivedAt: created.createdAt.toISOString(),
    };
  }

  async audit(event: {
    organizationId?: string | null;
    actorType: string;
    actorId?: string;
    eventType: string;
    payload: Record<string, unknown>;
  }) {
    await this.ensureInitialized();
    let orgId = event.organizationId;

    // If no organizationId provided, only infer it when this request is already scoped.
    if (!orgId && (this.context?.organizationId || this.context?.workspaceId)) {
      try {
        const { organization } = await this.workspaceContext();
        orgId = organization.id;
      } catch {
        // No organization context available
      }
    }

    if (!orgId) {
      console.warn("Audit event without organizationId:", event);
      return;
    }

    const actorId =
      event.actorId && UUID_PATTERN.test(event.actorId) ? event.actorId : null;
    const payload =
      actorId === event.actorId
        ? event.payload
        : {
            ...event.payload,
            rawActorId: event.actorId ?? null,
          };

    await db.insert(auditEvents).values({
      organizationId: orgId,
      actorType: event.actorType,
      actorId,
      eventType: event.eventType,
      payload,
    });
  }

  async listAuditEvents(limit = 20, options?: { since?: Date }) {
    await this.ensureInitialized();
    const { organization } = await this.workspaceContext();
    const normalizedLimit = Math.min(50, Math.max(1, Math.trunc(limit)));
    const conditions = [eq(auditEvents.organizationId, organization.id)];
    if (options?.since) {
      conditions.push(gte(auditEvents.createdAt, options.since));
    }

    const rows = await db
      .select()
      .from(auditEvents)
      .where(and(...conditions))
      .orderBy(desc(auditEvents.createdAt))
      .limit(normalizedLimit);

    return rows.map((row) =>
      sanitizeAuditLogEvent({
        id: row.id,
        organizationId: row.organizationId,
        actorType: row.actorType,
        actorId: row.actorId ?? null,
        eventType: row.eventType,
        payload: row.payload as Record<string, unknown>,
        createdAt: row.createdAt.toISOString(),
      }),
    );
  }
}

let storagePromise: Promise<SalesStorage> | null = null;

export class ProductionStorageUnavailableError extends Error {
  constructor() {
    super("Postgres storage is required in production; refusing demo memory fallback.");
    this.name = "ProductionStorageUnavailableError";
  }
}

async function detectPostgresReadiness() {
  if (process.env.NODE_ENV === "test" && !process.env.DATABASE_URL) {
    return false;
  }

  try {
    await db.execute(sql`select 1`);
    const result = await db.execute(
      sql`select to_regclass('public.organizations') as organizations`,
    );
    return hasOrganizationsTable(result);
  } catch (error) {
    console.error("Postgres readiness check failed.", error);
    return false;
  }
}

export async function getStorage(
  context?: StorageAccessContext,
): Promise<SalesStorage> {
  if (!storagePromise) {
    storagePromise = (async (): Promise<SalesStorage> => {
      const ready = await detectPostgresReadiness();
      if (ready) {
        return new PostgresStorage();
      }

      if (process.env.NODE_ENV === "production") {
        throw new ProductionStorageUnavailableError();
      }

      return new MemoryStorage();
    })().catch((error) => {
      storagePromise = null;
      throw error;
    });
  }

  const storage = await storagePromise;

  if (storage.mode === "postgres") {
    return (storage as PostgresStorage).scope(context);
  }

  return storage;
}
