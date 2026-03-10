import { sql, eq, desc } from "drizzle-orm";
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
  async updateOutreachProviderResult() { return null; }
  async updateCallProviderResult() { return null; }
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
}

class PostgresStorage implements SalesStorage {
  readonly mode: "memory" | "postgres" = "postgres";
  private initialized = false;
  private readonly seed = new DemoStore();
  private readonly memory = new DemoStore();

  private async ensureInitialized() {
    if (this.initialized) {
      return;
    }

    const dashboard = this.seed.getDashboard();
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

    this.initialized = true;
  }

  private async workspaceContext() {
    await this.ensureInitialized();
    const [organization] = await db.select().from(organizations).limit(1);
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.organizationId, organization.id))
      .limit(1);

    return { organization, workspace };
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
    return {
      id: call.id,
      leadId: call.leadId,
      status: call.reviewRequired ? "review_required" : "completed",
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
    const callRows = await db.select().from(callTasks).orderBy(desc(callTasks.createdAt));
    const meetingRows = await db.select().from(meetings).orderBy(desc(meetings.createdAt));
    const activityRows = await db.select().from(outreachActivities).orderBy(desc(outreachActivities.createdAt));

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
          value: String(meetingRows.filter((meeting) => meeting.status === "scheduled").length),
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
      activities: activityRows.map((activity) => ({
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
      calls: callRows.map((call) => this.mapCall(call)),
      meetings: meetingRows.map((meeting) => this.mapMeeting(meeting)),
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
    const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return lead ? this.mapLead(lead) : null;
  }

  async createOnboardingSession(input: OnboardingSessionInput) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const seedSession = this.memory.createOnboardingSession(input);
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
    const [session] = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, id)).limit(1);
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
      .where(eq(onboardingSessions.id, id))
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
    const [session] = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, id)).limit(1);
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
      .where(eq(onboardingSessions.id, id))
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
    const memoryResult = this.memory.runLeadSource(source);
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
    const created = this.memory.createLead(input);
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
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    return campaign ? this.mapCampaign(campaign) : null;
  }

  async createCampaign(input: CreateCampaignInput) {
    await this.ensureInitialized();
    const { workspace } = await this.workspaceContext();
    const memoryResult = this.memory.createCampaign(input);
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
    const [updated] = await db
      .update(campaigns)
      .set({
        approved: true,
        stage: "approved",
        nextActionAt: `Approved by ${approvedBy}`,
      })
      .where(eq(campaigns.id, id))
      .returning();
    return updated ? this.mapCampaign(updated) : null;
  }

  async runCampaign(id: string, approvedBy: string) {
    await this.ensureInitialized();
    const approved = await this.approveCampaign(id, approvedBy);
    if (!approved) {
      return null;
    }

    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.status, "qualified"))
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

    const [updatedCampaign] = await db
      .update(campaigns)
      .set({
        firstActionCompleted: true,
        stage: "running",
        nextActionAt: "Queued first autonomous touch",
      })
      .where(eq(campaigns.id, id))
      .returning();

    await db
      .update(leads)
      .set({
        status: "contacted",
        metadata: { ...(lead.metadata as object), lastTouchpoint: `${approved.channel} queued by ${approvedBy}` },
      })
      .where(eq(leads.id, lead.id));

    return {
      campaign: this.mapCampaign(updatedCampaign),
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
    const rows = await db.select().from(outreachActivities).where(eq(outreachActivities.campaignId, id)).orderBy(desc(outreachActivities.createdAt));
    return rows.map((activity) => ({
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
    }));
  }

  async createCall(input: CreateCallInput) {
    await this.ensureInitialized();
    const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
    if (!lead) {
      return null;
    }
    const [campaign] = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt)).limit(1);
    const reviewRequired = lead.score <= 85;
    const [call] = await db
      .insert(callTasks)
      .values({
        campaignId: campaign?.id ?? (await db.select().from(campaigns).limit(1))[0]!.id,
        leadId: lead.id,
        status: reviewRequired ? "blocked" : "completed",
        provider: input.provider,
        summary: reviewRequired
          ? "Lead engaged, but transcript confidence requires review."
          : "Lead showed interest and agreed to a discovery call.",
        transcript: `Agent discussed ${lead.company ?? "the business"} goals and outbound automation fit.`,
        disposition: reviewRequired ? "needs_review" : "meeting_requested",
        reviewRequired,
      })
      .returning();

    if (!reviewRequired) {
      await db
        .update(leads)
        .set({
          status: "meeting_booked",
          metadata: { ...(lead.metadata as object), lastTouchpoint: "AI call completed" },
        })
        .where(eq(leads.id, lead.id));

      await db.insert(meetings).values({
        leadId: lead.id,
        scheduledFor: new Date("2026-03-14T15:30:00Z"),
        status: "scheduled",
        bookingSource: "autonomous-agent",
        owner: "autonomous-agent",
        notes: "Auto-created after positive AI call disposition.",
        outcome: "scheduled",
      });
    }

    return this.mapCall(call);
  }

  async getCall(id: string) {
    await this.ensureInitialized();
    const [call] = await db.select().from(callTasks).where(eq(callTasks.id, id)).limit(1);
    return call ? this.mapCall(call) : null;
  }

  async reviewCall(id: string, approved: boolean, notes: string) {
    await this.ensureInitialized();
    const [call] = await db
      .update(callTasks)
      .set({
        reviewRequired: false,
        status: approved ? "completed" : "blocked",
        summary: sql`concat(${callTasks.summary}, ' Reviewer note: ', ${notes})`,
      })
      .where(eq(callTasks.id, id))
      .returning();
    return call ? this.mapCall(call) : null;
  }

  async createMeeting(input: CreateMeetingInput) {
    await this.ensureInitialized();
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
    const [activity] = await db
      .update(outreachActivities)
      .set({
        provider: update.provider,
        providerMessageId: update.providerMessageId,
        status: update.status,
        preview: sql`concat(${outreachActivities.preview}, ' ', ${update.detail})`,
      })
      .where(eq(outreachActivities.id, activityId))
      .returning();

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
    const [call] = await db
      .update(callTasks)
      .set({
        provider: update.provider,
        providerCallId: update.providerCallId,
        summary: sql`concat(${callTasks.summary}, ' ', ${update.detail})`,
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
      const payload = event.payload as { data?: { email_id?: string }; type?: string };
      const externalId = payload.data?.email_id;
      if (!externalId) {
        return null;
      }

      const [activity] = await db
        .update(outreachActivities)
        .set({
          status: payload.type?.includes("delivered") ? "sent" : "review_required",
          preview: sql`concat(${outreachActivities.preview}, ' Webhook: ', ${String(payload.type ?? event.eventType)})`,
        })
        .where(eq(outreachActivities.providerMessageId, externalId))
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

      const [call] = await db
        .update(callTasks)
        .set({
          status: payload.CallStatus === "completed" ? "completed" : "running",
          summary: sql`concat(${callTasks.summary}, ' Status callback: ', ${String(payload.CallStatus ?? event.eventType)})`,
        })
        .where(eq(callTasks.providerCallId, payload.CallSid))
        .returning();

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
    const { organization } = await this.workspaceContext();
    const [created] = await db
      .insert(auditEvents)
      .values({
        organizationId: organization.id,
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
}

let storagePromise: Promise<SalesStorage> | null = null;

async function detectPostgresReadiness() {
  try {
    await db.execute(sql`select 1`);
    const result = await db.execute(sql`select to_regclass('public.organizations') as organizations`);
    const rows = result as unknown as Array<{ organizations?: string | null }>;
    return Boolean(rows[0]?.organizations);
  } catch {
    return false;
  }
}

export async function getStorage(): Promise<SalesStorage> {
  if (!storagePromise) {
    storagePromise = (async () => {
      const ready = await detectPostgresReadiness();
      return ready ? new PostgresStorage() : new MemoryStorage();
    })();
  }

  return await storagePromise;
}
