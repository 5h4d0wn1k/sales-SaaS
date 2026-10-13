import type {
  AiWorkerControlPlaneResponse,
  ContentOpportunityPlan,
  DashboardResponse,
  SalesBlueprint,
} from "@sales/shared";

export type DashboardCockpitTone = "good" | "warn" | "blocked" | "neutral";

export type DashboardCockpitSignal = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: DashboardCockpitTone;
  actionLabel: string;
  href: string;
};

type DashboardCockpitInput = {
  dashboard: Pick<
    DashboardResponse,
    "subscription" | "sourcePlan" | "sourceRuns" | "campaigns" | "leads"
  >;
  blueprint: Pick<
    SalesBlueprint,
    "status" | "readinessScore" | "readinessGaps"
  > | null;
  pendingProposalCount: number;
  canReviewProposals: boolean;
  emailVerified: boolean;
  workspaceCount: number;
  aiWorkerSummary?: AiWorkerControlPlaneResponse["summary"] | null;
  contentPlan?: Pick<
    ContentOpportunityPlan,
    "publishingBlocked" | "blockers" | "opportunities"
  > | null;
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildDashboardCockpit(input: DashboardCockpitInput) {
  const sourceCount = input.dashboard.sourcePlan?.sources.length ?? 0;
  const sourceRunCount = input.dashboard.sourceRuns.length;
  const qualifiedLeads = input.dashboard.leads.filter(
    (lead) => lead.status === "qualified",
  ).length;
  const dispatchReadyCampaigns = input.dashboard.campaigns.filter(
    (campaign) => campaign.approved && !campaign.firstActionCompleted,
  ).length;
  const draftCampaigns = input.dashboard.campaigns.filter(
    (campaign) => !campaign.approved,
  ).length;
  const activeWorkers = input.aiWorkerSummary?.active ?? 0;
  const pendingWorkerApprovals = input.aiWorkerSummary?.pendingApproval ?? 0;
  const blockedWorkers = input.aiWorkerSummary?.blocked ?? 0;
  const opportunityCount = input.contentPlan?.opportunities.length ?? 0;
  const contentBlocked = input.contentPlan?.publishingBlocked ?? true;

  const signals: DashboardCockpitSignal[] = [
    {
      id: "blueprint",
      label: "Sales Blueprint",
      value: input.blueprint ? `${input.blueprint.readinessScore}/100` : "Missing",
      tone: !input.blueprint
        ? "blocked"
        : input.blueprint.readinessScore >= 85 && input.blueprint.readinessGaps.length === 0
          ? "good"
          : "warn",
      detail: !input.blueprint
        ? "Save the workspace business profile before serious lead planning."
        : input.blueprint.readinessGaps[0] ??
          `${input.blueprint.status.replace("_", " ")} blueprint is ready for governed execution.`,
      actionLabel: "Open settings",
      href: "/settings",
    },
    {
      id: "approvals",
      label: "Approval Inbox",
      value: String(input.pendingProposalCount),
      tone: input.pendingProposalCount === 0
        ? "good"
        : input.canReviewProposals
          ? "warn"
          : "blocked",
      detail: input.pendingProposalCount === 0
        ? "No high-risk workspace changes are waiting for review."
        : input.canReviewProposals
          ? "Review pending proposals before outreach, Telegram, or AI-worker actions proceed."
          : "Owner/admin access with verified email is required before these actions can move.",
      actionLabel: "Review queue",
      href: "/dashboard#approval-inbox",
    },
    {
      id: "source-evidence",
      label: "Source Evidence",
      value: sourceCount > 0
        ? `${sourceRunCount}/${sourceCount}`
        : "No plan",
      tone: sourceRunCount > 0 ? "good" : sourceCount > 0 ? "warn" : "blocked",
      detail: sourceRunCount > 0
        ? "Source runs are producing evidence for operator review before outreach."
        : sourceCount > 0
          ? "Run discovery to turn the plan into reviewable lead evidence."
          : "Build a source plan from the Sales Blueprint before collecting leads.",
      actionLabel: sourceCount > 0 ? "Run discovery" : "Build plan",
      href: sourceCount > 0 ? "/dashboard#lead-collection" : "/settings",
    },
    {
      id: "outreach",
      label: "Outreach Gate",
      value: dispatchReadyCampaigns > 0
        ? pluralize(dispatchReadyCampaigns, "ready campaign")
        : pluralize(draftCampaigns, "draft"),
      tone: dispatchReadyCampaigns > 0
        ? "good"
        : draftCampaigns > 0 || qualifiedLeads > 0
          ? "warn"
          : "neutral",
      detail: dispatchReadyCampaigns > 0
        ? "Approved campaigns still recheck entitlements, suppression, and provider budget at dispatch."
        : qualifiedLeads > 0
          ? "Qualified leads are available; create or approve a guarded campaign next."
          : "Lead qualification must happen before safe outreach can start.",
      actionLabel: "Open outreach",
      href: "/dashboard#outreach-operations",
    },
    {
      id: "ai-workers",
      label: "AI Workers",
      value: `${activeWorkers} active`,
      tone: blockedWorkers > 0
        ? "blocked"
        : pendingWorkerApprovals > 0
          ? "warn"
          : activeWorkers > 0
            ? "good"
            : "neutral",
      detail: blockedWorkers > 0
        ? "Worker activity has blocked runs that need budget, policy, or approval review."
        : pendingWorkerApprovals > 0
          ? "AI worker actions are waiting in the approval path before execution."
          : activeWorkers > 0
            ? "Workers are registered but still approval-gated for high-impact actions."
            : "AI worker registry is not available for this workspace yet.",
      actionLabel: "Open workers",
      href: "/dashboard#ai-workers",
    },
    {
      id: "demand-engine",
      label: "Demand Engine",
      value: pluralize(opportunityCount, "brief"),
      tone: contentBlocked
        ? opportunityCount > 0
          ? "warn"
          : "neutral"
        : "good",
      detail: contentBlocked
        ? input.contentPlan?.blockers[0] ??
          "Content stays review-gated until the blueprint and claim guardrails are ready."
        : "Claim-safe SEO opportunities are ready for operator-reviewed briefs.",
      actionLabel: "Open demand",
      href: "/dashboard#content-demand",
    },
  ];

  const blockedCount = signals.filter((signal) => signal.tone === "blocked").length;
  const warningCount = signals.filter((signal) => signal.tone === "warn").length;
  const overallTone: DashboardCockpitTone =
    blockedCount > 0 ? "blocked" : warningCount > 0 ? "warn" : "good";

  return {
    overallTone,
    overallLabel:
      overallTone === "good"
        ? "ready"
        : overallTone === "blocked"
          ? "blocked"
          : "needs review",
    summary: {
      blocked: blockedCount,
      needsReview: warningCount,
      ready: signals.filter((signal) => signal.tone === "good").length,
      workspaces: input.workspaceCount,
      emailVerified: input.emailVerified,
      planKey: input.dashboard.subscription.planKey,
      subscriptionStatus: input.dashboard.subscription.status,
    },
    signals,
  };
}
