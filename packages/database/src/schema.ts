import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
};

export const roleEnum = pgEnum("role", ["owner", "admin", "member"]);
export const campaignStageEnum = pgEnum("campaign_stage", ["draft", "approved", "running", "paused"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "qualified", "contacted", "meeting_booked", "won", "lost"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trialing", "active", "past_due", "canceled"]);
export const taskStatusEnum = pgEnum("task_status", ["queued", "running", "blocked", "failed", "completed"]);
export const onboardingStatusEnum = pgEnum("onboarding_status", ["draft", "in_progress", "completed"]);
export const sourceStatusEnum = pgEnum("source_status", ["planned", "running", "completed"]);
export const activityStatusEnum = pgEnum("activity_status", ["draft", "queued", "sent", "completed", "review_required"]);
export const meetingStatusEnum = pgEnum("meeting_status", ["pending", "scheduled", "completed", "canceled"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "revoked", "expired"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  region: varchar("region", { length: 48 }).notNull().default("global"),
  stripeCustomerId: text("stripe_customer_id"),
  razorpayCustomerId: text("razorpay_customer_id"),
  ...timestamps,
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 160 }).notNull(),
  industry: varchar("industry", { length: 120 }),
  ...timestamps,
}, (workspace) => ({
  organizationIdIdx: index("workspaces_organization_id_idx").on(workspace.organizationId),
}));

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  activeWorkspaceId: uuid("active_workspace_id").references(() => workspaces.id, {
    onDelete: "set null",
  }),
  sessionInvalidBefore: timestamp("session_invalid_before", {
    withTimezone: true,
    mode: "date",
  }),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
  image: text("image"),
  displayName: varchar("display_name", { length: 160 }),
  role: roleEnum("role").notNull().default("member"),
  passwordHash: text("password_hash"),
  ...timestamps,
}, (user) => ({
  organizationIdIdx: index("users_organization_id_idx").on(user.organizationId),
  activeWorkspaceIdIdx: index("users_active_workspace_id_idx").on(user.activeWorkspaceId),
}));

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("member"),
    ...timestamps,
  },
  (membership) => ({
    organizationUserUnique: uniqueIndex("organization_memberships_org_user_unique").on(
      membership.organizationId,
      membership.userId,
    ),
    organizationIdIdx: index("organization_memberships_organization_id_idx").on(
      membership.organizationId,
    ),
    userIdIdx: index("organization_memberships_user_id_idx").on(membership.userId),
  }),
);

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("member"),
    ...timestamps,
  },
  (membership) => ({
    workspaceUserUnique: uniqueIndex("workspace_memberships_workspace_user_unique").on(
      membership.workspaceId,
      membership.userId,
    ),
    workspaceIdIdx: index("workspace_memberships_workspace_id_idx").on(membership.workspaceId),
    userIdIdx: index("workspace_memberships_user_id_idx").on(membership.userId),
  }),
);

export const workspaceInvitations = pgTable(
  "workspace_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    email: varchar("email", { length: 255 }).notNull(),
    role: roleEnum("role").notNull().default("member"),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (invitation) => ({
    tokenHashUnique: uniqueIndex("workspace_invitations_token_hash_unique").on(
      invitation.tokenHash,
    ),
    workspaceEmailStatusIdx: index("workspace_invitations_workspace_email_status_idx").on(
      invitation.workspaceId,
      invitation.email,
      invitation.status,
    ),
    invitedByUserIdIdx: index("workspace_invitations_invited_by_user_id_idx").on(
      invitation.invitedByUserId,
    ),
  }),
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: varchar("sessionToken", { length: 255 }).notNull().primaryKey(),
  userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 40 }),
  company: varchar("company", { length: 160 }),
  source: varchar("source", { length: 100 }).notNull(),
  status: leadStatusEnum("status").notNull().default("new"),
  score: integer("score").notNull().default(0),
  rejectionReason: text("rejection_reason"),
  metadata: jsonb("metadata").notNull().default({}),
  ...timestamps,
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  name: varchar("name", { length: 160 }).notNull(),
  stage: campaignStageEnum("stage").notNull().default("draft"),
  approved: boolean("approved").notNull().default(false),
  channel: varchar("channel", { length: 40 }).notNull().default("email"),
  firstActionCompleted: boolean("first_action_completed").notNull().default(false),
  nextActionAt: varchar("next_action_at", { length: 160 }).notNull().default("Awaiting approval"),
  leadsEnrolled: integer("leads_enrolled").notNull().default(0),
  ...timestamps,
});

