import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  organizations,
  workspaces,
  subscriptions,
  leads,
  campaigns,
  meetings,
  onboardingSessions,
  sourcePlans,
  sourceRuns,
  outreachActivities,
  callTasks,
  auditEvents,
} from "@sales/database";
import type {
  DashboardResponse,
  CreateCallInput,
  CreateCampaignInput,
  CreateLeadInput,
  CreateMeetingInput,
  OnboardingMessageInput,
  OnboardingSessionInput,
  ProviderEvent,
  UpdateMeetingInput,
} from "@sales/shared";
import { buildSourcePlan, DemoStore, inferProfile, personalizedPreview } from "./demo-store";
import { hasOrganizationsTable } from "./storage-readiness";
import {
  findUniqueResendWebhookTarget,
  findUniqueTwilioWebhookTarget,
} from "./provider-event-targets";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface SalesStorage {
  mode: "memory" | "postgres";
  getDashboard(): Promise<DashboardResponse>;
  getLeads(): Promise<ReturnType<DemoStore["getLeads"]>>;
  getLead(id: string): Promise<ReturnType<DemoStore["getLead"]>>;
  createOnboardingSession(input: OnboardingSessionInput): Promise<ReturnType<DemoStore["createOnboardingSession"]>>;
  appendOnboardingMessage(
    id: string,
    input: OnboardingMessageInput,
  ): Promise<ReturnType<DemoStore["appendOnboardingMessage"]>>;
  finalizeOnboarding(id: string): Promise<ReturnType<DemoStore["finalizeOnboarding"]>>;
  getBusinessProfile(): Promise<ReturnType<DemoStore["getBusinessProfile"]>>;
  getSourcePlan(): Promise<ReturnType<DemoStore["getSourcePlan"]>>;
  runLeadSource(source: string): Promise<ReturnType<DemoStore["runLeadSource"]>>;
  createLead(input: CreateLeadInput): Promise<ReturnType<DemoStore["createLead"]>>;
  getCampaigns(): Promise<ReturnType<DemoStore["getCampaigns"]>>;
  getCampaign(id: string): Promise<ReturnType<DemoStore["getCampaign"]>>;
  createCampaign(input: CreateCampaignInput): Promise<ReturnType<DemoStore["createCampaign"]>>;
  approveCampaign(id: string, approvedBy: string): Promise<ReturnType<DemoStore["approveCampaign"]>>;
  runCampaign(id: string, approvedBy: string): Promise<ReturnType<DemoStore["runCampaign"]>>;
  getCampaignActivity(id: string): Promise<ReturnType<DemoStore["getCampaignActivity"]>>;
  createCall(input: CreateCallInput): Promise<ReturnType<DemoStore["createCall"]>>;
  getCall(id: string): Promise<ReturnType<DemoStore["getCall"]>>;
  reviewCall(id: string, approved: boolean, notes: string): Promise<ReturnType<DemoStore["reviewCall"]>>;
  createMeeting(input: CreateMeetingInput): Promise<ReturnType<DemoStore["createMeeting"]>>;
  updateMeeting(id: string, input: UpdateMeetingInput): Promise<ReturnType<DemoStore["updateMeeting"]>>;
  updateOutreachProviderResult(
    activityId: string,
    update: {
      provider: string;
      providerMessageId: string | null;
      status: "queued" | "sent" | "review_required";
      detail: string;
    },
  ): Promise<DashboardResponse["activities"][number] | null>;
  updateCallProviderResult(
    callId: string,
    update: {
      provider: string;
      providerCallId: string | null;
      detail: string;
    },
  ): Promise<DashboardResponse["calls"][number] | null>;
   applyProviderEvent(event: {
     provider: string;
     eventType: string;
     payload: unknown;
   }): Promise<{ kind: "activity" | "call"; id: string } | null>;
   recordProviderEvent(event: Omit<ProviderEvent, "id" | "receivedAt"> & { payload: unknown }): Promise<ProviderEvent>;
   audit(event: {
     organizationId: string | null;
     actorType: string;
     actorId?: string;
     eventType: string;
     payload: Record<string, unknown>;
   }): Promise<void>;
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

  async getDashboard() { return this.store.getDashboard(); }
  async getLeads() { return this.store.getLeads(); }
  async getLead(id: string) { return this.store.getLead(id); }
  async createOnboardingSession(input: OnboardingSessionInput) { return this.store.createOnboardingSession(input); }
  async appendOnboardingMessage(id: string, input: OnboardingMessageInput) { return this.store.appendOnboardingMessage(id, input); }
  async finalizeOnboarding(id: string) { return this.store.finalizeOnboarding(id); }
  async getBusinessProfile() { return this.store.getBusinessProfile(); }
  async getSourcePlan() { return this.store.getSourcePlan(); }
  async runLeadSource(source: string) { return this.store.runLeadSource(source); }
  async createLead(input: CreateLeadInput) { return this.store.createLead(input); }
  async getCampaigns() { return this.store.getCampaigns(); }
  async getCampaign(id: string) { return this.store.getCampaign(id); }
  async createCampaign(input: CreateCampaignInput) { return this.store.createCampaign(input); }
  async approveCampaign(id: string, approvedBy: string) { return this.store.approveCampaign(id, approvedBy); }
  async runCampaign(id: string, approvedBy: string) { return this.store.runCampaign(id, approvedBy); }
  async getCampaignActivity(id: string) { return this.store.getCampaignActivity(id); }
  async createCall(input: CreateCallInput) { return this.store.createCall(input); }
  async getCall(id: string) { return this.store.getCall(id); }
  async reviewCall(id: string, approved: boolean, notes: string) { return this.store.reviewCall(id, approved, notes); }
  async createMeeting(input: CreateMeetingInput) { return this.store.createMeeting(input); }
  async updateMeeting(id: string, input: UpdateMeetingInput) { return this.store.updateMeeting(id, input); }
  async updateOutreachProviderResult(
    activityId: string,
    update: {
      provider: string;
      providerMessageId: string | null;
      status: "queued" | "sent" | "review_required";
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
      detail: string;
    },
  ) {
    return this.store.updateCallProviderResult(callId, update);
  }
  async applyProviderEvent() { return null; }
   async recordProviderEvent(event: Omit<ProviderEvent, "id" | "receivedAt"> & { payload: unknown }) {
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
          industry: dashboard.onboarding.extractedProfile?.industry ?? "B2B SaaS",
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

      await db.insert(sourceRuns).values(
        dashboard.sourceRuns.map((run) => ({
          workspaceId: workspace.id,
          source: run.source,
          status: run.status,
          candidatesFound: run.candidatesFound,
          qualifiedCount: run.qualifiedCount,
          rejectedCount: run.rejectedCount,
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

      const leadIdByName = new Map(leadRows.map((lead) => [lead.fullName, lead.id]));

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

      const campaignIdByName = new Map(campaignRows.map((campaign) => [campaign.name, campaign.id]));

      await db.insert(outreachActivities).values(
        dashboard.activities
          .map((activity) => {
            const lead = dashboard.leads.find((entry) => entry.id === activity.leadId);
            const campaign = dashboard.campaigns.find((entry) => entry.id === activity.campaignId);
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
          .filter((value): value is NonNullable<typeof value> => value !== null),
      );

      await db.insert(callTasks).values(
        dashboard.calls
          .map((call) => {
            const lead = dashboard.leads.find((entry) => entry.id === call.leadId);
            if (!lead) {
              return null;
            }

            return {
              campaignId: campaignRows[0]!.id,
              leadId: leadIdByName.get(lead.fullName)!,
              status: (call.reviewRequired ? "blocked" : "completed") as "blocked" | "completed",
              provider: call.provider,
              summary: call.summary,
              transcript: call.transcript,
              disposition: call.disposition,
              reviewRequired: call.reviewRequired,
            };
          })
          .filter((value): value is NonNullable<typeof value> => value !== null),
      );

      await db.insert(meetings).values(
        dashboard.meetings
          .map((meeting) => {
            const lead = dashboard.leads.find((entry) => entry.id === meeting.leadId);
            if (!lead) {
              return null;
            }

            return {
              leadId: leadIdByName.get(lead.fullName)!,
              scheduledFor: new Date(meeting.scheduledFor),
              status: meeting.status,
              bookingSource: "autonomous-agent",
              owner: meeting.owner,
              notes: meeting.notes,
              outcome: meeting.status,
            };
          })
          .filter((value): value is NonNullable<typeof value> => value !== null),
      );
    }

    this.state.initialized = true;
  }

  private async workspaceContext() {
    await this.ensureInitialized();

    if (!this.context?.workspaceId) {
      throw new Error("Scoped workspaceId is required for tenant storage access");
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, this.context.workspaceId))
      .limit(1);

    if (!workspace) {
      throw new Error("Workspace not found for request context");
    }

    if (this.context.organizationId && workspace.organizationId !== this.context.organizationId) {
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
      .where(and(eq(outreachActivities.id, id), eq(campaigns.workspaceId, workspace.id)))
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

  private mapLead(lead: typeof leads.$inferSelect): DashboardResponse["leads"][number] {
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
        ((lead.metadata as { lastTouchpoint?: string } | null)?.lastTouchpoint ?? "Imported"),
      rejectionReason: lead.rejectionReason ?? null,
    };
  }

  private mapCampaign(campaign: typeof campaigns.$inferSelect): DashboardResponse["campaigns"][number] {
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

  private mapCall(call: typeof callTasks.$inferSelect): DashboardResponse["calls"][number] {
    const statusMap: Record<typeof call.status, DashboardResponse["calls"][number]["status"]> = {
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

  private mapMeeting(meeting: typeof meetings.$inferSelect): DashboardResponse["meetings"][number] {
    return {
      id: meeting.id,
      leadId: meeting.leadId,
      status: meeting.status,
      scheduledFor: meeting.scheduledFor?.toISOString() ?? "",
      owner: meeting.owner ?? "sales-ops",
      notes: meeting.notes ?? "",
    };
  }

  private async ensureAutonomousMeeting(leadId: string, notes: string) {
    const [existingMeeting] = await db
      .select({ id: meetings.id })
      .from(meetings)
      .where(and(eq(meetings.leadId, leadId), eq(meetings.bookingSource, "autonomous-agent")))
      .limit(1);

    if (existingMeeting) {
      return;
    }

    await db.insert(meetings).values({
      leadId,
      scheduledFor: new Date("2026-03-14T15:30:00Z"),
      status: "scheduled",
      bookingSource: "autonomous-agent",
      owner: "autonomous-agent",
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

  private async markLeadAsMeetingBooked(leadId: string, touchpoint: string, notes: string) {
    await db
      .update(leads)
      .set({
        status: "meeting_booked",
        metadata: sql`jsonb_set(coalesce(${leads.metadata}, '{}'::jsonb), '{lastTouchpoint}', ${JSON.stringify(touchpoint)}::jsonb)`,
      })
      .where(eq(leads.id, leadId));

    await this.ensureAutonomousMeeting(leadId, notes);
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
    const leadRows = await db.select().from(leads).where(eq(leads.workspaceId, workspace.id)).orderBy(desc(leads.createdAt));
    const campaignRows = await db.select().from(campaigns).where(eq(campaigns.workspaceId, workspace.id)).orderBy(desc(campaigns.createdAt));
    const sourceRunRows = await db.select().from(sourceRuns).where(eq(sourceRuns.workspaceId, workspace.id)).orderBy(desc(sourceRuns.createdAt));
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
          value: String(leadRows.filter((lead) => lead.status !== "lost").length),
          detail: "Leads that passed initial qualification and remain active.",
        },
        {
          label: "Campaigns running",
          value: String(campaignRows.filter((campaign) => campaign.stage === "running").length),
          detail: "Autonomous workflows currently executing outbound actions.",
        },
        {
          label: "Meetings booked",
          value: String(meetingRows.filter(({ meeting }) => meeting.status === "scheduled").length),
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
        monthlyUsage: 117,
      },
      actionItems: [
        {
          id: "db-approval",
          title: "Approve first send for draft campaigns",
          detail: "Postgres-backed campaign state is active and waiting for operator approval.",
          urgency: "high" as const,
        },
      ],
      onboarding: {
        id: onboarding.id,
        status: onboarding.status,
        currentStep: onboarding.currentStep,
        transcript: (onboarding.transcript as DashboardResponse["onboarding"]["transcript"]) ?? [],
        extractedProfile: (onboarding.extractedProfile as DashboardResponse["onboarding"]["extractedProfile"]) ?? null,
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
      sourceRuns: sourceRunRows.map((run) => ({
        id: run.id,
        source: run.source,
        status: run.status,
        candidatesFound: run.candidatesFound,
        qualifiedCount: run.qualifiedCount,
        rejectedCount: run.rejectedCount,
        summary: run.summary,
      })),
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
    const rows = await db.select().from(leads).where(eq(leads.workspaceId, workspace.id)).orderBy(desc(leads.createdAt));
    return rows.map((lead) => this.mapLead(lead));
  }

  async getLead(id: string) {
    await this.ensureInitialized();
    const lead = await this.getScopedLeadRow(id);
    return lead ? this.mapLead(lead) : null;
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
      .where(and(eq(onboardingSessions.id, id), eq(onboardingSessions.workspaceId, workspace.id)))
      .limit(1);
    if (!session) {
      return null;
    }

    const transcript = [
      ...((session.transcript as DashboardResponse["onboarding"]["transcript"]) ?? []),
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
      .where(and(eq(onboardingSessions.id, id), eq(onboardingSessions.workspaceId, workspace.id)))
      .returning();

    return {
      id: updated.id,
      status: updated.status,
      currentStep: updated.currentStep,
      transcript: updated.transcript as DashboardResponse["onboarding"]["transcript"],
      extractedProfile: updated.extractedProfile as DashboardResponse["onboarding"]["extractedProfile"],
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
      .where(and(eq(onboardingSessions.id, id), eq(onboardingSessions.workspaceId, workspace.id)))
      .limit(1);
    if (!session) {
      return null;
    }

    const transcript = (session.transcript as DashboardResponse["onboarding"]["transcript"]) ?? [];
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
      .where(and(eq(onboardingSessions.id, id), eq(onboardingSessions.workspaceId, workspace.id)))
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

    return {
      id: updated.id,
      status: updated.status,
      currentStep: updated.currentStep,
      transcript: updated.transcript as DashboardResponse["onboarding"]["transcript"],
      extractedProfile: updated.extractedProfile as DashboardResponse["onboarding"]["extractedProfile"],
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
    return (session?.extractedProfile as DashboardResponse["onboarding"]["extractedProfile"]) ?? null;
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

  async runLeadSource(source: string) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const memoryResult = this.state.memory.runLeadSource(source);
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
        candidatesFound: memoryResult.run.candidatesFound,
        qualifiedCount: memoryResult.run.qualifiedCount,
        rejectedCount: memoryResult.run.rejectedCount,
        summary: memoryResult.run.summary,
      })
      .returning();

    return {
      run: {
        id: run.id,
        source: run.source,
        status: run.status,
        candidatesFound: run.candidatesFound,
        qualifiedCount: run.qualifiedCount,
        rejectedCount: run.rejectedCount,
        summary: run.summary,
      },
      accepted: [this.mapLead(acceptedLead)],
      rejected: memoryResult.rejected,
    };
  }

  async createLead(input: CreateLeadInput) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
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
    return this.mapLead(lead);
  }

  async getCampaigns() {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const rows = await db.select().from(campaigns).where(eq(campaigns.workspaceId, workspace.id)).orderBy(desc(campaigns.createdAt));
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
    const leadCount = await db.select({ count: sql<number>`count(*)::int` }).from(leads).where(eq(leads.workspaceId, workspace.id));
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
      .where(and(eq(leads.status, "qualified"), eq(leads.workspaceId, workspace.id)))
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
      .where(and(eq(outreachActivities.campaignId, id), eq(campaigns.workspaceId, workspace.id)))
      .orderBy(desc(outreachActivities.createdAt));
    return rows.map((activity) => ({
      id: activity.activity.id,
      campaignId: activity.activity.campaignId,
      leadId: activity.activity.leadId,
      type: activity.activity.type as DashboardResponse["activities"][number]["type"],
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

    const [meeting] = await db
      .update(meetings)
      .set({
        status: input.status,
        notes: input.notes,
        outcome: input.status,
      })
      .where(eq(meetings.id, id))
      .returning();
    if (!meeting) {
      return null;
    }
    if (input.status === "completed") {
      await db
        .update(leads)
        .set({
          status: "won",
          metadata: sql`jsonb_set(coalesce(${leads.metadata}, '{}'::jsonb), '{lastTouchpoint}', '"Meeting completed"'::jsonb)`,
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
      detail: string;
    },
  ) {
    await this.ensureInitialized();
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
            nextActionAt: update.status === "sent" ? "First autonomous touch sent" : "Queued first autonomous touch",
          })
          .where(eq(campaigns.id, activity.campaignId));

        await this.markLeadAsContacted(
          activity.leadId,
          `${activity.type} ${update.status} via ${update.provider}`,
        );
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
      detail: string;
    },
  ) {
    await this.ensureInitialized();
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
        disposition: nextStatus === "completed" ? "meeting_requested" : existing.disposition ?? "pending",
        summary: sql`concat(${callTasks.summary}, ' ', cast(${update.detail} as text))`,
      })
      .where(eq(callTasks.id, callId))
      .returning();

    if (call && !call.reviewRequired && nextStatus === "completed") {
      await this.markLeadAsMeetingBooked(
        call.leadId,
        `AI call completed via ${update.provider}`,
        "Auto-created after positive AI call disposition.",
      );
    }

    return call ? this.mapCall(call) : null;
  }

  async applyProviderEvent(event: {
    provider: string;
    eventType: string;
    payload: unknown;
  }) {
    await this.ensureInitialized();

    if (event.provider === "resend") {
      const payload = event.payload as { data?: { email_id?: string }; type?: string };
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
          status: payload.type?.includes("delivered") ? "sent" : "review_required",
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
      const payload = event.payload as { CallSid?: string; CallStatus?: string };
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
          disposition: payload.CallStatus === "completed" ? "meeting_requested" : callTasks.disposition,
          summary: sql`concat(${callTasks.summary}, ' Status callback: ', ${String(payload.CallStatus ?? event.eventType)})`,
        })
        .where(eq(callTasks.id, target.id))
        .returning();

      if (call && payload.CallStatus === "completed" && !call.reviewRequired) {
        await this.markLeadAsMeetingBooked(
          call.leadId,
          "AI call completed via twilio",
          "Auto-created after Twilio reported a completed autonomous call.",
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

   async recordProviderEvent(event: Omit<ProviderEvent, "id" | "receivedAt"> & { payload: unknown }) {
     await this.ensureInitialized();
     let organizationId =
       this.context?.organizationId ??
       (await this.resolveOrganizationIdForProviderEvent(event));

     if (!organizationId && (this.context?.organizationId || this.context?.workspaceId)) {
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

    const actorId = event.actorId && UUID_PATTERN.test(event.actorId) ? event.actorId : null;
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
 }

let storagePromise: Promise<SalesStorage> | null = null;

async function detectPostgresReadiness() {
  if (process.env.NODE_ENV === "test" && !process.env.DATABASE_URL) {
    return false;
  }

  try {
    await db.execute(sql`select 1`);
    const result = await db.execute(sql`select to_regclass('public.organizations') as organizations`);
    return hasOrganizationsTable(result);
  } catch (error) {
    console.error("Postgres readiness check failed.", error);
    return false;
  }
}

export async function getStorage(context?: StorageAccessContext): Promise<SalesStorage> {
  if (!storagePromise) {
    storagePromise = (async () => {
      const ready = await detectPostgresReadiness();
      return ready ? new PostgresStorage() : new MemoryStorage();
    })();
  }

  const storage = await storagePromise;

  if (storage.mode === "postgres") {
    return (storage as PostgresStorage).scope(context);
  }

  return storage;
}
