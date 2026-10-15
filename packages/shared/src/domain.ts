import { z } from "zod";

export const roleSchema = z.enum(["owner", "admin", "member"]);
export const leadStatusSchema = z.enum([
  "new",
  "qualified",
  "contacted",
  "meeting_booked",
  "won",
  "lost",
]);
export const campaignStageSchema = z.enum(["draft", "approved", "running", "paused"]);
export const subscriptionStatusSchema = z.enum(["trialing", "active", "past_due", "canceled"]);
export const onboardingStatusSchema = z.enum(["draft", "in_progress", "completed"]);
export const sourceStatusSchema = z.enum(["planned", "running", "completed"]);
export const activityTypeSchema = z.enum([
  "email",
  "sms",
  "linkedin",
  "call",
  "website",
  "meeting",
]);
export const outboundChannelSchema = z.enum(["email", "sms", "linkedin", "call"]);
export const activityStatusSchema = z.enum(["draft", "queued", "sent", "completed", "review_required"]);
export const meetingStatusSchema = z.enum(["pending", "scheduled", "completed", "canceled"]);
export const callStatusSchema = z.enum(["queued", "in_progress", "completed", "review_required"]);
export const urgencySchema = z.enum(["high", "medium", "low"]);
export const invitationStatusSchema = z.enum(["pending", "accepted", "revoked", "expired"]);
export const suppressionChannelSchema = z.enum(["email", "phone", "sms", "call", "linkedin", "all"]);
export const suppressionReasonSchema = z.enum([
  "unsubscribe",
  "manual",
  "provider_complaint",
  "hard_bounce",
  "do_not_contact",
  "legal_request",
]);
export const telegramIntegrationStatusSchema = z.enum([
  "not_configured",
  "pending_verification",
  "active",
  "disabled",
]);
export const telegramCommandSchema = z.enum([
  "status",
  "brief",
  "approvals",
  "providers",
  "suppressions",
  "sequence",
  "forecast",
  "help",
  "pause",
]);
export const telegramCommandResultSchema = z.enum([
  "success",
  "denied",
  "not_configured",
  "requires_approval",
]);
export const telegramDefaultAllowedCommands = [
  "status",
  "brief",
  "approvals",
  "providers",
  "suppressions",
  "sequence",
  "forecast",
  "help",
  "pause",
] as const;

export const contactIntakeIntentSchema = z.enum([
  "sales_assessment",
  "managed_services",
  "setup_help",
  "billing_question",
  "product_feedback",
  "partnership",
]);
export const contactIntakeStatusSchema = z.enum(["new", "triaged", "closed"]);
export const contactIntakePrioritySchema = z.enum(["high", "medium", "low"]);
export const contactIntakeTimelineSchema = z.enum([
  "this_week",
  "this_month",
  "this_quarter",
  "exploring",
]);
export const contactIntakeBudgetRangeSchema = z.enum([
  "under_500",
  "500_1500",
  "1500_5000",
  "5000_plus",
  "not_sure",
]);

export const businessProfileSchema = z.object({
  businessName: z.string(),
  website: z.string(),
  industry: z.string(),
  offerSummary: z.string(),
  targetAudience: z.string(),
  regions: z.array(z.string()),
  goals: z.array(z.string()),
  channels: z.array(z.string()),
  constraints: z.array(z.string()),
  voice: z.string(),
  summary: z.string(),
});

const listFromFormValue = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) =>
      typeof entry === "string"
        ? entry.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean)
        : [],
    );
  }

  if (typeof value === "string") {
    return value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
  }

  return value;
}, z.array(z.string().trim().min(1).max(180)).max(24));

const contactIntakeAttributionValueSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, 180) : undefined;
}, z.string().max(180).optional());

export const contactIntakeAttributionSchema = z.object({
  source: contactIntakeAttributionValueSchema,
  medium: contactIntakeAttributionValueSchema,
  campaign: contactIntakeAttributionValueSchema,
  solutionSegment: contactIntakeAttributionValueSchema,
  segment: contactIntakeAttributionValueSchema,
  pricingPlan: contactIntakeAttributionValueSchema,
  pricingIntent: contactIntakeAttributionValueSchema,
  managedPackage: contactIntakeAttributionValueSchema,
  managedIntent: contactIntakeAttributionValueSchema,
}).catchall(z.unknown());

export const createContactIntakeInputSchema = z.object({
  intent: contactIntakeIntentSchema.default("sales_assessment"),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255),
  companyName: z.string().trim().min(2).max(160),
  website: z.string().trim().max(255).default(""),
  companyWebsiteUrl: z.string().trim().max(255).default(""),
  role: z.string().trim().max(120).default(""),
  teamSize: z.string().trim().max(80).default(""),
  monthlyLeadGoal: z.coerce.number().int().min(0).max(100000).default(0),
  budgetRange: contactIntakeBudgetRangeSchema.default("not_sure"),
  timeline: contactIntakeTimelineSchema.default("exploring"),
  goals: listFromFormValue.default([]),
  channels: listFromFormValue.default([]),
  message: z.string().trim().min(20).max(2400),
  sourcePath: z.string().trim().max(255).default("/contact"),
  referrer: z.string().trim().max(500).default(""),
  utm: contactIntakeAttributionSchema.default({}),
});

