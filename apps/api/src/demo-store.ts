import {
  type AiWorker,
  type AiWorkerControlPlaneResponse,
  type AiWorkerRun,
  type ActionItem,
  type ActionProposal,
  type ActionProposalStatus,
  type BusinessProfile,
  type CallRecord,
  type CampaignRecord,
  type CheckSuppressionInput,
  type ContactIntakeRecord,
  type CreateSuppressionInput,
  type CreateContactIntakeInput,
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
  type OutboundChannel,
  type OutreachActivity,
  type SalesBlueprint,
  type SourcePlan,
  type SourceRun,
  type SourceRunProviderMode,
  type SuppressionRecord,
  type SubscriptionRecord,
  type ConfigureTelegramIntegrationInput,
  type CompleteAiWorkerRunInput,
  type CreateAiWorkerTaskInput,
  type CreateActionProposalInput,
  type TelegramCommandAudit,
  type TelegramCommandResult,
  type TelegramIntegration,
  type ReviewActionProposalInput,
  type UpdateMeetingInput,
  type UpsertSalesBlueprintInput,
  type ChannelEntitlementResult,
  type UsageEntitlementMetric,
  type UsageEntitlementResult,
  type WorkspaceSummary,
  evaluateChannelEntitlement,
  evaluateUsageEntitlement,
  evaluateCampaignPolicy,
  getPlanAiWorkerExecutionBudgetCents,
  getPlanAiWorkerTaskProposalLimit,
  getPlanIncludedChannels,
  getPlanOutreachDispatchLimit,
  getPlanProviderCostBudgetCents,
  getPlanVoiceCallLimit,
  telegramDefaultAllowedCommands,
  normalizeSuppressionContactValue,
  scoreContactIntake,
  suppressionLookupChannels,
} from "@sales/shared";
import { hashTelegramChatId, maskTelegramChatId } from "./telegram";

const AI_ASSISTED_MEETING_OWNER = "Guarded AI assistant";
const LEGACY_AUTONOMOUS_MEETING_OWNER = "autonomous-agent";

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

function sourceRunEvidenceFor(
  source: string,
  accepted: LeadRecord[],
  rejectedCount: number,
  dedupedCount: number,
  providerMode: SourceRunProviderMode = "mock",
) {
  const lead = accepted[0];
  const companySlug = (lead?.company ?? "target-account").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    providerMode,
    dedupedCount,
    qualityScore: Math.min(98, Math.max(50, 74 + accepted.length * 8 - Math.floor(rejectedCount / 2))),
    evidence: [
      {
        label: "Public business signal",
        value: lead?.company ?? "Qualified company profile",
        detail: `Matched ${source} evidence against the workspace ICP and selected regions.`,
        url: `https://${companySlug}.example`,
        confidence: 91,
      },
      {
        label: "Contact evidence",
        value: lead?.email ?? "Business contact available",
        detail: "Contact signal is retained for review; suppression is checked before outreach.",
        url: null,
        confidence: 84,
      },
    ],
    rejectionReasons: [
      {
        reason: "Below target ICP threshold",
        count: Math.max(1, rejectedCount - 2),
        detail: "Rejected candidates lacked a strong fit with buyer role, region, or pain signal.",
      },
      {
        reason: "Duplicate company or domain",
        count: dedupedCount,
        detail: "Duplicate candidates were removed before lead creation.",
      },
    ],
    complianceChecks: [
      "Public business signal checked",
      "B2B-only source posture",
      "Suppression handoff required before outreach",
    ],
    freshness: "Scanned just now",
    nextAction: "Review qualified evidence before campaign enrollment.",
  };
}

const DEFAULT_APPROVAL_GATES = ["first outreach", "phone calls", "new channels"];

function readinessGapsFor(input: {
  businessProfile: BusinessProfile;
  buyerRoles: string[];
  painPoints: string[];
  sourceChannels: string[];
  outreachChannels: string[];
  searchKeywords: string[];
  complianceNotes: string;
}) {
  const gaps: string[] = [];

  if (!input.businessProfile.website.trim()) {
    gaps.push("Add the company website so source planning can anchor to a real business.");
  }

  if (input.businessProfile.regions.length === 0) {
    gaps.push("Choose at least one region before lead discovery runs.");
  }

  if (input.businessProfile.goals.length === 0) {
    gaps.push("Define sales goals so lead sourcing and outreach can optimize for the right outcome.");
  }

  if (input.buyerRoles.length === 0) {
    gaps.push("Add buyer roles for qualification and personalization.");
  }

  if (input.painPoints.length === 0) {
    gaps.push("Add customer pain points before campaign drafting.");
  }

  if (input.sourceChannels.length === 0) {
    gaps.push("Select at least one lead source channel.");
  }

  if (input.outreachChannels.length === 0) {
    gaps.push("Select at least one outreach channel.");
  }

  if (input.searchKeywords.length === 0) {
    gaps.push("Add search keywords for source runs.");
  }

  if (!input.complianceNotes.trim()) {
    gaps.push("Record compliance notes before widening live outreach.");
  }

  return gaps;
}

function readinessScoreFor(gaps: string[]) {
  return Math.max(0, 100 - gaps.length * 11);
}

export function aiWorkerTaskBlockReason(worker: {
  name: string;
  status: AiWorker["status"] | string;
  monthlyBudgetCents: number;
  budgetUsedCents: number;
}, expectedCostCents: number) {
  if (worker.status !== "active") {
    return `${worker.name} is ${worker.status}; only active workers can receive task proposals.`;
  }

  const remainingBudgetCents = Math.max(
    0,
    worker.monthlyBudgetCents - worker.budgetUsedCents,
  );

  if (expectedCostCents > remainingBudgetCents) {
    return `Expected cost ${expectedCostCents} cents exceeds ${worker.name}'s remaining monthly budget of ${remainingBudgetCents} cents.`;
  }

  return null;
}

