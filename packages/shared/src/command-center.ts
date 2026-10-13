import { z } from "zod";
import {
  actionProposalListResponseSchema,
  actionProposalSchema,
  aiWorkerControlPlaneResponseSchema,
  createActionProposalInputSchema,
  dashboardResponseSchema,
  providerSummarySchema,
  roleSchema,
  telegramIntegrationResponseSchema,
  type ActionProposal,
  type ActionProposalListResponse,
  type AiWorkerControlPlaneResponse,
  type CreateActionProposalInput,
  type DashboardResponse,
  type ProviderSummary,
  type TelegramIntegrationResponse,
} from "./domain";

export const commandCenterChannelSchema = z.enum(["in_app", "telegram"]);
export const commandCenterCapabilityStatusSchema = z.enum([
  "available",
  "beta",
  "roadmap",
  "disabled",
]);
export const commandCenterRiskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export const commandCenterCapabilitySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  status: commandCenterCapabilityStatusSchema,
  channels: z.array(commandCenterChannelSchema),
  requiredRole: roleSchema,
  riskLevel: commandCenterRiskLevelSchema,
  supportedIntents: z.array(z.string()),
  guardrails: z.array(z.string()),
  evidence: z.array(z.string()),
  accessible: z.boolean(),
});

export const commandCenterGuardrailSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: commandCenterCapabilityStatusSchema,
  detail: z.string(),
});

export const commandCenterCapabilitiesResponseSchema = z.object({
  surface: z.literal("command-center"),
  version: z.string(),
  actorRole: roleSchema,
  workspaceScoped: z.boolean(),
  capabilities: z.array(commandCenterCapabilitySchema),
  guardrails: z.array(commandCenterGuardrailSchema),
  unavailableClaims: z.array(z.string()),
});

export const commandCenterBriefToneSchema = z.enum(["good", "warn", "blocked", "neutral"]);
export const commandCenterBriefPostureSchema = z.enum([
  "blocked",
  "review_required",
  "growth_ready",
  "healthy",
]);

export const commandCenterBriefMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: commandCenterBriefToneSchema,
});

export const commandCenterBriefActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  urgency: commandCenterBriefToneSchema,
  href: z.string(),
  evidence: z.array(z.string()),
});

