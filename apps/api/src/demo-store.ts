import {
  type ActionItem,
  type BusinessProfile,
  type CallRecord,
  type CampaignRecord,
  type CreateCallInput,
  type CreateCampaignInput,
  type CreateLeadInput,
  type CreateMeetingInput,
  type DashboardMetric,
  type DashboardResponse,
  type LeadRecord,
  type MeetingRecord,
  type OnboardingMessageInput,
  type OnboardingSession,
  type OnboardingSessionInput,
  type OutreachActivity,
  type SourcePlan,
  type SourceRun,
  type SubscriptionRecord,
  type UpdateMeetingInput,
  type WorkspaceSummary,
  evaluateCampaignPolicy,
} from "@sales/shared";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function inferProfile(session: OnboardingSession): BusinessProfile {
  const combined = session.transcript
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.content)
    .join(" ");
  const lower = combined.toLowerCase();

  const industry = lower.includes("agency")
    ? "Agency services"
    : lower.includes("software") || lower.includes("saas")
      ? "B2B SaaS"
      : "Services";

  const regions = lower.includes("india") ? ["India", "UAE", "US"] : ["US", "Europe", "APAC"];
  const channels = [
    "email",
    lower.includes("linkedin") ? "linkedin" : "website",
    lower.includes("call") || lower.includes("phone") ? "call" : "sms",
  ];

  return {
    businessName: session.extractedProfile?.businessName ?? "Northstar Labs",
    website: "https://northstarlabs.example",
    industry,
    offerSummary:
      "AI-assisted outbound, lead qualification, and meeting booking for founder-led sales teams.",
    targetAudience: lower.includes("founder")
      ? "Founder-led SaaS and service businesses"
      : "Growth-stage SMB operators",
    regions,
    goals: [
      "Increase qualified pipeline",
      "Automate first-touch outreach",
      "Book meetings faster",
    ],
    channels,
    constraints: ["Protect sender reputation", "Keep approvals for risky steps"],
    voice: "Direct, consultative, and tailored to the lead's business context.",
    summary:
      "The business needs multi-source lead collection, personalized outreach, and controlled autonomy that can scale safely.",
  };
}

export function buildSourcePlan(profile: BusinessProfile): SourcePlan {
  const searchTerms = [
    `${profile.targetAudience} ${profile.regions[0]}`,
    `${profile.industry} growth leads`,
    `${profile.businessName} competitor customers`,
  ];

  return {
    id: createId("plan"),
    summary: `Prioritize ${profile.targetAudience} across ${profile.regions.join(", ")} using company websites, search, and directories.`,
    sources: ["website", "search", "directory", "csv"],
    contactTargets: profile.channels,
    searchTerms,
    rationale:
      "The business profile shows a need for broad contact discovery with email-first outreach and call follow-up for high-fit leads.",
  };
}

export function personalizedPreview(lead: LeadRecord) {
  return `Hi ${lead.fullName.split(" ")[0]}, I noticed ${lead.company ?? "your team"} fits the ICP for an automated outbound workflow.`;
}

export class DemoStore {
  private readonly workspace: WorkspaceSummary = {
    organizationName: "Northstar Labs",
    workspaceName: "Growth OS",
    region: "global",
    primaryChannel: "email",
  };

  private readonly subscription: SubscriptionRecord = {
    planKey: "growth",
    status: "trialing",
    seats: 5,
    usageLimit: 500,
    monthlyUsage: 117,
  };

  private onboarding: OnboardingSession = {
    id: "onb_1",
    status: "in_progress",
    currentStep: "business-model",
    transcript: [
      {
        role: "assistant",
        content:
          "Tell me about your business, ideal customer, regions, and what a successful sales outcome looks like.",
      },
      {
        role: "user",
        content:
          "We help founder-led B2B SaaS teams automate outbound across email and calls for the US and India markets.",
      },
    ],
    extractedProfile: null,
    scraperBrief: null,
    outreachBrief: null,
  };

  private leads: LeadRecord[] = [
    {
      id: "lead_1",
      fullName: "Aarav Malhotra",
      email: "aarav@orbitops.ai",
      phone: "+91 98765 43210",
      company: "OrbitOps",
      source: "Apollo import",
      status: "qualified",
      score: 86,
      lastTouchpoint: "AI email draft ready",
      rejectionReason: null,
    },
    {
      id: "lead_2",
      fullName: "Nina Carter",
      email: "nina@vectrcloud.com",
      phone: "+1 415 555 0141",
      company: "VectrCloud",
      source: "Website scrape",
      status: "contacted",
      score: 73,
      lastTouchpoint: "Call summary captured",
      rejectionReason: null,
    },
    {
      id: "lead_3",
      fullName: "Rohan Bedi",
      email: "rohan@fieldpeak.io",
      phone: "+91 90000 10000",
      company: "FieldPeak",
      source: "CSV import",
      status: "meeting_booked",
      score: 92,
      lastTouchpoint: "Demo booked for Thursday",
      rejectionReason: null,
    },
  ];

