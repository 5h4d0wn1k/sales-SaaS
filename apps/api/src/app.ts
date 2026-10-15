import { Hono, type Context } from "hono";
import {
  acceptWorkspaceInvitationInputSchema,
  aiWorkerControlPlaneResponseSchema,
  aiWorkerExecutionReadinessResponseSchema,
  aiWorkerRunSchema,
  actionProposalListResponseSchema,
  actionProposalSchema,
  actionProposalStatusSchema,
  approveCampaignInputSchema,
  campaignPolicyInputSchema,
  checkSuppressionInputSchema,
  configureTelegramIntegrationInputSchema,
  createAiWorkerTaskInputSchema,
  createContactIntakeInputSchema,
  CONTACT_INTAKE_MAX_BODY_BYTES,
  sanitizeContactIntakeInput,
  createWorkspaceInvitationInputSchema,
  createWorkspaceInvitationResponseSchema,
  createCallInputSchema,
  createCampaignInputSchema,
  createLeadInputSchema,
  createMeetingInputSchema,
  createActionProposalInputSchema,
  createSuppressionInputSchema,
  dashboardResponseSchema,
  dashboardSnapshot,
  discoverLeadsInputSchema,
  dispatchCallInputSchema,
  dispatchCampaignInputSchema,
  auditLogResponseSchema,
  auditExportResponseSchema,
  buildAuditLogResponse,
  buildAuditExport,
  buildAuditComplianceReadiness,
  buildAiWorkerExecutionReadiness,
  buildAiWorkerMarginReadiness,
  buildContentOpportunityPlan,
  buildCommandCenterActionProposalInput,
  buildCommandCenterBrief,
  buildCommandCenterCommandPreview,
  buildCommandCenterPolicyCatalog,
  buildTelegramCommandReadiness,
  buildTelegramNotificationReadiness,
  buildRevenueForecast,
  buildRevenueReconciliation,
  buildSourceAcquisitionReadiness,
  buildConversionIntegrationReadiness,
  buildConversionWorkQueue,
  buildMeetingCalendarHandoff,
  buildCrmHandoff,
  buildManagedServiceReadiness,
  buildOutboundChannelReadiness,
  buildOutreachSequencePlan,
  buildPlanGrowthReadiness,
  buildProviderActivationReadiness,
  buildProviderCostCurves,
  buildProviderSetupActionProposal,
  commandCenterCommandPreviewInputSchema,
  commandCenterCommandPreviewSchema,
  commandCenterCommandProposalInputSchema,
  commandCenterCommandProposalResponseSchema,
  completeAiWorkerRunInputSchema,
  ContactIntakeBodyTooLargeError,
  auditComplianceReadinessResponseSchema,
  aiWorkerMarginReadinessResponseSchema,
  contentOpportunityInputSchema,
  contentOpportunityPlanSchema,
  conversionBriefResponseSchema,
  conversionIntegrationReadinessResponseSchema,
  conversionWorkQueueResponseSchema,
  commandCenterBriefResponseSchema,
  commandCenterPolicyCatalogResponseSchema,
  crmHandoffResponseSchema,
  evaluateCampaignPolicy,
  commandCenterCapabilitiesResponseSchema,
  contactIntakeResponseSchema,
  getCommandCenterCapabilities,
  hasAiWorkerDryRunCostCurveCoverage,
  getPlanProviderCostBudgetCents,
  getUpgradeRecommendation,
  buildConversionBrief,
  isContactIntakeBodyTooLarge,
  isContactIntakeSpamTrapTriggered,
  onboardingMessageInputSchema,
  onboardingSessionInputSchema,
  outboundChannelSchema,
  outboundChannelReadinessResponseSchema,
  platformModules,
  outreachSequencePlanResponseSchema,
  planGrowthReadinessResponseSchema,
  providerActivationReadinessResponseSchema,
  providerCostCurveResponseSchema,
  providerSetupRequestInputSchema,
  reviewCallInputSchema,
  meetingCalendarHandoffResponseSchema,
  managedServiceReadinessResponseSchema,
  revenueForecastResponseSchema,
  revenueReconciliationResponseSchema,
  resolveAuditRetentionWindow,
  reviewActionProposalInputSchema,
  readContactIntakeBodyText,
  runCampaignInputSchema,
  selectWorkspaceInputSchema,
  suppressionCheckResponseSchema,
  suppressionListResponseSchema,
  telegramDefaultAllowedCommands,
  telegramCommandReadinessResponseSchema,
  sendTelegramNotificationInputSchema,
  telegramNotificationDeliveryResponseSchema,
  telegramNotificationReadinessResponseSchema,
  telegramIntegrationResponseSchema,
  telegramWebhookResponseSchema,
  type TelegramCommand,
  type TelegramCommandResult,
  type TelegramIntegrationResponse,
  type SuppressionChannel,
  type ChannelEntitlementResult,
  type UsageEntitlementResult,
  transferWorkspaceOwnershipInputSchema,
  updateWorkspaceTeamMemberRoleInputSchema,
  sourcePlanInputSchema,
  sourceRunInputSchema,
  salesBlueprintResponseSchema,
  sourceAcquisitionReadinessResponseSchema,
  updateMeetingInputSchema,
  upsertSalesBlueprintInputSchema,
  workspaceInvitationListSchema,
  workspaceMembershipListSchema,
  workspaceTeamMemberMutationResponseSchema,
  workspaceOwnershipTransferResponseSchema,
  workspaceTeamMemberRemovalResponseSchema,
  workspaceTeamMemberListSchema,
} from "@sales/shared";
import {
  CAMPAIGN_DISPATCH_UNSUPPORTED_CHANNEL_CODE,
  campaignDispatchUnsupportedDetail,
  chooseSourceProviders,
  dispatchCampaignActivity,
  dispatchVoiceCall,
  estimateLeadSourceProviderCostCents,
  estimateCampaignDispatchProviderCostCents,
  estimateVoiceCallProviderCostCents,
  getProviderSummary,
  isCampaignDispatchChannelSupported,
  sourceProviderModeFor,
  summarizeSourceRun,
} from "./providers";
import {
  checkContactIntakeRateLimit,
  normalizeContactIntakeClientIp,
} from "./contact-intake-abuse";
import { applyRateLimitHeaders } from "./rate-limit-headers";
import { getAllowedFrontendOrigins } from "./frontend-origin";
import { buildApiReadiness } from "./readiness";
import {
  createStorageAccessContext,
  getStorage,
  ProductionStorageUnavailableError,
} from "./storage";
import { notifyContactIntake } from "./contact-intake-notifications";
import { verifyResendWebhook, verifyTwilioVoiceWebhook } from "./webhooks";
import {
  extractTelegramMessage,
  hashTelegramChatId,
  maskTelegramChatId,
  parseTelegramCommand,
  sendTelegramReply,
  telegramCommandRateLimitConfig,
  telegramDeploymentState,
  verifyTelegramNotificationSchedulerSecret,
  verifyTelegramWebhookSecret,
} from "./telegram";
import { deliverTelegramOperationalNotification } from "./telegram-notifications";
import { billingRoutes } from "./routes/billing";
import { authRoutes } from "./routes/auth";
import { buildApiReleaseMetadata } from "./release";
import {
  securityHeadersMiddleware,
  requestIdMiddleware,
  rateLimitMiddleware,
  validateJsonMiddleware,
  requestSizeLimitMiddleware,
  auditLogMiddleware,
} from "./middleware/security";
import { apiErrorBoundary } from "./middleware/error-boundary";
import {
  authMiddleware,
  requireRole,
  requireVerifiedEmail,
  type AuthUser,
} from "./middleware/auth";
import {
  acceptWorkspaceInvitationForUser,
  createWorkspaceInvitationForActor,
  listWorkspaceInvitationsForActor,
  listWorkspaceMembershipsForUser,
  listWorkspaceTeamMembersForActor,
  removeWorkspaceTeamMemberForActor,
  revokeWorkspaceInvitationForActor,
  selectActiveWorkspaceForUser,
  TenantAccessError,
  transferWorkspaceOwnershipForActor,
  updateWorkspaceTeamMemberRoleForActor,
} from "./tenant-access";
import type { AppVariables } from "./request-context";

function configuredBoolean(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on", "configured"].includes(
    value.trim().toLowerCase(),
  );
}

function auditComplianceConfigFromEnv() {
  const retentionDays = Number.parseInt(
    process.env.AUDIT_RETENTION_DAYS ?? "",
    10,
  );

  return {
    retentionDays: Number.isFinite(retentionDays) ? retentionDays : null,
    siemStreamingConfigured:
      Boolean(process.env.AUDIT_SIEM_STREAM_URL) ||
      configuredBoolean(process.env.AUDIT_SIEM_STREAM_CONFIGURED),
    immutableArchiveConfigured:
      Boolean(process.env.AUDIT_ARCHIVE_BUCKET) ||
      configuredBoolean(process.env.AUDIT_ARCHIVE_CONFIGURED),
    legalDiscoveryOwner: process.env.AUDIT_LEGAL_DISCOVERY_OWNER ?? null,
  };
}

function auditRetentionWindowFromConfig(
  config: ReturnType<typeof auditComplianceConfigFromEnv>,
  generatedAt: string,
) {
  const retention = resolveAuditRetentionWindow({
    retentionDays: config.retentionDays,
    generatedAt,
  });

  return {
    ...retention,
    since: retention.cutoffAt ? new Date(retention.cutoffAt) : undefined,
  };
}

function providerActivationConfigFromEnv() {
  const rotationCadenceDays = Number.parseInt(
    process.env.PROVIDER_ROTATION_CADENCE_DAYS ?? "",
    10,
  );

  return {
    credentialVaultConfigured:
      Boolean(process.env.PROVIDER_CREDENTIAL_VAULT_URL) ||
      configuredBoolean(process.env.PROVIDER_CREDENTIAL_VAULT_CONFIGURED),
    rotationCadenceDays: Number.isFinite(rotationCadenceDays)
      ? rotationCadenceDays
      : null,
    workspaceActivationPolicyConfigured:
      Boolean(process.env.PROVIDER_WORKSPACE_ACTIVATION_POLICY_URL) ||
      configuredBoolean(process.env.PROVIDER_WORKSPACE_ACTIVATION_CONFIGURED),
    rollbackRunbookConfigured:
      Boolean(process.env.PROVIDER_ROLLBACK_RUNBOOK_URL) ||
      configuredBoolean(process.env.PROVIDER_ROLLBACK_RUNBOOK_CONFIGURED),
  };
}

function sourceProviderGovernanceConfigFromEnv() {
  return {
    providerTermsConfigured:
      Boolean(process.env.SOURCE_PROVIDER_TERMS_POLICY_URL) ||
      configuredBoolean(process.env.SOURCE_PROVIDER_TERMS_POLICY_CONFIGURED),
    rateLimitPolicyConfigured:
      Boolean(process.env.SOURCE_PROVIDER_RATE_LIMIT_POLICY_URL) ||
      configuredBoolean(
        process.env.SOURCE_PROVIDER_RATE_LIMIT_POLICY_CONFIGURED,
      ),
    consentPolicyConfigured:
      Boolean(process.env.SOURCE_PROVIDER_CONSENT_POLICY_URL) ||
      configuredBoolean(process.env.SOURCE_PROVIDER_CONSENT_POLICY_CONFIGURED),
    invoiceReconciliationConfigured:
      Boolean(process.env.SOURCE_PROVIDER_INVOICE_RECONCILIATION_URL) ||
      configuredBoolean(
        process.env.SOURCE_PROVIDER_INVOICE_RECONCILIATION_CONFIGURED,
      ),
    qualityGovernanceConfigured:
      Boolean(process.env.SOURCE_PROVIDER_QUALITY_GOVERNANCE_POLICY_URL) ||
      configuredBoolean(
        process.env.SOURCE_PROVIDER_QUALITY_GOVERNANCE_CONFIGURED,
      ),
  };
}

type SourceProviderGovernanceConfig = ReturnType<
  typeof sourceProviderGovernanceConfigFromEnv
>;

const sourceProviderGovernanceControls: Array<{
  id: string;
  label: string;
  env: string;
  detail: string;
  configured: keyof SourceProviderGovernanceConfig;
}> = [
  {
    id: "provider_terms_policy",
    label: "Source-provider terms policy",
    env: "SOURCE_PROVIDER_TERMS_POLICY_CONFIGURED",
    configured: "providerTermsConfigured",
    detail: "Document approved source-provider terms before live evidence runs.",
  },
  {
    id: "rate_limit_policy",
    label: "Source-provider rate-limit policy",
    env: "SOURCE_PROVIDER_RATE_LIMIT_POLICY_CONFIGURED",
    configured: "rateLimitPolicyConfigured",
    detail: "Define provider-specific rate limits before live evidence runs.",
  },
  {
    id: "consent_policy",
    label: "Source-provider consent policy",
    env: "SOURCE_PROVIDER_CONSENT_POLICY_CONFIGURED",
    configured: "consentPolicyConfigured",
    detail: "Define consent and outreach-handoff rules before live evidence runs.",
  },
  {
    id: "invoice_reconciliation",
    label: "Source-provider invoice reconciliation",
    env: "SOURCE_PROVIDER_INVOICE_RECONCILIATION_CONFIGURED",
    configured: "invoiceReconciliationConfigured",
    detail: "Configure provider-cost invoice review before live evidence runs.",
  },
  {
    id: "source_quality_governance",
    label: "Source-quality governance",
    env: "SOURCE_PROVIDER_QUALITY_GOVERNANCE_CONFIGURED",
    configured: "qualityGovernanceConfigured",
    detail: "Define quality, dedupe, and rejection review before live evidence runs.",
  },
];