export const commandCenterBriefResponseSchema = z.object({
  surface: z.literal("command-center-brief"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  posture: commandCenterBriefPostureSchema,
  title: z.string(),
  summary: z.string(),
  metrics: z.array(commandCenterBriefMetricSchema),
  nextActions: z.array(commandCenterBriefActionSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export const commandCenterIntentSchema = z.enum([
  "summarize_workspace",
  "check_telegram_status",
  "run_source_evidence",
  "dispatch_campaign",
  "pause_outreach",
  "approve_action",
  "run_ai_worker_task",
  "change_billing",
  "telegram_mutate_outreach",
  "unsupported_automation",
]);

export const commandCenterPolicyDecisionSchema = z.enum([
  "read_only",
  "allowed",
  "requires_approval",
  "blocked",
]);

export const commandCenterPolicyPreconditionStatusSchema = z.enum([
  "met",
  "missing",
  "blocked",
]);

export const commandCenterPolicyPreconditionSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: commandCenterPolicyPreconditionStatusSchema,
  detail: z.string(),
});

export const commandCenterPolicyNextActionSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const commandCenterPolicyExplanationSchema = z.object({
  intent: commandCenterIntentSchema,
  label: z.string(),
  decision: commandCenterPolicyDecisionSchema,
  riskLevel: commandCenterRiskLevelSchema,
  requiredRole: roleSchema,
  channel: commandCenterChannelSchema,
  summary: z.string(),
  preconditions: z.array(commandCenterPolicyPreconditionSchema),
  guardrails: z.array(z.string()),
  evidence: z.array(z.string()),
  nextAction: commandCenterPolicyNextActionSchema,
});

export const commandCenterPolicyCatalogResponseSchema = z.object({
  surface: z.literal("command-center-policy"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  actor: z.object({
    role: roleSchema,
    emailVerified: z.boolean(),
  }),
  policies: z.array(commandCenterPolicyExplanationSchema),
  unavailableClaims: z.array(z.string()),
});

export const commandCenterCommandPreviewInputSchema = z.object({
  commandText: z.string().trim().min(2).max(500),
  channel: commandCenterChannelSchema.default("in_app"),
});

export const commandCenterCommandPreviewExecutionModeSchema = z.enum([
  "answer_only",
  "allowed_in_app",
  "requires_approval",
  "blocked",
]);

export const commandCenterCommandPreviewSchema = z.object({
  surface: z.literal("command-center-command-preview"),
  version: z.string(),
  generatedAt: z.string(),
  previewOnly: z.literal(true),
  command: z.object({
    text: z.string(),
    normalizedText: z.string(),
    channel: commandCenterChannelSchema,
  }),
  match: z.object({
    intent: commandCenterIntentSchema,
    confidence: z.number().int().min(0).max(100),
    matchedPhrase: z.string(),
  }),
  policy: commandCenterPolicyExplanationSchema,
  executionMode: commandCenterCommandPreviewExecutionModeSchema,
  requestedMutation: z.boolean(),
  operatorMessage: z.string(),
  safeNextStep: commandCenterPolicyNextActionSchema,
  audit: z.object({
    eventType: z.string(),
    requiredForExecution: z.boolean(),
  }),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export const commandCenterCommandProposalInputSchema = commandCenterCommandPreviewInputSchema;

export const commandCenterCommandProposalResponseSchema = z.object({
  surface: z.literal("command-center-command-proposal"),
  version: z.string(),
  generatedAt: z.string(),
  preview: commandCenterCommandPreviewSchema,
  proposal: actionProposalSchema,
  detail: z.string(),
  guardrails: z.array(z.string()),
});

export type CommandCenterChannel = z.infer<typeof commandCenterChannelSchema>;
export type CommandCenterCapabilityStatus = z.infer<
  typeof commandCenterCapabilityStatusSchema
>;
export type CommandCenterRiskLevel = z.infer<typeof commandCenterRiskLevelSchema>;
export type CommandCenterCapability = z.infer<typeof commandCenterCapabilitySchema>;
export type CommandCenterGuardrail = z.infer<typeof commandCenterGuardrailSchema>;
export type CommandCenterCapabilitiesResponse = z.infer<
  typeof commandCenterCapabilitiesResponseSchema
>;
export type CommandCenterBriefTone = z.infer<typeof commandCenterBriefToneSchema>;
export type CommandCenterBriefPosture = z.infer<typeof commandCenterBriefPostureSchema>;
export type CommandCenterBriefMetric = z.infer<typeof commandCenterBriefMetricSchema>;
export type CommandCenterBriefAction = z.infer<typeof commandCenterBriefActionSchema>;
export type CommandCenterBriefResponse = z.infer<typeof commandCenterBriefResponseSchema>;
export type CommandCenterIntent = z.infer<typeof commandCenterIntentSchema>;
export type CommandCenterPolicyDecision = z.infer<
  typeof commandCenterPolicyDecisionSchema
>;
export type CommandCenterPolicyPreconditionStatus = z.infer<
  typeof commandCenterPolicyPreconditionStatusSchema
>;
export type CommandCenterPolicyPrecondition = z.infer<
  typeof commandCenterPolicyPreconditionSchema
>;
export type CommandCenterPolicyNextAction = z.infer<
  typeof commandCenterPolicyNextActionSchema
>;
export type CommandCenterPolicyExplanation = z.infer<
  typeof commandCenterPolicyExplanationSchema
>;
export type CommandCenterPolicyCatalogResponse = z.infer<
  typeof commandCenterPolicyCatalogResponseSchema
>;
export type CommandCenterCommandPreviewInput = z.infer<
  typeof commandCenterCommandPreviewInputSchema
>;
export type CommandCenterCommandPreviewExecutionMode = z.infer<
  typeof commandCenterCommandPreviewExecutionModeSchema
>;
export type CommandCenterCommandPreviewResponse = z.infer<
  typeof commandCenterCommandPreviewSchema
>;
export type CommandCenterCommandProposalInput = z.infer<
  typeof commandCenterCommandProposalInputSchema
>;
export type CommandCenterCommandProposalResponse = z.infer<
  typeof commandCenterCommandProposalResponseSchema
>;

type Role = z.infer<typeof roleSchema>;
type CapabilityDefinition = Omit<CommandCenterCapability, "accessible">;

type CommandIntentMatcher = {
  intent: CommandCenterIntent;
  phrases: string[];
  confidence: number;
};

const roleRank: Record<Role, number> = {
  member: 0,
  admin: 1,
  owner: 2,
};

const capabilityDefinitions: CapabilityDefinition[] = [
  {
    id: "workspace-status",
    title: "Workspace status",
    summary:
      "Ask for dashboard, provider, billing, onboarding, and readiness state without mutating records.",
    status: "available",
    channels: ["in_app"],
    requiredRole: "member",
    riskLevel: "low",
    supportedIntents: [
      "summarize workspace state",
      "explain provider readiness",
      "show billing and usage posture",
      "list current operator action items",
    ],
    guardrails: [
      "read-only response",
      "workspace-scoped authentication",
      "request audit trail",
    ],
    evidence: [
      "/v1/dashboard",
      "/v1/providers",
      "/v1/subscription",
      "packages/shared/src/domain.ts",
    ],
  },
  {
    id: "approval-review",
    title: "Approval review",
    summary:
      "Review campaign and call decisions before live outreach or voice actions leave the workspace.",
    status: "beta",
    channels: ["in_app"],
    requiredRole: "admin",
    riskLevel: "high",
    supportedIntents: [
      "approve a campaign",
      "review a call",
      "explain why an action needs approval",
    ],
    guardrails: [
      "owner or admin authorization",
      "verified email for live dispatch",
      "approval-first policy checks",
      "audit logging",
    ],
    evidence: [
      "/v1/campaigns/:id/approve",
      "/v1/calls/:id/review",
      "/v1/policies/campaign",
      "packages/shared/src/policy.ts",
    ],
  },
  {
    id: "telegram-control",
    title: "Telegram control",
    summary:
      "Guarded Telegram bot surface for deterministic natural-language aliases, read-only status checks, operator briefs, sequence readiness, revenue forecast visibility, approval visibility, provider readiness, suppressions, and tightly scoped commands.",
    status: "beta",
    channels: ["telegram"],
    requiredRole: "admin",
    riskLevel: "medium",
    supportedIntents: [
      "check workspace status",
      "review operator brief",
      "review outreach sequence readiness",
      "review revenue forecast posture",
      "review approval queue summary",
      "summarize provider readiness",
      "check suppression count",
      "request a guarded pause without mutating outreach",
    ],
    guardrails: [
      "server-side bot token",
      "workspace allowlist",
      "Telegram secret header verification",
      "chat ID hashing and masking",
      "replay protection",
      "per-chat command throttling",
      "emergency disable",
      "command-specific audit events",
      "step-up approval for critical actions",
    ],
    evidence: [
      "/v1/integrations/telegram",
      "/v1/webhooks/telegram",
      "apps/web/app/settings/page.tsx",
      "docs/product/ai-operating-system-roadmap.md",
    ],
  },
  {
    id: "ai-worker-orchestration",
    title: "AI worker orchestration",
    summary:
      "Guarded AI worker registry, task proposal ledger, permissions, and budget posture for sales research, outreach planning, meetings, and CRM operations.",
    status: "beta",
    channels: ["in_app"],
    requiredRole: "owner",
    riskLevel: "critical",
    supportedIntents: [
      "assign a bounded worker task",
      "review worker cost and output",
      "approve worker escalation",
      "pause or disable a worker",
    ],
    guardrails: [
      "worker permission model",
      "cost ledger",
      "approval queue",
      "human owner for every action",
      "rollback path for mutations",
    ],
    evidence: [
      "/v1/ai-workers",
      "/v1/ai-workers/tasks",
      "apps/web/app/dashboard/page.tsx",
      "docs/product/ai-operating-system-roadmap.md",
    ],
  },
  {
    id: "company-ops-modules",
    title: "Company operations modules",
    summary:
      "Future operating-system modules for customer operations, project coordination, knowledge, finance visibility, and HR workflow support.",
    status: "roadmap",
    channels: ["in_app"],
    requiredRole: "owner",
    riskLevel: "critical",
    supportedIntents: [
      "summarize company operations",
      "draft operational tasks",
      "route approvals to human owners",
      "surface finance or HR workflow status",
    ],
    guardrails: [
      "module-level entitlements",
      "sensitive-data minimization",
      "domain-specific approvals",
      "legal and finance human ownership",
    ],
    evidence: [
      "docs/product/platform-requirements.md",
      "docs/product/ai-operating-system-roadmap.md",
    ],
  },
];

export const commandCenterGuardrails: CommandCenterGuardrail[] = [
  {
    id: "role-authorization",
    label: "Role authorization",
    status: "available",
    detail: "Command visibility and future execution are mapped to member, admin, and owner roles.",
  },
  {
    id: "audit-trail",
    label: "Audit trail",
    status: "available",
    detail: "Authenticated API requests are audited with request IDs and workspace context.",
  },
  {
    id: "approval-gates",
    label: "Approval gates",
    status: "beta",
    detail: "Campaign and call actions have explicit approval paths before high-risk dispatch.",
  },
  {
    id: "telegram-security",
    label: "Telegram security",
    status: "beta",
    detail: "Workspace chat binding, secret-header webhook verification, chat ID hashing, replay protection, Postgres-backed per-chat command throttling, emergency disable, and command audits exist; deeper approval inbox integration still needs hardening.",
  },
  {
    id: "worker-controls",
    label: "AI worker controls",
    status: "beta",
    detail: "Worker registry, permissions, budget posture, task ledger, and approval-proposal creation exist; autonomous tool execution is still gated.",
  },
];

export const commandCenterUnavailableClaims = [
  "Telegram cannot mutate outreach, approve actions, or run autonomous operations without in-app owner approval.",
  "Fully autonomous AI workers are not generally available.",
  "Company-wide HR, ERP, finance, legal, or employment automation is not generally available.",
  "Unsupported scraping, browser automation, auto-connect, or auto-DM workflows are not supported.",
];

export function getCommandCenterCapabilities(input: {
  actorRole: Role | string;
}): CommandCenterCapabilitiesResponse {
  const actorRole = roleSchema.catch("member").parse(input.actorRole);
  const actorRank = roleRank[actorRole];

  return commandCenterCapabilitiesResponseSchema.parse({
    surface: "command-center",
    version: "2026-06-03.ai-worker-control-plane",
    actorRole,
    workspaceScoped: true,
    capabilities: capabilityDefinitions.map((capability) => ({
      ...capability,
      accessible: actorRank >= roleRank[capability.requiredRole],
    })),
    guardrails: commandCenterGuardrails,
    unavailableClaims: commandCenterUnavailableClaims,
  });
}

function metricValue(dashboard: DashboardResponse, label: string, fallback = "0") {
  return dashboard.metrics.find((metric) => metric.label === label)?.value ?? fallback;
}

function pushUniqueAction(
  actions: CommandCenterBriefAction[],
  action: CommandCenterBriefAction,
) {
  if (!actions.some((existing) => existing.id === action.id)) {
    actions.push(action);
  }
}

function roleMeets(actorRole: Role, requiredRole: Role) {
  return roleRank[actorRole] >= roleRank[requiredRole];
}

function policyPrecondition(
  id: string,
  label: string,
  status: CommandCenterPolicyPreconditionStatus,
  detail: string,
): CommandCenterPolicyPrecondition {
  return { id, label, status, detail };
}

function rolePolicyPrecondition(
  actorRole: Role,
  requiredRole: Role,
): CommandCenterPolicyPrecondition {
  return policyPrecondition(
    "role",
    "Role",
    roleMeets(actorRole, requiredRole) ? "met" : "blocked",
    roleMeets(actorRole, requiredRole)
      ? `${actorRole} can request ${requiredRole}-level command handling.`
      : `${requiredRole} role is required for this command intent.`,
  );
}

function verifiedEmailPolicyPrecondition(emailVerified: boolean) {
  return policyPrecondition(
    "verified-email",
    "Verified email",
    emailVerified ? "met" : "blocked",
    emailVerified
      ? "Actor email is verified for sensitive workflow decisions."
      : "Verify email before requesting sensitive workflow decisions.",
  );
}

function providerPolicyPrecondition(providerBlockerCount: number) {
  return policyPrecondition(
    "provider-readiness",
    "Provider readiness",
    providerBlockerCount === 0 ? "met" : "blocked",
    providerBlockerCount === 0
      ? "No production provider blockers are currently reported."
      : `${providerBlockerCount} production provider blocker${providerBlockerCount === 1 ? "" : "s"} must be cleared first.`,
  );
}

function policyDecisionFromPreconditions(
  preconditions: CommandCenterPolicyPrecondition[],
  readyDecision: Exclude<CommandCenterPolicyDecision, "blocked">,
): CommandCenterPolicyDecision {
  return preconditions.some((item) => item.status === "blocked" || item.status === "missing")
    ? "blocked"
    : readyDecision;
}

const commandIntentMatchers: CommandIntentMatcher[] = [
  {
    intent: "unsupported_automation",
    confidence: 96,
    phrases: [
      "auto dm",
      "auto-dm",
      "auto connect",
      "auto-connect",
      "browser automation",
      "bypass",
      "scrape linkedin",
      "scrape every",
      "scrape all",
      "dm everyone",
      "message everyone",
    ],
  },
  {
    intent: "change_billing",
    confidence: 90,
    phrases: ["billing", "invoice", "plan", "checkout", "upgrade", "seat", "payment"],
  },
  {
    intent: "run_ai_worker_task",
    confidence: 88,
    phrases: ["ai worker", "worker task", "assign worker", "research accounts", "worker run"],
  },
  {
    intent: "approve_action",
    confidence: 88,
    phrases: ["approve", "reject", "review approval", "approval inbox", "pending proposal"],
  },
  {
    intent: "pause_outreach",
    confidence: 90,
    phrases: ["pause outreach", "stop outreach", "halt outreach", "pause campaign", "stop campaign"],
  },
  {
    intent: "dispatch_campaign",
    confidence: 86,
    phrases: ["dispatch", "send campaign", "launch campaign", "start outreach", "email leads"],
  },
  {
    intent: "run_source_evidence",
    confidence: 82,
    phrases: ["find leads", "source leads", "discover leads", "source evidence", "lead evidence"],
  },
  {
    intent: "check_telegram_status",
    confidence: 78,
    phrases: ["telegram", "bot", "chat status", "command center"],
  },
  {
    intent: "summarize_workspace",
    confidence: 72,
    phrases: ["status", "summary", "summarize", "dashboard", "brief", "what is happening"],
  },
];

function normalizeCommandText(commandText: string) {
  return commandText
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ");
}

function inferCommandIntent(
  commandText: string,
  channel: CommandCenterChannel,
): { intent: CommandCenterIntent; confidence: number; matchedPhrase: string } {
  const normalizedText = normalizeCommandText(commandText);

  for (const matcher of commandIntentMatchers) {
    const matchedPhrase = matcher.phrases.find((phrase) => normalizedText.includes(phrase));

    if (matchedPhrase) {
      const riskyTelegramIntent =
        channel === "telegram" &&
        [
          "approve_action",
          "dispatch_campaign",
          "run_ai_worker_task",
          "change_billing",
        ].includes(matcher.intent);

      return {
        intent: riskyTelegramIntent ? "telegram_mutate_outreach" : matcher.intent,
        confidence: riskyTelegramIntent ? 94 : matcher.confidence,
        matchedPhrase,
      };
    }
  }

  return {
    intent: "summarize_workspace",
    confidence: 45,
    matchedPhrase: "fallback",
  };
}

function commandPreviewExecutionMode(
  decision: CommandCenterPolicyDecision,
): CommandCenterCommandPreviewExecutionMode {
  if (decision === "read_only") {
    return "answer_only";
  }

  if (decision === "allowed") {
    return "allowed_in_app";
  }

  if (decision === "requires_approval") {
    return "requires_approval";
  }

  return "blocked";
}

function commandPreviewOperatorMessage(policy: CommandCenterPolicyExplanation) {
  if (policy.decision === "read_only") {
    return `${policy.label} can be answered without changing workspace state.`;
  }

  if (policy.decision === "allowed") {
    return `${policy.label} can continue in the app, with audit and downstream policy checks still applied.`;
  }

  if (policy.decision === "requires_approval") {
    return `${policy.label} must be converted into an approval-gated workflow before execution.`;
  }

  return `${policy.label} is blocked by the current command policy.`;
}

function commandRequestedMutation(intent: CommandCenterIntent) {
  return !["summarize_workspace", "check_telegram_status", "unsupported_automation"].includes(
    intent,
  );
}

function commandProposalActor(channel: CommandCenterChannel) {
  return channel === "telegram" ? "telegram" : "operator";
}

function trimProposalText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

export function buildCommandCenterPolicyCatalog(input: {
  dashboard: DashboardResponse;
  proposals: ActionProposalListResponse;
  providers: ProviderSummary;
  aiWorkers?: AiWorkerControlPlaneResponse | null;
  telegram?: TelegramIntegrationResponse | null;
  actorRole: Role | string;
  emailVerified?: boolean;
  generatedAt?: string;
}): CommandCenterPolicyCatalogResponse {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const proposals = actionProposalListResponseSchema.parse(input.proposals);
  const providers = providerSummarySchema.parse(input.providers);
  const aiWorkers = input.aiWorkers
    ? aiWorkerControlPlaneResponseSchema.parse(input.aiWorkers)
    : null;
  const telegram = input.telegram
    ? telegramIntegrationResponseSchema.parse(input.telegram)
    : null;
  const actorRole = roleSchema.catch("member").parse(input.actorRole);
  const emailVerified = input.emailVerified === true;
  const providerBlockerCount = providers.summary.productionBlockers.length;
  const hasSourcePlan = Boolean(dashboard.sourcePlan);
  const hasSourceEvidence = dashboard.sourceRuns.length > 0;
  const hasPendingApprovals = proposals.summary.pending > 0;
  const hasRunningCampaigns = dashboard.campaigns.some(
    (campaign) => campaign.stage === "running",
  );
  const hasDispatchableCampaign = dashboard.campaigns.some(
    (campaign) =>
      campaign.approved &&
      campaign.leadsEnrolled > 0 &&
      campaign.stage !== "paused",
  );
  const telegramActive = telegram?.integration.status === "active";
  const hasActiveWorker = (aiWorkers?.summary.active ?? 0) > 0;
  const hasWorkerBudget =
    aiWorkers !== null && aiWorkers.summary.budgetLimitCents > aiWorkers.summary.budgetUsedCents;

  const workspaceStatusPreconditions = [
    rolePolicyPrecondition(actorRole, "member"),
    policyPrecondition(
      "workspace-scope",
      "Workspace scope",
      "met",
      "Response is derived from the authenticated active workspace only.",
    ),
  ];

  const telegramStatusPreconditions = [
    rolePolicyPrecondition(actorRole, "admin"),
    policyPrecondition(
      "telegram-binding",
      "Telegram binding",
      telegramActive ? "met" : "missing",
      telegramActive
        ? "Telegram command center is active for this workspace."
        : "Telegram command center must be configured and verified first.",
    ),
  ];

  const sourceEvidencePreconditions = [
    rolePolicyPrecondition(actorRole, "admin"),
    verifiedEmailPolicyPrecondition(emailVerified),
    policyPrecondition(
      "source-plan",
      "Source plan",
      hasSourcePlan ? "met" : "missing",
      hasSourcePlan
        ? "A source plan is available for a bounded evidence run."
        : "Complete onboarding or the sales blueprint before requesting source evidence.",
    ),
  ];

  const campaignDispatchPreconditions = [
    rolePolicyPrecondition(actorRole, "admin"),
    verifiedEmailPolicyPrecondition(emailVerified),
    providerPolicyPrecondition(providerBlockerCount),
    policyPrecondition(
      "source-evidence",
      "Source evidence",
      hasSourceEvidence ? "met" : "missing",
      hasSourceEvidence
        ? "At least one source run exists for review before campaign expansion."
        : "Run source evidence before dispatching outreach.",
    ),
    policyPrecondition(
      "approved-campaign",
      "Approved campaign",
      hasDispatchableCampaign ? "met" : "missing",
      hasDispatchableCampaign
        ? "An approved campaign with enrolled leads is ready for gated dispatch."
        : "Approve a campaign with enrolled leads before live dispatch.",
    ),
  ];

  const pauseOutreachPreconditions = [
    rolePolicyPrecondition(actorRole, "admin"),
    policyPrecondition(
      "running-campaign",
      "Running campaign",
      hasRunningCampaigns ? "met" : "missing",
      hasRunningCampaigns
        ? "A running campaign can be converted into a reviewable pause proposal."
        : "No running campaign is available to pause.",
    ),
  ];

  const approvalPreconditions = [
    rolePolicyPrecondition(actorRole, "admin"),
    verifiedEmailPolicyPrecondition(emailVerified),
    policyPrecondition(
      "pending-proposals",
      "Pending proposals",
      hasPendingApprovals ? "met" : "missing",
      hasPendingApprovals
        ? `${proposals.summary.pending} pending proposal${proposals.summary.pending === 1 ? "" : "s"} can be reviewed.`
        : "No pending proposal is currently waiting for review.",
    ),
  ];

  const aiWorkerPreconditions = [
    rolePolicyPrecondition(actorRole, "owner"),
    verifiedEmailPolicyPrecondition(emailVerified),
    policyPrecondition(
      "active-worker",
      "Active worker",
      hasActiveWorker ? "met" : "missing",
      hasActiveWorker
        ? "At least one AI worker is active for bounded task proposals."
        : "Activate an AI worker before requesting worker task proposals.",
    ),
    policyPrecondition(
      "worker-budget",
      "Worker budget",
      hasWorkerBudget ? "met" : "blocked",
      hasWorkerBudget
        ? "AI worker budget remains available for proposed work."
        : "AI worker budget is unavailable or exhausted.",
    ),
  ];

  const billingPreconditions = [
    rolePolicyPrecondition(actorRole, "owner"),
    policyPrecondition(
      "billing-portal",
      "Billing portal",
      "met",
      "Billing changes are routed through the provider-backed portal or checkout flow.",
    ),
  ];

  const telegramMutationPreconditions = [
    rolePolicyPrecondition(actorRole, "admin"),
    policyPrecondition(
      "telegram-binding",
      "Telegram binding",
      telegramActive ? "met" : "missing",
      telegramActive
        ? "Telegram is active for read-only and proposal-generating commands."
        : "Telegram must be configured before any chat command is accepted.",
    ),
    policyPrecondition(
      "direct-mutation",
      "Direct mutation",
      "blocked",
      "Telegram cannot directly approve actions, dispatch outreach, or mutate campaign state.",
    ),
  ];

  const policies: CommandCenterPolicyExplanation[] = [
    {
      intent: "summarize_workspace",
      label: "Summarize workspace",
      decision: "read_only",
      riskLevel: "low",
      requiredRole: "member",
      channel: "in_app",
      summary: "Status, provider, pipeline, billing posture, and action-item answers are read-only.",
      preconditions: workspaceStatusPreconditions,
      guardrails: [
        "No records are created, updated, dispatched, approved, or deleted.",
        "Responses are generated from authenticated workspace-scoped data.",
      ],
      evidence: ["/v1/dashboard", "/v1/providers", "/v1/subscription"],
      nextAction: {
        label: "Open dashboard",
        href: "/dashboard",
      },
    },
    {
      intent: "check_telegram_status",
      label: "Check Telegram status",
      decision: policyDecisionFromPreconditions(telegramStatusPreconditions, "read_only"),
      riskLevel: "low",
      requiredRole: "admin",
      channel: "telegram",
      summary: "Telegram status checks can return workspace state only after chat binding is active.",
      preconditions: telegramStatusPreconditions,
      guardrails: [
        "Webhook secret, replay protection, chat binding, masking, and throttling remain enforced.",
        "Read-only status checks do not mutate outreach or approve work.",
      ],
      evidence: ["/v1/integrations/telegram", "/v1/webhooks/telegram"],
      nextAction: {
        label: telegramActive ? "Review Telegram binding" : "Finish Telegram setup",
        href: "/settings#telegram-command-center",
      },
    },
    {
      intent: "run_source_evidence",
      label: "Run source evidence",
      decision: policyDecisionFromPreconditions(
        sourceEvidencePreconditions,
        "requires_approval",
      ),
      riskLevel: "medium",
      requiredRole: "admin",
      channel: "in_app",
      summary: "Lead-source evidence requests must be bounded by the sales blueprint and reviewed.",
      preconditions: sourceEvidencePreconditions,
      guardrails: [
        "Use configured source plan channels and compliance checks.",
        "Do not support unsupported scraping, auto-connect, or auto-DM workflows.",
      ],
      evidence: ["/v1/dashboard", "/v1/sales-blueprint", "/v1/source-runs"],
      nextAction: {
        label: hasSourcePlan ? "Review source plan" : "Complete sales blueprint",
        href: hasSourcePlan ? "/dashboard#source-plan" : "/sales-blueprint",
      },
    },
    {
      intent: "dispatch_campaign",
      label: "Dispatch campaign",
      decision: policyDecisionFromPreconditions(
        campaignDispatchPreconditions,
        "requires_approval",
      ),
      riskLevel: "high",
      requiredRole: "admin",
      channel: "in_app",
      summary: "Live outreach dispatch remains approval-gated and blocked by provider or evidence gaps.",
      preconditions: campaignDispatchPreconditions,
      guardrails: [
        "Suppression, entitlement, cost, provider, and approval policies still run at dispatch time.",
        "High-risk outreach cannot bypass human review.",
      ],
      evidence: ["/v1/campaigns", "/v1/policies/campaign", "/v1/providers", "/v1/suppressions"],
      nextAction: {
        label: hasDispatchableCampaign ? "Review campaign approval" : "Prepare campaign",
        href: "/dashboard#approval-inbox",
      },
    },
    {
      intent: "pause_outreach",
      label: "Pause outreach",
      decision: policyDecisionFromPreconditions(pauseOutreachPreconditions, "requires_approval"),
      riskLevel: "medium",
      requiredRole: "admin",
      channel: "telegram",
      summary: "A pause request can create or surface a proposal, but it cannot mutate outreach directly.",
      preconditions: pauseOutreachPreconditions,
      guardrails: [
        "Telegram pause commands are converted into reviewable proposals.",
        "Campaign state changes require in-app admin or owner approval.",
      ],
      evidence: ["/v1/action-proposals", "/v1/webhooks/telegram"],
      nextAction: {
        label: hasRunningCampaigns ? "Review pause proposals" : "Open campaigns",
        href: "/dashboard#approval-inbox",
      },
    },
    {
      intent: "approve_action",
      label: "Approve action",
      decision: policyDecisionFromPreconditions(approvalPreconditions, "allowed"),
      riskLevel: proposals.summary.highRisk > 0 ? "high" : "medium",
      requiredRole: "admin",
      channel: "in_app",
      summary: "Approval decisions are allowed only for verified admins or owners with pending proposals.",
      preconditions: approvalPreconditions,
      guardrails: [
        "Approvals are audited with reviewer identity and workspace context.",
        "Downstream provider, suppression, budget, and entitlement gates still apply.",
      ],
      evidence: ["/v1/action-proposals"],
      nextAction: {
        label: hasPendingApprovals ? "Open approval inbox" : "View action history",
        href: "/dashboard#approval-inbox",
      },
    },
    {
      intent: "run_ai_worker_task",
      label: "Run AI worker task",
      decision: policyDecisionFromPreconditions(aiWorkerPreconditions, "requires_approval"),
      riskLevel: "critical",
      requiredRole: "owner",
      channel: "in_app",
      summary: "AI workers can propose bounded work, but autonomous execution stays gated by owner control.",
      preconditions: aiWorkerPreconditions,
      guardrails: [
        "Worker permissions, blocked tools, budget ledger, and proposal review are mandatory.",
        "No fully autonomous sales execution is generally available.",
      ],
      evidence: ["/v1/ai-workers", "/v1/ai-workers/tasks"],
      nextAction: {
        label: hasActiveWorker ? "Review worker ledger" : "Open AI workers",
        href: "/dashboard#ai-workers",
      },
    },
    {
      intent: "change_billing",
      label: "Change billing",
      decision: policyDecisionFromPreconditions(billingPreconditions, "requires_approval"),
      riskLevel: "high",
      requiredRole: "owner",
      channel: "in_app",
      summary: "Plan, seat, and billing changes are owner-only and routed through billing controls.",
      preconditions: billingPreconditions,
      guardrails: [
        "Billing changes use provider-backed checkout or portal flows.",
        "Plan entitlement changes must stay aligned with the shared plan catalog.",
      ],
      evidence: ["/v1/billing/portal", "/v1/billing/checkout/stripe", "packages/shared/src/billing/pricing.ts"],
      nextAction: {
        label: "Open billing",
        href: "/billing",
      },
    },
    {
      intent: "telegram_mutate_outreach",
      label: "Telegram mutate outreach",
      decision: "blocked",
      riskLevel: "critical",
      requiredRole: "admin",
      channel: "telegram",
      summary: "Telegram cannot directly mutate outreach, approve actions, or run autonomous operations.",
      preconditions: telegramMutationPreconditions,
      guardrails: [
        "Chat commands can return status or create reviewable proposals only.",
        "Critical sales actions require in-app approval and audit coverage.",
      ],
      evidence: ["/v1/integrations/telegram", "/v1/webhooks/telegram", "/v1/action-proposals"],
      nextAction: {
        label: "Open approval inbox",
        href: "/dashboard#approval-inbox",
      },
    },
    {
      intent: "unsupported_automation",
      label: "Unsupported automation",
      decision: "blocked",
      riskLevel: "critical",
      requiredRole: "owner",
      channel: "in_app",
      summary:
        "Unsupported scraping, browser automation, auto-connect, auto-DM, or platform-bypass requests are blocked.",
      preconditions: [
        policyPrecondition(
          "platform-policy",
          "Platform policy",
          "blocked",
          "The platform does not support browser automation, auto-connect, auto-DM, or provider-terms bypass workflows.",
        ),
        policyPrecondition(
          "human-owned-compliance",
          "Human-owned compliance",
          "blocked",
          "Lead sourcing and outreach must stay inside configured providers, consent boundaries, suppression checks, and review gates.",
        ),
      ],
      guardrails: [
        "Do not claim universal live scraping or platform-bypass automation.",
        "Use source evidence, provider readiness, suppression checks, and approval workflows instead.",
      ],
      evidence: [
        "docs/product/public-claims-truth-matrix.md",
        "docs/product/capability-map.md",
      ],
      nextAction: {
        label: hasSourcePlan ? "Review source plan" : "Complete sales blueprint",
        href: hasSourcePlan ? "/dashboard#source-plan" : "/sales-blueprint",
      },
    },
  ];

  return commandCenterPolicyCatalogResponseSchema.parse({
    surface: "command-center-policy",
    version: "2026-06-04.command-policy",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey: dashboard.subscription.planKey,
    },
    actor: {
      role: actorRole,
      emailVerified,
    },
    policies,
    unavailableClaims: commandCenterUnavailableClaims,
  });
}

export function buildCommandCenterCommandPreview(input: {
  commandText: string;
  channel?: CommandCenterChannel;
  policyCatalog: CommandCenterPolicyCatalogResponse;
  generatedAt?: string;
}): CommandCenterCommandPreviewResponse {
  const previewInput = commandCenterCommandPreviewInputSchema.parse({
    commandText: input.commandText,
    channel: input.channel,
  });
  const policyCatalog = commandCenterPolicyCatalogResponseSchema.parse(input.policyCatalog);
  const normalizedText = normalizeCommandText(previewInput.commandText);
  const match = inferCommandIntent(previewInput.commandText, previewInput.channel);
  const policy =
    policyCatalog.policies.find((item) => item.intent === match.intent) ??
    policyCatalog.policies.find((item) => item.intent === "unsupported_automation");

  if (!policy) {
    throw new Error("Command center policy catalog is missing the fallback policy.");
  }

  return commandCenterCommandPreviewSchema.parse({
    surface: "command-center-command-preview",
    version: "2026-06-04.command-preview",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    previewOnly: true,
    command: {
      text: previewInput.commandText,
      normalizedText,
      channel: previewInput.channel,
    },
    match,
    policy,
    executionMode: commandPreviewExecutionMode(policy.decision),
    requestedMutation: commandRequestedMutation(match.intent),
    operatorMessage: commandPreviewOperatorMessage(policy),
    safeNextStep: policy.nextAction,
    audit: {
      eventType: "command_preview",
      requiredForExecution: policy.decision !== "read_only",
    },
    guardrails: [
      "Command preview is deterministic and read-only.",
      "No workspace state changes are made by previewing a command.",
      ...policy.guardrails,
    ],
    unavailableClaims: policyCatalog.unavailableClaims,
  });
}

export function buildCommandCenterActionProposalInput(input: {
  preview: CommandCenterCommandPreviewResponse;
  dashboard: DashboardResponse;
  aiWorkers?: AiWorkerControlPlaneResponse | null;
  requestedBy?: string | null;
}): CreateActionProposalInput | null {
  const preview = commandCenterCommandPreviewSchema.parse(input.preview);
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const aiWorkers = input.aiWorkers
    ? aiWorkerControlPlaneResponseSchema.parse(input.aiWorkers)
    : null;

  if (preview.executionMode !== "requires_approval") {
    return null;
  }

  const requestedBy = input.requestedBy?.trim() || "command-center";
  const proposedBy = commandProposalActor(preview.command.channel);
  const guardrails = Array.from(
    new Set([
      "Created from deterministic command preview.",
      "Approval inbox review is required before any effect.",
      "No provider work, outreach dispatch, billing change, or AI worker tool ran from this command.",
      ...preview.guardrails.slice(0, 4),
    ]),
  );
  const payload = {
    commandText: preview.command.text,
    normalizedText: preview.command.normalizedText,
    channel: preview.command.channel,
    intent: preview.match.intent,
    confidence: preview.match.confidence,
    matchedPhrase: preview.match.matchedPhrase,
  };

  if (preview.match.intent === "run_source_evidence") {
    if (!dashboard.sourcePlan) {
      return null;
    }

    return createActionProposalInputSchema.parse({
      type: "lead_source_run",
      riskLevel: "medium",
      title: "Review command source evidence run",
      detail:
        "A command-center request asked to run bounded lead-source evidence. Approval records the operator decision before any sourcing workflow is queued.",
      proposedBy,
      targetKind: "source_plan",
      targetId: dashboard.sourcePlan.id,
      targetLabel: trimProposalText(dashboard.sourcePlan.summary, 160),
      payloadSummary: trimProposalText(
        `Run source evidence for ${dashboard.sourcePlan.sources.join(", ") || "the active source plan"}.`,
        800,
      ),
      payload: {
        ...payload,
        sourcePlanId: dashboard.sourcePlan.id,
        sources: dashboard.sourcePlan.sources,
        searchTerms: dashboard.sourcePlan.searchTerms,
      },
      guardrails,
      expectedEffect:
        "A bounded source evidence run can be reviewed or queued after approval; live outreach still remains separate and gated.",
      rollbackPlan:
        "Reject the proposal to keep lead sourcing idle; no records or provider work are changed by rejection.",
      requiredRole: preview.policy.requiredRole,
      requestedBy,
    });
  }

  if (preview.match.intent === "dispatch_campaign") {
    const campaign = dashboard.campaigns.find(
      (item) => item.approved && item.leadsEnrolled > 0 && item.stage !== "paused",
    );

    if (!campaign) {
      return null;
    }

    return createActionProposalInputSchema.parse({
      type: "campaign_dispatch",
      riskLevel: "high",
      title: "Review command campaign dispatch",
      detail:
        "A command-center request asked to advance an approved campaign toward dispatch. Approval can mark the campaign ready; provider dispatch still uses the guarded dispatch route.",
      proposedBy,
      targetKind: "campaign",
      targetId: campaign.id,
      targetLabel: campaign.name,
      payloadSummary: trimProposalText(
        `Review dispatch readiness for ${campaign.name} with ${campaign.leadsEnrolled} enrolled leads.`,
        800,
      ),
      payload: {
        ...payload,
        campaignId: campaign.id,
        channel: campaign.channel,
        leadsEnrolled: campaign.leadsEnrolled,
      },
      guardrails,
      expectedEffect:
        "The campaign can move to approved/ready after review; suppression, entitlement, provider, and cost gates still apply before live send.",
      rollbackPlan:
        "Reject the proposal to keep the campaign unchanged and prevent command-driven dispatch readiness.",
      requiredRole: preview.policy.requiredRole,
      requestedBy,
    });
  }

  if (preview.match.intent === "pause_outreach") {
    const runningCampaignCount = dashboard.campaigns.filter(
      (campaign) => campaign.stage === "running",
    ).length;

    if (runningCampaignCount === 0) {
      return null;
    }

    return createActionProposalInputSchema.parse({
      type: "telegram_pause",
      riskLevel: "medium",
      title: "Review command outreach pause",
      detail:
        "A command-center request asked to pause running outreach. No campaign state changes until an owner or admin approves this proposal.",
      proposedBy,
      targetKind: "workspace",
      targetId: null,
      targetLabel: dashboard.workspace.workspaceName,
      payloadSummary: trimProposalText(
        `Pause ${runningCampaignCount} running campaign${runningCampaignCount === 1 ? "" : "s"} after approval.`,
        800,
      ),
      payload: {
        ...payload,
        runningCampaignCount,
      },
      guardrails,
      expectedEffect:
        "Running campaigns move to paused after approval; draft and already paused campaigns stay unchanged.",
      rollbackPlan:
        "Reject the proposal to keep outreach running, or restart paused campaigns after a later review.",
      requiredRole: preview.policy.requiredRole,
      requestedBy,
    });
  }

  if (preview.match.intent === "change_billing") {
    return createActionProposalInputSchema.parse({
      type: "billing_change",
      riskLevel: "high",
      title: "Review command billing request",
      detail:
        "A command-center request mentioned billing, plan, seats, payment, or checkout. Approval records owner intent; actual billing changes still require the billing portal or checkout provider.",
      proposedBy,
      targetKind: "subscription",
      targetId: null,
      targetLabel: dashboard.subscription.planKey,
      payloadSummary: trimProposalText(
        `Review billing command for the ${dashboard.subscription.planKey} subscription.`,
        800,
      ),
      payload: {
        ...payload,
        planKey: dashboard.subscription.planKey,
        subscriptionStatus: dashboard.subscription.status,
        seats: dashboard.subscription.seats,
      },
      guardrails,
      expectedEffect:
        "Owner approval captures review intent only; Stripe, Razorpay, or portal-backed billing changes remain separate.",
      rollbackPlan:
        "Reject the proposal to leave subscription, seats, and billing provider state unchanged.",
      requiredRole: preview.policy.requiredRole,
      requestedBy,
    });
  }

  if (preview.match.intent === "run_ai_worker_task" && aiWorkers?.summary.active) {
    return null;
  }

  return null;
}

export function buildCommandCenterBrief(input: {
  dashboard: DashboardResponse;
  proposals: ActionProposalListResponse;
  providers: ProviderSummary;
  aiWorkers?: AiWorkerControlPlaneResponse | null;
  telegram?: TelegramIntegrationResponse | null;
  generatedAt?: string;
}): CommandCenterBriefResponse {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const proposals = actionProposalListResponseSchema.parse(input.proposals);
  const providers = providerSummarySchema.parse(input.providers);
  const aiWorkers = input.aiWorkers
    ? aiWorkerControlPlaneResponseSchema.parse(input.aiWorkers)
    : null;
  const telegram = input.telegram
    ? telegramIntegrationResponseSchema.parse(input.telegram)
    : null;
  const providerBlockerCount = providers.summary.productionBlockers.length;
  const pendingApprovalCount = proposals.summary.pending;
  const highRiskApprovalCount = proposals.summary.highRisk;
  const workerBlockedCount = aiWorkers?.summary.blocked ?? 0;
  const workerPendingCount = aiWorkers?.summary.pendingApproval ?? 0;
  const sourceRunCount = dashboard.sourceRuns.length;
  const qualifiedLeadCount = dashboard.leads.filter((lead) => lead.status === "qualified").length;
  const meetingCount = dashboard.meetings.filter(
    (meeting) => meeting.status === "scheduled" || meeting.status === "completed",
  ).length;
  const telegramReady = telegram?.integration.status === "active";
  const actions: CommandCenterBriefAction[] = [];

  if (pendingApprovalCount > 0) {
    pushUniqueAction(actions, {
      id: "review-approvals",
      label: "Review approval queue",
      detail:
        highRiskApprovalCount > 0
          ? `${highRiskApprovalCount} high-risk proposal${highRiskApprovalCount === 1 ? "" : "s"} need owner or admin review before work can move.`
          : `${pendingApprovalCount} proposal${pendingApprovalCount === 1 ? "" : "s"} are waiting for a human decision.`,
      urgency: highRiskApprovalCount > 0 ? "blocked" : "warn",
      href: "/dashboard#approval-inbox",
      evidence: ["/v1/action-proposals"],
    });
  }

  if (providerBlockerCount > 0) {
    pushUniqueAction(actions, {
      id: "fix-provider-readiness",
      label: "Fix provider readiness",
      detail: `${providerBlockerCount} production blocker${providerBlockerCount === 1 ? "" : "s"} must be cleared before broad live outreach.`,
      urgency: "blocked",
      href: "/settings#provider-readiness",
      evidence: ["/v1/providers"],
    });
  }

  if (!dashboard.sourcePlan || sourceRunCount === 0) {
    pushUniqueAction(actions, {
      id: "run-source-evidence",
      label: "Run source evidence",
      detail: "Create or refresh source evidence before campaign enrollment expands.",
      urgency: dashboard.sourcePlan ? "warn" : "blocked",
      href: "/dashboard#source-plan",
      evidence: ["/v1/dashboard", "/v1/sales-blueprint"],
    });
  }

  if (workerBlockedCount > 0 || workerPendingCount > 0) {
    pushUniqueAction(actions, {
      id: "review-worker-ledger",
      label: "Review AI worker ledger",
      detail: `${workerPendingCount} worker proposal${workerPendingCount === 1 ? "" : "s"} pending and ${workerBlockedCount} blocked task${workerBlockedCount === 1 ? "" : "s"} need operator attention.`,
      urgency: workerBlockedCount > 0 ? "blocked" : "warn",
      href: "/dashboard#ai-workers",
      evidence: ["/v1/ai-workers"],
    });
  }

  if (telegram && !telegramReady) {
    pushUniqueAction(actions, {
      id: "finish-telegram-binding",
      label: "Finish Telegram binding",
      detail: "Telegram control is not active yet; bind and verify the workspace chat before relying on chat operations.",
      urgency: telegram.integration.status === "disabled" ? "blocked" : "warn",
      href: "/settings#telegram-command-center",
      evidence: ["/v1/integrations/telegram"],
    });
  }

  if (actions.length === 0) {
    pushUniqueAction(actions, {
      id: "grow-next-pipeline",
      label: "Prepare next growth pass",
      detail: "Core blockers are clear. Review source quality, outreach approvals, and meeting follow-up before increasing volume.",
      urgency: "good",
      href: "/dashboard#source-plan",
      evidence: ["/v1/dashboard", "/v1/providers"],
    });
  }

  const posture: CommandCenterBriefPosture =
    providerBlockerCount > 0 || highRiskApprovalCount > 0
      ? "blocked"
      : pendingApprovalCount > 0 || workerBlockedCount > 0 || workerPendingCount > 0
        ? "review_required"
        : qualifiedLeadCount > 0 || meetingCount > 0
          ? "growth_ready"
          : "healthy";
  const title =
    posture === "blocked"
      ? "Operator attention required"
      : posture === "review_required"
        ? "Ready for human review"
        : posture === "growth_ready"
          ? "Growth pass ready"
          : "Workspace operating normally";

  return commandCenterBriefResponseSchema.parse({
    surface: "command-center-brief",
    version: "2026-06-04.operator-brief",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey: dashboard.subscription.planKey,
    },
    posture,
    title,
    summary:
      `${pendingApprovalCount} pending approval${pendingApprovalCount === 1 ? "" : "s"}, ` +
      `${providerBlockerCount} provider blocker${providerBlockerCount === 1 ? "" : "s"}, ` +
      `${metricValue(dashboard, "Qualified leads")} qualified leads, ` +
      `${metricValue(dashboard, "Meetings booked")} meetings booked.`,
    metrics: [
      {
        id: "approvals",
        label: "Approvals",
        value: String(pendingApprovalCount),
        detail: `${highRiskApprovalCount} high-risk approval${highRiskApprovalCount === 1 ? "" : "s"}.`,
        tone: highRiskApprovalCount > 0 ? "blocked" : pendingApprovalCount > 0 ? "warn" : "good",
      },
      {
        id: "providers",
        label: "Providers",
        value: String(providers.summary.configured),
        detail: `${providerBlockerCount} production blocker${providerBlockerCount === 1 ? "" : "s"}.`,
        tone: providerBlockerCount > 0 ? "blocked" : "good",
      },
      {
        id: "pipeline",
        label: "Pipeline",
        value: metricValue(dashboard, "Qualified leads"),
        detail: `${sourceRunCount} source run${sourceRunCount === 1 ? "" : "s"} recorded.`,
        tone: sourceRunCount > 0 ? "good" : "warn",
      },
      {
        id: "meetings",
        label: "Meetings",
        value: metricValue(dashboard, "Meetings booked"),
        detail: "Scheduled or completed meeting follow-up visible in the workspace.",
        tone: meetingCount > 0 ? "good" : "neutral",
      },
      {
        id: "telegram",
        label: "Telegram",
        value: telegram?.integration.status.replaceAll("_", " ") ?? "unknown",
        detail: telegramReady
          ? "Chat control is active for safe commands."
          : "Chat control requires setup before operational use.",
        tone: telegramReady ? "good" : telegram ? "warn" : "neutral",
      },
    ],
    nextActions: actions.slice(0, 5),
    guardrails: [
      "Read-only operator brief; no workspace state changes are made.",
      "Risky actions stay approval-gated in the app.",
      "Provider, suppression, budget, and role limits still apply.",
    ],
    unavailableClaims: commandCenterUnavailableClaims,
  });
}