export function buildSalesBlueprintFromProfile(
  profile: BusinessProfile,
  sourcePlan: SourcePlan | null = null,
): SalesBlueprint {
  const sourceChannels = sourcePlan?.sources ?? ["website", "search", "directory", "csv"];
  const outreachChannels = profile.channels.length > 0 ? profile.channels : ["email"];
  const searchKeywords = sourcePlan?.searchTerms ?? [
    `${profile.targetAudience} ${profile.regions[0] ?? "global"}`,
    `${profile.industry} growth leads`,
  ];
  const buyerRoles = ["Founder", "Head of Sales", "Revenue Operations"];
  const painPoints = ["Manual prospecting", "Slow meeting conversion", "Low outbound visibility"];
  const qualificationRules = [
    "Prioritize accounts matching the target audience and regions.",
    "Require a public business signal before outreach draft creation.",
    "Keep first-touch outreach approval-gated.",
  ];
  const businessProfile = {
    ...profile,
    goals: profile.goals.length > 0 ? profile.goals : ["Increase qualified pipeline"],
    channels: outreachChannels,
  };
  const complianceNotes =
    "Respect unsubscribe, do-not-contact, sender reputation, and local outreach rules before live dispatch.";
  const readinessGaps = readinessGapsFor({
    businessProfile,
    buyerRoles,
    painPoints,
    sourceChannels,
    outreachChannels,
    searchKeywords,
    complianceNotes,
  });
  const readinessScore = readinessScoreFor(readinessGaps);

  return {
    id: createId("blueprint"),
    status: readinessScore >= 85 ? "ready" : "needs_review",
    businessProfile,
    icpSummary: businessProfile.targetAudience,
    buyerRoles,
    painPoints,
    disqualifiers: [
      "No clear business website or public company signal",
      "Outside selected regions",
      "No relevant pain signal for the offer",
    ],
    qualificationRules,
    sourceChannels,
    outreachChannels,
    searchKeywords,
    monthlyLeadTarget: 250,
    meetingTarget: 20,
    averageContractValue: 5000,
    automationMode: "approval_gated",
    approvalRequiredFor: DEFAULT_APPROVAL_GATES,
    complianceNotes,
    readinessScore,
    readinessGaps,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function buildSalesBlueprintFromInput(
  input: UpsertSalesBlueprintInput,
  id = createId("blueprint"),
): SalesBlueprint {
  const businessProfile: BusinessProfile = {
    businessName: input.businessName,
    website: input.website,
    industry: input.industry,
    offerSummary: input.offerSummary,
    targetAudience: input.targetAudience,
    regions: input.regions,
    goals: input.goals,
    channels: input.channels,
    constraints: input.constraints,
    voice: input.voice,
    summary: input.summary,
  };
  const readinessGaps = readinessGapsFor({
    businessProfile,
    buyerRoles: input.buyerRoles,
    painPoints: input.painPoints,
    sourceChannels: input.sourceChannels,
    outreachChannels: input.outreachChannels,
    searchKeywords: input.searchKeywords,
    complianceNotes: input.complianceNotes,
  });
  const readinessScore = readinessScoreFor(readinessGaps);

  return {
    id,
    status: readinessScore >= 85 ? "ready" : "needs_review",
    businessProfile,
    icpSummary: input.icpSummary,
    buyerRoles: input.buyerRoles,
    painPoints: input.painPoints,
    disqualifiers: input.disqualifiers,
    qualificationRules: input.qualificationRules,
    sourceChannels: input.sourceChannels,
    outreachChannels: input.outreachChannels,
    searchKeywords: input.searchKeywords,
    monthlyLeadTarget: input.monthlyLeadTarget,
    meetingTarget: input.meetingTarget,
    averageContractValue: input.averageContractValue,
    automationMode: input.automationMode,
    approvalRequiredFor: input.approvalRequiredFor.length > 0
      ? input.approvalRequiredFor
      : DEFAULT_APPROVAL_GATES,
    complianceNotes: input.complianceNotes,
    readinessScore,
    readinessGaps,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export class DemoStore {
  private contactIntakeSubmissions: ContactIntakeRecord[] = [];

  private readonly workspace: WorkspaceSummary = {
    organizationName: "Northstar Labs",
    workspaceName: "Growth OS",
    region: "global",
    primaryChannel: "email",
  };

  createContactIntake(input: CreateContactIntakeInput): ContactIntakeRecord {
    const now = new Date().toISOString();
    const routing = scoreContactIntake(input);
    const { companyWebsiteUrl: _companyWebsiteUrl, ...storedInput } = input;
    const submission: ContactIntakeRecord = {
      ...storedInput,
      id: createId("intake"),
      status: "new",
      priority: routing.priority,
      qualificationScore: routing.qualificationScore,
      routingRecommendation: routing.routingRecommendation,
      createdAt: now,
      updatedAt: now,
    };

    this.contactIntakeSubmissions.unshift(submission);
    return submission;
  }

  private readonly subscription: SubscriptionRecord = {
    planKey: "pro",
    status: "trialing",
    seats: 5,
    usageLimit: 500,
    monthlyUsage: 117,
  };

  private usageByMetric: Record<UsageEntitlementMetric, number> = {
    leads_created: this.subscription.monthlyUsage,
    outreach_dispatches: 0,
    voice_calls: 0,
    provider_cost_cents: 0,
    ai_worker_task_proposals: 0,
    ai_worker_execution_cents: 0,
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
  private salesBlueprint: SalesBlueprint | null = buildSalesBlueprintFromProfile(
    inferProfile(this.onboarding),
    this.sourcePlan,
  );

  private sourceRuns: SourceRun[] = [
    {
      id: "run_1",
      source: "website",
      status: "completed",
      providerMode: "mock",
      candidatesFound: 18,
      dedupedCount: 3,
      qualifiedCount: 7,
      rejectedCount: 8,
      qualityScore: 86,
      evidence: [
        {
          label: "Homepage ICP signal",
          value: "B2B SaaS outbound team",
          detail: "Public website copy matched the founder-led SaaS target audience.",
          url: "https://orbitops.ai",
          confidence: 92,
        },
        {
          label: "Contact page",
          value: "Business email discovered",
          detail: "A reviewable contact route exists; suppression still applies before dispatch.",
          url: "https://orbitops.ai/contact",
          confidence: 87,
        },
      ],
      rejectionReasons: [
        {
          reason: "No clear business website",
          count: 4,
          detail: "Rejected candidates did not expose a public company signal.",
        },
        {
          reason: "Duplicate company or domain",
          count: 3,
          detail: "Duplicate candidates were removed before lead creation.",
        },
      ],
      complianceChecks: [
        "Public business signal checked",
        "B2B-only source posture",
        "Suppression handoff required before outreach",
      ],
      freshness: "Scanned 2h ago",
      nextAction: "Review qualified evidence before campaign enrollment.",
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

  private actionProposals: ActionProposal[] = [
    {
      id: "appr_1",
      type: "campaign_dispatch",
      status: "pending",
      riskLevel: "high",
      title: "Approve first send for Founder outbound",
      detail:
        "The draft email campaign has qualified leads enrolled and is waiting for an operator before the first outbound touch can leave the workspace.",
      proposedBy: "ai",
      targetKind: "campaign",
      targetId: "camp_1",
      targetLabel: "Founder outbound",
      payloadSummary: "Approve the first email send for 28 enrolled founder-led SaaS leads.",
      payload: {
        campaignId: "camp_1",
        channel: "email",
        leadsEnrolled: 28,
      },
      guardrails: [
        "Suppression checks run before provider dispatch.",
        "Only the first touch is unlocked by this review.",
        "Provider failures keep the campaign in review.",
      ],
      expectedEffect:
        "Campaign moves from draft to approved so the first personalized outreach task can be queued.",
      rollbackPlan:
        "Pause the campaign from the approval inbox or campaign controls before provider dispatch.",
      requiredRole: "admin",
      requestedBy: "ai-sales-operator",
      reviewedBy: null,
      reviewNote: null,
      auditEventId: null,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      expiresAt: null,
    },
    {
      id: "appr_worker_1",
      type: "ai_worker_action",
      status: "pending",
      riskLevel: "medium",
      title: "Research 40 founder-led SaaS accounts",
      detail:
        "The Sales researcher worker wants to run a read-only source pass using configured business directories and public company websites. No outreach or contact mutation will occur from this approval.",
      proposedBy: "ai",
      targetKind: "ai_worker",
      targetId: "worker_researcher",
      targetLabel: "Sales researcher",
      payloadSummary: "Run one governed research task for 40 ICP-fit accounts.",
      payload: {
        workerId: "worker_researcher",
        runId: "worker_run_1",
        proposedAction: "Collect public company evidence, dedupe candidates, and prepare a lead-source review batch.",
        expectedCostCents: 1800,
      },
      guardrails: [
        "Read-only tools only.",
        "No outreach, enrichment purchase, or CRM mutation.",
        "Every accepted lead must include source evidence.",
      ],
      expectedEffect:
        "Creates a reviewable lead-source batch for the approval-gated collection engine.",
      rollbackPlan:
        "Reject the proposal; no worker task runs and no workspace state changes.",
      requiredRole: "admin",
      requestedBy: "ai-worker-control-plane",
      reviewedBy: null,
      reviewNote: null,
      auditEventId: null,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      expiresAt: null,
    },
  ];

  private aiWorkers: AiWorker[] = [
    {
      id: "worker_researcher",
      name: "Sales researcher",
      role: "Lead discovery and evidence preparation",
      status: "active",
      riskLevel: "medium",
      ownerRole: "admin",
      description:
        "Finds reviewable public business signals, dedupes candidates, and prepares lead-source batches.",
      permissions: ["Read sales blueprint", "Read source plan", "Create approval proposals"],
      allowedTools: ["website-source", "directory-source", "search-source", "csv-import"],
      blockedTools: ["email-send", "voice-call", "billing-change", "crm-write"],
      monthlyBudgetCents: 50000,
      budgetUsedCents: 12400,
      lastActionAt: new Date().toISOString(),
      guardrails: [
        "Must include source evidence for accepted leads.",
        "Cannot dispatch outreach.",
        "Must respect suppression handoff before campaign enrollment.",
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "worker_outreach",
      name: "Outreach strategist",
      role: "Drafts channel-specific outreach for approved campaigns",
      status: "paused",
      riskLevel: "high",
      ownerRole: "admin",
      description:
        "Prepares personalized email, LinkedIn, SMS, and call scripts after lead evidence is reviewed.",
      permissions: ["Read leads", "Read campaigns", "Create approval proposals"],
      allowedTools: ["message-draft", "campaign-read", "suppression-check"],
      blockedTools: ["email-send", "sms-send", "linkedin-send", "voice-call"],
      monthlyBudgetCents: 75000,
      budgetUsedCents: 21000,
      lastActionAt: new Date().toISOString(),
      guardrails: [
        "First touch always requires approval.",
        "Suppression checks are required before any provider dispatch.",
        "Provider sends remain blocked until integration readiness is configured.",
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "worker_meetings",
      name: "Meeting coordinator",
      role: "Books and updates meetings after qualified replies",
      status: "active",
      riskLevel: "medium",
      ownerRole: "admin",
      description:
        "Turns qualified responses into meeting proposals and tracks follow-through.",
      permissions: ["Read leads", "Read calls", "Create meeting proposals"],
      allowedTools: ["calendar-read", "meeting-draft", "crm-read"],
      blockedTools: ["calendar-write", "crm-write", "payment-change"],
      monthlyBudgetCents: 35000,
      budgetUsedCents: 8200,
      lastActionAt: null,
      guardrails: [
        "Meeting creation is proposal-gated until calendar write access is configured.",
        "Never overwrite existing booked times.",
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "worker_crm",
      name: "CRM operator",
      role: "Maintains sales state after approved operator actions",
      status: "disabled",
      riskLevel: "critical",
      ownerRole: "owner",
      description:
        "Reserved for future CRM mutations once audit coverage, rollback, and provider mapping are complete.",
      permissions: ["Read workspace state"],
      allowedTools: ["crm-read", "audit-read"],
      blockedTools: ["crm-write", "billing-change", "team-admin", "provider-secret"],
      monthlyBudgetCents: 0,
      budgetUsedCents: 0,
      lastActionAt: null,
      guardrails: [
        "Mutation tools are disabled.",
        "Owner review required before enabling write access.",
        "Rollback plan required for every CRM state change.",
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private aiWorkerRuns: AiWorkerRun[] = [
    {
      id: "worker_run_1",
      workerId: "worker_researcher",
      workerName: "Sales researcher",
      status: "proposed",
      title: "Research 40 founder-led SaaS accounts",
      detail:
        "Prepare a reviewable lead-source batch from public company pages and directories.",
      riskLevel: "medium",
      proposedAction:
        "Collect public company evidence, dedupe candidates, and prepare a lead-source review batch.",
      expectedCostCents: 1800,
      actualCostCents: 0,
      approvalProposalId: "appr_worker_1",
      resultSummary: null,
      blockedReason: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "worker_run_2",
      workerId: "worker_outreach",
      workerName: "Outreach strategist",
      status: "blocked",
      title: "Draft first-touch sequence for Founder outbound",
      detail:
        "The worker can draft copy, but live provider dispatch is blocked until email readiness and first-touch approval are complete.",
      riskLevel: "high",
      proposedAction:
        "Draft a five-step email and call follow-up sequence using approved lead evidence.",
      expectedCostCents: 2400,
      actualCostCents: 0,
      approvalProposalId: null,
      resultSummary: null,
      blockedReason: "Email provider readiness and first-touch approval are required before dispatch.",
      createdAt: new Date().toISOString(),
      completedAt: null,
      updatedAt: new Date().toISOString(),
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
      dealValueCents: 0,
      dealCurrency: "USD",
    },
  ];

  private suppressions: SuppressionRecord[] = [];
  private telegramIntegration: TelegramIntegration | null = null;
  private telegramCommandAudits: TelegramCommandAudit[] = [];

  private buildActionItems(): ActionItem[] {
    const items: ActionItem[] = [
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

    const pendingProposals = this.actionProposals.filter((proposal) => proposal.status === "pending");
    if (pendingProposals.length > 0) {
      items.unshift({
        id: "action_approval_inbox",
        title: `${pendingProposals.length} approval proposal${pendingProposals.length === 1 ? "" : "s"} waiting`,
        detail:
          "Review proposed campaign, Telegram, provider, or AI-worker actions before they mutate workspace state.",
        urgency: pendingProposals.some((proposal) => proposal.riskLevel === "high" || proposal.riskLevel === "critical")
          ? "high"
          : "medium",
      });
    }

    if (this.suppressions.length === 0) {
      items.push({
        id: "action_4",
        title: "Configure suppression controls",
        detail: "Add unsubscribe and do-not-contact rules before widening live outreach channels.",
        urgency: "medium",
      });
    }

    return items;
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

  listSuppressions() {
    return this.suppressions;
  }

  createSuppression(input: CreateSuppressionInput) {
    const normalizedContactValue = normalizeSuppressionContactValue(
      input.contactValue,
      input.channel,
    );
    const existing = this.suppressions.find(
      (suppression) =>
        suppression.channel === input.channel &&
        suppression.normalizedContactValue === normalizedContactValue,
    );

    if (existing) {
      return existing;
    }

    const suppression: SuppressionRecord = {
      id: createId("supp"),
      channel: input.channel,
      contactValue: input.contactValue.trim(),
      normalizedContactValue,
      reason: input.reason,
      source: input.source,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt ?? null,
    };

    this.suppressions = [suppression, ...this.suppressions];
    return suppression;
  }

  checkSuppression(input: CheckSuppressionInput) {
    const lookupChannels = suppressionLookupChannels(input.channel);
    const contactValues = new Set<string>();

    if (input.contactValue) {
      contactValues.add(normalizeSuppressionContactValue(input.contactValue, input.channel));
    }

    if (input.email) {
      contactValues.add(normalizeSuppressionContactValue(input.email, "email"));
    }

    if (input.phone) {
      contactValues.add(normalizeSuppressionContactValue(input.phone, "phone"));
    }

    const now = Date.now();
    const matchedSuppression =
      this.suppressions.find((suppression) => {
        if (!lookupChannels.includes(suppression.channel)) {
          return false;
        }

        if (suppression.expiresAt && new Date(suppression.expiresAt).getTime() <= now) {
          return false;
        }

        return contactValues.has(suppression.normalizedContactValue);
      }) ?? null;

    return {
      suppressed: Boolean(matchedSuppression),
      matchedSuppression,
      detail: matchedSuppression
        ? `Suppressed by ${matchedSuppression.reason} rule from ${matchedSuppression.source}.`
        : "No active suppression matched this contact.",
    };
  }

  getTelegramIntegration(): TelegramIntegration {
    return this.telegramIntegration ?? {
      id: null,
      status: "not_configured",
      botUsername: null,
      chatIdMask: null,
      allowedCommands: [...telegramDefaultAllowedCommands],
      lastUpdateId: null,
      lastVerifiedAt: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  upsertTelegramIntegration(input: ConfigureTelegramIntegrationInput) {
    const now = new Date().toISOString();
    this.telegramRawChatId = input.chatId;
    this.telegramIntegration = {
      id: this.telegramIntegration?.id ?? createId("tg"),
      status: "pending_verification",
      botUsername: input.botUsername,
      chatIdMask: maskTelegramChatId(input.chatId),
      allowedCommands: input.allowedCommands,
      lastUpdateId: null,
      lastVerifiedAt: null,
      createdAt: this.telegramIntegration?.createdAt ?? now,
      updatedAt: now,
    };

    return this.telegramIntegration;
  }

  resolveTelegramIntegrationByChatIdHash(chatIdHash: string) {
    if (!this.telegramIntegration?.chatIdMask) {
      return null;
    }

    return this.telegramIntegration.id && this.telegramChatIdHash === chatIdHash
      ? {
          integration: this.telegramIntegration,
          organizationId: "demo-organization",
          workspaceId: "demo-workspace",
        }
      : null;
  }

  private get telegramChatIdHash() {
    return this.telegramRawChatId ? hashTelegramChatId(this.telegramRawChatId) : null;
  }

  private telegramRawChatId: string | null = null;

  claimTelegramWebhookUpdate(chatIdHash: string, updateId: number | null) {
    if (!this.telegramIntegration || this.telegramChatIdHash !== chatIdHash || updateId === null) {
      return true;
    }

    if (
      this.telegramIntegration.lastUpdateId !== null &&
      updateId <= this.telegramIntegration.lastUpdateId
    ) {
      return false;
    }

    this.telegramIntegration = {
      ...this.telegramIntegration,
      lastUpdateId: updateId,
      updatedAt: new Date().toISOString(),
    };

    return true;
  }

  markTelegramIntegrationVerified(chatIdHash: string) {
    if (!this.telegramIntegration || this.telegramChatIdHash !== chatIdHash) {
      return null;
    }

    const now = new Date().toISOString();
    this.telegramIntegration = {
      ...this.telegramIntegration,
      status: "active",
      lastVerifiedAt: now,
      updatedAt: now,
    };

    return this.telegramIntegration;
  }

  disableTelegramIntegration() {
    if (!this.telegramIntegration) {
      return this.getTelegramIntegration();
    }

    this.telegramIntegration = {
      ...this.telegramIntegration,
      status: "disabled",
      updatedAt: new Date().toISOString(),
    };

    return this.telegramIntegration;
  }

  listTelegramCommandAudits() {
    return this.telegramCommandAudits.slice(0, 8);
  }

  recordTelegramCommandAudit(input: {
    command: string;
    chatIdMask: string;
    result: TelegramCommandResult;
    detail: string;
  }) {
    const audit: TelegramCommandAudit = {
      id: createId("tg_audit"),
      command: input.command,
      chatIdMask: input.chatIdMask,
      result: input.result,
      detail: input.detail,
      createdAt: new Date().toISOString(),
    };

    this.telegramCommandAudits = [audit, ...this.telegramCommandAudits].slice(0, 20);
    return audit;
  }

  checkUsageEntitlement(
    metric: UsageEntitlementMetric,
    requestedQuantity = 1,
  ): UsageEntitlementResult {
    const usageLimit = metric === "provider_cost_cents"
      ? getPlanProviderCostBudgetCents(this.subscription.planKey)
      : metric === "outreach_dispatches"
        ? getPlanOutreachDispatchLimit(this.subscription.planKey)
        : metric === "voice_calls"
          ? getPlanVoiceCallLimit(this.subscription.planKey)
          : metric === "ai_worker_task_proposals"
            ? getPlanAiWorkerTaskProposalLimit(this.subscription.planKey)
            : metric === "ai_worker_execution_cents"
              ? getPlanAiWorkerExecutionBudgetCents(this.subscription.planKey)
              : this.subscription.usageLimit;

    return evaluateUsageEntitlement({
      metric,
      planKey: this.subscription.planKey,
      subscriptionStatus: this.subscription.status,
      currentUsage: this.usageByMetric[metric] ?? 0,
      usageLimit,
      requestedQuantity,
      enforceLimit: true,
    });
  }

  checkChannelEntitlement(channel: OutboundChannel): ChannelEntitlementResult {
    return evaluateChannelEntitlement({
      channel,
      planKey: this.subscription.planKey,
      subscriptionStatus: this.subscription.status,
      includedChannels: getPlanIncludedChannels(this.subscription.planKey),
    });
  }

  private recordUsage(metric: UsageEntitlementMetric, quantity: number) {
    this.usageByMetric[metric] = (this.usageByMetric[metric] ?? 0) + quantity;

    if (metric === "leads_created") {
      this.subscription.monthlyUsage += quantity;
    }
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
    this.salesBlueprint = buildSalesBlueprintFromProfile(profile, this.sourcePlan);
    return this.onboarding;
  }

  getBusinessProfile() {
    return this.onboarding.extractedProfile;
  }

  getSalesBlueprint() {
    return this.salesBlueprint;
  }

  upsertSalesBlueprint(input: UpsertSalesBlueprintInput) {
    this.salesBlueprint = buildSalesBlueprintFromInput(
      input,
      this.salesBlueprint?.id ?? createId("blueprint"),
    );
    this.onboarding.extractedProfile = this.salesBlueprint.businessProfile;
    this.onboarding.status = "completed";
    this.onboarding.currentStep = "complete";
    this.sourcePlan = buildSourcePlan(this.salesBlueprint.businessProfile);
    return this.salesBlueprint;
  }

  listActionProposals(status?: ActionProposalStatus) {
    return this.actionProposals
      .filter((proposal) => !status || proposal.status === status)
      .sort((left, right) => {
        if (left.status === "pending" && right.status !== "pending") {
          return -1;
        }

        if (left.status !== "pending" && right.status === "pending") {
          return 1;
        }

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }

  createActionProposal(input: CreateActionProposalInput): ActionProposal {
    const proposal: ActionProposal = {
      id: createId("appr"),
      type: input.type,
      status: "pending",
      riskLevel: input.riskLevel,
      title: input.title,
      detail: input.detail,
      proposedBy: input.proposedBy,
      targetKind: input.targetKind,
      targetId: input.targetId ?? null,
      targetLabel: input.targetLabel,
      payloadSummary: input.payloadSummary,
      payload: input.payload,
      guardrails: input.guardrails,
      expectedEffect: input.expectedEffect,
      rollbackPlan: input.rollbackPlan,
      requiredRole: input.requiredRole,
      requestedBy: input.requestedBy ?? null,
      reviewedBy: null,
      reviewNote: null,
      auditEventId: null,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      expiresAt: input.expiresAt ?? null,
    };

    this.actionProposals = [proposal, ...this.actionProposals];
    return proposal;
  }

  getAiWorkerControlPlane(): AiWorkerControlPlaneResponse {
    return {
      workers: this.aiWorkers,
      runs: [...this.aiWorkerRuns].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
      summary: {
        active: this.aiWorkers.filter((worker) => worker.status === "active").length,
        paused: this.aiWorkers.filter((worker) => worker.status === "paused").length,
        disabled: this.aiWorkers.filter((worker) => worker.status === "disabled").length,
        pendingApproval: this.aiWorkerRuns.filter((run) => run.status === "proposed").length,
        blocked: this.aiWorkerRuns.filter((run) => run.status === "blocked").length,
        budgetUsedCents: this.aiWorkers.reduce(
          (total, worker) => total + worker.budgetUsedCents,
          0,
        ),
        budgetLimitCents: this.aiWorkers.reduce(
          (total, worker) => total + worker.monthlyBudgetCents,
          0,
        ),
      },
    };
  }

  createAiWorkerTaskProposal(input: CreateAiWorkerTaskInput): AiWorkerRun | null {
    const worker = this.aiWorkers.find((entry) => entry.id === input.workerId);
    if (!worker) {
      return null;
    }

    const now = new Date().toISOString();
    const runId = createId("worker_run");
    const blockedReason = aiWorkerTaskBlockReason(worker, input.expectedCostCents);

    if (blockedReason) {
      const run: AiWorkerRun = {
        id: runId,
        workerId: worker.id,
        workerName: worker.name,
        status: "blocked",
        title: input.title,
        detail: input.detail,
        riskLevel: input.riskLevel,
        proposedAction: input.proposedAction,
        expectedCostCents: input.expectedCostCents,
        actualCostCents: 0,
        approvalProposalId: null,
        resultSummary: null,
        blockedReason,
        createdAt: now,
        completedAt: null,
        updatedAt: now,
      };

      this.aiWorkerRuns = [run, ...this.aiWorkerRuns];
      this.aiWorkers = this.aiWorkers.map((entry) =>
        entry.id === worker.id
          ? { ...entry, lastActionAt: now, updatedAt: now }
          : entry,
      );

      return run;
    }

    const proposal = this.createActionProposal({
      type: "ai_worker_action",
      riskLevel: input.riskLevel,
      title: input.title,
      detail: input.detail,
      proposedBy: "ai",
      targetKind: "ai_worker",
      targetId: worker.id,
      targetLabel: worker.name,
      payloadSummary: `Propose ${worker.name} task with an expected budget of ${input.expectedCostCents} cents.`,
      payload: {
        workerId: worker.id,
        runId,
        proposedAction: input.proposedAction,
        expectedCostCents: input.expectedCostCents,
        permissions: worker.permissions,
        allowedTools: worker.allowedTools,
      },
      guardrails: worker.guardrails,
      expectedEffect:
        "Creates a governed worker task record; no tool execution occurs until approved controls are implemented.",
      rollbackPlan:
        "Reject the proposal or pause the worker; proposed tasks do not mutate workspace state.",
      requiredRole: worker.ownerRole,
      requestedBy: "ai-worker-control-plane",
    });
    const run: AiWorkerRun = {
      id: runId,
      workerId: worker.id,
      workerName: worker.name,
      status: "proposed",
      title: input.title,
      detail: input.detail,
      riskLevel: input.riskLevel,
      proposedAction: input.proposedAction,
      expectedCostCents: input.expectedCostCents,
      actualCostCents: 0,
      approvalProposalId: proposal.id,
      resultSummary: null,
      blockedReason: null,
      createdAt: now,
      completedAt: null,
      updatedAt: now,
    };

    this.aiWorkerRuns = [run, ...this.aiWorkerRuns];
    this.aiWorkers = this.aiWorkers.map((entry) =>
      entry.id === worker.id
        ? { ...entry, lastActionAt: now, updatedAt: now }
        : entry,
    );
    this.recordUsage("ai_worker_task_proposals", 1);

    return run;
  }

  reviewActionProposal(
    id: string,
    input: ReviewActionProposalInput,
    reviewer: { id?: string; name: string },
  ) {
    const proposal = this.actionProposals.find((entry) => entry.id === id);
    if (!proposal || proposal.status !== "pending") {
      return null;
    }

    proposal.status = input.decision === "approve" ? "approved" : "rejected";
    proposal.reviewedBy = reviewer.name;
    proposal.reviewNote = input.note;
    proposal.reviewedAt = new Date().toISOString();
    proposal.auditEventId = createId("audit");

    this.applyReviewedAiWorkerProposal(proposal, reviewer.name);

    if (proposal.status === "approved") {
      this.applyApprovedActionProposal(proposal, reviewer.name);
    }

    return proposal;
  }

  private applyReviewedAiWorkerProposal(proposal: ActionProposal, reviewerName: string) {
    if (proposal.type !== "ai_worker_action") {
      return;
    }

    const now = new Date().toISOString();
    this.aiWorkerRuns = this.aiWorkerRuns.map((run) => {
      if (run.approvalProposalId !== proposal.id) {
        return run;
      }

      if (proposal.status === "approved") {
        return {
          ...run,
          status: "approved",
          resultSummary:
            `Approved by ${reviewerName}; task is ready for a governed executor. No tool ran automatically.`,
          blockedReason: null,
          updatedAt: now,
        };
      }

      if (proposal.status === "rejected") {
        return {
          ...run,
          status: "rejected",
          resultSummary: null,
          blockedReason: `Rejected by ${reviewerName}; no worker tools ran.`,
          updatedAt: now,
        };
      }

      return run;
    });
  }

  completeAiWorkerRun(
    id: string,
    input: CompleteAiWorkerRunInput,
    actor: { id?: string; name: string },
  ) {
    const run = this.aiWorkerRuns.find((entry) => entry.id === id);
    if (!run) {
      return {
        run: null,
        status: 404 as const,
        error: "AI worker run not found in this workspace.",
      };
    }

    if (run.status !== "approved") {
      return {
        run: null,
        status: 409 as const,
        error: "Only approved AI worker runs can receive dry-run results.",
      };
    }

    if (input.actualCostCents > run.expectedCostCents) {
      return {
        run: null,
        status: 409 as const,
        error: "Actual dry-run cost cannot exceed the approved expected cost.",
      };
    }

    const worker = this.aiWorkers.find((entry) => entry.id === run.workerId);
    if (!worker) {
      return {
        run: null,
        status: 404 as const,
        error: "AI worker for this run is not available.",
      };
    }

    const remainingBudgetCents = Math.max(0, worker.monthlyBudgetCents - worker.budgetUsedCents);
    if (input.actualCostCents > remainingBudgetCents) {
      return {
        run: null,
        status: 409 as const,
        error: "Actual dry-run cost exceeds the worker's remaining monthly budget.",
      };
    }

    const now = new Date().toISOString();
    const completedRun: AiWorkerRun = {
      ...run,
      status: "completed",
      actualCostCents: input.actualCostCents,
      resultSummary: `${input.resultSummary} Recorded by ${actor.name}; no external worker tool ran automatically.`,
      blockedReason: null,
      completedAt: now,
      updatedAt: now,
    };

    this.aiWorkerRuns = this.aiWorkerRuns.map((entry) =>
      entry.id === run.id ? completedRun : entry,
    );
    this.aiWorkers = this.aiWorkers.map((entry) =>
      entry.id === worker.id
        ? {
            ...entry,
            budgetUsedCents: entry.budgetUsedCents + input.actualCostCents,
            lastActionAt: now,
            updatedAt: now,
          }
        : entry,
    );
    if (input.actualCostCents > 0) {
      this.recordUsage("ai_worker_execution_cents", input.actualCostCents);
    }

    return {
      run: completedRun,
    };
  }

  private applyApprovedActionProposal(proposal: ActionProposal, reviewerName: string) {
    if (proposal.type === "campaign_dispatch" && proposal.targetKind === "campaign" && proposal.targetId) {
      this.approveCampaign(proposal.targetId, reviewerName);
      return;
    }

    if (proposal.type === "telegram_pause") {
      for (const campaign of this.campaigns) {
        if (campaign.stage === "running") {
          campaign.stage = "paused";
          campaign.nextActionAt = `Paused by ${reviewerName} from approval inbox`;
        }
      }
    }
  }

  getSourcePlan() {
    return this.sourcePlan;
  }

  runLeadSource(
    source: string,
    options: {
      providerMode?: SourceRunProviderMode;
      providerCostCents?: number;
    } = {},
  ) {
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
    this.recordUsage("leads_created", 1);
    const evidence = sourceRunEvidenceFor(
      source,
      [newLeads[0]!],
      7,
      4,
      options.providerMode ?? "mock",
    );
    const run: SourceRun = {
      id: createId("run"),
      source,
      status: "completed",
      providerMode: evidence.providerMode,
      candidatesFound: 12,
      dedupedCount: evidence.dedupedCount,
      qualifiedCount: 1,
      rejectedCount: 7,
      qualityScore: evidence.qualityScore,
      evidence: evidence.evidence,
      rejectionReasons: evidence.rejectionReasons,
      complianceChecks: evidence.complianceChecks,
      freshness: evidence.freshness,
      nextAction: evidence.nextAction,
      summary: `The ${source} run found fresh candidates and filtered out low-fit leads using the qualification model.`,
    };
    this.sourceRuns = [run, ...this.sourceRuns];
    if ((options.providerCostCents ?? 0) > 0) {
      this.recordUsage("provider_cost_cents", options.providerCostCents!);
    }
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
    this.recordUsage("leads_created", 1);
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

    this.activities = [activity, ...this.activities];

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
      status: lead.score > 85 ? "queued" : "review_required",
      provider: input.provider,
      providerCallId: null,
      summary:
        lead.score > 85
          ? "Call queued for AI voice dispatch."
          : "Lead requires operator review before AI calling.",
      transcript: "",
      disposition: lead.score > 85 ? "pending" : "needs_review",
      reviewRequired: lead.score <= 85,
    };

    this.calls = [call, ...this.calls];
    return call;
  }

  updateCallSuppressionResult(callId: string, detail: string) {
    const call = this.calls.find((entry) => entry.id === callId);
    if (!call) {
      return null;
    }

    call.status = "review_required";
    call.reviewRequired = true;
    call.disposition = "suppressed";
    call.summary = `${call.summary} ${detail}`;

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

    call.reviewRequired = !approved;
    call.status = approved ? "queued" : "review_required";
    call.disposition = approved ? "pending" : "needs_review";
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
      dealValueCents: 0,
      dealCurrency: "USD",
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
    meeting.dealValueCents = input.status === "completed" ? input.dealValueCents : 0;
    meeting.dealCurrency = input.dealCurrency.toUpperCase();

    const lead = this.leads.find((entry) => entry.id === meeting.leadId);
    if (lead) {
      if (input.status === "completed") {
        lead.status = "won";
        lead.lastTouchpoint = "Meeting completed";
      } else if (input.status === "canceled") {
        lead.status = "lost";
        lead.lastTouchpoint = "Meeting canceled";
      } else if (input.status === "scheduled") {
        lead.status = "meeting_booked";
        lead.lastTouchpoint = "Meeting scheduled";
      }
    }

    return meeting;
  }

  updateOutreachProviderResult(
    activityId: string,
    update: {
      provider: string;
      providerMessageId: string | null;
      status: "queued" | "sent" | "review_required";
      providerCostCents?: number;
      detail: string;
    },
  ) {
    const activity = this.activities.find((entry) => entry.id === activityId);
    if (!activity) {
      return null;
    }

    activity.provider = update.provider;
    activity.providerMessageId = update.providerMessageId;
    activity.status = update.status;
    activity.preview = `${activity.preview} ${update.detail}`;

    const campaign = this.campaigns.find((entry) => entry.id === activity.campaignId);
    const lead = this.leads.find((entry) => entry.id === activity.leadId);

    if (campaign) {
      if (update.status === "review_required") {
        campaign.firstActionCompleted = false;
        campaign.stage = "approved";
        campaign.nextActionAt = "Awaiting manual review before first outbound touch";
      } else {
        campaign.firstActionCompleted = true;
        campaign.stage = "running";
        campaign.nextActionAt =
          update.status === "sent"
            ? "First approved touch sent"
            : "Queued first approved touch";
        this.recordUsage("outreach_dispatches", 1);

        if ((update.providerCostCents ?? 0) > 0) {
          this.recordUsage("provider_cost_cents", update.providerCostCents!);
        }
      }
    }

    if (lead && update.status !== "review_required") {
      lead.status = "contacted";
      lead.lastTouchpoint = `${activity.type} ${update.status} via ${update.provider}`;
    }

    return activity;
  }

  updateCallProviderResult(
    callId: string,
    update: {
      provider: string;
      providerCallId: string | null;
      providerCostCents?: number;
      detail: string;
    },
  ) {
    const call = this.calls.find((entry) => entry.id === callId);
    if (!call) {
      return null;
    }

    call.provider = update.provider;
    call.providerCallId = update.providerCallId;
    call.summary = `${call.summary} ${update.detail}`;

    if (!call.reviewRequired) {
      this.recordUsage("voice_calls", 1);

      if ((update.providerCostCents ?? 0) > 0) {
        this.recordUsage("provider_cost_cents", update.providerCostCents!);
      }

      if (update.providerCallId) {
        call.status = "in_progress";
        call.disposition = "in_progress";
      } else {
        call.status = "completed";
        call.disposition = "meeting_requested";

        const lead = this.leads.find((entry) => entry.id === call.leadId);
        if (lead) {
          lead.status = "meeting_booked";
          lead.lastTouchpoint = `AI-assisted call completed via ${update.provider}`;
        }

        const existingMeeting = this.meetings.find(
          (entry) =>
            entry.leadId === call.leadId &&
            (entry.owner === AI_ASSISTED_MEETING_OWNER ||
              entry.owner === LEGACY_AUTONOMOUS_MEETING_OWNER),
        );
        if (!existingMeeting) {
          this.meetings = [
            {
              id: createId("meet"),
              leadId: call.leadId,
              status: "scheduled",
              scheduledFor: "2026-03-14T15:30:00Z",
              owner: AI_ASSISTED_MEETING_OWNER,
              notes: "Created after positive AI-assisted call disposition.",
              dealValueCents: 0,
              dealCurrency: "USD",
            },
            ...this.meetings,
          ];
        }
      }
    }

    return call;
  }

  updateCallProviderFailure(
    callId: string,
    update: {
      provider: string;
      detail: string;
    },
  ) {
    const call = this.calls.find((entry) => entry.id === callId);
    if (!call) {
      return null;
    }

    call.provider = update.provider;
    call.providerCallId = null;
    call.status = "review_required";
    call.reviewRequired = true;
    call.disposition = "provider_failed";
    call.summary = `${call.summary} ${update.detail}`;

    return call;
  }
}

export const demoStore = new DemoStore();