export type CreateContactIntakeInput = z.infer<typeof createContactIntakeInputSchema>;
export type ContactIntakeAttribution = z.infer<typeof contactIntakeAttributionSchema>;
export type ContactIntakeIntent = z.infer<typeof contactIntakeIntentSchema>;
export type ContactIntakePriority = z.infer<typeof contactIntakePrioritySchema>;
export type ContactIntakeStatus = z.infer<typeof contactIntakeStatusSchema>;

export function isContactIntakeSpamTrapTriggered(input: Pick<CreateContactIntakeInput, "companyWebsiteUrl">) {
  return input.companyWebsiteUrl.trim().length > 0;
}

function readUtmString(input: CreateContactIntakeInput, key: string) {
  const value = input.utm[key];
  return typeof value === "string" ? value.trim() : "";
}

const storedContactIntakeInputSchema = createContactIntakeInputSchema.omit({
  companyWebsiteUrl: true,
});

export const contactIntakeRecordSchema = storedContactIntakeInputSchema.extend({
  id: z.string(),
  status: contactIntakeStatusSchema,
  priority: contactIntakePrioritySchema,
  qualificationScore: z.number().int().min(0).max(100),
  routingRecommendation: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const contactIntakeNotificationSchema = z.object({
  mode: z.enum(["email", "preview", "unavailable", "failed"]),
  provider: z.string(),
  detail: z.string(),
});

export const contactIntakeResponseSchema = z.object({
  submission: contactIntakeRecordSchema,
  notification: contactIntakeNotificationSchema.optional(),
  detail: z.string(),
});

export type ContactIntakeRecord = z.infer<typeof contactIntakeRecordSchema>;
export type ContactIntakeNotification = z.infer<typeof contactIntakeNotificationSchema>;
export type ContactIntakeResponse = z.infer<typeof contactIntakeResponseSchema>;

export function scoreContactIntake(input: CreateContactIntakeInput) {
  let score = 20;

  if (input.intent === "sales_assessment" || input.intent === "managed_services") {
    score += 18;
  }

  if (input.timeline === "this_week") {
    score += 20;
  } else if (input.timeline === "this_month") {
    score += 14;
  } else if (input.timeline === "this_quarter") {
    score += 8;
  }

  if (input.budgetRange === "5000_plus") {
    score += 18;
  } else if (input.budgetRange === "1500_5000") {
    score += 14;
  } else if (input.budgetRange === "500_1500") {
    score += 8;
  }

  if (input.monthlyLeadGoal >= 1000) {
    score += 14;
  } else if (input.monthlyLeadGoal >= 250) {
    score += 10;
  } else if (input.monthlyLeadGoal >= 50) {
    score += 6;
  }

  if (input.website) {
    score += 6;
  }

  if (input.channels.length >= 2) {
    score += 6;
  }

  if (input.goals.length >= 2) {
    score += 6;
  }

  if (readUtmString(input, "source") === "solution_segment") {
    score += 8;
  }

  const qualificationScore = Math.min(100, Math.max(0, score));
  const priority: ContactIntakePriority =
    qualificationScore >= 72 ? "high" : qualificationScore >= 44 ? "medium" : "low";
  const routingRecommendation =
    input.intent === "billing_question"
      ? "Route to billing support with plan-fit context."
      : input.intent === "product_feedback"
        ? "Route to product feedback review; do not treat as a sales-qualified lead."
        : priority === "high"
          ? "Route to founder/managed-services review within one business day."
          : priority === "medium"
            ? "Route to beta onboarding review with Sales Blueprint follow-up."
            : "Route to nurture and request more business context before sales follow-up.";

  return {
    priority,
    qualificationScore,
    routingRecommendation,
  };
}

export const salesBlueprintStatusSchema = z.enum(["draft", "ready", "needs_review"]);
export const salesBlueprintAutomationModeSchema = z.enum([
  "assistive",
  "approval_gated",
  "supervised_autonomy",
]);

export const salesBlueprintSchema = z.object({
  id: z.string(),
  status: salesBlueprintStatusSchema,
  businessProfile: businessProfileSchema,
  icpSummary: z.string(),
  buyerRoles: z.array(z.string()),
  painPoints: z.array(z.string()),
  disqualifiers: z.array(z.string()),
  qualificationRules: z.array(z.string()),
  sourceChannels: z.array(z.string()),
  outreachChannels: z.array(z.string()),
  searchKeywords: z.array(z.string()),
  monthlyLeadTarget: z.number().int().min(1),
  meetingTarget: z.number().int().min(1),
  averageContractValue: z.number().int().min(0),
  automationMode: salesBlueprintAutomationModeSchema,
  approvalRequiredFor: z.array(z.string()),
  complianceNotes: z.string(),
  readinessScore: z.number().int().min(0).max(100),
  readinessGaps: z.array(z.string()),
  lastUpdatedAt: z.string(),
});

export const upsertSalesBlueprintInputSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  website: z.string().trim().max(255).default(""),
  industry: z.string().trim().min(2).max(120),
  offerSummary: z.string().trim().min(10).max(1200),
  targetAudience: z.string().trim().min(5).max(800),
  regions: listFromFormValue.default([]),
  goals: listFromFormValue.default([]),
  channels: listFromFormValue.default([]),
  constraints: listFromFormValue.default([]),
  voice: z.string().trim().min(5).max(800),
  summary: z.string().trim().min(10).max(1200),
  icpSummary: z.string().trim().min(10).max(1200),
  buyerRoles: listFromFormValue.default([]),
  painPoints: listFromFormValue.default([]),
  disqualifiers: listFromFormValue.default([]),
  qualificationRules: listFromFormValue.default([]),
  sourceChannels: listFromFormValue.default([]),
  outreachChannels: listFromFormValue.default([]),
  searchKeywords: listFromFormValue.default([]),
  monthlyLeadTarget: z.coerce.number().int().min(1).max(100000).default(100),
  meetingTarget: z.coerce.number().int().min(1).max(10000).default(10),
  averageContractValue: z.coerce.number().int().min(0).max(100000000).default(0),
  automationMode: salesBlueprintAutomationModeSchema.default("approval_gated"),
  approvalRequiredFor: listFromFormValue.default([
    "first outreach",
    "phone calls",
    "new channels",
  ]),
  complianceNotes: z.string().trim().max(1200).default(""),
});