export const callTasks = pgTable(
  "call_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
    leadId: uuid("lead_id").notNull().references(() => leads.id),
    status: taskStatusEnum("status").notNull().default("queued"),
    provider: varchar("provider", { length: 80 }),
    providerCallId: varchar("provider_call_id", { length: 160 }),
    summary: text("summary"),
    transcript: text("transcript"),
    disposition: varchar("disposition", { length: 80 }),
    reviewRequired: boolean("review_required").notNull().default(false),
    ...timestamps,
  },
  (callTask) => ({
    providerCallIdUnique: uniqueIndex("call_tasks_provider_call_id_unique").on(
      callTask.providerCallId,
    ),
  }),
);

export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  status: meetingStatusEnum("status").notNull().default("pending"),
  bookingSource: varchar("booking_source", { length: 80 }),
  owner: varchar("owner", { length: 120 }),
  notes: text("notes"),
  outcome: varchar("outcome", { length: 80 }),
  dealValueCents: integer("deal_value_cents").notNull().default(0),
  dealCurrency: varchar("deal_currency", { length: 3 }).notNull().default("USD"),
  ...timestamps,
});

export const onboardingSessions = pgTable("onboarding_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  status: onboardingStatusEnum("status").notNull().default("draft"),
  currentStep: varchar("current_step", { length: 80 }).notNull().default("start"),
  transcript: jsonb("transcript").notNull().default([]),
  extractedProfile: jsonb("extracted_profile"),
  scraperBrief: text("scraper_brief"),
  outreachBrief: text("outreach_brief"),
  ...timestamps,
});

export const contactIntakeSubmissions = pgTable(
  "contact_intake_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    intent: varchar("intent", { length: 60 }).notNull().default("sales_assessment"),
    status: varchar("status", { length: 40 }).notNull().default("new"),
    priority: varchar("priority", { length: 20 }).notNull().default("medium"),
    qualificationScore: integer("qualification_score").notNull().default(0),
    routingRecommendation: text("routing_recommendation").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    companyName: varchar("company_name", { length: 160 }).notNull(),
    website: varchar("website", { length: 255 }).notNull().default(""),
    role: varchar("role", { length: 120 }).notNull().default(""),
    teamSize: varchar("team_size", { length: 80 }).notNull().default(""),
    monthlyLeadGoal: integer("monthly_lead_goal").notNull().default(0),
    budgetRange: varchar("budget_range", { length: 40 }).notNull().default("not_sure"),
    timeline: varchar("timeline", { length: 40 }).notNull().default("exploring"),
    goals: jsonb("goals").notNull().default([]),
    channels: jsonb("channels").notNull().default([]),
    message: text("message").notNull(),
    sourcePath: varchar("source_path", { length: 255 }).notNull().default("/contact"),
    referrer: text("referrer").notNull().default(""),
    utm: jsonb("utm").notNull().default({}),
    metadata: jsonb("metadata").notNull().default({}),
    ...timestamps,
  },
  (submission) => ({
    statusPriorityIdx: index("contact_intake_status_priority_idx").on(
      submission.status,
      submission.priority,
    ),
    emailIdx: index("contact_intake_email_idx").on(submission.email),
    createdAtIdx: index("contact_intake_created_at_idx").on(submission.createdAt),
  }),
);

