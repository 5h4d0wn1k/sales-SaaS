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
export const activityStatusSchema = z.enum(["draft", "queued", "sent", "completed", "review_required"]);
export const meetingStatusSchema = z.enum(["pending", "scheduled", "completed", "canceled"]);
export const callStatusSchema = z.enum(["queued", "in_progress", "completed", "review_required"]);
export const urgencySchema = z.enum(["high", "medium", "low"]);

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

export const sourceRunSchema = z.object({
  id: z.string(),
  source: z.string(),
  status: sourceStatusSchema,
  candidatesFound: z.number().int().min(0),
  qualifiedCount: z.number().int().min(0),
  rejectedCount: z.number().int().min(0),
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
});

export const subscriptionRecordSchema = z.object({
  planKey: z.string(),
  status: subscriptionStatusSchema,
  seats: z.number().int().min(1),
  usageLimit: z.number().int().positive(),
  monthlyUsage: z.number().int().min(0),
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

export const approveCampaignInputSchema = z.object({
  approvedBy: z.string().min(2),
});

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

export const runCampaignInputSchema = z.object({
  approvedBy: z.string().min(2),
});

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
});

export const providerHealthSchema = z.object({
  provider: z.string(),
  kind: z.enum(["lead-source", "outreach", "voice"]),
  mode: z.enum(["mock", "configured", "disabled"]),
  channels: z.array(z.string()),
  detail: z.string(),
});

export const providerSummarySchema = z.object({
  sources: z.array(providerHealthSchema),
  outreach: z.array(providerHealthSchema),
  voice: z.array(providerHealthSchema),
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

export const dispatchCampaignInputSchema = z.object({
  approvedBy: z.string().min(2),
});

export const dispatchCampaignResponseSchema = z.object({
  campaign: campaignRecordSchema,
  activity: outreachActivitySchema.nullable(),
  provider: z.string(),
  mode: z.enum(["mock", "configured"]),
  externalId: z.string().nullable(),
  deliveryStatus: z.enum(["queued", "sent", "review_required"]),
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

export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export type OnboardingMessage = z.infer<typeof onboardingMessageSchema>;
export type OnboardingSession = z.infer<typeof onboardingSessionSchema>;
export type LeadRecord = z.infer<typeof leadRecordSchema>;
export type SourcePlan = z.infer<typeof sourcePlanSchema>;
export type SourceRun = z.infer<typeof sourceRunSchema>;
export type OutreachActivity = z.infer<typeof outreachActivitySchema>;
export type CampaignRecord = z.infer<typeof campaignRecordSchema>;
export type CallRecord = z.infer<typeof callRecordSchema>;
export type MeetingRecord = z.infer<typeof meetingRecordSchema>;
export type SubscriptionRecord = z.infer<typeof subscriptionRecordSchema>;
export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;
export type DashboardMetric = z.infer<typeof dashboardMetricSchema>;
export type ActionItem = z.infer<typeof actionItemSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;
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
export type ProviderSummary = z.infer<typeof providerSummarySchema>;
export type DiscoverLeadsInput = z.infer<typeof discoverLeadsInputSchema>;
export type DiscoverLeadsResponse = z.infer<typeof discoverLeadsResponseSchema>;
export type DispatchCampaignInput = z.infer<typeof dispatchCampaignInputSchema>;
export type DispatchCampaignResponse = z.infer<typeof dispatchCampaignResponseSchema>;
export type DispatchCallInput = z.infer<typeof dispatchCallInputSchema>;
export type DispatchCallResponse = z.infer<typeof dispatchCallResponseSchema>;
export type ProviderEvent = z.infer<typeof providerEventSchema>;
