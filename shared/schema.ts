export * from "./models/auth";
export * from "./models/chat";

import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  title: text("title"),
  source: text("source").default("manual"),
  status: text("status").default("new"),
  score: integer("score").default(0),
  tags: text("tags").array(),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  leadId: integer("lead_id").references(() => leads.id),
  clientId: integer("client_id").references(() => clients.id),
  title: text("title").notNull(),
  value: integer("value").default(0),
  stage: text("stage").default("prospecting"),
  probability: integer("probability").default(0),
  expectedCloseDate: timestamp("expected_close_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company").notNull(),
  industry: text("industry"),
  website: text("website"),
  address: text("address"),
  status: text("status").default("active"),
  tier: text("tier").default("standard"),
  healthScore: integer("health_score").default(100),
  lifetimeValue: integer("lifetime_value").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").default("email"),
  status: text("status").default("draft"),
  subject: text("subject"),
  content: text("content"),
  templateId: integer("template_id"),
  targetAudience: text("target_audience"),
  sentCount: integer("sent_count").default(0),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  replyCount: integer("reply_count").default(0),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerSuccess = pgTable("customer_success", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("pending"),
  priority: text("priority").default("medium"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  tier: text("tier").default("free"),
  status: text("status").default("active"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agenticTasks = pgTable("agentic_tasks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("pending"),
  config: jsonb("config"),
  result: jsonb("result"),
  progress: integer("progress").default(0),
  isActive: boolean("is_active").default(true),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: timestamp("date").notNull(),
  metric: text("metric").notNull(),
  value: integer("value").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const businessProfiles = pgTable("business_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  businessName: text("business_name").notNull(),
  industry: text("industry").notNull(),
  businessType: text("business_type").notNull(),
  targetMarket: text("target_market"),
  companySize: text("company_size"),
  website: text("website"),
  description: text("description"),
  idealCustomer: text("ideal_customer"),
  valueProposition: text("value_proposition"),
  competitors: text("competitors").array(),
  isOnboarded: boolean("is_onboarded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailSequences = pgTable("email_sequences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("draft"),
  triggerType: text("trigger_type").default("manual"),
  steps: jsonb("steps"),
  enrolledCount: integer("enrolled_count").default(0),
  completedCount: integer("completed_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sequenceEnrollments = pgTable("sequence_enrollments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  sequenceId: integer("sequence_id").references(() => emailSequences.id, { onDelete: "cascade" }).notNull(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }).notNull(),
  currentStep: integer("current_step").default(0),
  status: text("status").default("active"),
  nextSendAt: timestamp("next_send_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiGeneratedContent = pgTable("ai_generated_content", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  leadId: integer("lead_id").references(() => leads.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export const insertOpportunitySchema = createInsertSchema(opportunities).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, createdAt: true });
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true });
export const insertCustomerSuccessSchema = createInsertSchema(customerSuccess).omit({ id: true, createdAt: true, completedAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, updatedAt: true });
export const insertAgenticTaskSchema = createInsertSchema(agenticTasks).omit({ id: true, createdAt: true, status: true, result: true, progress: true, lastRunAt: true });
export const insertAnalyticsSchema = createInsertSchema(analytics).omit({ id: true, createdAt: true });
export const insertLeadActivitySchema = createInsertSchema(leadActivities).omit({ id: true, userId: true, createdAt: true });
export const insertBusinessProfileSchema = createInsertSchema(businessProfiles).omit({ id: true, userId: true, createdAt: true, isOnboarded: true });
export const insertEmailSequenceSchema = createInsertSchema(emailSequences).omit({ id: true, createdAt: true, enrolledCount: true, completedCount: true });
export const insertSequenceEnrollmentSchema = createInsertSchema(sequenceEnrollments).omit({ id: true, userId: true, createdAt: true, completedAt: true });
export const insertAiGeneratedContentSchema = createInsertSchema(aiGeneratedContent).omit({ id: true, userId: true, createdAt: true });

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type CustomerSuccessTask = typeof customerSuccess.$inferSelect;
export type InsertCustomerSuccessTask = z.infer<typeof insertCustomerSuccessSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type AgenticTask = typeof agenticTasks.$inferSelect;
export type InsertAgenticTask = z.infer<typeof insertAgenticTaskSchema>;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = z.infer<typeof insertLeadActivitySchema>;
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = z.infer<typeof insertBusinessProfileSchema>;
export type EmailSequence = typeof emailSequences.$inferSelect;
export type InsertEmailSequence = z.infer<typeof insertEmailSequenceSchema>;
export type SequenceEnrollment = typeof sequenceEnrollments.$inferSelect;
export type InsertSequenceEnrollment = z.infer<typeof insertSequenceEnrollmentSchema>;
export type AiGeneratedContent = typeof aiGeneratedContent.$inferSelect;
export type InsertAiGeneratedContent = z.infer<typeof insertAiGeneratedContentSchema>;

export const geneticTasks = agenticTasks;
export type GeneticTask = AgenticTask;
export type InsertGeneticTask = InsertAgenticTask;
export const insertGeneticTaskSchema = insertAgenticTaskSchema;

export const emailTracking = pgTable("email_tracking", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  leadId: integer("lead_id").references(() => leads.id),
  emailId: text("email_id").notNull(),
  subject: text("subject").notNull(),
  recipient: text("recipient").notNull(),
  status: text("status").default("sent"),
  sentAt: timestamp("sent_at").defaultNow(),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  repliedAt: timestamp("replied_at"),
  bouncedAt: timestamp("bounced_at"),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  metadata: jsonb("metadata"),
});

export const scheduledOutreach = pgTable("scheduled_outreach", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  channel: text("channel").notNull(),
  type: text("type").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  executedAt: timestamp("executed_at"),
  status: text("status").default("scheduled"),
  result: jsonb("result"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const meetingSchedules = pgTable("meeting_schedules", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  leadId: integer("lead_id").references(() => leads.id),
  clientId: integer("client_id").references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  meetingType: text("meeting_type").default("call"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(30),
  status: text("status").default("scheduled"),
  meetingLink: text("meeting_link"),
  notes: text("notes"),
  aiInsights: jsonb("ai_insights"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesCoaching = pgTable("sales_coaching", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  leadId: integer("lead_id").references(() => leads.id),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  sessionType: text("session_type").notNull(),
  transcript: text("transcript"),
  summary: text("summary"),
  insights: jsonb("insights"),
  coachingPoints: jsonb("coaching_points"),
  sentimentScore: integer("sentiment_score"),
  winProbability: integer("win_probability"),
  nextBestActions: jsonb("next_best_actions"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const automationRules = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  trigger: text("trigger").notNull(),
  conditions: jsonb("conditions"),
  actions: jsonb("actions"),
  isActive: boolean("is_active").default(true),
  executionCount: integer("execution_count").default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pipelineForecasts = pgTable("pipeline_forecasts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  forecastDate: timestamp("forecast_date").notNull(),
  expectedRevenue: integer("expected_revenue").default(0),
  bestCaseRevenue: integer("best_case_revenue").default(0),
  worstCaseRevenue: integer("worst_case_revenue").default(0),
  aiConfidence: integer("ai_confidence").default(0),
  factors: jsonb("factors"),
  recommendations: jsonb("recommendations"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailTrackingSchema = createInsertSchema(emailTracking).omit({ id: true, userId: true, sentAt: true, openedAt: true, clickedAt: true, repliedAt: true, bouncedAt: true, openCount: true, clickCount: true });
export const insertScheduledOutreachSchema = createInsertSchema(scheduledOutreach).omit({ id: true, userId: true, createdAt: true, executedAt: true, result: true });
export const insertMeetingScheduleSchema = createInsertSchema(meetingSchedules).omit({ id: true, userId: true, createdAt: true });
export const insertSalesCoachingSchema = createInsertSchema(salesCoaching).omit({ id: true, userId: true, createdAt: true });
export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({ id: true, userId: true, createdAt: true, executionCount: true, lastExecutedAt: true });
export const insertPipelineForecastSchema = createInsertSchema(pipelineForecasts).omit({ id: true, userId: true, createdAt: true });

export type EmailTracking = typeof emailTracking.$inferSelect;
export type InsertEmailTracking = z.infer<typeof insertEmailTrackingSchema>;
export type ScheduledOutreach = typeof scheduledOutreach.$inferSelect;
export type InsertScheduledOutreach = z.infer<typeof insertScheduledOutreachSchema>;
export type MeetingSchedule = typeof meetingSchedules.$inferSelect;
export type InsertMeetingSchedule = z.infer<typeof insertMeetingScheduleSchema>;
export type SalesCoaching = typeof salesCoaching.$inferSelect;
export type InsertSalesCoaching = z.infer<typeof insertSalesCoachingSchema>;
export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type PipelineForecast = typeof pipelineForecasts.$inferSelect;
export type InsertPipelineForecast = z.infer<typeof insertPipelineForecastSchema>;