export const salesBlueprintResponseSchema = z.object({
  blueprint: salesBlueprintSchema.nullable(),
  detail: z.string(),
});

export const onboardingMessageSchema = z.object({
  role: z.enum(["assistant", "user"]),
  content: z.string(),
});

export const onboardingSessionSchema = z.object({
  id: z.string(),
  status: onboardingStatusSchema,
  currentStep: z.string(),
  transcript: z.array(onboardingMessageSchema),
  extractedProfile: businessProfileSchema.nullable(),
  scraperBrief: z.string().nullable(),
  outreachBrief: z.string().nullable(),
});

export const leadRecordSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string(),
  status: leadStatusSchema,
  score: z.number().int().min(0).max(100),
  lastTouchpoint: z.string(),
  rejectionReason: z.string().nullable().default(null),
});

export const sourcePlanSchema = z.object({
  id: z.string(),
  summary: z.string(),
  sources: z.array(z.string()),
  contactTargets: z.array(z.string()),
  searchTerms: z.array(z.string()),
  rationale: z.string(),
});

export const sourceRunProviderModeSchema = z.enum(["mock", "configured"]);

export const sourceRunEvidenceSchema = z.object({
  label: z.string(),
  value: z.string(),
  detail: z.string().nullable().default(null),
  url: z.string().nullable().default(null),
  confidence: z.number().int().min(0).max(100).default(0),
});

export const sourceRunRejectionReasonSchema = z.object({
  reason: z.string(),
  count: z.number().int().min(0),
  detail: z.string(),
});

export const sourceRunSchema = z.object({
  id: z.string(),
  source: z.string(),
  status: sourceStatusSchema,
  providerMode: sourceRunProviderModeSchema.default("mock"),
  candidatesFound: z.number().int().min(0),
  dedupedCount: z.number().int().min(0).default(0),
  qualifiedCount: z.number().int().min(0),
  rejectedCount: z.number().int().min(0),
  qualityScore: z.number().int().min(0).max(100).default(0),
  evidence: z.array(sourceRunEvidenceSchema).default([]),
  rejectionReasons: z.array(sourceRunRejectionReasonSchema).default([]),
  complianceChecks: z.array(z.string()).default([]),
  freshness: z.string().default("Not recorded"),
  nextAction: z.string().default("Review source evidence before outreach."),
  summary: z.string(),
});

export const outreachActivitySchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  leadId: z.string(),
  type: activityTypeSchema,
  provider: z.string().nullable().default(null),
  providerMessageId: z.string().nullable().default(null),
  status: activityStatusSchema,
  subject: z.string(),
  preview: z.string(),
  personalizedFor: z.string(),
});

export const campaignRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  channel: z.string(),
  stage: campaignStageSchema,
  approved: z.boolean(),
  firstActionCompleted: z.boolean(),
  nextActionAt: z.string(),
  leadsEnrolled: z.number().int().min(0),
});

export const callRecordSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  status: callStatusSchema,
  provider: z.string(),
  providerCallId: z.string().nullable().default(null),
  summary: z.string(),
  transcript: z.string(),
  disposition: z.string(),
  reviewRequired: z.boolean(),
});

export const meetingRecordSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  status: meetingStatusSchema,
  scheduledFor: z.string(),
  owner: z.string(),
  notes: z.string(),
  dealValueCents: z.number().int().min(0).default(0),
  dealCurrency: z.string().trim().min(3).max(3).default("USD"),
});

export const subscriptionRecordSchema = z.object({
  planKey: z.string(),
  status: subscriptionStatusSchema,
  seats: z.number().int().min(1),
  usageLimit: z.number().int().positive(),
  monthlyUsage: z.number().int().min(0),
});

export const organizationMembershipSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  role: roleSchema,
});

export const workspaceMembershipSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  workspaceId: z.string(),
  workspaceName: z.string(),
  role: roleSchema,
  active: z.boolean(),
});