  private sourcePlan: SourcePlan | null = buildSourcePlan(inferProfile(this.onboarding));

  private sourceRuns: SourceRun[] = [
    {
      id: "run_1",
      source: "website",
      status: "completed",
      candidatesFound: 18,
      qualifiedCount: 7,
      rejectedCount: 11,
      summary: "Company sites and contact pages yielded 7 ICP-fit leads with public email or phone data.",
    },
  ];

  private campaigns: CampaignRecord[] = [
    {
      id: "camp_1",
      name: "Founder outbound",
      channel: "email",
      stage: "draft",
      approved: false,
      firstActionCompleted: false,
      nextActionAt: "Awaiting approval",
      leadsEnrolled: 28,
    },
    {
      id: "camp_2",
      name: "RevOps rescue",
      channel: "call",
      stage: "running",
      approved: true,
      firstActionCompleted: true,
      nextActionAt: "Today 18:30 UTC",
      leadsEnrolled: 9,
    },
  ];

  private activities: OutreachActivity[] = [
    {
      id: "act_1",
      campaignId: "camp_2",
      leadId: "lead_2",
      type: "call",
      status: "completed",
      provider: null,
      providerMessageId: null,
      subject: "RevOps rescue call",
      preview: "Confirmed ops pain and interest in an outbound automation pilot.",
      personalizedFor: "Nina Carter",
    },
    {
      id: "act_2",
      campaignId: "camp_1",
      leadId: "lead_1",
      type: "email",
      status: "draft",
      provider: null,
      providerMessageId: null,
      subject: "Founder pipeline acceleration",
      preview: personalizedPreview(this.leads[0]!),
      personalizedFor: "Aarav Malhotra",
    },
  ];

  private calls: CallRecord[] = [
    {
      id: "call_1",
      leadId: "lead_2",
      status: "completed",
      provider: "twilio",
      providerCallId: null,
      summary: "Lead requested a product walkthrough and pricing follow-up.",
      transcript: "Agent: We help teams automate outbound. Lead: Book a walkthrough for next week.",
      disposition: "interested",
      reviewRequired: false,
    },
  ];

  private meetings: MeetingRecord[] = [
    {
      id: "meet_1",
      leadId: "lead_3",
      status: "scheduled",
      scheduledFor: "2026-03-13T11:00:00Z",
      owner: "sales-ops",
      notes: "Discovery call booked after qualified outbound sequence.",
    },
  ];

  private buildActionItems(): ActionItem[] {
    return [
      {
        id: "action_1",
        title: "Approve first send for Founder outbound",
        detail: "The campaign is blocked until an operator approves the first outbound action.",
        urgency: "high",
      },
      {
        id: "action_2",
        title: "Complete onboarding profile finalization",
        detail: "Structured business context improves scraper targeting and message quality.",
        urgency: this.onboarding.status === "completed" ? "low" : "high",
      },
      {
        id: "action_3",
        title: "Review low-confidence call transcript",
        detail: "One AI call summary may require human validation before the next touchpoint.",
        urgency: this.calls.some((call) => call.reviewRequired) ? "medium" : "low",
      },
    ];
  }

  getDashboard(): DashboardResponse {
    const metrics: DashboardMetric[] = [
      {
        label: "Qualified leads",
        value: String(this.leads.filter((lead) => lead.status !== "lost").length),
        detail: "Leads that passed initial qualification and remain active.",
      },
      {
        label: "Campaigns running",
        value: String(this.campaigns.filter((campaign) => campaign.stage === "running").length),
        detail: "Autonomous workflows currently executing outbound actions.",
      },
      {
        label: "Meetings booked",
        value: String(this.meetings.filter((meeting) => meeting.status === "scheduled").length),
        detail: "Meetings created from outbound and voice workflows.",
      },
    ];

    return {
      workspace: this.workspace,
      metrics,
      leads: this.leads,
      campaigns: this.campaigns,
      subscription: this.subscription,
      actionItems: this.buildActionItems(),
      onboarding: this.onboarding,
      sourcePlan: this.sourcePlan,
      sourceRuns: this.sourceRuns,
      activities: this.activities,
      calls: this.calls,
      meetings: this.meetings,
    };
  }

  getLeads() {
    return this.leads;
  }

  getLead(id: string) {
    return this.leads.find((lead) => lead.id === id) ?? null;
  }