export const salesBlueprints = pgTable(
  "sales_blueprints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    status: varchar("status", { length: 40 }).notNull().default("draft"),
    businessProfile: jsonb("business_profile").notNull().default({}),
    icpSummary: text("icp_summary").notNull().default(""),
    buyerRoles: jsonb("buyer_roles").notNull().default([]),
    painPoints: jsonb("pain_points").notNull().default([]),
    disqualifiers: jsonb("disqualifiers").notNull().default([]),
    qualificationRules: jsonb("qualification_rules").notNull().default([]),
    sourceChannels: jsonb("source_channels").notNull().default([]),
    outreachChannels: jsonb("outreach_channels").notNull().default([]),
    searchKeywords: jsonb("search_keywords").notNull().default([]),
    monthlyLeadTarget: integer("monthly_lead_target").notNull().default(100),
    meetingTarget: integer("meeting_target").notNull().default(10),
    averageContractValue: integer("average_contract_value").notNull().default(0),
    automationMode: varchar("automation_mode", { length: 40 }).notNull().default("approval_gated"),
    approvalRequiredFor: jsonb("approval_required_for").notNull().default([
      "first outreach",
      "phone calls",
      "new channels",
    ]),
    complianceNotes: text("compliance_notes").notNull().default(""),
    readinessScore: integer("readiness_score").notNull().default(0),
    readinessGaps: jsonb("readiness_gaps").notNull().default([]),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (blueprint) => ({
    workspaceUnique: uniqueIndex("sales_blueprints_workspace_unique").on(
      blueprint.workspaceId,
    ),
    workspaceStatusIdx: index("sales_blueprints_workspace_status_idx").on(
      blueprint.workspaceId,
      blueprint.status,
    ),
  }),
);

export const actionProposals = pgTable(
  "action_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    type: varchar("type", { length: 80 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("pending"),
    riskLevel: varchar("risk_level", { length: 40 }).notNull().default("medium"),
    title: varchar("title", { length: 180 }).notNull(),
    detail: text("detail").notNull(),
    proposedBy: varchar("proposed_by", { length: 40 }).notNull().default("system"),
    targetKind: varchar("target_kind", { length: 80 }).notNull(),
    targetId: varchar("target_id", { length: 160 }),
    targetLabel: varchar("target_label", { length: 180 }).notNull(),
    payloadSummary: text("payload_summary").notNull(),
    payload: jsonb("payload").notNull().default({}),
    guardrails: jsonb("guardrails").notNull().default([]),
    expectedEffect: text("expected_effect").notNull(),
    rollbackPlan: text("rollback_plan").notNull(),
    requiredRole: roleEnum("required_role").notNull().default("admin"),
    requestedBy: varchar("requested_by", { length: 160 }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedByName: varchar("reviewed_by_name", { length: 160 }),
    reviewNote: text("review_note"),
    auditEventId: uuid("audit_event_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (proposal) => ({
    workspaceStatusIdx: index("action_proposals_workspace_status_idx").on(
      proposal.workspaceId,
      proposal.status,
    ),
    workspaceRiskIdx: index("action_proposals_workspace_risk_idx").on(
      proposal.workspaceId,
      proposal.riskLevel,
    ),
    targetIdx: index("action_proposals_target_idx").on(
      proposal.workspaceId,
      proposal.targetKind,
      proposal.targetId,
    ),
  }),
);

export const aiWorkers = pgTable(
  "ai_workers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 160 }).notNull(),
    role: varchar("role", { length: 120 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("active"),
    riskLevel: varchar("risk_level", { length: 40 }).notNull().default("medium"),
    ownerRole: roleEnum("owner_role").notNull().default("admin"),
    description: text("description").notNull(),
    permissions: jsonb("permissions").notNull().default([]),
    allowedTools: jsonb("allowed_tools").notNull().default([]),
    blockedTools: jsonb("blocked_tools").notNull().default([]),
    monthlyBudgetCents: integer("monthly_budget_cents").notNull().default(0),
    budgetUsedCents: integer("budget_used_cents").notNull().default(0),
    lastActionAt: timestamp("last_action_at", { withTimezone: true, mode: "date" }),
    guardrails: jsonb("guardrails").notNull().default([]),
    ...timestamps,
  },
  (worker) => ({
    workspaceStatusIdx: index("ai_workers_workspace_status_idx").on(
      worker.workspaceId,
      worker.status,
    ),
    workspaceRiskIdx: index("ai_workers_workspace_risk_idx").on(
      worker.workspaceId,
      worker.riskLevel,
    ),
  }),
);

export const aiWorkerRuns = pgTable(
  "ai_worker_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    workerId: uuid("worker_id").notNull().references(() => aiWorkers.id, {
      onDelete: "cascade",
    }),
    status: varchar("status", { length: 40 }).notNull().default("proposed"),
    title: varchar("title", { length: 180 }).notNull(),
    detail: text("detail").notNull(),
    riskLevel: varchar("risk_level", { length: 40 }).notNull().default("medium"),
    proposedAction: text("proposed_action").notNull(),
    expectedCostCents: integer("expected_cost_cents").notNull().default(0),
    actualCostCents: integer("actual_cost_cents").notNull().default(0),
    approvalProposalId: uuid("approval_proposal_id").references(() => actionProposals.id, {
      onDelete: "set null",
    }),
    resultSummary: text("result_summary"),
    blockedReason: text("blocked_reason"),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (run) => ({
    workspaceStatusIdx: index("ai_worker_runs_workspace_status_idx").on(
      run.workspaceId,
      run.status,
    ),
    workerStatusIdx: index("ai_worker_runs_worker_status_idx").on(
      run.workerId,
      run.status,
    ),
    approvalProposalIdx: index("ai_worker_runs_approval_proposal_idx").on(
      run.approvalProposalId,
    ),
  }),
);