export const workspaceMembershipListSchema = z.object({
  memberships: z.array(workspaceMembershipSchema),
});

export const selectWorkspaceInputSchema = z.object({
  workspaceId: z.string().min(2),
});

export const requestEmailVerificationInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase())
    .optional(),
});

export const confirmEmailVerificationInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  token: z.string().trim().min(24).max(200),
});

export const requestPasswordResetInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
});

export const confirmPasswordResetInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  token: z.string().trim().min(24).max(200),
  password: z.string().min(8).max(128),
});

export const workspaceTeamMemberSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable().default(null),
  workspaceRole: roleSchema,
  organizationRole: roleSchema,
  activeWorkspace: z.boolean(),
  currentUser: z.boolean(),
});

export const workspaceTeamMemberListSchema = z.object({
  members: z.array(workspaceTeamMemberSchema),
});

export const workspaceInvitationSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: roleSchema,
  status: invitationStatusSchema,
  workspaceId: z.string(),
  workspaceName: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  invitedByName: z.string(),
  expiresAt: z.string(),
  acceptedAt: z.string().nullable().default(null),
});

export const workspaceInvitationListSchema = z.object({
  invitations: z.array(workspaceInvitationSchema),
});

export const createWorkspaceInvitationInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  role: roleSchema,
});

export const acceptWorkspaceInvitationInputSchema = z.object({
  token: z.string().trim().min(24).max(200),
});

export const updateWorkspaceTeamMemberRoleInputSchema = z.object({
  role: roleSchema,
});

export const transferWorkspaceOwnershipInputSchema = z.object({
  targetUserId: z.string().min(2),
});

export const authLifecycleDeliverySchema = z.object({
  mode: z.enum(["email", "preview", "unavailable"]),
  previewUrl: z.string().url().optional(),
});

export const createWorkspaceInvitationResponseSchema = z.object({
  invitation: workspaceInvitationSchema,
  delivery: authLifecycleDeliverySchema,
});

export const workspaceTeamMemberMutationResponseSchema = z.object({
  member: workspaceTeamMemberSchema,
});

export const workspaceTeamMemberRemovalResponseSchema = z.object({
  removedUserId: z.string(),
  removedEmail: z.string().email(),
});

export const workspaceOwnershipTransferResponseSchema = z.object({
  transferredToUserId: z.string(),
  transferredToEmail: z.string().email(),
});

export const authLifecycleRequestResponseSchema = z.object({
  ok: z.boolean(),
  email: z.string().email(),
  requiresEmailVerification: z.boolean().optional(),
  delivery: authLifecycleDeliverySchema.optional(),
});

export const emailVerificationConfirmResponseSchema = z.object({
  ok: z.boolean(),
  verified: z.boolean(),
  alreadyVerified: z.boolean().default(false),
});

export const passwordResetConfirmResponseSchema = z.object({
  ok: z.boolean(),
  reset: z.boolean(),
});

export const workspaceSummarySchema = z.object({
  organizationName: z.string(),
  workspaceName: z.string(),
  region: z.string(),
  primaryChannel: z.string(),
});

export const dashboardMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  detail: z.string(),
});

export const actionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  urgency: urgencySchema,
});

export const actionProposalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "expired",
]);
export const actionProposalRiskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export const actionProposalTypeSchema = z.enum([
  "lead_source_run",
  "campaign_dispatch",
  "call_dispatch",
  "telegram_pause",
  "provider_setup",
  "billing_change",
  "ai_worker_action",
]);
export const actionProposalActorSchema = z.enum(["ai", "operator", "telegram", "system"]);

export const actionProposalSchema = z.object({
  id: z.string(),
  type: actionProposalTypeSchema,
  status: actionProposalStatusSchema,
  riskLevel: actionProposalRiskLevelSchema,
  title: z.string(),
  detail: z.string(),
  proposedBy: actionProposalActorSchema,
  targetKind: z.string(),
  targetId: z.string().nullable(),
  targetLabel: z.string(),
  payloadSummary: z.string(),
  payload: z.record(z.unknown()).default({}),
  guardrails: z.array(z.string()).default([]),
  expectedEffect: z.string(),
  rollbackPlan: z.string(),
  requiredRole: roleSchema,
  requestedBy: z.string().nullable().default(null),
  reviewedBy: z.string().nullable().default(null),
  reviewNote: z.string().nullable().default(null),
  auditEventId: z.string().nullable().default(null),
  createdAt: z.string(),
  reviewedAt: z.string().nullable().default(null),
  expiresAt: z.string().nullable().default(null),
});

export const actionProposalListResponseSchema = z.object({
  proposals: z.array(actionProposalSchema),
  summary: z.object({
    pending: z.number().int().min(0),
    highRisk: z.number().int().min(0),
    approved: z.number().int().min(0),
    rejected: z.number().int().min(0),
  }),
});