  createOnboardingSession(input: OnboardingSessionInput) {
    this.onboarding = {
      id: createId("onb"),
      status: "in_progress",
      currentStep: "business-model",
      transcript: [
        {
          role: "assistant",
          content: `Hi ${input.ownerName}, tell me about ${input.businessName}, who it serves, and the kind of leads you want.`,
        },
      ],
      extractedProfile: null,
      scraperBrief: null,
      outreachBrief: null,
    };

    return this.onboarding;
  }

  appendOnboardingMessage(id: string, input: OnboardingMessageInput) {
    if (this.onboarding.id !== id) {
      return null;
    }

    this.onboarding.transcript.push({
      role: "user",
      content: input.content,
    });
    this.onboarding.transcript.push({
      role: "assistant",
      content:
        "Noted. I am refining your ICP, channel mix, and compliance-safe outreach plan based on that detail.",
    });
    this.onboarding.currentStep = "goals-and-channels";
    return this.onboarding;
  }

  finalizeOnboarding(id: string) {
    if (this.onboarding.id !== id) {
      return null;
    }

    const profile = inferProfile(this.onboarding);
    this.onboarding.status = "completed";
    this.onboarding.currentStep = "complete";
    this.onboarding.extractedProfile = profile;
    this.onboarding.scraperBrief =
      "Search websites, directories, and search results for founder-led SMBs matching the ICP; prioritize public email, phone, and contact pages.";
    this.onboarding.outreachBrief =
      "Start with tailored email, escalate to call for high-score leads, and convert interest into booked meetings with a consultative tone.";
    this.sourcePlan = buildSourcePlan(profile);
    return this.onboarding;
  }

  getBusinessProfile() {
    return this.onboarding.extractedProfile;
  }

  getSourcePlan() {
    return this.sourcePlan;
  }

  runLeadSource(source: string) {
    const newLeads: LeadRecord[] = [
      {
        id: createId("lead"),
        fullName: "Maya Sinha",
        email: "maya@pipelineforge.ai",
        phone: "+91 80001 23456",
        company: "PipelineForge",
        source,
        status: "qualified",
        score: 88,
        lastTouchpoint: "Imported from source run",
        rejectionReason: null,
      },
      {
        id: createId("lead"),
        fullName: "Daniel Brooks",
        email: "daniel@opsignal.io",
        phone: "+1 212 555 0193",
        company: "Opsignal",
        source,
        status: "new",
        score: 59,
        lastTouchpoint: "Needs manual review",
        rejectionReason: "Below target ICP threshold",
      },
    ];

    this.leads = [newLeads[0]!, ...this.leads];
    const run: SourceRun = {
      id: createId("run"),
      source,
      status: "completed",
      candidatesFound: 12,
      qualifiedCount: 1,
      rejectedCount: 1,
      summary: `The ${source} run found fresh candidates and filtered out low-fit leads using the qualification model.`,
    };
    this.sourceRuns = [run, ...this.sourceRuns];
    return {
      run,
      accepted: [newLeads[0]!],
      rejected: [newLeads[1]!],
    };
  }

  createLead(input: CreateLeadInput): LeadRecord {
    const lead: LeadRecord = {
      id: createId("lead"),
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      company: input.company,
      source: input.source,
      status: input.score >= 70 ? "qualified" : "new",
      score: input.score,
      lastTouchpoint: "Imported into workspace",
      rejectionReason: input.score >= 70 ? null : "Needs better fit",
    };

    this.leads = [lead, ...this.leads];
    return lead;
  }

  createCampaign(input: CreateCampaignInput) {
    const policy = evaluateCampaignPolicy({
      approved: false,
      campaignStage: "draft",
      firstAction: true,
      highRiskChannel: input.highRiskChannel,
      monthlyUsage: this.subscription.monthlyUsage,
      planLimit: this.subscription.usageLimit,
    });

    const enrolled = this.leads.filter((lead) => lead.status === "qualified").length;
    const campaign: CampaignRecord = {
      id: createId("camp"),
      name: input.name,
      channel: input.channel,
      stage: policy.nextStage,
      approved: false,
      firstActionCompleted: false,
      nextActionAt: policy.allowed ? "Ready now" : policy.reason,
      leadsEnrolled: enrolled,
    };

    this.campaigns = [campaign, ...this.campaigns];

    return {
      campaign,
      policy,
    };
  }

  getCampaigns() {
    return this.campaigns;
  }

  getCampaign(id: string) {
    return this.campaigns.find((campaign) => campaign.id === id) ?? null;
  }