export const sourcePlans = pgTable("source_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  summary: text("summary").notNull(),
  sources: jsonb("sources").notNull().default([]),
  contactTargets: jsonb("contact_targets").notNull().default([]),
  searchTerms: jsonb("search_terms").notNull().default([]),
  rationale: text("rationale").notNull(),
  ...timestamps,
});

export const sourceRuns = pgTable("source_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  source: varchar("source", { length: 80 }).notNull(),
  status: sourceStatusEnum("status").notNull().default("planned"),
  providerMode: varchar("provider_mode", { length: 40 }).notNull().default("mock"),
  candidatesFound: integer("candidates_found").notNull().default(0),
  dedupedCount: integer("deduped_count").notNull().default(0),
  qualifiedCount: integer("qualified_count").notNull().default(0),
  rejectedCount: integer("rejected_count").notNull().default(0),
  qualityScore: integer("quality_score").notNull().default(0),
  evidence: jsonb("evidence").notNull().default([]),
  rejectionReasons: jsonb("rejection_reasons").notNull().default([]),
  complianceChecks: jsonb("compliance_checks").notNull().default([]),
  freshness: varchar("freshness", { length: 160 }).notNull().default("Not recorded"),
  nextAction: varchar("next_action", { length: 180 }).notNull().default("Review source evidence before outreach."),
  summary: text("summary").notNull(),
  ...timestamps,
});

export const outreachActivities = pgTable(
  "outreach_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
    leadId: uuid("lead_id").notNull().references(() => leads.id),
    type: varchar("type", { length: 40 }).notNull(),
    provider: varchar("provider", { length: 80 }),
    providerMessageId: varchar("provider_message_id", { length: 160 }),
    status: activityStatusEnum("status").notNull().default("draft"),
    subject: varchar("subject", { length: 160 }).notNull(),
    preview: text("preview").notNull(),
    personalizedFor: varchar("personalized_for", { length: 160 }).notNull(),
    ...timestamps,
  },
  (activity) => ({
    providerMessageIdUnique: uniqueIndex("outreach_activities_provider_message_id_unique").on(
      activity.providerMessageId,
    ),
  }),
);