export const createActionProposalInputSchema = z.object({
  type: actionProposalTypeSchema,
  riskLevel: actionProposalRiskLevelSchema.default("medium"),
  title: z.string().trim().min(3).max(180),
  detail: z.string().trim().min(8).max(1600),
  proposedBy: actionProposalActorSchema.default("operator"),
  targetKind: z.string().trim().min(2).max(80),
  targetId: z.string().trim().min(1).max(160).nullable().optional(),
  targetLabel: z.string().trim().min(2).max(180),
  payloadSummary: z.string().trim().min(3).max(800),
  payload: z.record(z.unknown()).default({}),
  guardrails: listFromFormValue.default([]),
  expectedEffect: z.string().trim().min(3).max(800),
  rollbackPlan: z.string().trim().min(3).max(800),
  requiredRole: roleSchema.default("admin"),
  requestedBy: z.string().trim().min(2).max(160).nullable().optional(),
  expiresAt: z.string().trim().min(2).nullable().optional(),
});

export const reviewActionProposalInputSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().min(2).max(800),
});

export const aiWorkerStatusSchema = z.enum(["active", "paused", "disabled"]);
export const aiWorkerRunStatusSchema = z.enum([
  "proposed",
  "approved",
  "rejected",
  "completed",
  "blocked",
]);

export const aiWorkerSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  status: aiWorkerStatusSchema,
  riskLevel: actionProposalRiskLevelSchema,
  ownerRole: roleSchema,
  description: z.string(),
  permissions: z.array(z.string()).default([]),
  allowedTools: z.array(z.string()).default([]),
  blockedTools: z.array(z.string()).default([]),
  monthlyBudgetCents: z.number().int().min(0).default(0),
  budgetUsedCents: z.number().int().min(0).default(0),
  lastActionAt: z.string().nullable().default(null),
  guardrails: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const aiWorkerRunSchema = z.object({
  id: z.string(),
  workerId: z.string(),
  workerName: z.string(),
  status: aiWorkerRunStatusSchema,
  title: z.string(),
  detail: z.string(),
  riskLevel: actionProposalRiskLevelSchema,
  proposedAction: z.string(),
  expectedCostCents: z.number().int().min(0).default(0),
  actualCostCents: z.number().int().min(0).default(0),
  approvalProposalId: z.string().nullable().default(null),
  resultSummary: z.string().nullable().default(null),
  blockedReason: z.string().nullable().default(null),
  createdAt: z.string(),
  completedAt: z.string().nullable().default(null),
  updatedAt: z.string(),
});

export const aiWorkerControlPlaneResponseSchema = z.object({
  workers: z.array(aiWorkerSchema),
  runs: z.array(aiWorkerRunSchema),
  summary: z.object({
    active: z.number().int().min(0),
    paused: z.number().int().min(0),
    disabled: z.number().int().min(0),
    pendingApproval: z.number().int().min(0),
    blocked: z.number().int().min(0),
    budgetUsedCents: z.number().int().min(0),
    budgetLimitCents: z.number().int().min(0),
  }),
});

export const createAiWorkerTaskInputSchema = z.object({
  workerId: z.string().trim().min(2).max(160),
  title: z.string().trim().min(3).max(180),
  detail: z.string().trim().min(8).max(1600),
  proposedAction: z.string().trim().min(8).max(1600),
  riskLevel: actionProposalRiskLevelSchema.default("medium"),
  expectedCostCents: z.coerce.number().int().min(0).max(1_000_000).default(0),
  requiredRole: roleSchema.default("admin"),
});

export const completeAiWorkerRunInputSchema = z.object({
  resultSummary: z.string().trim().min(8).max(1600),
  actualCostCents: z.coerce.number().int().min(0).max(1_000_000).default(0),
});

export const dashboardResponseSchema = z.object({
  workspace: workspaceSummarySchema,
  metrics: z.array(dashboardMetricSchema),
  leads: z.array(leadRecordSchema),
  campaigns: z.array(campaignRecordSchema),
  subscription: subscriptionRecordSchema,
  actionItems: z.array(actionItemSchema),
  onboarding: onboardingSessionSchema,
  sourcePlan: sourcePlanSchema.nullable(),
  sourceRuns: z.array(sourceRunSchema),
  activities: z.array(outreachActivitySchema),
  calls: z.array(callRecordSchema),
  meetings: z.array(meetingRecordSchema),
});

export const createLeadInputSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(5).optional(),
  company: z.string().min(2).optional(),
  source: z.string().min(2),
  score: z.number().int().min(0).max(100).default(50),
});

export const createCampaignInputSchema = z.object({
  name: z.string().min(3),
  channel: z.string().min(2),
  highRiskChannel: z.boolean().default(false),
});

export const campaignPolicyResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string(),
  nextStage: campaignStageSchema,
});

export const createCampaignResponseSchema = z.object({
  campaign: campaignRecordSchema,
  policy: campaignPolicyResultSchema,
});

export const approveCampaignInputSchema = z.object({});

export const onboardingSessionInputSchema = z.object({
  ownerName: z.string().min(2),
  businessName: z.string().min(2),
});

export const onboardingMessageInputSchema = z.object({
  content: z.string().min(2),
});

export const sourcePlanInputSchema = z.object({
  goal: z.string().min(2).default("Find qualified leads"),
});

export const sourceRunInputSchema = z.object({
  source: z.string().min(2),
});

export const runCampaignInputSchema = z.object({});