  approveCampaign(id: string, approvedBy: string) {
    const campaign = this.campaigns.find((entry) => entry.id === id);
    if (!campaign) {
      return null;
    }

    campaign.approved = true;
    campaign.stage = campaign.firstActionCompleted ? "running" : "approved";
    campaign.nextActionAt = `Approved by ${approvedBy}`;

    return campaign;
  }

  runCampaign(id: string, approvedBy: string) {
    const campaign = this.approveCampaign(id, approvedBy);
    if (!campaign) {
      return null;
    }

    const lead = this.leads.find((entry) => entry.status === "qualified");
    if (!lead) {
      return { campaign, activities: [] };
    }

    const activity: OutreachActivity = {
      id: createId("act"),
      campaignId: campaign.id,
      leadId: lead.id,
      type: campaign.channel === "call" ? "call" : "email",
      status: "queued",
      provider: null,
      providerMessageId: null,
      subject: `Personalized ${campaign.channel} for ${lead.company ?? lead.fullName}`,
      preview: personalizedPreview(lead),
      personalizedFor: lead.fullName,
    };

    campaign.firstActionCompleted = true;
    campaign.stage = "running";
    campaign.nextActionAt = "Queued first autonomous touch";
    this.activities = [activity, ...this.activities];
    this.subscription.monthlyUsage += 1;
    lead.status = "contacted";
    lead.lastTouchpoint = `${campaign.channel} queued by ${approvedBy}`;

    return {
      campaign,
      activities: [activity],
    };
  }

  getCampaignActivity(id: string) {
    return this.activities.filter((activity) => activity.campaignId === id);
  }

  createCall(input: CreateCallInput) {
    const lead = this.leads.find((entry) => entry.id === input.leadId);
    if (!lead) {
      return null;
    }

    const call: CallRecord = {
      id: createId("call"),
      leadId: lead.id,
      status: lead.score > 85 ? "completed" : "review_required",
      provider: input.provider,
      providerCallId: null,
      summary:
        lead.score > 85
          ? "Lead showed interest and agreed to a discovery call."
          : "Lead engaged, but transcript confidence requires review.",
      transcript: `Agent discussed ${lead.company ?? "the business"} goals and outbound automation fit.`,
      disposition: lead.score > 85 ? "meeting_requested" : "needs_review",
      reviewRequired: lead.score <= 85,
    };

    this.calls = [call, ...this.calls];
    this.activities = [
      {
        id: createId("act"),
        campaignId: this.campaigns[0]?.id ?? "manual",
        leadId: lead.id,
        type: "call",
        status: call.reviewRequired ? "review_required" : "completed",
        provider: null,
        providerMessageId: null,
        subject: `AI call with ${lead.fullName}`,
        preview: call.summary,
        personalizedFor: lead.fullName,
      },
      ...this.activities,
    ];
    lead.lastTouchpoint = "AI call completed";

    if (!call.reviewRequired) {
      lead.status = "meeting_booked";
      this.meetings = [
        {
          id: createId("meet"),
          leadId: lead.id,
          status: "scheduled",
          scheduledFor: "2026-03-14T15:30:00Z",
          owner: "autonomous-agent",
          notes: "Auto-created after positive AI call disposition.",
        },
        ...this.meetings,
      ];
    }

    return call;
  }

  getCall(id: string) {
    return this.calls.find((call) => call.id === id) ?? null;
  }

  reviewCall(id: string, approved: boolean, notes: string) {
    const call = this.calls.find((entry) => entry.id === id);
    if (!call) {
      return null;
    }

    call.reviewRequired = false;
    call.status = approved ? "completed" : "review_required";
    call.summary = `${call.summary} Reviewer note: ${notes}`;

    return call;
  }

  createMeeting(input: CreateMeetingInput) {
    const lead = this.leads.find((entry) => entry.id === input.leadId);
    if (!lead) {
      return null;
    }

    const meeting: MeetingRecord = {
      id: createId("meet"),
      leadId: input.leadId,
      status: "scheduled",
      scheduledFor: input.scheduledFor,
      owner: input.owner,
      notes: input.notes,
    };

    this.meetings = [meeting, ...this.meetings];
    lead.status = "meeting_booked";
    lead.lastTouchpoint = "Meeting created";
    return meeting;
  }

  updateMeeting(id: string, input: UpdateMeetingInput) {
    const meeting = this.meetings.find((entry) => entry.id === id);
    if (!meeting) {
      return null;
    }

    meeting.status = input.status;
    meeting.notes = input.notes;

    const lead = this.leads.find((entry) => entry.id === meeting.leadId);
    if (lead && input.status === "completed") {
      lead.status = "won";
      lead.lastTouchpoint = "Meeting completed";
    }

    return meeting;
  }
}

export const demoStore = new DemoStore();