export const contactSuppressions = pgTable(
  "contact_suppressions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    channel: varchar("channel", { length: 40 }).notNull(),
    contactValue: varchar("contact_value", { length: 255 }).notNull(),
    normalizedContactValue: varchar("normalized_contact_value", { length: 255 }).notNull(),
    reason: varchar("reason", { length: 80 }).notNull().default("manual"),
    source: varchar("source", { length: 120 }).notNull().default("manual"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (suppression) => ({
    workspaceChannelContactUnique: uniqueIndex(
      "contact_suppressions_workspace_channel_contact_unique",
    ).on(
      suppression.workspaceId,
      suppression.channel,
      suppression.normalizedContactValue,
    ),
    workspaceChannelIdx: index("contact_suppressions_workspace_channel_idx").on(
      suppression.workspaceId,
      suppression.channel,
    ),
  }),
);

export const telegramIntegrations = pgTable(
  "telegram_integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    botUsername: varchar("bot_username", { length: 120 }),
    chatIdHash: varchar("chat_id_hash", { length: 128 }).notNull(),
    chatIdMask: varchar("chat_id_mask", { length: 80 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("pending_verification"),
    allowedCommands: jsonb("allowed_commands")
      .$type<string[]>()
      .notNull()
      .default([
        "status",
        "brief",
        "approvals",
        "providers",
        "suppressions",
        "sequence",
        "forecast",
        "help",
        "pause",
      ]),
    lastUpdateId: integer("last_update_id"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (integration) => ({
    workspaceUnique: uniqueIndex("telegram_integrations_workspace_unique").on(
      integration.workspaceId,
    ),
    chatIdHashUnique: uniqueIndex("telegram_integrations_chat_id_hash_unique").on(
      integration.chatIdHash,
    ),
    chatIdHashIdx: index("telegram_integrations_chat_id_hash_idx").on(
      integration.chatIdHash,
    ),
    workspaceStatusIdx: index("telegram_integrations_workspace_status_idx").on(
      integration.workspaceId,
      integration.status,
    ),
  }),
);

export const telegramNotificationDeliveries = pgTable(
  "telegram_notification_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    integrationId: uuid("integration_id").references(() => telegramIntegrations.id, {
      onDelete: "set null",
    }),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    notificationType: varchar("notification_type", { length: 80 }).notNull(),
    mode: varchar("mode", { length: 40 }).notNull().default("claimed"),
    provider: varchar("provider", { length: 40 }).notNull().default("telegram"),
    chatIdMask: varchar("chat_id_mask", { length: 80 }),
    dryRun: boolean("dry_run").notNull().default(false),
    targetChatConfigured: boolean("target_chat_configured").notNull().default(false),
    targetChatMatchesWorkspace: boolean("target_chat_matches_workspace").notNull().default(false),
    rateLimitLimit: integer("rate_limit_limit").notNull(),
    rateLimitWindowSeconds: integer("rate_limit_window_seconds").notNull().default(3600),
    messagePreview: text("message_preview"),
    detail: text("detail"),
    metadata: jsonb("metadata").notNull().default({}),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (delivery) => ({
    workspaceCreatedAtIdx: index("telegram_notification_deliveries_workspace_created_at_idx").on(
      delivery.workspaceId,
      delivery.createdAt,
    ),
    workspaceTypeCreatedAtIdx: index("telegram_notification_deliveries_workspace_type_created_at_idx").on(
      delivery.workspaceId,
      delivery.notificationType,
      delivery.createdAt,
    ),
    workspaceModeCreatedAtIdx: index("telegram_notification_deliveries_workspace_mode_created_at_idx").on(
      delivery.workspaceId,
      delivery.mode,
      delivery.createdAt,
    ),
  }),
);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  planKey: varchar("plan_key", { length: 80 }).notNull(),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  cancellationRequestedAt: timestamp("cancellation_requested_at", {
    withTimezone: true,
    mode: "date",
  }),
  canceledAt: timestamp("canceled_at", { withTimezone: true, mode: "date" }),
  usageLimit: integer("usage_limit").notNull().default(500),
  seats: integer("seats").notNull().default(3),
  stripeCustomerId: varchar("stripe_customer_id", { length: 120 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 120 }),
  razorpayCustomerId: varchar("razorpay_customer_id", { length: 120 }),
  razorpaySubscriptionId: varchar("razorpay_subscription_id", { length: 120 }),
  ...timestamps,
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 10 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    providerPaymentId: varchar("provider_payment_id", { length: 255 }),
    receiptUrl: text("receipt_url"),
    ...timestamps,
  },
  (payment) => ({
    providerPaymentIdUnique: uniqueIndex("payments_provider_payment_id_unique").on(
      payment.provider,
      payment.providerPaymentId,
    ),
  }),
);

export const usageEvents = pgTable("usage_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  metric: varchar("metric", { length: 80 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  actorType: varchar("actor_type", { length: 40 }).notNull(),
  actorId: uuid("actor_id"),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