export const createCallInputSchema = z.object({
  leadId: z.string().min(2),
  provider: z.string().min(2).default("twilio"),
});

export const reviewCallInputSchema = z.object({
  approved: z.boolean(),
  notes: z.string().min(2),
});

export const createMeetingInputSchema = z.object({
  leadId: z.string().min(2),
  scheduledFor: z.string().min(2),
  owner: z.string().min(2),
  notes: z.string().min(2),
});

export const updateMeetingInputSchema = z.object({
  status: meetingStatusSchema,
  notes: z.string().min(2),
  dealValueCents: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  dealCurrency: z.string().trim().min(3).max(3).default("USD"),
});

export const providerReadinessStatusSchema = z.enum([
  "configured",
  "guarded",
  "blocked",
  "disabled",
]);

export const providerHealthSchema = z.object({
  provider: z.string(),
  kind: z.enum(["lead-source", "outreach", "voice", "billing", "webhook", "chat"]),
  mode: z.enum(["mock", "configured", "disabled"]),
  channels: z.array(z.string()),
  detail: z.string(),
  readiness: providerReadinessStatusSchema.default("guarded"),
  requiredSecrets: z.array(z.string()).default([]),
  missingSecrets: z.array(z.string()).default([]),
  liveAction: z.string().default("Guarded until configured."),
  guardrails: z.array(z.string()).default([]),
  lastVerifiedAt: z.string().nullable().default(null),
  productionBlockers: z.array(z.string()).default([]),
});

export const providerSummarySchema = z.object({
  sources: z.array(providerHealthSchema),
  outreach: z.array(providerHealthSchema),
  voice: z.array(providerHealthSchema),
  billing: z.array(providerHealthSchema).default([]),
  webhooks: z.array(providerHealthSchema).default([]),
  chat: z.array(providerHealthSchema).default([]),
  summary: z.object({
    configured: z.number().int().min(0),
    guarded: z.number().int().min(0),
    blocked: z.number().int().min(0),
    disabled: z.number().int().min(0),
    productionBlockers: z.array(z.string()),
  }).default({
    configured: 0,
    guarded: 0,
    blocked: 0,
    disabled: 0,
    productionBlockers: [],
  }),
});

export const discoverLeadsInputSchema = z.object({
  limitSources: z.number().int().min(1).max(5).default(3),
});

export const discoverLeadsResponseSchema = z.object({
  sourcePlan: sourcePlanSchema.nullable(),
  selectedSources: z.array(z.string()),
  runs: z.array(
    z.object({
      source: z.string(),
      run: sourceRunSchema,
      accepted: z.array(leadRecordSchema),
      rejected: z.array(leadRecordSchema),
    }),
  ),
});

export const dispatchCampaignInputSchema = z.object({});

export const dispatchCampaignResponseSchema = z.object({
  campaign: campaignRecordSchema,
  activity: outreachActivitySchema.nullable(),
  provider: z.string(),
  mode: z.enum(["mock", "configured"]),
  externalId: z.string().nullable(),
  deliveryStatus: z.enum(["queued", "sent", "review_required"]),
  providerCostCents: z.number().int().min(0).optional(),
  detail: z.string(),
});

export const dispatchCallInputSchema = z.object({
  leadId: z.string().min(2),
  provider: z.string().optional(),
});

export const dispatchCallResponseSchema = z.object({
  call: callRecordSchema,
  provider: z.string(),
  mode: z.enum(["mock", "configured"]),
  externalId: z.string().nullable(),
  providerCostCents: z.number().int().min(0).optional(),
  detail: z.string(),
});

export const providerEventSchema = z.object({
  id: z.string(),
  provider: z.string(),
  eventType: z.string(),
  verified: z.boolean(),
  receivedAt: z.string(),
  detail: z.string(),
});

export const suppressionRecordSchema = z.object({
  id: z.string(),
  channel: suppressionChannelSchema,
  contactValue: z.string(),
  normalizedContactValue: z.string(),
  reason: suppressionReasonSchema,
  source: z.string(),
  createdAt: z.string(),
  expiresAt: z.string().nullable().default(null),
});

export const createSuppressionInputSchema = z.object({
  channel: suppressionChannelSchema,
  contactValue: z.string().trim().min(3).max(255),
  reason: suppressionReasonSchema.default("manual"),
  source: z.string().trim().min(2).max(120).default("manual"),
  expiresAt: z.string().trim().min(2).nullable().optional(),
});

export const checkSuppressionInputSchema = z.object({
  channel: suppressionChannelSchema,
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(5).optional(),
  contactValue: z.string().trim().min(3).max(255).optional(),
});

export const suppressionListResponseSchema = z.object({
  suppressions: z.array(suppressionRecordSchema),
});

export const suppressionCheckResponseSchema = z.object({
  suppressed: z.boolean(),
  matchedSuppression: suppressionRecordSchema.nullable(),
  detail: z.string(),
});