function configuredSourceProviderGovernanceBlock(sources: string[]) {
  if (sources.length === 0) {
    return null;
  }

  const governance = sourceProviderGovernanceConfigFromEnv();
  const missingControls = sourceProviderGovernanceControls
    .filter((control) => !governance[control.configured])
    .map(({ id, label, env, detail }) => ({ id, label, env, detail }));

  if (missingControls.length === 0) {
    return null;
  }

  return {
    error:
      "Configured source-provider work requires governance controls before live source expansion.",
    code: "source_provider_governance_required",
    providerMode: "configured",
    sources,
    missingControls,
    guardrail:
      "Mock source runs remain available; configure source-provider governance before provider-backed evidence runs.",
  };
}

function conversionIntegrationConfigFromEnv() {
  return {
    crmSyncConfigured:
      Boolean(process.env.CRM_SYNC_PROVIDER_URL) ||
      configuredBoolean(process.env.CRM_SYNC_CONFIGURED),
    crmFieldMappingConfigured:
      Boolean(process.env.CRM_FIELD_MAPPING_POLICY_URL) ||
      configuredBoolean(process.env.CRM_FIELD_MAPPING_CONFIGURED),
    calendarSyncConfigured:
      Boolean(process.env.CALENDAR_SYNC_PROVIDER_URL) ||
      configuredBoolean(process.env.CALENDAR_SYNC_CONFIGURED),
    calendarAvailabilityConfigured:
      Boolean(process.env.CALENDAR_AVAILABILITY_POLICY_URL) ||
      configuredBoolean(process.env.CALENDAR_AVAILABILITY_CONFIGURED),
    accountingSyncConfigured:
      Boolean(process.env.ACCOUNTING_SYNC_PROVIDER_URL) ||
      configuredBoolean(process.env.ACCOUNTING_SYNC_CONFIGURED),
    revenueRecognitionPolicyConfigured:
      Boolean(process.env.REVENUE_RECOGNITION_POLICY_URL) ||
      configuredBoolean(process.env.REVENUE_RECOGNITION_POLICY_CONFIGURED),
    invoiceMatchingConfigured:
      Boolean(process.env.INVOICE_MATCHING_POLICY_URL) ||
      configuredBoolean(process.env.INVOICE_MATCHING_CONFIGURED),
    paymentReconciliationConfigured:
      Boolean(process.env.PAYMENT_RECONCILIATION_POLICY_URL) ||
      configuredBoolean(process.env.PAYMENT_RECONCILIATION_CONFIGURED),
  };
}

function outboundChannelReadinessConfigFromEnv() {
  return {
    smsProviderConfigured:
      Boolean(process.env.SMS_PROVIDER_URL) ||
      configuredBoolean(process.env.SMS_PROVIDER_CONFIGURED),
    smsConsentPolicyConfigured:
      Boolean(process.env.SMS_CONSENT_POLICY_URL) ||
      configuredBoolean(process.env.SMS_CONSENT_POLICY_CONFIGURED),
    smsOptOutConfigured:
      Boolean(process.env.SMS_OPT_OUT_POLICY_URL) ||
      configuredBoolean(process.env.SMS_OPT_OUT_CONFIGURED),
    smsCostCurveConfigured:
      Boolean(process.env.SMS_COST_CURVE_POLICY_URL) ||
      configuredBoolean(process.env.SMS_COST_CURVE_CONFIGURED),
    socialProviderConfigured:
      Boolean(process.env.SOCIAL_PROVIDER_URL) ||
      configuredBoolean(process.env.SOCIAL_PROVIDER_CONFIGURED),
    socialPlatformPolicyConfigured:
      Boolean(process.env.SOCIAL_PLATFORM_POLICY_URL) ||
      configuredBoolean(process.env.SOCIAL_PLATFORM_POLICY_CONFIGURED),
    socialHumanReviewConfigured:
      Boolean(process.env.SOCIAL_HUMAN_REVIEW_POLICY_URL) ||
      configuredBoolean(process.env.SOCIAL_HUMAN_REVIEW_CONFIGURED),
    socialCostCurveConfigured:
      Boolean(process.env.SOCIAL_COST_CURVE_POLICY_URL) ||
      configuredBoolean(process.env.SOCIAL_COST_CURVE_CONFIGURED),
  };
}

function managedServiceReadinessConfigFromEnv() {
  return {
    scopePolicyConfigured:
      Boolean(process.env.MANAGED_SERVICE_SCOPE_POLICY_URL) ||
      configuredBoolean(process.env.MANAGED_SERVICE_SCOPE_POLICY_CONFIGURED),
    sowTemplateConfigured:
      Boolean(process.env.MANAGED_SERVICE_SOW_TEMPLATE_URL) ||
      configuredBoolean(process.env.MANAGED_SERVICE_SOW_TEMPLATE_CONFIGURED),
    pricingPolicyConfigured:
      Boolean(process.env.MANAGED_SERVICE_PRICING_POLICY_URL) ||
      configuredBoolean(process.env.MANAGED_SERVICE_PRICING_POLICY_CONFIGURED),
    deliveryOwner: process.env.MANAGED_SERVICE_DELIVERY_OWNER ?? null,
    customerHandoffConfigured:
      Boolean(process.env.MANAGED_SERVICE_HANDOFF_URL) ||
      configuredBoolean(process.env.MANAGED_SERVICE_HANDOFF_CONFIGURED),
    providerCostPolicyConfigured:
      Boolean(process.env.MANAGED_SERVICE_PROVIDER_COST_POLICY_URL) ||
      configuredBoolean(
        process.env.MANAGED_SERVICE_PROVIDER_COST_POLICY_CONFIGURED,
      ),
    supportCapacityConfigured:
      Boolean(process.env.MANAGED_SERVICE_CAPACITY_POLICY_URL) ||
      configuredBoolean(process.env.MANAGED_SERVICE_CAPACITY_CONFIGURED),
  };
}

function telegramNotificationTargetChatIdFromEnv() {
  const targetChatId = process.env.TELEGRAM_NOTIFICATION_TARGET_CHAT_ID?.trim();

  return targetChatId ? targetChatId : null;
}

async function resolveTelegramNotificationTargetChat() {
  const targetChatId = telegramNotificationTargetChatIdFromEnv();

  if (!targetChatId) {
    return {
      targetChatId: null,
      targetChatConfigured: false,
      targetChatMask: null,
      resolved: null,
    };
  }

  const targetChatHash = hashTelegramChatId(targetChatId);
  const rootStorage = await getStorage();
  const resolved =
    await rootStorage.resolveTelegramIntegrationByChatIdHash(targetChatHash);

  return {
    targetChatId,
    targetChatConfigured: true,
    targetChatMask: maskTelegramChatId(targetChatId),
    resolved,
  };
}

async function telegramNotificationTargetState(
  telegram?: TelegramIntegrationResponse,
) {
  const target = await resolveTelegramNotificationTargetChat();

  if (!target.targetChatId) {
    return {
      targetChatId: null,
      targetChatConfigured: false,
      targetChatMatchesWorkspace: false,
    };
  }

  const maskMatches =
    telegram?.integration.chatIdMask !== null &&
    telegram?.integration.chatIdMask === target.targetChatMask;
  const resolvedMatches = Boolean(
    target.resolved?.integration.id &&
      telegram?.integration.id &&
      target.resolved.integration.id === telegram.integration.id,
  );

  return {
    targetChatId: target.targetChatId,
    targetChatConfigured: true,
    targetChatMatchesWorkspace: resolvedMatches || maskMatches,
  };
}

function parseTelegramNotificationClockMinutes(value: string | undefined) {
  const trimmed = value?.trim();
  const match = trimmed?.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1]!, 10) * 60 + Number.parseInt(match[2]!, 10);
}

function localClockMinutesFor(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number.parseInt(
    parts.find((part) => part.type === "hour")?.value ?? "",
    10,
  );
  const minute = Number.parseInt(
    parts.find((part) => part.type === "minute")?.value ?? "",
    10,
  );

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    throw new Error("Unable to resolve Telegram notification quiet-hours time.");
  }

  return hour * 60 + minute;
}

function telegramNotificationQuietHoursFromEnv(now = new Date()) {
  const configured =
    Boolean(process.env.TELEGRAM_NOTIFICATION_QUIET_HOURS_POLICY_URL) ||
    configuredBoolean(process.env.TELEGRAM_NOTIFICATION_QUIET_HOURS_CONFIGURED) ||
    Boolean(
      process.env.TELEGRAM_NOTIFICATION_QUIET_HOURS_START &&
        process.env.TELEGRAM_NOTIFICATION_QUIET_HOURS_END,
    );
  const start = process.env.TELEGRAM_NOTIFICATION_QUIET_HOURS_START?.trim();
  const end = process.env.TELEGRAM_NOTIFICATION_QUIET_HOURS_END?.trim();
  const timeZone =
    process.env.TELEGRAM_NOTIFICATION_TIME_ZONE?.trim() || "UTC";

  if (!configured) {
    return {
      configured: false,
      enforceable: false,
      active: false,
      start: start ?? null,
      end: end ?? null,
      timeZone,
      detail:
        "Telegram notification quiet-hours policy is not configured; scheduled dispatch is blocked.",
    };
  }

  const startMinutes = parseTelegramNotificationClockMinutes(start);
  const endMinutes = parseTelegramNotificationClockMinutes(end);

  if (startMinutes === null || endMinutes === null) {
    return {
      configured: true,
      enforceable: false,
      active: false,
      start: start ?? null,
      end: end ?? null,
      timeZone,
      detail:
        "Telegram notification quiet-hours window is missing or invalid. Use HH:mm values for TELEGRAM_NOTIFICATION_QUIET_HOURS_START and TELEGRAM_NOTIFICATION_QUIET_HOURS_END.",
    };
  }

  let currentMinutes: number;
  try {
    currentMinutes = localClockMinutesFor(now, timeZone);
  } catch {
    return {
      configured: true,
      enforceable: false,
      active: false,
      start,
      end,
      timeZone,
      detail:
        "Telegram notification quiet-hours timezone is invalid. Use an IANA timezone such as UTC, America/New_York, Europe/London, or Asia/Kolkata.",
    };
  }
  const active =
    startMinutes === endMinutes
      ? true
      : startMinutes < endMinutes
        ? currentMinutes >= startMinutes && currentMinutes < endMinutes
        : currentMinutes >= startMinutes || currentMinutes < endMinutes;

  return {
    configured: true,
    enforceable: true,
    active,
    start,
    end,
    timeZone,
    detail: active
      ? `Telegram notification quiet hours are active from ${start} to ${end} ${timeZone}.`
      : `Telegram notification quiet hours are configured from ${start} to ${end} ${timeZone} and are not active now.`,
  };
}

function telegramNotificationReadinessConfigFromEnv(
  targetState?: Awaited<ReturnType<typeof telegramNotificationTargetState>>,
) {
  const parsedMaxPerHour = Number.parseInt(
    process.env.TELEGRAM_NOTIFICATION_MAX_PER_HOUR ?? "",
    10,
  );

  return {
    notificationsEnabled:
      configuredBoolean(process.env.TELEGRAM_NOTIFICATIONS_ENABLED),
    targetChatConfigured: targetState?.targetChatConfigured ?? false,
    targetChatMatchesWorkspace:
      targetState?.targetChatMatchesWorkspace ?? false,
    policyConfigured:
      Boolean(process.env.TELEGRAM_NOTIFICATION_POLICY_URL) ||
      configuredBoolean(process.env.TELEGRAM_NOTIFICATION_POLICY_CONFIGURED),
    quietHoursConfigured:
      Boolean(process.env.TELEGRAM_NOTIFICATION_QUIET_HOURS_POLICY_URL) ||
      configuredBoolean(
        process.env.TELEGRAM_NOTIFICATION_QUIET_HOURS_CONFIGURED,
      ) ||
      Boolean(
        process.env.TELEGRAM_NOTIFICATION_QUIET_HOURS_START &&
          process.env.TELEGRAM_NOTIFICATION_QUIET_HOURS_END,
      ),
    escalationOwner: process.env.TELEGRAM_NOTIFICATION_ESCALATION_OWNER ?? null,
    digestScheduleConfigured:
      Boolean(process.env.TELEGRAM_NOTIFICATION_DIGEST_SCHEDULE_URL) ||
      configuredBoolean(
        process.env.TELEGRAM_NOTIFICATION_DIGEST_CONFIGURED,
      ),
    approvalAlertsConfigured:
      configuredBoolean(
        process.env.TELEGRAM_NOTIFICATION_APPROVAL_ALERTS_CONFIGURED,
      ),
    providerAlertsConfigured:
      configuredBoolean(
        process.env.TELEGRAM_NOTIFICATION_PROVIDER_ALERTS_CONFIGURED,
      ),
    conversionAlertsConfigured:
      configuredBoolean(
        process.env.TELEGRAM_NOTIFICATION_CONVERSION_ALERTS_CONFIGURED,
      ),
    incidentAlertsConfigured:
      configuredBoolean(
        process.env.TELEGRAM_NOTIFICATION_INCIDENT_ALERTS_CONFIGURED,
      ),
    deliveryAuditConfigured:
      Boolean(process.env.TELEGRAM_NOTIFICATION_DELIVERY_AUDIT_URL) ||
      configuredBoolean(
        process.env.TELEGRAM_NOTIFICATION_DELIVERY_AUDIT_CONFIGURED,
      ),
    payloadReviewConfigured:
      Boolean(process.env.TELEGRAM_NOTIFICATION_PAYLOAD_REVIEW_URL) ||
      configuredBoolean(
        process.env.TELEGRAM_NOTIFICATION_PAYLOAD_REVIEW_CONFIGURED,
      ),
    maxNotificationsPerHour:
      Number.isFinite(parsedMaxPerHour) && parsedMaxPerHour > 0
        ? Math.min(120, parsedMaxPerHour)
        : 12,
  };
}

async function readOptionalJsonPayload(c: Context) {
  const body = await c.req.text();
  if (body.trim().length === 0) {
    return {};
  }

  return JSON.parse(body);
}

