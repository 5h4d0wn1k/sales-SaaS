import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  primaryKey,
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

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  region: varchar("region", { length: 48 }).notNull().default("global"),
  ...timestamps,
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 160 }).notNull(),
  industry: varchar("industry", { length: 120 }),
  ...timestamps,
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
  image: text("image"),
  displayName: varchar("display_name", { length: 160 }),
  role: roleEnum("role").notNull().default("member"),
  passwordHash: text("password_hash"),
  ...timestamps,
});

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

export const callTasks = pgTable("call_tasks", {
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
});

export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  status: meetingStatusEnum("status").notNull().default("pending"),
  bookingSource: varchar("booking_source", { length: 80 }),
  owner: varchar("owner", { length: 120 }),
  notes: text("notes"),
  outcome: varchar("outcome", { length: 80 }),
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
  candidatesFound: integer("candidates_found").notNull().default(0),
  qualifiedCount: integer("qualified_count").notNull().default(0),
  rejectedCount: integer("rejected_count").notNull().default(0),
  summary: text("summary").notNull(),
  ...timestamps,
});

export const outreachActivities = pgTable("outreach_activities", {
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
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  planKey: varchar("plan_key", { length: 80 }).notNull(),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  usageLimit: integer("usage_limit").notNull().default(500),
  seats: integer("seats").notNull().default(3),
  stripeCustomerId: varchar("stripe_customer_id", { length: 120 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 120 }),
  razorpayCustomerId: varchar("razorpay_customer_id", { length: 120 }),
  razorpaySubscriptionId: varchar("razorpay_subscription_id", { length: 120 }),
  ...timestamps,
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  providerPaymentId: varchar("provider_payment_id", { length: 255 }),
  receiptUrl: text("receipt_url"),
  ...timestamps,
});

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