export const telegramIntegrationSchema = z.object({
  id: z.string().nullable(),
  status: telegramIntegrationStatusSchema,
  botUsername: z.string().nullable(),
  chatIdMask: z.string().nullable(),
  allowedCommands: z.array(telegramCommandSchema),
  lastUpdateId: z.number().int().nullable(),
  lastVerifiedAt: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const configureTelegramIntegrationInputSchema = z.object({
  botUsername: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim().length > 0
          ? value
          : undefined,
      z.string().trim().min(2).max(120).optional(),
    )
    .transform((value) => {
      if (!value) {
        return null;
      }

      const normalized = value.startsWith("@") ? value : `@${value}`;
      return normalized.toLowerCase();
    }),
  chatId: z.string().trim().min(3).max(80),
  allowedCommands: z
    .array(telegramCommandSchema)
    .min(1)
    .default([...telegramDefaultAllowedCommands]),
});

export const telegramDeploymentStateSchema = z.object({
  botTokenConfigured: z.boolean(),
  webhookSecretConfigured: z.boolean(),
});

export const telegramCommandAuditSchema = z.object({
  id: z.string(),
  command: z.string(),
  chatIdMask: z.string(),
  result: telegramCommandResultSchema,
  detail: z.string(),
  createdAt: z.string(),
});

export const telegramIntegrationResponseSchema = z.object({
  integration: telegramIntegrationSchema,
  deployment: telegramDeploymentStateSchema,
  liveCommands: z.array(telegramCommandSchema),
  plannedCommands: z.array(telegramCommandSchema),
  recentCommands: z.array(telegramCommandAuditSchema),
  detail: z.string(),
});

export const telegramWebhookResponseSchema = z.object({
  ok: z.boolean(),
  verified: z.boolean(),
  command: z.string().nullable(),
  result: telegramCommandResultSchema,
  reply: z.string(),
  messageSent: z.boolean(),
  detail: z.string(),
});

export function normalizeSuppressionContactValue(value: string, channel: SuppressionChannel | string) {
  const trimmed = value.trim();

  if (channel === "phone" || channel === "sms" || channel === "call") {
    const hasPlus = trimmed.startsWith("+");
    const digits = trimmed.replace(/\D/g, "");
    return hasPlus && digits ? `+${digits}` : digits;
  }

  return trimmed.toLowerCase();
}

export function suppressionLookupChannels(channel: SuppressionChannel): SuppressionChannel[] {
  if (channel === "sms" || channel === "call") {
    return [channel, "phone", "all"];
  }

  if (channel === "phone") {
    return ["phone", "sms", "call", "all"];
  }

  if (channel === "all") {
    return ["all"];
  }

  return [channel, "all"];
}

export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export type SalesBlueprintStatus = z.infer<typeof salesBlueprintStatusSchema>;
export type SalesBlueprintAutomationMode = z.infer<
  typeof salesBlueprintAutomationModeSchema
>;
export type SalesBlueprint = z.infer<typeof salesBlueprintSchema>;
export type UpsertSalesBlueprintInput = z.infer<typeof upsertSalesBlueprintInputSchema>;
export type SalesBlueprintResponse = z.infer<typeof salesBlueprintResponseSchema>;
export type OnboardingMessage = z.infer<typeof onboardingMessageSchema>;
export type OnboardingSession = z.infer<typeof onboardingSessionSchema>;
export type LeadRecord = z.infer<typeof leadRecordSchema>;
export type SourcePlan = z.infer<typeof sourcePlanSchema>;
export type SourceRunProviderMode = z.infer<typeof sourceRunProviderModeSchema>;
export type SourceRunEvidence = z.infer<typeof sourceRunEvidenceSchema>;
export type SourceRunRejectionReason = z.infer<typeof sourceRunRejectionReasonSchema>;
export type SourceRun = z.infer<typeof sourceRunSchema>;
export type OutreachActivity = z.infer<typeof outreachActivitySchema>;
export type CampaignRecord = z.infer<typeof campaignRecordSchema>;
export type CallRecord = z.infer<typeof callRecordSchema>;
export type MeetingRecord = z.infer<typeof meetingRecordSchema>;
export type SubscriptionRecord = z.infer<typeof subscriptionRecordSchema>;
export type OrganizationMembership = z.infer<typeof organizationMembershipSchema>;
export type WorkspaceMembership = z.infer<typeof workspaceMembershipSchema>;
export type WorkspaceMembershipList = z.infer<typeof workspaceMembershipListSchema>;
export type SelectWorkspaceInput = z.infer<typeof selectWorkspaceInputSchema>;
export type RequestEmailVerificationInput = z.infer<typeof requestEmailVerificationInputSchema>;
export type ConfirmEmailVerificationInput = z.infer<typeof confirmEmailVerificationInputSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetInputSchema>;
export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetInputSchema>;
export type WorkspaceTeamMember = z.infer<typeof workspaceTeamMemberSchema>;
export type WorkspaceTeamMemberList = z.infer<typeof workspaceTeamMemberListSchema>;
export type WorkspaceInvitation = z.infer<typeof workspaceInvitationSchema>;
export type WorkspaceInvitationList = z.infer<typeof workspaceInvitationListSchema>;
export type CreateWorkspaceInvitationInput = z.infer<typeof createWorkspaceInvitationInputSchema>;
export type CreateWorkspaceInvitationResponse = z.infer<
  typeof createWorkspaceInvitationResponseSchema
>;
export type AcceptWorkspaceInvitationInput = z.infer<typeof acceptWorkspaceInvitationInputSchema>;
export type AuthLifecycleDelivery = z.infer<typeof authLifecycleDeliverySchema>;
export type AuthLifecycleRequestResponse = z.infer<typeof authLifecycleRequestResponseSchema>;
export type EmailVerificationConfirmResponse = z.infer<
  typeof emailVerificationConfirmResponseSchema
>;
export type PasswordResetConfirmResponse = z.infer<typeof passwordResetConfirmResponseSchema>;
export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;
export type DashboardMetric = z.infer<typeof dashboardMetricSchema>;
export type ActionItem = z.infer<typeof actionItemSchema>;
export type ActionProposalStatus = z.infer<typeof actionProposalStatusSchema>;
export type ActionProposalRiskLevel = z.infer<typeof actionProposalRiskLevelSchema>;
export type ActionProposalType = z.infer<typeof actionProposalTypeSchema>;
export type ActionProposalActor = z.infer<typeof actionProposalActorSchema>;
export type ActionProposal = z.infer<typeof actionProposalSchema>;
export type ActionProposalListResponse = z.infer<
  typeof actionProposalListResponseSchema
>;
export type CreateActionProposalInput = z.infer<typeof createActionProposalInputSchema>;
export type ReviewActionProposalInput = z.infer<typeof reviewActionProposalInputSchema>;
export type AiWorkerStatus = z.infer<typeof aiWorkerStatusSchema>;
export type AiWorkerRunStatus = z.infer<typeof aiWorkerRunStatusSchema>;
export type AiWorker = z.infer<typeof aiWorkerSchema>;
export type AiWorkerRun = z.infer<typeof aiWorkerRunSchema>;
export type AiWorkerControlPlaneResponse = z.infer<
  typeof aiWorkerControlPlaneResponseSchema
>;
export type CreateAiWorkerTaskInput = z.infer<typeof createAiWorkerTaskInputSchema>;
export type CompleteAiWorkerRunInput = z.infer<typeof completeAiWorkerRunInputSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;
export type OutboundChannel = z.infer<typeof outboundChannelSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignInputSchema>;
export type ApproveCampaignInput = z.infer<typeof approveCampaignInputSchema>;
export type OnboardingSessionInput = z.infer<typeof onboardingSessionInputSchema>;
export type OnboardingMessageInput = z.infer<typeof onboardingMessageInputSchema>;
export type SourcePlanInput = z.infer<typeof sourcePlanInputSchema>;
export type SourceRunInput = z.infer<typeof sourceRunInputSchema>;
export type RunCampaignInput = z.infer<typeof runCampaignInputSchema>;
export type CreateCallInput = z.infer<typeof createCallInputSchema>;
export type ReviewCallInput = z.infer<typeof reviewCallInputSchema>;
export type CreateMeetingInput = z.infer<typeof createMeetingInputSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingInputSchema>;
export type ProviderHealth = z.infer<typeof providerHealthSchema>;
export type ProviderReadinessStatus = z.infer<typeof providerReadinessStatusSchema>;
export type ProviderSummary = z.infer<typeof providerSummarySchema>;
export type DiscoverLeadsInput = z.infer<typeof discoverLeadsInputSchema>;
export type DiscoverLeadsResponse = z.infer<typeof discoverLeadsResponseSchema>;
export type DispatchCampaignInput = z.infer<typeof dispatchCampaignInputSchema>;
export type DispatchCampaignResponse = z.infer<typeof dispatchCampaignResponseSchema>;
export type DispatchCallInput = z.infer<typeof dispatchCallInputSchema>;
export type DispatchCallResponse = z.infer<typeof dispatchCallResponseSchema>;
export type ProviderEvent = z.infer<typeof providerEventSchema>;
export type SuppressionChannel = z.infer<typeof suppressionChannelSchema>;
export type SuppressionReason = z.infer<typeof suppressionReasonSchema>;
export type SuppressionRecord = z.infer<typeof suppressionRecordSchema>;
export type CreateSuppressionInput = z.infer<typeof createSuppressionInputSchema>;
export type CheckSuppressionInput = z.infer<typeof checkSuppressionInputSchema>;
export type SuppressionListResponse = z.infer<typeof suppressionListResponseSchema>;
export type SuppressionCheckResponse = z.infer<typeof suppressionCheckResponseSchema>;
export type TelegramIntegrationStatus = z.infer<typeof telegramIntegrationStatusSchema>;
export type TelegramCommand = z.infer<typeof telegramCommandSchema>;
export type TelegramCommandResult = z.infer<typeof telegramCommandResultSchema>;
export type TelegramIntegration = z.infer<typeof telegramIntegrationSchema>;
export type ConfigureTelegramIntegrationInput = z.infer<
  typeof configureTelegramIntegrationInputSchema
>;
export type TelegramDeploymentState = z.infer<typeof telegramDeploymentStateSchema>;
export type TelegramCommandAudit = z.infer<typeof telegramCommandAuditSchema>;
export type TelegramIntegrationResponse = z.infer<typeof telegramIntegrationResponseSchema>;
export type TelegramWebhookResponse = z.infer<typeof telegramWebhookResponseSchema>;