export function createApp() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.onError(apiErrorBoundary);
  const allowedOrigins = getAllowedFrontendOrigins();
  const storageFor = (c: Context) =>
    getStorage(
      createStorageAccessContext(
        c.get("user") as
          | {
              organizationId?: string | null;
              workspaceId?: string | null;
            }
          | undefined,
      ),
    );
  const telegramLiveCommands: TelegramCommand[] = [
    "status",
    "brief",
    "approvals",
    "providers",
    "suppressions",
    "sequence",
    "forecast",
    "help",
    "pause",
  ];
  const telegramPlannedCommands: TelegramCommand[] = [];
  const actionProposalPayload = async (
    storage: Awaited<ReturnType<typeof storageFor>>,
    status?: string | null,
  ) => {
    const parsedStatus = status
      ? actionProposalStatusSchema.safeParse(status)
      : null;
    if (parsedStatus && !parsedStatus.success) {
      return null;
    }

    const allProposals = await storage.listActionProposals();
    const proposals = parsedStatus
      ? allProposals.filter((proposal) => proposal.status === parsedStatus.data)
      : allProposals;

    return actionProposalListResponseSchema.parse({
      proposals,
      summary: {
        pending: allProposals.filter(
          (proposal) => proposal.status === "pending",
        ).length,
        highRisk: allProposals.filter(
          (proposal) =>
            proposal.status === "pending" &&
            (proposal.riskLevel === "high" ||
              proposal.riskLevel === "critical"),
        ).length,
        approved: allProposals.filter(
          (proposal) => proposal.status === "approved",
        ).length,
        rejected: allProposals.filter(
          (proposal) => proposal.status === "rejected",
        ).length,
      },
    });
  };
  const telegramIntegrationPayload = async (
    storage: Awaited<ReturnType<typeof storageFor>>,
  ) => {
    const integration = await storage.getTelegramIntegration();
    const recentCommands = await storage.listTelegramCommandAudits();

    return telegramIntegrationResponseSchema.parse({
      integration,
      deployment: telegramDeploymentState(),
      liveCommands: telegramLiveCommands,
      plannedCommands: telegramPlannedCommands,
      recentCommands,
      detail:
        integration.status === "not_configured"
          ? "Bind a Telegram chat, then set deployment secrets before enabling verified webhook commands."
          : "Telegram command center binding is available for safe read-only commands.",
    });
  };
  const buildTelegramCommandReply = async (
    command: TelegramCommand,
    storage: Awaited<ReturnType<typeof storageFor>>,
    actor?: string | null,
  ): Promise<{
    reply: string;
    result: TelegramCommandResult;
    detail: string;
  }> => {
    if (command === "help") {
      return {
        result: "success",
        detail: "Help command returned without changing outreach state.",
        reply:
          "Winrate AI commands: /status, /brief, /sequence, /forecast, /approvals, /providers, /suppressions, /help. /pause is gated and requires owner approval in the app before outreach can change.",
      };
    }

    if (command === "pause") {
      const proposal = await storage.createActionProposal({
        type: "telegram_pause",
        riskLevel: "medium",
        title: "Pause outreach from Telegram",
        detail:
          "A verified Telegram command requested a workspace outreach pause. No campaign state changed until an owner or admin reviews this proposal in the app.",
        proposedBy: "telegram",
        targetKind: "workspace",
        targetId: null,
        targetLabel: "Workspace outreach",
        payloadSummary:
          "Pause all running outreach campaigns after in-app approval.",
        payload: {
          command: "pause",
          channel: "telegram",
          actor: actor ?? null,
        },
        guardrails: [
          "No campaign state changes from the Telegram webhook.",
          "Owner or admin review is required in the app.",
          "Audit event is recorded when the proposal is reviewed.",
        ],
        expectedEffect:
          "All running campaigns move to paused after approval; draft campaigns remain untouched.",
        rollbackPlan:
          "Reject the proposal to keep outreach running, or restart paused campaigns after review.",
        requiredRole: "admin",
        requestedBy: actor ?? "telegram",
      });

      return {
        result: "requires_approval",
        detail: `Pause command created approval proposal ${proposal.id}; no outreach state changed.`,
        reply: `Pause request recorded as approval ${proposal.id}. Review it in the dashboard before any campaign state changes.`,
      };
    }

    if (command === "brief") {
      const [dashboard, proposals, aiWorkers, telegram] = await Promise.all([
        storage.getDashboard(),
        actionProposalPayload(storage, "pending"),
        storage.getAiWorkerControlPlane(),
        telegramIntegrationPayload(storage),
      ]);

      if (!proposals) {
        return {
          result: "denied",
          detail:
            "Unable to load pending action proposals for Telegram operator brief.",
          reply:
            "Operator brief is temporarily unavailable. Try again from the dashboard.",
        };
      }

      const brief = buildCommandCenterBrief({
        dashboard,
        proposals,
        providers: getProviderSummary(),
        aiWorkers,
        telegram,
      });
      const firstAction = brief.nextActions[0];

      return {
        result: "success",
        detail:
          "Operator brief summarized for Telegram without mutating workspace state.",
        reply:
          `Brief: ${brief.posture.replace(/_/g, " ")}. ${brief.summary} ` +
          `${firstAction ? `Next: ${firstAction.label}. ` : ""}` +
          "No approval, outreach, billing, provider, AI-worker, or workspace mutation was performed.",
      };
    }

    if (command === "sequence") {
      const [dashboard, blueprint] = await Promise.all([
        storage.getDashboard(),
        storage.getSalesBlueprint(),
      ]);
      const sequencePlan = buildOutreachSequencePlan({
        dashboard,
        blueprint,
      });
      const blockedChannels = sequencePlan.channels.filter(
        (channel) => channel.status !== "included",
      );
      const primaryCandidate = sequencePlan.candidates[0];
      const firstStep = sequencePlan.steps[0];

      return {
        result: "success",
        detail:
          "Outreach sequence plan summarized for Telegram without creating provider work.",
        reply:
          `Sequence: ${sequencePlan.posture.replace(/_/g, " ")}. ` +
          `${sequencePlan.steps.length} review steps, ${sequencePlan.candidates.length} candidate leads` +
          `${primaryCandidate ? `; top lead ${primaryCandidate.fullName} (${primaryCandidate.score})` : ""}. ` +
          `${
            blockedChannels.length > 0
              ? `Channel review needed: ${blockedChannels.map((channel) => channel.label).join(", ")}. `
              : "Planned channels fit the current plan. "
          }` +
          `${firstStep ? `First step: ${firstStep.channel} on day ${firstStep.dayOffset}. ` : ""}` +
          "No send, call, SMS, social action, campaign, or provider mutation was created.",
      };
    }

    if (command === "forecast") {
      const [dashboard, blueprint] = await Promise.all([
        storage.getDashboard(),
        storage.getSalesBlueprint(),
      ]);
      const forecast = buildRevenueForecast({
        dashboard,
        blueprint,
      });
      const weightedPipeline = forecast.metrics.find(
        (metric) => metric.id === "weighted-pipeline",
      );
      const actualClosed = forecast.metrics.find(
        (metric) => metric.id === "actual-closed",
      );
      const pipelineGap = forecast.metrics.find(
        (metric) => metric.id === "pipeline-gap",
      );
      const nextAction = forecast.nextActions[0];

      return {
        result: "success",
        detail:
          "Revenue forecast summarized for Telegram without creating provider or billing work.",
        reply:
          `Forecast: ${forecast.posture.replace(/_/g, " ")}. ` +
          `${weightedPipeline?.label ?? "Weighted pipeline"} ${weightedPipeline?.value ?? "$0"}; ` +
          `${actualClosed?.label ?? "Actual closed"} ${actualClosed?.value ?? "$0"}; ` +
          `${pipelineGap?.label ?? "Pipeline gap"} ${pipelineGap?.value ?? "$0"}. ` +
          `${nextAction ? `Next: ${nextAction.label}. ` : ""}` +
          "No outreach, scheduling, billing, or provider work was triggered.",
      };
    }

    if (command === "providers") {
      const providers = getProviderSummary();
      const groups = [
        ["sources", providers.sources],
        ["outreach", providers.outreach],
        ["voice", providers.voice],
        ["billing", providers.billing],
        ["webhooks", providers.webhooks],
        ["chat", providers.chat],
      ] as const;
      const groupSummary = groups
        .map(([label, entries]) => {
          const configured = entries.filter(
            (provider) => provider.readiness === "configured",
          ).length;
          const blocked = entries.filter(
            (provider) => provider.readiness === "blocked",
          ).length;

          return `${label} ${configured}/${entries.length} configured${blocked > 0 ? `, ${blocked} blocked` : ""}`;
        })
        .join("; ");
      const blocker = providers.summary.productionBlockers[0];

      return {
        result: "success",
        detail: "Full provider readiness summarized for Telegram.",
        reply:
          `Provider readiness: ${providers.summary.configured} configured, ` +
          `${providers.summary.guarded} guarded, ${providers.summary.blocked} blocked, ` +
          `${providers.summary.disabled} disabled across sources, outreach, voice, billing, webhooks, and chat. ` +
          `${groupSummary}. ` +
          `${blocker ? `Top blocker: ${blocker}. ` : "No production blockers reported. "}` +
          "No provider, billing, webhook, or chat configuration changed.",
      };
    }

    if (command === "suppressions") {
      const suppressions = await storage.listSuppressions();

      return {
        result: "success",
        detail: "Suppression count returned for Telegram.",
        reply: `Suppression controls: ${suppressions.length} active rule${suppressions.length === 1 ? "" : "s"} checked before live dispatch.`,
      };
    }

    if (command === "approvals") {
      const proposals = await storage.listActionProposals("pending");
      const highRisk = proposals.filter(
        (proposal) =>
          proposal.riskLevel === "high" || proposal.riskLevel === "critical",
      ).length;

      return {
        result: "success",
        detail: "Pending approval proposals summarized for Telegram.",
        reply:
          proposals.length > 0
            ? `Approvals: ${proposals.length} pending proposal${proposals.length === 1 ? "" : "s"}, ${highRisk} high risk. Top item: ${proposals[0]?.title}.`
            : "Approvals: no pending action proposals are waiting.",
      };
    }

    const dashboard = await storage.getDashboard();

    const qualifiedLeads = dashboard.metrics.find(
      (metric) => metric.label === "Qualified leads",
    );
    const campaignsRunning = dashboard.metrics.find(
      (metric) => metric.label === "Campaigns running",
    );
    const meetingsBooked = dashboard.metrics.find(
      (metric) => metric.label === "Meetings booked",
    );

    return {
      result: "success",
      detail: "Workspace status summarized for Telegram.",
      reply:
        `${dashboard.workspace.workspaceName}: ` +
        `${qualifiedLeads?.value ?? "0"} qualified leads, ` +
        `${campaignsRunning?.value ?? "0"} campaigns running, ` +
        `${meetingsBooked?.value ?? "0"} meetings booked.`,
    };
  };
  const actorNameFor = (c: Context): string => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      throw new Error("Authenticated actor is required");
    }

    return user.name ?? user.email ?? user.id;
  };
  const suppressionChannelFor = (channel: string): SuppressionChannel => {
    if (channel === "call" || channel === "voice") {
      return "call";
    }

    if (channel === "sms") {
      return "sms";
    }

    if (channel === "linkedin") {
      return "linkedin";
    }

    return "email";
  };
  const outboundChannelFor = (channel: string) => {
    const normalized = channel === "voice" ? "call" : channel;
    const parsed = outboundChannelSchema.safeParse(normalized);
    return parsed.success ? parsed.data : null;
  };
  const upgradeRequirementFor = (
    entitlement: UsageEntitlementResult,
    requiredQuantity: number,
  ) => {
    switch (entitlement.metric) {
      case "provider_cost_cents":
        return { minProviderCostBudgetCents: requiredQuantity };
      case "outreach_dispatches":
        return { minOutreachDispatchLimit: requiredQuantity };
      case "voice_calls":
        return { minVoiceCallLimit: requiredQuantity };
      case "ai_worker_task_proposals":
        return { minAiWorkerTaskProposalLimit: requiredQuantity };
      case "ai_worker_execution_cents":
        return { minAiWorkerExecutionBudgetCents: requiredQuantity };
      default:
        return { minUsageLimit: requiredQuantity };
    }
  };
  const usageEntitlementResponse = (
    c: Context,
    entitlement: UsageEntitlementResult,
  ) => {
    const requiredQuantity =
      entitlement.currentUsage + entitlement.requestedQuantity;
    const upgrade =
      entitlement.subscriptionStatus === "active" ||
      entitlement.subscriptionStatus === "trialing"
        ? getUpgradeRecommendation({
            currentPlanKey: entitlement.planKey,
            ...upgradeRequirementFor(entitlement, requiredQuantity),
          })
        : null;

    return c.json(
      {
        error: entitlement.reason,
        entitlement,
        ...(upgrade ? { upgrade } : {}),
      },
      409,
    );
  };
  const channelEntitlementResponse = (
    c: Context,
    entitlement: ChannelEntitlementResult,
  ) => {
    const upgrade =
      entitlement.subscriptionStatus === "active" ||
      entitlement.subscriptionStatus === "trialing"
        ? getUpgradeRecommendation({
            currentPlanKey: entitlement.planKey,
            requiredChannel: entitlement.channel,
          })
        : null;

    return c.json(
      {
        error: entitlement.reason,
        entitlement,
        ...(upgrade ? { upgrade } : {}),
      },
      409,
    );
  };
  const requiredParam = (c: Context, key: string): string => {
    const value = c.req.param(key);
    if (!value) {
      throw new Error(`Missing route param: ${key}`);
    }

    return value;
  };
  const tenantErrorResponse = (c: Context, error: unknown) => {
    if (!(error instanceof TenantAccessError)) {
      return null;
    }

    return c.json(
      {
        error: error.message,
        code: error.code,
      },
      error.status as 400 | 401 | 403 | 404 | 409,
    );
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
    if (
      c.req.path === "/health" ||
      c.req.path === "/ready" ||
      c.req.method === "OPTIONS"
    ) {
      return next();
    }

    return auditLogMiddleware(c, next);
  });

  // CORS preflight handler
  app.options("*", async (c) => {
    const origin = c.req.header("Origin");

    if (origin && allowedOrigins.has(origin)) {
      c.res.headers.set("Access-Control-Allow-Origin", origin);
      c.res.headers.set("Vary", "Origin");
      c.res.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      c.res.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      c.res.headers.set("Access-Control-Allow-Credentials", "true");
      c.res.headers.set("Access-Control-Max-Age", "86400");
    }
    return c.text("", 200);
  });

  // Also add CORS headers to all actual responses
  app.use("*", async (c, next) => {
    await next();
    const origin = c.req.header("Origin");

    if (origin && allowedOrigins.has(origin)) {
      c.res.headers.set("Access-Control-Allow-Origin", origin);
      c.res.headers.set("Vary", "Origin");
      c.res.headers.set("Access-Control-Allow-Credentials", "true");
      c.res.headers.set(
        "Access-Control-Expose-Headers",
        "Content-Length, X-Content-Type-Options",
      );
    }
  });

  app.get("/health", async (c) => {
    let storageMode: "memory" | "postgres" | "unavailable";
    try {
      const storage = await getStorage();
      storageMode = storage.mode;
    } catch (error) {
      if (!(error instanceof ProductionStorageUnavailableError)) {
        throw error;
      }

      storageMode = "unavailable";
    }

    return c.json({
      status: "ok",
      service: "sales-api",
      release: buildApiReleaseMetadata(),
      storage: storageMode,
    });
  });

  app.get("/ready", async (c) => {
    let storageMode: "memory" | "postgres" = "memory";
    try {
      const storage = await getStorage();
      storageMode = storage.mode;
    } catch (error) {
      if (!(error instanceof ProductionStorageUnavailableError)) {
        throw error;
      }
    }

    const readiness = buildApiReadiness({
      storageMode,
      providerSummary: getProviderSummary(),
    });

    c.header("Cache-Control", "no-store");

    return c.json(readiness, readiness.status === "ready" ? 200 : 503);
  });

  app.get("/v1/foundation/summary", (c) => {
    return c.json({
      product: "Sales AaaS Platform",
      modules: platformModules,
      snapshot: dashboardSnapshot,
    });
  });

  app.post("/v1/contact/intake", async (c) => {
    const clientIp = normalizeContactIntakeClientIp(
      c.req.header("x-forwarded-for"),
      c.req.header("x-real-ip"),
      c.req.header("cf-connecting-ip"),
    );

    if (isContactIntakeBodyTooLarge(c.req.header("content-length"))) {
      return c.json(
        {
          error:
            "Contact request is too large. Please keep the message under 2,400 characters and submit business context only.",
          maxBodyBytes: CONTACT_INTAKE_MAX_BODY_BYTES,
        },
        413,
      );
    }

    const rateLimit = checkContactIntakeRateLimit(clientIp);

    if (!rateLimit.allowed) {
      const response = c.json(
        {
          error: "Too many contact requests. Please try again later.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        429,
      );
      const retryAfterSeconds = applyRateLimitHeaders(response.headers, {
        limit: rateLimit.limit,
        remaining: 0,
        resetAt: rateLimit.resetAt,
      });
      response.headers.set("Retry-After", String(retryAfterSeconds));

      return response;
    }

    let payload: unknown;

    try {
      payload = JSON.parse(await readContactIntakeBodyText(c.req.raw));
    } catch (error) {
      if (error instanceof ContactIntakeBodyTooLargeError) {
        return c.json(
          {
            error:
              "Contact request is too large. Please keep the message under 2,400 characters and submit business context only.",
            maxBodyBytes: error.maxBodyBytes,
          },
          413,
        );
      }

      if (error instanceof SyntaxError) {
        return c.json(
          {
            error: "Invalid contact intake JSON payload.",
            code: "invalid_json",
            requestId: c.get("requestId") ?? null,
          },
          400,
        );
      }

      throw error;
    }

    const input = createContactIntakeInputSchema.parse(payload);

    if (isContactIntakeSpamTrapTriggered(input)) {
      return c.json(
        {
          detail: "Your request was captured for review.",
        },
        202,
      );
    }

    const sanitized = sanitizeContactIntakeInput(input);
    const storage = await getStorage();
    const submission = await storage.createContactIntake(sanitized.input, {
      requestId: c.get("requestId") ?? null,
      ip: clientIp,
      userAgent: c.req.header("user-agent") ?? "unknown",
      contactIntakeSensitiveRedactionCount: sanitized.redactions.reduce(
        (total, finding) => total + finding.count,
        0,
      ),
      contactIntakeSensitiveRedactionTypes: [
        ...new Set(sanitized.redactions.map((finding) => finding.type)),
      ],
    });
    const notification = await notifyContactIntake(submission);

    return c.json(
      contactIntakeResponseSchema.parse({
        submission,
        notification,
        detail:
          submission.priority === "high"
            ? "Your request was captured for priority founder or managed-services review."
            : "Your request was captured for beta onboarding review.",
      }),
      201,
    );
  });

  app.get("/v1/command-center/capabilities", (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    return c.json(
      commandCenterCapabilitiesResponseSchema.parse(
        getCommandCenterCapabilities({ actorRole: user.role }),
      ),
    );
  });

  app.get("/v1/command-center/brief", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const [dashboard, proposals, aiWorkers, telegram] = await Promise.all([
      storage.getDashboard(),
      actionProposalPayload(storage, "pending"),
      storage.getAiWorkerControlPlane(),
      telegramIntegrationPayload(storage),
    ]);

    if (!proposals) {
      return c.json({ error: "Unable to load pending action proposals." }, 500);
    }

    return c.json(
      commandCenterBriefResponseSchema.parse(
        buildCommandCenterBrief({
          dashboard,
          proposals,
          providers: getProviderSummary(),
          aiWorkers,
          telegram,
        }),
      ),
    );
  });

  app.get("/v1/command-center/policies", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const [dashboard, proposals, aiWorkers, telegram] = await Promise.all([
      storage.getDashboard(),
      actionProposalPayload(storage, "pending"),
      storage.getAiWorkerControlPlane(),
      telegramIntegrationPayload(storage),
    ]);

    if (!proposals) {
      return c.json({ error: "Unable to load pending action proposals." }, 500);
    }

    return c.json(
      commandCenterPolicyCatalogResponseSchema.parse(
        buildCommandCenterPolicyCatalog({
          dashboard,
          proposals,
          providers: getProviderSummary(),
          aiWorkers,
          telegram,
          actorRole: user.role,
          emailVerified: user.emailVerified,
        }),
      ),
    );
  });

  app.get("/v1/command-center/telegram-readiness", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const [dashboard, proposals, telegram] = await Promise.all([
      storage.getDashboard(),
      actionProposalPayload(storage),
      telegramIntegrationPayload(storage),
    ]);

    if (!proposals) {
      return c.json({ error: "Unable to load action proposals." }, 500);
    }

    return c.json(
      telegramCommandReadinessResponseSchema.parse(
        buildTelegramCommandReadiness({
          dashboard,
          telegram,
          proposals,
          storageMode: storage.mode,
          rateLimit: telegramCommandRateLimitConfig(),
        }),
      ),
    );
  });

  app.get("/v1/command-center/telegram-notification-readiness", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const [dashboard, proposals, telegram] = await Promise.all([
      storage.getDashboard(),
      actionProposalPayload(storage),
      telegramIntegrationPayload(storage),
    ]);

    if (!proposals) {
      return c.json({ error: "Unable to load action proposals." }, 500);
    }

    const targetState = await telegramNotificationTargetState(telegram);

    return c.json(
      telegramNotificationReadinessResponseSchema.parse(
        buildTelegramNotificationReadiness({
          dashboard,
          telegram,
          proposals,
          config: telegramNotificationReadinessConfigFromEnv(targetState),
        }),
      ),
    );
  });

  app.post(
    "/v1/command-center/telegram-notifications/test",
    requireRole("owner", "admin"),
    requireVerifiedEmail(
      "Verify your email before sending Telegram notification tests.",
    ),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      const payload = await c.req.json();
      const input = sendTelegramNotificationInputSchema.parse(payload);
      const storage = await storageFor(c);
      const [dashboard, proposals, telegram] = await Promise.all([
        storage.getDashboard(),
        actionProposalPayload(storage),
        telegramIntegrationPayload(storage),
      ]);

      if (!proposals) {
        return c.json({ error: "Unable to load action proposals." }, 500);
      }

      const targetState = await telegramNotificationTargetState(telegram);
      const notificationConfig =
        telegramNotificationReadinessConfigFromEnv(targetState);
      const rateCap = await storage.claimTelegramNotificationDelivery({
        workspaceId: user.workspaceId,
        integrationId: telegram.integration.id,
        actorId: user.id,
        notificationType: input.notificationType,
        chatIdMask: telegram.integration.chatIdMask,
        dryRun: input.dryRun,
        targetChatConfigured: targetState.targetChatConfigured,
        targetChatMatchesWorkspace: targetState.targetChatMatchesWorkspace,
        maxNotificationsPerHour: notificationConfig.maxNotificationsPerHour,
      });

      if (!rateCap.allowed) {
        c.header("Retry-After", String(rateCap.retryAfterSeconds));
        const generatedAt = new Date().toISOString();
        const delivery = telegramNotificationDeliveryResponseSchema.parse({
          surface: "telegram-notification-delivery",
          version: "2026-06-06.telegram-notification-delivery",
          generatedAt,
          notificationType: input.notificationType,
          mode: "blocked",
          provider: "telegram",
          chatIdMask: telegram.integration.chatIdMask,
          messagePreview:
            "Telegram notification test was blocked before delivery because the workspace rate cap was reached.",
          detail: `${rateCap.detail} Wait before sending another notification test.`,
          guardrails: [
            "Summary-only Telegram notification.",
            "No network message was sent while the rate cap was reached.",
            "No approval, outreach dispatch, call dispatch, billing change, provider configuration, or AI-worker execution was performed.",
          ],
          auditEventId: null,
        });

        if (rateCap.deliveryId) {
          await storage.completeTelegramNotificationDelivery({
            deliveryId: rateCap.deliveryId,
            mode: delivery.mode,
            messagePreview: delivery.messagePreview,
            detail: delivery.detail,
            guardrails: delivery.guardrails,
          });
        }

        await storage.audit({
          organizationId: user.organizationId ?? null,
          actorType: "user",
          actorId: user.id,
          eventType: "telegram.notification.test",
          payload: {
            workspaceId: user.workspaceId ?? null,
            notificationType: delivery.notificationType,
            mode: delivery.mode,
            chatIdMask: delivery.chatIdMask,
            targetChatConfigured: targetState.targetChatConfigured,
            targetChatMatchesWorkspace: targetState.targetChatMatchesWorkspace,
            dryRun: input.dryRun,
            deliveryLedgerId: rateCap.deliveryId,
            rateLimit: {
              enforcedLimit: rateCap.enforcedLimit,
              used: rateCap.used,
              remaining: rateCap.remaining,
              windowSeconds: rateCap.windowSeconds,
              source: "telegram_notification_deliveries",
            },
            guardrails: delivery.guardrails,
          },
        });

        return c.json(delivery, 429);
      }

      const delivery = telegramNotificationDeliveryResponseSchema.parse(
        await deliverTelegramOperationalNotification({
          notificationType: input.notificationType,
          dryRun: input.dryRun,
          dashboard,
          proposals,
          telegram,
          config: notificationConfig,
          targetChatId: targetState.targetChatId,
          targetChatMatchesWorkspace: targetState.targetChatMatchesWorkspace,
        }),
      );

      if (rateCap.deliveryId) {
        await storage.completeTelegramNotificationDelivery({
          deliveryId: rateCap.deliveryId,
          mode: delivery.mode,
          messagePreview: delivery.messagePreview,
          detail: delivery.detail,
          guardrails: delivery.guardrails,
        });
      }

      await storage.audit({
        organizationId: user.organizationId ?? null,
        actorType: "user",
        actorId: user.id,
        eventType: "telegram.notification.test",
        payload: {
          workspaceId: user.workspaceId ?? null,
          notificationType: delivery.notificationType,
          mode: delivery.mode,
          chatIdMask: delivery.chatIdMask,
          targetChatConfigured: targetState.targetChatConfigured,
          targetChatMatchesWorkspace: targetState.targetChatMatchesWorkspace,
          dryRun: input.dryRun,
          deliveryLedgerId: rateCap.deliveryId,
          rateLimit: {
            enforcedLimit: rateCap.enforcedLimit,
            used: rateCap.used,
            remaining: rateCap.remaining,
            windowSeconds: rateCap.windowSeconds,
            source: "telegram_notification_deliveries",
          },
          guardrails: delivery.guardrails,
        },
      });

      const status = delivery.mode === "queued" || delivery.mode === "preview"
        ? 200
        : delivery.mode === "failed"
          ? 502
          : 409;

      return c.json(delivery, status);
    },
  );

  app.post(
    "/v1/command-center/telegram-notifications/scheduled-dispatch",
    async (c) => {
      const schedulerSecret = verifyTelegramNotificationSchedulerSecret({
        authorization: c.req.header("authorization"),
        schedulerSecretHeader: c.req.header(
          "x-telegram-notification-scheduler-secret",
        ),
      });

      if (!schedulerSecret.verified) {
        return c.json(
          {
            error: schedulerSecret.detail,
            detail:
              "Scheduled Telegram notification dispatch requires a deployment-owned scheduler secret.",
          },
          schedulerSecret.status,
        );
      }

      const payload = await c.req.json();
      const input = sendTelegramNotificationInputSchema.parse(payload);
      const generatedAt = new Date().toISOString();
      const target = await resolveTelegramNotificationTargetChat();
      const scheduledDelivery = (delivery: {
        mode: "blocked" | "unavailable";
        chatIdMask: string | null;
        messagePreview: string;
        detail: string;
        guardrails?: string[];
      }) =>
        telegramNotificationDeliveryResponseSchema.parse({
          surface: "telegram-notification-delivery",
          version: "2026-06-06.telegram-notification-delivery",
          generatedAt,
          notificationType: input.notificationType,
          mode: delivery.mode,
          provider: "telegram",
          chatIdMask: delivery.chatIdMask,
          messagePreview: delivery.messagePreview,
          detail: delivery.detail,
          guardrails: delivery.guardrails ?? [
            "Summary-only Telegram notification.",
            "No approval, outreach dispatch, call dispatch, billing change, provider configuration, or AI-worker execution was performed.",
            "Scheduled dispatch is blocked before transport when deployment, quiet-hours, target-chat, or rate-cap controls fail.",
          ],
          auditEventId: null,
        });

      if (!target.targetChatConfigured || !target.targetChatId) {
        return c.json(
          scheduledDelivery({
            mode: "unavailable",
            chatIdMask: null,
            messagePreview:
              "Scheduled Telegram notification dispatch could not resolve a deployment target chat.",
            detail:
              "TELEGRAM_NOTIFICATION_TARGET_CHAT_ID is not configured server-side.",
          }),
          503,
        );
      }

      if (!target.resolved) {
        return c.json(
          scheduledDelivery({
            mode: "blocked",
            chatIdMask: target.targetChatMask,
            messagePreview:
              "Scheduled Telegram notification dispatch was blocked before delivery because no workspace binding matched the configured target chat.",
            detail:
              "The deployment-owned Telegram notification target chat is not bound to a workspace.",
          }),
          409,
        );
      }

      const scopedStorage = await getStorage({
        organizationId: target.resolved.organizationId,
        workspaceId: target.resolved.workspaceId,
      });
      const [dashboard, proposals, telegram] = await Promise.all([
        scopedStorage.getDashboard(),
        actionProposalPayload(scopedStorage),
        telegramIntegrationPayload(scopedStorage),
      ]);

      if (!proposals) {
        return c.json({ error: "Unable to load action proposals." }, 500);
      }

      const targetState = {
        targetChatId: target.targetChatId,
        targetChatConfigured: true,
        targetChatMatchesWorkspace: true,
      };
      const notificationConfig =
        telegramNotificationReadinessConfigFromEnv(targetState);
      const quietHours = telegramNotificationQuietHoursFromEnv();
      const auditScheduledDispatch = async (
        delivery: typeof telegramNotificationDeliveryResponseSchema._output,
        extra: Record<string, unknown> = {},
      ) => {
        await scopedStorage.audit({
          organizationId: target.resolved!.organizationId,
          actorType: "system",
          eventType: "telegram.notification.scheduled_dispatch",
          payload: {
            workspaceId: target.resolved!.workspaceId,
            trigger: "scheduler",
            notificationType: delivery.notificationType,
            mode: delivery.mode,
            chatIdMask: delivery.chatIdMask,
            targetChatConfigured: targetState.targetChatConfigured,
            targetChatMatchesWorkspace: targetState.targetChatMatchesWorkspace,
            dryRun: input.dryRun,
            quietHours: {
              configured: quietHours.configured,
              enforceable: quietHours.enforceable,
              active: quietHours.active,
              start: quietHours.start,
              end: quietHours.end,
              timeZone: quietHours.timeZone,
            },
            guardrails: delivery.guardrails,
            ...extra,
          },
        });
      };

      if (!quietHours.configured || !quietHours.enforceable) {
        const delivery = scheduledDelivery({
          mode: "blocked",
          chatIdMask: telegram.integration.chatIdMask,
          messagePreview:
            "Scheduled Telegram notification dispatch was blocked before delivery because quiet-hours enforcement is not production-ready.",
          detail: quietHours.detail,
        });

        await auditScheduledDispatch(delivery);

        return c.json(delivery, 409);
      }

      if (quietHours.active) {
        const delivery = scheduledDelivery({
          mode: "blocked",
          chatIdMask: telegram.integration.chatIdMask,
          messagePreview:
            "Scheduled Telegram notification dispatch was skipped during quiet hours.",
          detail: `${quietHours.detail} The scheduler should retry outside this window.`,
        });

        await auditScheduledDispatch(delivery);

        return c.json(delivery, 202);
      }

      const rateCap = await scopedStorage.claimTelegramNotificationDelivery({
        workspaceId: target.resolved.workspaceId,
        integrationId: telegram.integration.id,
        actorId: null,
        notificationType: input.notificationType,
        chatIdMask: telegram.integration.chatIdMask,
        dryRun: input.dryRun,
        targetChatConfigured: targetState.targetChatConfigured,
        targetChatMatchesWorkspace: targetState.targetChatMatchesWorkspace,
        maxNotificationsPerHour: notificationConfig.maxNotificationsPerHour,
      });

      if (!rateCap.allowed) {
        c.header("Retry-After", String(rateCap.retryAfterSeconds));
        const delivery = scheduledDelivery({
          mode: "blocked",
          chatIdMask: telegram.integration.chatIdMask,
          messagePreview:
            "Scheduled Telegram notification dispatch was blocked before delivery because the workspace rate cap was reached.",
          detail: `${rateCap.detail} Wait before scheduler delivery retries.`,
        });

        if (rateCap.deliveryId) {
          await scopedStorage.completeTelegramNotificationDelivery({
            deliveryId: rateCap.deliveryId,
            mode: delivery.mode,
            messagePreview: delivery.messagePreview,
            detail: delivery.detail,
            guardrails: delivery.guardrails,
          });
        }

        await auditScheduledDispatch(delivery, {
          deliveryLedgerId: rateCap.deliveryId,
          rateLimit: {
            enforcedLimit: rateCap.enforcedLimit,
            used: rateCap.used,
            remaining: rateCap.remaining,
            windowSeconds: rateCap.windowSeconds,
            source: "telegram_notification_deliveries",
          },
        });

        return c.json(delivery, 429);
      }

      const delivery = telegramNotificationDeliveryResponseSchema.parse(
        await deliverTelegramOperationalNotification({
          notificationType: input.notificationType,
          dryRun: input.dryRun,
          dashboard,
          proposals,
          telegram,
          config: notificationConfig,
          targetChatId: target.targetChatId,
          targetChatMatchesWorkspace: targetState.targetChatMatchesWorkspace,
        }),
      );

      if (rateCap.deliveryId) {
        await scopedStorage.completeTelegramNotificationDelivery({
          deliveryId: rateCap.deliveryId,
          mode: delivery.mode,
          messagePreview: delivery.messagePreview,
          detail: delivery.detail,
          guardrails: delivery.guardrails,
        });
      }

      await auditScheduledDispatch(delivery, {
        deliveryLedgerId: rateCap.deliveryId,
        rateLimit: {
          enforcedLimit: rateCap.enforcedLimit,
          used: rateCap.used,
          remaining: rateCap.remaining,
          windowSeconds: rateCap.windowSeconds,
          source: "telegram_notification_deliveries",
        },
      });

      const status = delivery.mode === "queued" || delivery.mode === "preview"
        ? 200
        : delivery.mode === "failed"
          ? 502
          : 409;

      return c.json(delivery, status);
    },
  );

  app.post("/v1/command-center/preview", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const payload = await c.req.json();
    const input = commandCenterCommandPreviewInputSchema.parse(payload);
    const storage = await storageFor(c);
    const [dashboard, proposals, aiWorkers, telegram] = await Promise.all([
      storage.getDashboard(),
      actionProposalPayload(storage, "pending"),
      storage.getAiWorkerControlPlane(),
      telegramIntegrationPayload(storage),
    ]);

    if (!proposals) {
      return c.json({ error: "Unable to load pending action proposals." }, 500);
    }

    const policyCatalog = buildCommandCenterPolicyCatalog({
      dashboard,
      proposals,
      providers: getProviderSummary(),
      aiWorkers,
      telegram,
      actorRole: user.role,
      emailVerified: user.emailVerified,
    });

    return c.json(
      commandCenterCommandPreviewSchema.parse(
        buildCommandCenterCommandPreview({
          commandText: input.commandText,
          channel: input.channel,
          policyCatalog,
        }),
      ),
    );
  });

  app.post(
    "/v1/command-center/proposals",
    requireRole("owner", "admin"),
    requireVerifiedEmail(
      "Verify your email before creating command approval proposals.",
    ),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      const payload = await c.req.json();
      const input = commandCenterCommandProposalInputSchema.parse(payload);
      const storage = await storageFor(c);
      const [dashboard, proposals, aiWorkers, telegram] = await Promise.all([
        storage.getDashboard(),
        actionProposalPayload(storage, "pending"),
        storage.getAiWorkerControlPlane(),
        telegramIntegrationPayload(storage),
      ]);

      if (!proposals) {
        return c.json(
          { error: "Unable to load pending action proposals." },
          500,
        );
      }

      const policyCatalog = buildCommandCenterPolicyCatalog({
        dashboard,
        proposals,
        providers: getProviderSummary(),
        aiWorkers,
        telegram,
        actorRole: user.role,
        emailVerified: user.emailVerified,
      });
      const preview = buildCommandCenterCommandPreview({
        commandText: input.commandText,
        channel: input.channel,
        policyCatalog,
      });
      const proposalInput = buildCommandCenterActionProposalInput({
        preview,
        dashboard,
        aiWorkers,
        requestedBy: actorNameFor(c),
      });

      if (!proposalInput) {
        return c.json(
          {
            error:
              preview.executionMode === "blocked"
                ? preview.operatorMessage
                : "This command can be previewed but cannot create a generic approval proposal yet.",
            preview,
          },
          409,
        );
      }

      const proposal = await storage.createActionProposal(
        proposalInput,
        user.id,
      );

      return c.json(
        commandCenterCommandProposalResponseSchema.parse({
          surface: "command-center-command-proposal",
          version: "2026-06-04.command-proposal",
          generatedAt: new Date().toISOString(),
          preview,
          proposal,
          detail:
            "Command converted into a pending approval proposal. No provider work ran.",
          guardrails: [
            "Proposal creation records operator intent only.",
            "Approval inbox review is required before any downstream effect.",
            "Existing provider, suppression, entitlement, and audit gates still apply.",
          ],
        }),
        201,
      );
    },
  );

  app.get("/v1/dashboard", async (c) => {
    const storage = await storageFor(c);
    return c.json(dashboardResponseSchema.parse(await storage.getDashboard()));
  });

  app.get("/v1/audit/recent", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const parsedLimit = Number.parseInt(c.req.query("limit") ?? "20", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(50, Math.max(1, parsedLimit))
      : 20;
    const storage = await storageFor(c);
    const generatedAt = new Date().toISOString();
    const auditConfig = auditComplianceConfigFromEnv();
    const retention = auditRetentionWindowFromConfig(auditConfig, generatedAt);

    return c.json(
      auditLogResponseSchema.parse(
        buildAuditLogResponse({
          events: await storage.listAuditEvents(limit, {
            since: retention.since,
          }),
          generatedAt,
          retentionDays: auditConfig.retentionDays,
        }),
      ),
    );
  });

  app.get("/v1/audit/export", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const parsedLimit = Number.parseInt(c.req.query("limit") ?? "50", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(50, Math.max(1, parsedLimit))
      : 50;
    const storage = await storageFor(c);
    const generatedAt = new Date().toISOString();
    const auditConfig = auditComplianceConfigFromEnv();
    const retention = auditRetentionWindowFromConfig(auditConfig, generatedAt);
    const [dashboard, events] = await Promise.all([
      storage.getDashboard(),
      storage.listAuditEvents(limit, { since: retention.since }),
    ]);

    return c.json(
      auditExportResponseSchema.parse(
        await buildAuditExport({
          events,
          workspaceName: dashboard.workspace.workspaceName,
          generatedAt,
          retentionDays: auditConfig.retentionDays,
        }),
      ),
    );
  });

  app.get("/v1/audit/compliance-readiness", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const generatedAt = new Date().toISOString();
    const auditConfig = auditComplianceConfigFromEnv();
    const retention = auditRetentionWindowFromConfig(auditConfig, generatedAt);
    const auditLog = buildAuditLogResponse({
      events: await storage.listAuditEvents(20, { since: retention.since }),
      generatedAt,
      retentionDays: auditConfig.retentionDays,
    });

    return c.json(
      auditComplianceReadinessResponseSchema.parse(
        buildAuditComplianceReadiness({
          auditLog,
          config: auditConfig,
          generatedAt,
        }),
      ),
    );
  });

  app.get("/v1/conversion/brief", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    return c.json(
      conversionBriefResponseSchema.parse(
        buildConversionBrief({ dashboard: await storage.getDashboard() }),
      ),
    );
  });

  app.get("/v1/conversion/work-queue", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    return c.json(
      conversionWorkQueueResponseSchema.parse(
        buildConversionWorkQueue({ dashboard: await storage.getDashboard() }),
      ),
    );
  });

  app.get("/v1/conversion/integration-readiness", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    return c.json(
      conversionIntegrationReadinessResponseSchema.parse(
        buildConversionIntegrationReadiness({
          dashboard: await storage.getDashboard(),
          config: conversionIntegrationConfigFromEnv(),
        }),
      ),
    );
  });

  app.get("/v1/conversion/crm-handoff", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    return c.json(
      crmHandoffResponseSchema.parse(
        buildCrmHandoff({ dashboard: await storage.getDashboard() }),
      ),
    );
  });

  app.get("/v1/growth/plan-readiness", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const [
      dashboard,
      blueprint,
      outreachEntitlement,
      voiceEntitlement,
      providerCostEntitlement,
    ] = await Promise.all([
      storage.getDashboard(),
      storage.getSalesBlueprint(),
      storage.checkUsageEntitlement("outreach_dispatches", 1),
      storage.checkUsageEntitlement("voice_calls", 1),
      storage.checkUsageEntitlement("provider_cost_cents", 1),
    ]);

    return c.json(
      planGrowthReadinessResponseSchema.parse(
        buildPlanGrowthReadiness({
          dashboard,
          blueprint,
          outreachDispatchUsage: outreachEntitlement.currentUsage,
          voiceCallUsage: voiceEntitlement.currentUsage,
          providerCostUsageCents: providerCostEntitlement.currentUsage,
        }),
      ),
    );
  });

  app.get("/v1/growth/managed-service-readiness", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const [
      dashboard,
      blueprint,
      outreachEntitlement,
      voiceEntitlement,
      providerCostEntitlement,
      proposals,
      aiWorkers,
    ] = await Promise.all([
      storage.getDashboard(),
      storage.getSalesBlueprint(),
      storage.checkUsageEntitlement("outreach_dispatches", 1),
      storage.checkUsageEntitlement("voice_calls", 1),
      storage.checkUsageEntitlement("provider_cost_cents", 1),
      actionProposalPayload(storage),
      storage.getAiWorkerControlPlane(),
    ]);

    if (!proposals) {
      return c.json({ error: "Unable to load action proposals." }, 500);
    }

    const planGrowthReadiness = buildPlanGrowthReadiness({
      dashboard,
      blueprint,
      outreachDispatchUsage: outreachEntitlement.currentUsage,
      voiceCallUsage: voiceEntitlement.currentUsage,
      providerCostUsageCents: providerCostEntitlement.currentUsage,
    });
    const conversionWorkQueue = buildConversionWorkQueue({ dashboard });

    return c.json(
      managedServiceReadinessResponseSchema.parse(
        buildManagedServiceReadiness({
          dashboard,
          planGrowthReadiness,
          conversionWorkQueue,
          proposals,
          aiWorkerSummary: aiWorkers.summary,
          config: managedServiceReadinessConfigFromEnv(),
        }),
      ),
    );
  });

  app.get("/v1/outreach/sequence-plan", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const [dashboard, blueprint] = await Promise.all([
      storage.getDashboard(),
      storage.getSalesBlueprint(),
    ]);

    return c.json(
      outreachSequencePlanResponseSchema.parse(
        buildOutreachSequencePlan({
          dashboard,
          blueprint,
        }),
      ),
    );
  });

  app.get("/v1/outreach/channel-readiness", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const emailProviderCostCents =
      estimateCampaignDispatchProviderCostCents("email");
    const voiceProviderCostCents = estimateVoiceCallProviderCostCents();
    const [
      dashboard,
      emailChannel,
      callChannel,
      linkedinChannel,
      smsChannel,
      outreachDispatch,
      voiceCall,
      emailProviderCost,
      voiceProviderCost,
    ] = await Promise.all([
      storage.getDashboard(),
      storage.checkChannelEntitlement("email"),
      storage.checkChannelEntitlement("call"),
      storage.checkChannelEntitlement("linkedin"),
      storage.checkChannelEntitlement("sms"),
      storage.checkUsageEntitlement("outreach_dispatches", 1),
      storage.checkUsageEntitlement("voice_calls", 1),
      storage.checkUsageEntitlement(
        "provider_cost_cents",
        Math.max(1, emailProviderCostCents),
      ),
      storage.checkUsageEntitlement(
        "provider_cost_cents",
        Math.max(1, voiceProviderCostCents),
      ),
    ]);

    return c.json(
      outboundChannelReadinessResponseSchema.parse(
        buildOutboundChannelReadiness({
          dashboard,
          providers: getProviderSummary(),
          channelEntitlements: {
            email: emailChannel,
            call: callChannel,
            linkedin: linkedinChannel,
            sms: smsChannel,
          },
          usage: {
            outreachDispatch,
            voiceCall,
            emailProviderCost,
            voiceProviderCost,
          },
          config: outboundChannelReadinessConfigFromEnv(),
        }),
      ),
    );
  });

  app.get("/v1/ai-workers", async (c) => {
    const storage = await storageFor(c);
    return c.json(
      aiWorkerControlPlaneResponseSchema.parse(
        await storage.getAiWorkerControlPlane(),
      ),
    );
  });

  app.get("/v1/ai-workers/execution-readiness", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    const storage = await storageFor(c);
    const [controlPlane, aiExecutionBudgetEntitlement] = await Promise.all([
      storage.getAiWorkerControlPlane(),
      storage.checkUsageEntitlement("ai_worker_execution_cents", 1),
    ]);

    return c.json(
      aiWorkerExecutionReadinessResponseSchema.parse(
        buildAiWorkerExecutionReadiness({
          controlPlane,
          actorRole: user?.role ?? "member",
          emailVerified: Boolean(user?.emailVerified),
          aiExecutionBudgetUsage: {
            currentUsage: aiExecutionBudgetEntitlement.currentUsage,
            usageLimit: aiExecutionBudgetEntitlement.usageLimit,
            remainingQuantity: aiExecutionBudgetEntitlement.remainingQuantity,
          },
        }),
      ),
    );
  });

  app.get("/v1/ai-workers/margin-readiness", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const [
      dashboard,
      blueprint,
      controlPlane,
      outreachEntitlement,
      voiceEntitlement,
      providerCostEntitlement,
      aiTaskProposalEntitlement,
      aiExecutionBudgetEntitlement,
    ] = await Promise.all([
      storage.getDashboard(),
      storage.getSalesBlueprint(),
      storage.getAiWorkerControlPlane(),
      storage.checkUsageEntitlement("outreach_dispatches", 1),
      storage.checkUsageEntitlement("voice_calls", 1),
      storage.checkUsageEntitlement("provider_cost_cents", 1),
      storage.checkUsageEntitlement("ai_worker_task_proposals", 1),
      storage.checkUsageEntitlement("ai_worker_execution_cents", 1),
    ]);
    const planGrowthReadiness = buildPlanGrowthReadiness({
      dashboard,
      blueprint,
      outreachDispatchUsage: outreachEntitlement.currentUsage,
      voiceCallUsage: voiceEntitlement.currentUsage,
      providerCostUsageCents: providerCostEntitlement.currentUsage,
    });

    return c.json(
      aiWorkerMarginReadinessResponseSchema.parse(
        buildAiWorkerMarginReadiness({
          dashboard,
          controlPlane,
          planGrowthReadiness,
          providerCostUsageCents: providerCostEntitlement.currentUsage,
          aiTaskProposalUsage: {
            currentUsage: aiTaskProposalEntitlement.currentUsage,
            usageLimit: aiTaskProposalEntitlement.usageLimit,
            remainingQuantity: aiTaskProposalEntitlement.remainingQuantity,
          },
          aiExecutionBudgetUsage: {
            currentUsage: aiExecutionBudgetEntitlement.currentUsage,
            usageLimit: aiExecutionBudgetEntitlement.usageLimit,
            remainingQuantity: aiExecutionBudgetEntitlement.remainingQuantity,
          },
          aiTaskMeteringEnforced: true,
          aiExecutionBudgetEnforced: true,
          providerCostCurvesConfigured: hasAiWorkerDryRunCostCurveCoverage(),
        }),
      ),
    );
  });

  app.post(
    "/v1/ai-workers/tasks",
    requireRole("owner", "admin"),
    requireVerifiedEmail(
      "Verify your email before creating AI worker task proposals.",
    ),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      const storage = await storageFor(c);
      const payload = await c.req.json();
      const input = createAiWorkerTaskInputSchema.parse(payload);
      const entitlement = await storage.checkUsageEntitlement(
        "ai_worker_task_proposals",
        1,
      );

      if (!entitlement.allowed) {
        return usageEntitlementResponse(c, entitlement);
      }

      const run = await storage.createAiWorkerTaskProposal(input, user.id);

      if (!run) {
        return c.json({ error: "AI worker not found in this workspace." }, 404);
      }

      if (run.status === "blocked") {
        return c.json(
          {
            error:
              run.blockedReason ??
              "AI worker task proposal was blocked by policy.",
            run: aiWorkerRunSchema.parse(run),
          },
          409,
        );
      }

      return c.json(aiWorkerRunSchema.parse(run), 201);
    },
  );

  app.post(
    "/v1/ai-workers/runs/:id/result",
    requireRole("owner", "admin"),
    requireVerifiedEmail(
      "Verify your email before recording AI worker dry-run results.",
    ),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      const storage = await storageFor(c);
      const payload = await c.req.json();
      const input = completeAiWorkerRunInputSchema.parse(payload);
      if (input.actualCostCents > 0) {
        const entitlement = await storage.checkUsageEntitlement(
          "ai_worker_execution_cents",
          input.actualCostCents,
        );

        if (!entitlement.allowed) {
          return usageEntitlementResponse(c, entitlement);
        }
      }

      const result = await storage.completeAiWorkerRun(
        requiredParam(c, "id"),
        input,
        {
          id: user.id,
          name: actorNameFor(c),
        },
      );

      if (!result.run) {
        return c.json({ error: result.error }, result.status);
      }

      return c.json(aiWorkerRunSchema.parse(result.run));
    },
  );

  app.get("/v1/account/workspaces", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    try {
      const memberships = await listWorkspaceMembershipsForUser({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        activeWorkspaceId: user.workspaceId,
      });

      return c.json(workspaceMembershipListSchema.parse({ memberships }));
    } catch (error) {
      return (
        tenantErrorResponse(c, error) ??
        c.json({ error: "Unable to load workspaces" }, 500)
      );
    }
  });

  app.post("/v1/account/workspaces/select", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    try {
      const payload = await c.req.json();
      const { workspaceId } = selectWorkspaceInputSchema.parse(payload);
      const selected = await selectActiveWorkspaceForUser(user.id, workspaceId);
      const memberships = await listWorkspaceMembershipsForUser({
        id: user.id,
        email: user.email,
        name: user.name,
        role: selected.role,
        organizationId: selected.organizationId,
        activeWorkspaceId: selected.workspaceId,
      });

      return c.json(workspaceMembershipListSchema.parse({ memberships }));
    } catch (error) {
      return (
        tenantErrorResponse(c, error) ??
        c.json({ error: "Unable to select workspace" }, 500)
      );
    }
  });

  app.get("/v1/account/team", requireRole("owner", "admin"), async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    try {
      const members = await listWorkspaceTeamMembersForActor({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as "owner" | "admin" | "member",
        organizationId: user.organizationId!,
        workspaceId: user.workspaceId!,
      });

      return c.json(workspaceTeamMemberListSchema.parse({ members }));
    } catch (error) {
      return (
        tenantErrorResponse(c, error) ??
        c.json({ error: "Unable to load team members" }, 500)
      );
    }
  });

  app.get(
    "/v1/account/team/invitations",
    requireRole("owner", "admin"),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      try {
        const invitations = await listWorkspaceInvitationsForActor({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as "owner" | "admin" | "member",
          organizationId: user.organizationId!,
          workspaceId: user.workspaceId!,
        });

        return c.json(workspaceInvitationListSchema.parse({ invitations }));
      } catch (error) {
        return (
          tenantErrorResponse(c, error) ??
          c.json({ error: "Unable to load team invites" }, 500)
        );
      }
    },
  );

  app.post(
    "/v1/account/team/invitations",
    requireRole("owner", "admin"),
    requireVerifiedEmail("Verify your email before inviting teammates."),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      try {
        const payload = await c.req.json();
        const input = createWorkspaceInvitationInputSchema.parse(payload);
        const result = await createWorkspaceInvitationForActor(
          {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as "owner" | "admin" | "member",
            organizationId: user.organizationId!,
            workspaceId: user.workspaceId!,
          },
          input,
        );

        return c.json(
          createWorkspaceInvitationResponseSchema.parse(result),
          201,
        );
      } catch (error) {
        return (
          tenantErrorResponse(c, error) ??
          c.json({ error: "Unable to create invite" }, 500)
        );
      }
    },
  );

  app.post(
    "/v1/account/team/invitations/:id/revoke",
    requireRole("owner", "admin"),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      try {
        return c.json(
          await revokeWorkspaceInvitationForActor(
            {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role as "owner" | "admin" | "member",
              organizationId: user.organizationId!,
              workspaceId: user.workspaceId!,
            },
            requiredParam(c, "id"),
          ),
        );
      } catch (error) {
        return (
          tenantErrorResponse(c, error) ??
          c.json({ error: "Unable to revoke invite" }, 500)
        );
      }
    },
  );

  app.patch(
    "/v1/account/team/members/:id/role",
    requireRole("owner"),
    requireVerifiedEmail(
      "Verify your email before changing team member roles.",
    ),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      try {
        const payload = await c.req.json();
        const input = updateWorkspaceTeamMemberRoleInputSchema.parse(payload);
        const result = await updateWorkspaceTeamMemberRoleForActor(
          {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as "owner" | "admin" | "member",
            organizationId: user.organizationId!,
            workspaceId: user.workspaceId!,
          },
          requiredParam(c, "id"),
          input,
        );

        return c.json(workspaceTeamMemberMutationResponseSchema.parse(result));
      } catch (error) {
        return (
          tenantErrorResponse(c, error) ??
          c.json({ error: "Unable to update team member role" }, 500)
        );
      }
    },
  );

  app.delete(
    "/v1/account/team/members/:id",
    requireRole("owner"),
    requireVerifiedEmail("Verify your email before removing team members."),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      try {
        const result = await removeWorkspaceTeamMemberForActor(
          {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as "owner" | "admin" | "member",
            organizationId: user.organizationId!,
            workspaceId: user.workspaceId!,
          },
          requiredParam(c, "id"),
        );

        return c.json(workspaceTeamMemberRemovalResponseSchema.parse(result));
      } catch (error) {
        return (
          tenantErrorResponse(c, error) ??
          c.json({ error: "Unable to remove team member" }, 500)
        );
      }
    },
  );

  app.post(
    "/v1/account/team/ownership/transfer",
    requireRole("owner"),
    requireVerifiedEmail("Verify your email before transferring ownership."),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      try {
        const payload = await c.req.json();
        const input = transferWorkspaceOwnershipInputSchema.parse(payload);
        const result = await transferWorkspaceOwnershipForActor(
          {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as "owner" | "admin" | "member",
            organizationId: user.organizationId!,
            workspaceId: user.workspaceId!,
          },
          input.targetUserId,
        );

        return c.json(workspaceOwnershipTransferResponseSchema.parse(result));
      } catch (error) {
        return (
          tenantErrorResponse(c, error) ??
          c.json({ error: "Unable to transfer ownership" }, 500)
        );
      }
    },
  );

  app.post("/v1/account/team/invitations/accept", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    try {
      const payload = await c.req.json();
      const input = acceptWorkspaceInvitationInputSchema.parse(payload);

      return c.json(
        await acceptWorkspaceInvitationForUser(
          {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            activeWorkspaceId: user.workspaceId,
          },
          input.token,
        ),
      );
    } catch (error) {
      return (
        tenantErrorResponse(c, error) ??
        c.json({ error: "Unable to accept invite" }, 500)
      );
    }
  });

  app.get("/v1/providers", (c) => {
    return c.json(getProviderSummary());
  });

  app.get("/v1/providers/activation-readiness", (c) => {
    return c.json(
      providerActivationReadinessResponseSchema.parse(
        buildProviderActivationReadiness({
          providers: getProviderSummary(),
          config: providerActivationConfigFromEnv(),
        }),
      ),
    );
  });

  app.get("/v1/providers/cost-curves", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const [dashboard, providerCostEntitlement] = await Promise.all([
      storage.getDashboard(),
      storage.checkUsageEntitlement("provider_cost_cents", 1),
    ]);

    return c.json(
      providerCostCurveResponseSchema.parse(
        buildProviderCostCurves({
          providers: getProviderSummary(),
          providerCostBudgetCents: getPlanProviderCostBudgetCents(
            dashboard.subscription.planKey,
          ),
          providerCostUsageCents: providerCostEntitlement.currentUsage,
        }),
      ),
    );
  });

  app.post(
    "/v1/providers/setup-requests",
    requireRole("owner", "admin"),
    requireVerifiedEmail(
      "Verify your email before requesting provider setup review.",
    ),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      const payload = await c.req.json();
      const input = providerSetupRequestInputSchema.parse(payload);
      const proposalInput = buildProviderSetupActionProposal(
        input,
        actorNameFor(c),
      );
      const storage = await storageFor(c);
      const proposal = await storage.createActionProposal(
        proposalInput,
        user.id,
      );

      return c.json(actionProposalSchema.parse(proposal), 201);
    },
  );

  app.get("/v1/sales-blueprint", async (c) => {
    const storage = await storageFor(c);
    const blueprint = await storage.getSalesBlueprint();
    return c.json(
      salesBlueprintResponseSchema.parse({
        blueprint,
        detail: blueprint
          ? "Sales blueprint is available for this workspace."
          : "No sales blueprint has been saved for this workspace yet.",
      }),
    );
  });

  app.get("/v1/content/opportunities", async (c) => {
    const storage = await storageFor(c);
    const parsedInput = contentOpportunityInputSchema.safeParse({
      limit: c.req.query("limit") ?? undefined,
    });

    if (!parsedInput.success) {
      return c.json({ error: "Invalid content opportunity limit." }, 400);
    }

    const [blueprint, sourcePlan] = await Promise.all([
      storage.getSalesBlueprint(),
      storage.getSourcePlan(),
    ]);

    return c.json(
      contentOpportunityPlanSchema.parse(
        buildContentOpportunityPlan({
          blueprint,
          sourcePlan,
          limit: parsedInput.data.limit,
        }),
      ),
    );
  });

  app.get("/v1/revenue/forecast", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const [dashboard, blueprint] = await Promise.all([
      storage.getDashboard(),
      storage.getSalesBlueprint(),
    ]);

    return c.json(
      revenueForecastResponseSchema.parse(
        buildRevenueForecast({
          dashboard,
          blueprint,
        }),
      ),
    );
  });

  app.get("/v1/revenue/reconciliation", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    return c.json(
      revenueReconciliationResponseSchema.parse(
        buildRevenueReconciliation({
          dashboard: await storage.getDashboard(),
        }),
      ),
    );
  });

  app.put(
    "/v1/sales-blueprint",
    requireRole("owner", "admin"),
    requireVerifiedEmail(
      "Verify your email before changing the sales blueprint.",
    ),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      const storage = await storageFor(c);
      const payload = await c.req.json();
      const input = upsertSalesBlueprintInputSchema.parse(payload);
      const blueprint = await storage.upsertSalesBlueprint(input, user.id);

      return c.json(
        salesBlueprintResponseSchema.parse({
          blueprint,
          detail: "Sales blueprint saved and source planning refreshed.",
        }),
      );
    },
  );

  app.get("/v1/action-proposals", async (c) => {
    const storage = await storageFor(c);
    const payload = await actionProposalPayload(
      storage,
      c.req.query("status") ?? null,
    );

    if (!payload) {
      return c.json({ error: "Invalid action proposal status filter." }, 400);
    }

    return c.json(payload);
  });

  app.post(
    "/v1/action-proposals",
    requireRole("owner", "admin"),
    requireVerifiedEmail(
      "Verify your email before creating approval proposals.",
    ),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      const storage = await storageFor(c);
      const payload = await c.req.json();
      const input = createActionProposalInputSchema.parse(payload);
      const proposal = await storage.createActionProposal(input, user.id);

      return c.json(actionProposalSchema.parse(proposal), 201);
    },
  );

  app.post(
    "/v1/action-proposals/:id/review",
    requireRole("owner", "admin"),
    requireVerifiedEmail(
      "Verify your email before reviewing approval proposals.",
    ),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      const storage = await storageFor(c);
      const payload = await c.req.json();
      const input = reviewActionProposalInputSchema.parse(payload);
      const proposal = await storage.reviewActionProposal(
        requiredParam(c, "id"),
        input,
        {
          id: user.id,
          name: actorNameFor(c),
        },
      );

      if (!proposal) {
        return c.json({ error: "Pending approval proposal not found" }, 404);
      }

      return c.json(actionProposalSchema.parse(proposal));
    },
  );

  app.get("/v1/suppressions", async (c) => {
    const storage = await storageFor(c);
    return c.json(
      suppressionListResponseSchema.parse({
        suppressions: await storage.listSuppressions(),
      }),
    );
  });

  app.post("/v1/suppressions/check", async (c) => {
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = checkSuppressionInputSchema.parse(payload);
    return c.json(
      suppressionCheckResponseSchema.parse(
        await storage.checkSuppression(input),
      ),
    );
  });

  app.post("/v1/suppressions", requireRole("owner", "admin"), async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = createSuppressionInputSchema.parse(payload);
    return c.json(await storage.createSuppression(input, user.id), 201);
  });

  app.get("/v1/integrations/telegram", async (c) => {
    const storage = await storageFor(c);
    return c.json(await telegramIntegrationPayload(storage));
  });

  app.post(
    "/v1/integrations/telegram",
    requireRole("owner", "admin"),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      try {
        const storage = await storageFor(c);
        const payload = await c.req.json();
        const input = configureTelegramIntegrationInputSchema.parse(payload);
        await storage.upsertTelegramIntegration(input, user.id);
        return c.json(await telegramIntegrationPayload(storage), 201);
      } catch (error) {
        if (error instanceof Error && error.message.includes("already bound")) {
          return c.json({ error: error.message }, 409);
        }

        throw error;
      }
    },
  );

  app.post(
    "/v1/integrations/telegram/disable",
    requireRole("owner", "admin"),
    async (c) => {
      const user = c.get("user") as AuthUser | undefined;
      if (!user) {
        return c.json({ error: "Authentication required" }, 401);
      }

      const storage = await storageFor(c);
      await storage.disableTelegramIntegration(user.id);
      return c.json(await telegramIntegrationPayload(storage));
    },
  );

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

  app.post("/v1/webhooks/telegram", async (c) => {
    const verification = verifyTelegramWebhookSecret(
      c.req.header("x-telegram-bot-api-secret-token"),
    );

    if (!verification.verified) {
      return c.json(
        telegramWebhookResponseSchema.parse({
          ok: false,
          verified: false,
          command: null,
          result: "denied",
          reply: "Telegram webhook secret verification failed.",
          messageSent: false,
          detail: verification.detail,
        }),
        401,
      );
    }

    const payload = await c.req.json();
    const message = extractTelegramMessage(payload);

    if (!message) {
      return c.json(
        telegramWebhookResponseSchema.parse({
          ok: false,
          verified: true,
          command: null,
          result: "denied",
          reply: "Telegram update did not contain a supported text message.",
          messageSent: false,
          detail: "Unsupported Telegram update payload.",
        }),
        400,
      );
    }

    const chatIdHash = hashTelegramChatId(message.chatId);
    const chatIdMask = maskTelegramChatId(message.chatId);
    const command = parseTelegramCommand(message.text) ?? "help";
    const rootStorage = await getStorage();
    const resolved =
      await rootStorage.resolveTelegramIntegrationByChatIdHash(chatIdHash);

    if (!resolved) {
      const reply =
        "This Telegram chat is not bound to a Winrate AI workspace. Configure it from Settings before using commands.";
      const delivery = await sendTelegramReply(message.chatId, reply);

      return c.json(
        telegramWebhookResponseSchema.parse({
          ok: false,
          verified: true,
          command,
          result: "not_configured",
          reply,
          messageSent: delivery.sent,
          detail: "No workspace binding matched the Telegram chat hash.",
        }),
        200,
      );
    }

    const scopedStorage = await getStorage({
      organizationId: resolved.organizationId,
      workspaceId: resolved.workspaceId,
    });
    const integration = resolved.integration;
    const allowedCommands =
      integration.allowedCommands.length > 0
        ? integration.allowedCommands
        : [...telegramDefaultAllowedCommands];
    let result: TelegramCommandResult;
    let detail: string;
    let reply: string;
    let shouldSendReply = true;

    if (integration.status === "disabled") {
      result = "denied";
      detail = "Telegram integration is disabled.";
      reply = "This Telegram integration is disabled in Winrate AI settings.";
    } else if (!allowedCommands.includes(command)) {
      result = "denied";
      detail = `Telegram command /${command} is not allowlisted for this workspace.`;
      reply = `Command /${command} is not enabled for this workspace. Update the allowlist in Settings.`;
    } else if (
      !(await scopedStorage.claimTelegramWebhookUpdate(
        chatIdHash,
        message.updateId,
      ))
    ) {
      result = "denied";
      detail = "Telegram update replay detected and ignored.";
      reply =
        "This Telegram update was already processed. No workspace state changed.";
    } else {
      const commandRateLimit =
        await scopedStorage.claimTelegramCommandRateLimit(chatIdHash);

      if (!commandRateLimit.allowed) {
        c.header("Retry-After", String(commandRateLimit.retryAfterSeconds));
        result = "denied";
        detail = commandRateLimit.detail;
        reply = `Telegram command limit reached. Wait ${commandRateLimit.retryAfterSeconds} seconds before sending another command.`;
        shouldSendReply = false;
      } else {
        await scopedStorage.markTelegramIntegrationVerified(chatIdHash);
        const response = await buildTelegramCommandReply(
          command,
          scopedStorage,
          message.actor,
        );
        result = response.result;
        detail = response.detail;
        reply = response.reply;
      }
    }

    await scopedStorage.recordTelegramCommandAudit({
      organizationId: resolved.organizationId,
      workspaceId: resolved.workspaceId,
      integrationId: integration.id,
      actor: message.actor,
      command,
      chatIdMask: integration.chatIdMask ?? chatIdMask,
      result,
      detail,
    });

    const delivery = shouldSendReply
      ? await sendTelegramReply(message.chatId, reply)
      : {
          sent: false,
          detail:
            "Telegram reply delivery skipped because the chat is rate limited.",
        };

    return c.json(
      telegramWebhookResponseSchema.parse({
        ok: result === "success" || result === "requires_approval",
        verified: true,
        command,
        result,
        reply,
        messageSent: delivery.sent,
        detail: `${detail} ${delivery.detail}`,
      }),
      200,
    );
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
    const session = await storage.appendOnboardingMessage(
      requiredParam(c, "id"),
      input,
    );

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
    const entitlement = await storage.checkUsageEntitlement("leads_created", 1);

    if (!entitlement.allowed) {
      return usageEntitlementResponse(c, entitlement);
    }

    return c.json(await storage.createLead(input), 201);
  });

  app.get("/v1/leads", async (c) => {
    const storage = await storageFor(c);
    return c.json(await storage.getLeads());
  });

  app.get("/v1/leads/source-acquisition-readiness", async (c) => {
    const storage = await storageFor(c);
    const dashboard = await storage.getDashboard();
    const readiness = buildSourceAcquisitionReadiness({
      sourcePlan: dashboard.sourcePlan,
      sourceRuns: dashboard.sourceRuns,
      leads: dashboard.leads,
      providers: getProviderSummary(),
      sourceProviderGovernance: sourceProviderGovernanceConfigFromEnv(),
    });

    return c.json(sourceAcquisitionReadinessResponseSchema.parse(readiness));
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
    const providerMode = sourceProviderModeFor(input.source);
    const providerCostCents = estimateLeadSourceProviderCostCents(input.source);
    const entitlement = await storage.checkUsageEntitlement("leads_created", 1);

    if (!entitlement.allowed) {
      return usageEntitlementResponse(c, entitlement);
    }

    const governanceBlock = configuredSourceProviderGovernanceBlock(
      providerMode === "configured" ? [input.source] : [],
    );
    if (governanceBlock) {
      return c.json(governanceBlock, 409);
    }

    if (providerCostCents > 0) {
      const providerCostEntitlement = await storage.checkUsageEntitlement(
        "provider_cost_cents",
        providerCostCents,
      );

      if (!providerCostEntitlement.allowed) {
        return usageEntitlementResponse(c, providerCostEntitlement);
      }
    }

    return c.json(
      await storage.runLeadSource(input.source, {
        providerMode,
        providerCostCents,
      }),
      201,
    );
  });

  app.post("/v1/leads/discover", async (c) => {
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = discoverLeadsInputSchema.parse(payload);
    const sourcePlan = await storage.getSourcePlan();
    const adapters = chooseSourceProviders(sourcePlan, input.limitSources);
    const providerCostCents = adapters.reduce(
      (total, adapter) =>
        total + estimateLeadSourceProviderCostCents(adapter.provider),
      0,
    );
    const entitlement = await storage.checkUsageEntitlement(
      "leads_created",
      adapters.length,
    );

    if (!entitlement.allowed) {
      return usageEntitlementResponse(c, entitlement);
    }

    const configuredSourceProviders = adapters
      .map((adapter) => adapter.provider)
      .filter((provider) => sourceProviderModeFor(provider) === "configured");
    const governanceBlock = configuredSourceProviderGovernanceBlock(
      configuredSourceProviders,
    );
    if (governanceBlock) {
      return c.json(governanceBlock, 409);
    }

    if (providerCostCents > 0) {
      const providerCostEntitlement = await storage.checkUsageEntitlement(
        "provider_cost_cents",
        providerCostCents,
      );

      if (!providerCostEntitlement.allowed) {
        return usageEntitlementResponse(c, providerCostEntitlement);
      }
    }

    const runs = [];
    for (const adapter of adapters) {
      const adapterCostCents = estimateLeadSourceProviderCostCents(
        adapter.provider,
      );
      const result = await storage.runLeadSource(adapter.provider, {
        providerMode: sourceProviderModeFor(adapter.provider),
        providerCostCents: adapterCostCents,
      });
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

  app.post("/v1/campaigns", requireRole("owner", "admin"), async (c) => {
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = createCampaignInputSchema.parse(payload);
    const outboundChannel = outboundChannelFor(input.channel);

    if (!outboundChannel) {
      return c.json(
        { error: `Unsupported outbound channel: ${input.channel}` },
        400,
      );
    }

    const channelEntitlement =
      await storage.checkChannelEntitlement(outboundChannel);

    if (!channelEntitlement.allowed) {
      return channelEntitlementResponse(c, channelEntitlement);
    }

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

  app.post(
    "/v1/campaigns/:id/approve",
    requireRole("owner", "admin"),
    requireVerifiedEmail("Verify your email before approving outreach."),
    async (c) => {
      const storage = await storageFor(c);
      const campaignId = requiredParam(c, "id");
      const payload = await readOptionalJsonPayload(c);
      approveCampaignInputSchema.parse(payload);
      const campaign = await storage.approveCampaign(
        campaignId,
        actorNameFor(c),
      );

      if (!campaign) {
        return c.json({ error: "Campaign not found" }, 404);
      }

      return c.json(campaign);
    },
  );

  app.post(
    "/v1/campaigns/:id/run",
    requireRole("owner", "admin"),
    requireVerifiedEmail("Verify your email before running live outreach."),
    async (c) => {
      const storage = await storageFor(c);
      const campaignId = requiredParam(c, "id");
      const payload = await readOptionalJsonPayload(c);
      runCampaignInputSchema.parse(payload);
      const campaign = await storage.getCampaign(campaignId);

      if (!campaign) {
        return c.json({ error: "Campaign not found" }, 404);
      }

      const outboundChannel = outboundChannelFor(campaign.channel);

      if (!outboundChannel) {
        return c.json(
          { error: `Unsupported outbound channel: ${campaign.channel}` },
          400,
        );
      }

      if (!isCampaignDispatchChannelSupported(outboundChannel)) {
        return c.json(
          {
            error: campaignDispatchUnsupportedDetail(outboundChannel),
            code: CAMPAIGN_DISPATCH_UNSUPPORTED_CHANNEL_CODE,
            channel: outboundChannel,
          },
          400,
        );
      }

      const channelEntitlement =
        await storage.checkChannelEntitlement(outboundChannel);

      if (!channelEntitlement.allowed) {
        return channelEntitlementResponse(c, channelEntitlement);
      }

      const result = await storage.runCampaign(campaignId, actorNameFor(c));

      if (!result) {
        return c.json({ error: "Campaign not found" }, 404);
      }

      return c.json(result);
    },
  );

  app.post(
    "/v1/campaigns/:id/dispatch",
    requireRole("owner", "admin"),
    requireVerifiedEmail("Verify your email before dispatching live outreach."),
    async (c) => {
      const storage = await storageFor(c);
      const campaignId = requiredParam(c, "id");
      const payload = await readOptionalJsonPayload(c);
      dispatchCampaignInputSchema.parse(payload);
      const campaign = await storage.getCampaign(campaignId);

      if (!campaign) {
        return c.json({ error: "Campaign not found" }, 404);
      }

      const outboundChannel = outboundChannelFor(campaign.channel);

      if (!outboundChannel) {
        return c.json(
          { error: `Unsupported outbound channel: ${campaign.channel}` },
          400,
        );
      }

      if (!isCampaignDispatchChannelSupported(outboundChannel)) {
        return c.json(
          {
            error: campaignDispatchUnsupportedDetail(outboundChannel),
            code: CAMPAIGN_DISPATCH_UNSUPPORTED_CHANNEL_CODE,
            channel: outboundChannel,
          },
          400,
        );
      }

      const channelEntitlement =
        await storage.checkChannelEntitlement(outboundChannel);

      if (!channelEntitlement.allowed) {
        return channelEntitlementResponse(c, channelEntitlement);
      }

      const entitlement = await storage.checkUsageEntitlement(
        "outreach_dispatches",
        1,
      );

      if (!entitlement.allowed) {
        return usageEntitlementResponse(c, entitlement);
      }

      const providerCostCents = estimateCampaignDispatchProviderCostCents(
        campaign.channel,
      );
      if (providerCostCents > 0) {
        const costEntitlement = await storage.checkUsageEntitlement(
          "provider_cost_cents",
          providerCostCents,
        );

        if (!costEntitlement.allowed) {
          return usageEntitlementResponse(c, costEntitlement);
        }
      }

      const result = await storage.runCampaign(campaignId, actorNameFor(c));

      if (!result) {
        return c.json({ error: "Campaign not found" }, 404);
      }

      const activity = result.activities[0] ?? null;
      const lead = activity ? await storage.getLead(activity.leadId) : null;
      if (activity && lead) {
        const suppression = await storage.checkSuppression({
          channel: suppressionChannelFor(result.campaign.channel),
          email: lead.email,
          phone: lead.phone,
        });

        if (suppression.suppressed) {
          const detail = `Dispatch blocked: ${suppression.detail}`;
          const updatedActivity =
            (await storage.updateOutreachProviderResult(activity.id, {
              provider: "suppression-policy",
              providerMessageId: null,
              status: "review_required",
              providerCostCents: 0,
              detail,
            })) ?? activity;
          const updatedCampaign = await storage.getCampaign(campaignId);

          return c.json({
            campaign: updatedCampaign ?? result.campaign,
            activity: updatedActivity,
            provider: "suppression-policy",
            mode: "mock",
            externalId: null,
            deliveryStatus: "review_required",
            providerCostCents: 0,
            detail,
          });
        }
      }

      const dispatch = await dispatchCampaignActivity({
        campaign: result.campaign,
        activity,
        lead,
      });
      const acceptedProviderCostCents =
        dispatch.deliveryStatus === "review_required" ? 0 : providerCostCents;

      let updatedActivity = activity;
      if (activity && dispatch.externalId !== undefined) {
        updatedActivity =
          (await storage.updateOutreachProviderResult(activity.id, {
            provider: dispatch.provider,
            providerMessageId: dispatch.externalId,
            status: dispatch.deliveryStatus,
            providerCostCents: acceptedProviderCostCents,
            detail: dispatch.detail,
          })) ?? activity;
      }

      const updatedCampaign = await storage.getCampaign(campaignId);

      return c.json({
        campaign: updatedCampaign ?? result.campaign,
        activity: updatedActivity,
        ...dispatch,
        providerCostCents: acceptedProviderCostCents,
      });
    },
  );

  app.get("/v1/campaigns/:id/activity", async (c) => {
    const storage = await storageFor(c);
    return c.json(await storage.getCampaignActivity(requiredParam(c, "id")));
  });

  app.post("/v1/calls", async (c) => {
    const storage = await storageFor(c);
    const payload = await c.req.json();
    const input = createCallInputSchema.parse(payload);
    const channelEntitlement = await storage.checkChannelEntitlement("call");

    if (!channelEntitlement.allowed) {
      return channelEntitlementResponse(c, channelEntitlement);
    }

    const call = await storage.createCall(input);

    if (!call) {
      return c.json({ error: "Lead not found" }, 404);
    }

    return c.json(call, 201);
  });

  app.post(
    "/v1/calls/dispatch",
    requireRole("owner", "admin"),
    requireVerifiedEmail("Verify your email before dispatching live calls."),
    async (c) => {
      const storage = await storageFor(c);
      const payload = await c.req.json();
      const input = dispatchCallInputSchema.parse(payload);
      const channelEntitlement = await storage.checkChannelEntitlement("call");

      if (!channelEntitlement.allowed) {
        return channelEntitlementResponse(c, channelEntitlement);
      }

      const lead = await storage.getLead(input.leadId);

      if (!lead) {
        return c.json({ error: "Lead not found" }, 404);
      }

      const entitlement = await storage.checkUsageEntitlement("voice_calls", 1);

      if (!entitlement.allowed) {
        return usageEntitlementResponse(c, entitlement);
      }

      const suppression = await storage.checkSuppression({
        channel: "call",
        email: lead?.email,
        phone: lead?.phone,
      });

      const providerCostCents =
        lead.score > 85 ? estimateVoiceCallProviderCostCents() : 0;
      if (!suppression.suppressed && providerCostCents > 0) {
        const costEntitlement = await storage.checkUsageEntitlement(
          "provider_cost_cents",
          providerCostCents,
        );

        if (!costEntitlement.allowed) {
          return usageEntitlementResponse(c, costEntitlement);
        }
      }

      const call = await storage.createCall({
        leadId: input.leadId,
        provider: input.provider ?? "twilio",
      });

      if (!call) {
        return c.json({ error: "Lead not found" }, 404);
      }

      if (suppression.suppressed) {
        const detail = `Dispatch blocked: ${suppression.detail}`;
        const updatedCall =
          (await storage.updateCallSuppressionResult(call.id, detail)) ?? call;

        return c.json({
          call: updatedCall,
          provider: "suppression-policy",
          mode: "mock",
          externalId: null,
          providerCostCents: 0,
          detail,
        });
      }

      if (call.reviewRequired) {
        return c.json({
          call,
          provider: call.provider,
          mode: "mock",
          externalId: null,
          providerCostCents: 0,
          detail: "Call requires operator review before provider dispatch.",
        });
      }

      const dispatch = await dispatchVoiceCall({
        call,
        lead,
      });
      const acceptedProviderCostCents =
        dispatch.outcome === "review_required" ? 0 : providerCostCents;

      let updatedCall = call;
      if (dispatch.outcome === "review_required") {
        updatedCall =
          (await storage.updateCallProviderFailure(call.id, {
            provider: dispatch.provider,
            detail: dispatch.detail,
          })) ?? call;
      } else if (dispatch.externalId !== undefined) {
        updatedCall =
          (await storage.updateCallProviderResult(call.id, {
            provider: dispatch.provider,
            providerCallId: dispatch.externalId,
            providerCostCents: acceptedProviderCostCents,
            detail: dispatch.detail,
          })) ?? call;
      }

      return c.json({
        call: updatedCall,
        provider: dispatch.provider,
        mode: dispatch.mode,
        externalId: dispatch.externalId,
        providerCostCents: acceptedProviderCostCents,
        detail: dispatch.detail,
      });
    },
  );

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

  app.post(
    "/v1/meetings",
    requireRole("owner", "admin"),
    requireVerifiedEmail("Verify your email before scheduling meetings."),
    async (c) => {
      const storage = await storageFor(c);
      const payload = await c.req.json();
      const input = createMeetingInputSchema.parse(payload);
      const meeting = await storage.createMeeting(input);

      if (!meeting) {
        return c.json({ error: "Lead not found" }, 404);
      }

      return c.json(meeting, 201);
    },
  );

  app.get("/v1/meetings/:id/calendar", async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const storage = await storageFor(c);
    const handoff = buildMeetingCalendarHandoff({
      dashboard: await storage.getDashboard(),
      meetingId: requiredParam(c, "id"),
    });

    if (!handoff) {
      return c.json({ error: "Meeting not found" }, 404);
    }

    return c.json(meetingCalendarHandoffResponseSchema.parse(handoff));
  });

  app.patch(
    "/v1/meetings/:id",
    requireRole("owner", "admin"),
    requireVerifiedEmail("Verify your email before updating meeting outcomes."),
    async (c) => {
      const storage = await storageFor(c);
      const payload = await c.req.json();
      const input = updateMeetingInputSchema.parse(payload);
      const meeting = await storage.updateMeeting(
        requiredParam(c, "id"),
        input,
      );

      if (!meeting) {
        return c.json({ error: "Meeting not found" }, 404);
      }

      return c.json(meeting);
    },
  );

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
