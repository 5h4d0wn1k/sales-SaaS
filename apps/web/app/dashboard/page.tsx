import type { ReactNode } from "react";
import type { Metadata } from "next";
import {
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  PhoneCall,
  Search,
  Send,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  buildMeetingCalendarHandoff,
  buildCrmHandoff,
  buildRevenueReconciliation,
  buildCommandCenterCommandPreview,
  getCommandCenterCapabilities,
  platformModules,
  readinessChecklist,
  type CommandCenterCapabilityStatus,
  type CommandCenterPolicyDecision,
  type CommandCenterPolicyPreconditionStatus,
  type ConversionBriefPosture,
  type ConversionWorkQueueUrgency,
  type OutboundChannelReadinessPosture,
  type OutreachSequencePlanPosture,
  type PlanGrowthReadinessPosture,
  type RevenueForecastPosture,
} from "@sales/shared";
import { auth } from "../../auth";
import {
  getActionProposals,
  getAuditLog,
  getAiWorkerControlPlane,
  getAiWorkerExecutionReadiness,
  getAiWorkerMarginReadiness,
  getCommandCenterBrief,
  getCommandCenterPolicies,
  getConversionBrief,
  getConversionIntegrationReadiness,
  getConversionWorkQueue,
  getContentOpportunityPlan,
  getDashboardData,
  getManagedServiceReadiness,
  getOutboundChannelReadiness,
  getOutreachSequencePlan,
  getPlanGrowthReadiness,
  getRevenueForecast,
  getSalesBlueprint,
  getSourceAcquisitionReadiness,
  getWorkspaceMemberships,
} from "./api";
import {
  isServerApiUnauthorizedError,
  isServerApiWorkspaceSelectionRequiredError,
} from "@/lib/server-api-auth";
import { readUpgradeSearchParams } from "@/lib/upgrade-recommendation";
import {
  buildSourceProviderGovernanceRunGate,
  readSourceProviderGovernanceSearchParams,
} from "@/lib/source-provider-governance";
import { buildCampaignDispatchReadinessGate } from "@/lib/campaign-dispatch-readiness";
import { buildAiWorkerBudgetReadiness } from "@/lib/ai-worker-budget-readiness";
import {
  buildDashboardCockpit,
  type DashboardCockpitTone,
} from "@/lib/dashboard-cockpit";
import { buildContentDemandRows } from "@/lib/content-demand-display";
import { buildConversionFollowUpInsight } from "@/lib/conversion-follow-up";
import { buildManagedSupportFit } from "@/lib/managed-support-fit";
import { buildOperationalHealth } from "@/lib/operational-health";
import { buildSourceRunReviewInsight } from "@/lib/source-run-insights";
import {
  buildSettingsBlueprintHandoffUrl,
  parseGetStartedAcquisitionContext,
} from "@/lib/acquisition-context";
import { AuthenticatedAppNav } from "@/components/authenticated-app-nav";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { WorkspaceSelectionRequired } from "@/components/workspace-selection-required";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

type DashboardSearchParams = Record<string, string | undefined> & {
  checkout?: string;
  workspace?: string;
  verifyEmail?: string;
  inviteStatus?: string;
  approvalStatus?: string;
  approvalMessage?: string;
  campaignStatus?: string;
  campaignMessage?: string;
  callStatus?: string;
  callMessage?: string;
  sourceStatus?: string;
  sourceMessage?: string;
  sourceGate?: string;
  sourceControls?: string;
  discoverStatus?: string;
  discoverMessage?: string;
  discoverGate?: string;
  discoverControls?: string;
  meetingStatus?: string;
  meetingMessage?: string;
  workerStatus?: string;
  workerMessage?: string;
  commandStatus?: string;
  commandMessage?: string;
  upgradePlan?: string;
  upgradeName?: string;
  upgradeDescription?: string;
  upgradeCheckout?: string;
};

type DashboardPageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

const AI_WORKER_TASK_BUDGET_CENTS = 1500;

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Review your active salesxgrowth workspace, lead workflow, meetings, and billing state.",
  robots: {
    index: false,
    follow: false,
  },
};

type SectionProps = {
  id?: string;
  title: string;
  description: string;
  children: ReactNode;
};

function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-8 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

type CardProps = {
  eyebrow: string;
  title: string;
  summary: string;
  children?: ReactNode;
};

function DataCard({ eyebrow, title, summary, children }: CardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {eyebrow}
      </span>
      <h3 className="mt-2 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{summary}</p>
      {children ? (
        <div className="mt-4 space-y-3 text-sm text-slate-700">{children}</div>
      ) : null}
    </article>
  );
}

function EmptyStateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-2 leading-6">{description}</p>
    </div>
  );
}

function KeyValueList({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="space-y-2">
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="flex items-start justify-between gap-3"
        >
          <dt className="text-slate-500">{item.label}</dt>
          <dd className="text-right font-medium text-slate-900">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: DashboardCockpitTone;
}) {
  const toneClassName =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "blocked"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : tone === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneClassName}`}
    >
      {label}
    </span>
  );
}

function capabilityTone(status: CommandCenterCapabilityStatus) {
  return status === "available"
    ? "good"
    : status === "beta"
      ? "warn"
      : "neutral";
}

function policyDecisionTone(
  decision: CommandCenterPolicyDecision,
): DashboardCockpitTone {
  return decision === "blocked"
    ? "blocked"
    : decision === "requires_approval"
      ? "warn"
      : "good";
}

function policyPreconditionTone(
  status: CommandCenterPolicyPreconditionStatus,
): DashboardCockpitTone {
  return status === "blocked"
    ? "blocked"
    : status === "missing"
      ? "warn"
      : "good";
}

function conversionBriefTone(
  posture: ConversionBriefPosture,
): DashboardCockpitTone {
  return posture === "blocked"
    ? "blocked"
    : posture === "needs_follow_up" || posture === "pipeline_ready"
      ? "warn"
      : "good";
}

function conversionWorkQueueUrgencyTone(
  urgency: ConversionWorkQueueUrgency,
): DashboardCockpitTone {
  return urgency === "blocked"
    ? "blocked"
    : urgency === "high" || urgency === "medium"
      ? "warn"
      : "neutral";
}

function revenueForecastTone(
  posture: RevenueForecastPosture,
): DashboardCockpitTone {
  return posture === "blueprint_required" || posture === "needs_conversion"
    ? "blocked"
    : posture === "target_gap"
      ? "warn"
      : "good";
}

function outreachSequenceTone(
  posture: OutreachSequencePlanPosture,
): DashboardCockpitTone {
  return posture === "blueprint_required" || posture === "lead_required"
    ? "blocked"
    : posture === "channel_review"
      ? "warn"
      : "good";
}

function outboundChannelReadinessTone(
  posture: OutboundChannelReadinessPosture,
): DashboardCockpitTone {
  return posture === "blocked"
    ? "blocked"
    : posture === "guarded"
      ? "warn"
      : "good";
}

function planGrowthReadinessTone(
  posture: PlanGrowthReadinessPosture,
): DashboardCockpitTone {
  return posture === "blocked"
    ? "blocked"
    : posture === "upgrade_recommended" || posture === "watch"
      ? "warn"
      : "good";
}

function cockpitToneClassName(tone: DashboardCockpitTone) {
  if (tone === "good") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "blocked") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (tone === "warn") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMoneyCents(cents: number, currency = "USD") {
  if (currency === "MIXED") {
    return `Mixed ${Math.round(cents / 100).toLocaleString("en-US")}`;
  }

  const normalizedCurrency = /^[A-Za-z]{3}$/.test(currency)
    ? currency.toUpperCase()
    : "USD";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatAuditTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeSourceKey(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/get-started");
  }

  const params = await searchParams;
  const showCheckoutSuccess = params?.checkout === "success";
  const activationContext = parseGetStartedAcquisitionContext(params);
  const settingsBlueprintHandoffUrl = activationContext
    ? buildSettingsBlueprintHandoffUrl(params)
    : "/settings#blueprint-business-name";
  const workspaceSwitchState = params?.workspace;
  const verifyEmailState = params?.verifyEmail;
  const upgradeCta = readUpgradeSearchParams(params);
  const sourceGovernanceContext = readSourceProviderGovernanceSearchParams(
    params,
    "source",
  );
  const discoverGovernanceContext = readSourceProviderGovernanceSearchParams(
    params,
    "discover",
  );

  let dashboard;
  let workspaceMemberships;
  let salesBlueprintResponse: Awaited<
    ReturnType<typeof getSalesBlueprint>
  > | null = null;
  let contentOpportunityPlan: Awaited<
    ReturnType<typeof getContentOpportunityPlan>
  > | null = null;
  let actionProposalResponse: Awaited<
    ReturnType<typeof getActionProposals>
  > | null = null;
  let aiWorkerControlPlane: Awaited<
    ReturnType<typeof getAiWorkerControlPlane>
  > | null = null;
  let aiWorkerExecutionReadiness: Awaited<
    ReturnType<typeof getAiWorkerExecutionReadiness>
  > | null = null;
  let aiWorkerMarginReadiness: Awaited<
    ReturnType<typeof getAiWorkerMarginReadiness>
  > | null = null;
  let conversionBrief: Awaited<ReturnType<typeof getConversionBrief>> | null =
    null;
  let conversionWorkQueue: Awaited<
    ReturnType<typeof getConversionWorkQueue>
  > | null = null;
  let conversionIntegrationReadiness: Awaited<
    ReturnType<typeof getConversionIntegrationReadiness>
  > | null = null;
  let outreachSequencePlan: Awaited<
    ReturnType<typeof getOutreachSequencePlan>
  > | null = null;
  let outboundChannelReadiness: Awaited<
    ReturnType<typeof getOutboundChannelReadiness>
  > | null = null;
  let revenueForecast: Awaited<ReturnType<typeof getRevenueForecast>> | null =
    null;
  let planGrowthReadiness: Awaited<
    ReturnType<typeof getPlanGrowthReadiness>
  > | null = null;
  let managedServiceReadiness: Awaited<
    ReturnType<typeof getManagedServiceReadiness>
  > | null = null;
  let sourceAcquisitionReadiness: Awaited<
    ReturnType<typeof getSourceAcquisitionReadiness>
  > | null = null;
  let auditLog: Awaited<ReturnType<typeof getAuditLog>> | null = null;
  let commandCenterBrief: Awaited<
    ReturnType<typeof getCommandCenterBrief>
  > | null = null;
  let commandCenterPolicies: Awaited<
    ReturnType<typeof getCommandCenterPolicies>
  > | null = null;

  try {
    dashboard = await getDashboardData();
    workspaceMemberships = await getWorkspaceMemberships();
    salesBlueprintResponse = await getSalesBlueprint().catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    contentOpportunityPlan = await getContentOpportunityPlan(5).catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    actionProposalResponse = await getActionProposals("pending").catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    aiWorkerControlPlane = await getAiWorkerControlPlane().catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    aiWorkerExecutionReadiness = await getAiWorkerExecutionReadiness().catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    aiWorkerMarginReadiness = await getAiWorkerMarginReadiness().catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    conversionBrief = await getConversionBrief().catch((error: unknown) => {
      if (
        isServerApiUnauthorizedError(error) ||
        isServerApiWorkspaceSelectionRequiredError(error)
      ) {
        throw error;
      }

      return null;
    });
    conversionWorkQueue = await getConversionWorkQueue().catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    conversionIntegrationReadiness =
      await getConversionIntegrationReadiness().catch((error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      });
    outreachSequencePlan = await getOutreachSequencePlan().catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    outboundChannelReadiness = await getOutboundChannelReadiness().catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    revenueForecast = await getRevenueForecast().catch((error: unknown) => {
      if (
        isServerApiUnauthorizedError(error) ||
        isServerApiWorkspaceSelectionRequiredError(error)
      ) {
        throw error;
      }

      return null;
    });
    planGrowthReadiness = await getPlanGrowthReadiness().catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    managedServiceReadiness = await getManagedServiceReadiness().catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    sourceAcquisitionReadiness = await getSourceAcquisitionReadiness().catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    auditLog = await getAuditLog(12).catch((error: unknown) => {
      if (
        isServerApiUnauthorizedError(error) ||
        isServerApiWorkspaceSelectionRequiredError(error)
      ) {
        throw error;
      }

      return null;
    });
    commandCenterBrief = await getCommandCenterBrief().catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
    commandCenterPolicies = await getCommandCenterPolicies().catch(
      (error: unknown) => {
        if (
          isServerApiUnauthorizedError(error) ||
          isServerApiWorkspaceSelectionRequiredError(error)
        ) {
          throw error;
        }

        return null;
      },
    );
  } catch (error) {
    if (isServerApiUnauthorizedError(error)) {
      redirect("/get-started");
    }

    if (isServerApiWorkspaceSelectionRequiredError(error)) {
      const memberships = await getWorkspaceMemberships().catch(() => []);

      return (
        <WorkspaceSelectionRequired
          memberships={memberships}
          returnTo="/dashboard"
        />
      );
    }

    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
            Dashboard unavailable
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            We could not load your live workspace data.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            This page only renders real account data. Please try again in a
            moment or return to billing and onboarding once the API is healthy.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
            >
              Retry dashboard
            </Link>
            <Link
              href="/billing"
              className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
            >
              Open billing
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const blueprint = salesBlueprintResponse?.blueprint ?? null;
  const profile =
    blueprint?.businessProfile ?? dashboard.onboarding.extractedProfile;
  const commandCenter = getCommandCenterCapabilities({
    actorRole: session.user.role ?? "member",
  });
  const commandPolicyCounts = commandCenterPolicies
    ? {
        blocked: commandCenterPolicies.policies.filter(
          (policy) => policy.decision === "blocked",
        ).length,
        approvalGated: commandCenterPolicies.policies.filter(
          (policy) => policy.decision === "requires_approval",
        ).length,
        readOnly: commandCenterPolicies.policies.filter(
          (policy) => policy.decision === "read_only",
        ).length,
      }
    : null;
  const commandPreviewExamples = commandCenterPolicies
    ? [
        buildCommandCenterCommandPreview({
          commandText: "Summarize workspace status",
          channel: "in_app",
          policyCatalog: commandCenterPolicies,
          generatedAt: commandCenterPolicies.generatedAt,
        }),
        buildCommandCenterCommandPreview({
          commandText: "Pause outreach from Telegram",
          channel: "telegram",
          policyCatalog: commandCenterPolicies,
          generatedAt: commandCenterPolicies.generatedAt,
        }),
        buildCommandCenterCommandPreview({
          commandText: "Scrape LinkedIn and auto-DM every lead",
          channel: "telegram",
          policyCatalog: commandCenterPolicies,
          generatedAt: commandCenterPolicies.generatedAt,
        }),
      ]
    : [];
  const pendingProposals = actionProposalResponse?.proposals ?? [];
  const pendingProposalCount =
    actionProposalResponse?.summary.pending ?? pendingProposals.length;
  const highRiskProposalCount =
    actionProposalResponse?.summary.highRisk ??
    pendingProposals.filter(
      (proposal) =>
        proposal.riskLevel === "high" || proposal.riskLevel === "critical",
    ).length;
  const aiWorkers = aiWorkerControlPlane?.workers ?? [];
  const aiWorkerRuns = aiWorkerControlPlane?.runs ?? [];
  const selectedWorker = aiWorkers[0] ?? null;
  const selectedWorkerRemainingBudgetCents = selectedWorker
    ? Math.max(
        0,
        selectedWorker.monthlyBudgetCents - selectedWorker.budgetUsedCents,
      )
    : 0;
  const canReviewProposals =
    Boolean(session.user.emailVerified) &&
    (session.user.role === "owner" || session.user.role === "admin");
  const canProposeWorkerTask = canReviewProposals;
  const selectedWorkerBudgetAllowsProposal =
    selectedWorkerRemainingBudgetCents >= AI_WORKER_TASK_BUDGET_CENTS;
  const selectedWorkerCanReceiveProposal =
    Boolean(selectedWorker) &&
    selectedWorker.status === "active" &&
    selectedWorkerBudgetAllowsProposal;
  const sourcePlanSources = dashboard.sourcePlan?.sources ?? [];
  const sourceProviderGovernanceRunGate =
    buildSourceProviderGovernanceRunGate(sourceAcquisitionReadiness);
  const sourceRunOptions = sourcePlanSources.map((source) => {
    const normalizedSource = normalizeSourceKey(source);
    const lane = sourceAcquisitionReadiness?.lanes.find((item) => {
      const normalizedLaneSource = normalizeSourceKey(item.source);
      const normalizedLaneProvider = normalizeSourceKey(item.provider);
      return (
        normalizedLaneSource === normalizedSource ||
        normalizedLaneProvider === normalizedSource
      );
    });
    const disabled = Boolean(
      sourceProviderGovernanceRunGate && lane?.providerMode === "configured",
    );

    return {
      source,
      lane,
      disabled,
      label: disabled
        ? `${source} - governance required`
        : source,
    };
  });
  const defaultSourceRunOption =
    sourceRunOptions.find((option) => !option.disabled) ??
    sourceRunOptions[0] ??
    null;
  const sourceRunBlocked =
    sourceRunOptions.length > 0 &&
    sourceRunOptions.every((option) => option.disabled);
  const sourceDiscoveryGovernanceBlocked = sourceRunOptions.some(
    (option) => option.disabled,
  );
  const sourceDiscoveryOptions = Array.from(
    { length: Math.min(5, sourcePlanSources.length) },
    (_, index) => index + 1,
  );
  const defaultSourceDiscoveryLimit = Math.min(
    3,
    Math.max(1, sourcePlanSources.length),
  );
  const sourceReadinessTone: DashboardCockpitTone =
    sourceAcquisitionReadiness?.posture === "ready"
      ? "good"
      : sourceAcquisitionReadiness?.posture === "blocked"
        ? "blocked"
        : "warn";
  const qualifiedLeadCount = dashboard.leads.filter(
    (lead) => lead.status === "qualified",
  ).length;
  const contentOpportunities = contentOpportunityPlan?.opportunities ?? [];
  const contentDemandRows = buildContentDemandRows(contentOpportunities);
  const contentPublishingBlocked =
    contentOpportunityPlan?.publishingBlocked ?? true;
  const openMeetingLeadIds = new Set(
    dashboard.meetings
      .filter(
        (meeting) =>
          meeting.status === "pending" || meeting.status === "scheduled",
      )
      .map((meeting) => meeting.leadId),
  );
  const meetingCandidateLeads = dashboard.leads.filter(
    (lead) =>
      (lead.status === "qualified" ||
        lead.status === "contacted" ||
        lead.status === "meeting_booked") &&
      !openMeetingLeadIds.has(lead.id),
  );
  const meetingCalendarHandoffs = new Map(
    dashboard.meetings.flatMap((meeting) => {
      const handoff = buildMeetingCalendarHandoff({
        dashboard,
        meetingId: meeting.id,
      });

      return handoff ? [[meeting.id, handoff] as const] : [];
    }),
  );
  const crmHandoff = buildCrmHandoff({
    dashboard,
  });
  const conversionFollowUpInsight = conversionWorkQueue
    ? buildConversionFollowUpInsight(conversionWorkQueue)
    : null;
  const revenueReconciliation = buildRevenueReconciliation({
    dashboard,
  });
  const cockpit = buildDashboardCockpit({
    dashboard,
    blueprint,
    pendingProposalCount,
    canReviewProposals,
    emailVerified: Boolean(session.user.emailVerified),
    workspaceCount: workspaceMemberships.length,
    aiWorkerSummary: aiWorkerControlPlane?.summary ?? null,
    contentPlan: contentOpportunityPlan
      ? {
          publishingBlocked: contentOpportunityPlan.publishingBlocked,
          blockers: contentOpportunityPlan.blockers,
          opportunities: contentOpportunityPlan.opportunities,
        }
      : null,
  });
  const operationalHealth = buildOperationalHealth({
    dashboard,
    auditLog,
    pendingProposalCount,
    highRiskProposalCount,
    canReviewProposals,
  });
  const managedSupportFit = buildManagedSupportFit({
    dashboard,
    planGrowthReadiness,
    conversionWorkQueue,
    operationalHealth,
    pendingProposalCount,
    highRiskProposalCount,
    aiWorkerSummary: aiWorkerControlPlane?.summary ?? null,
  });
  const aiWorkerBudgetReadiness = buildAiWorkerBudgetReadiness({
    subscription: dashboard.subscription,
    aiWorkerSummary: aiWorkerControlPlane?.summary ?? null,
    selectedWorker,
    pendingProposalCount,
    highRiskProposalCount,
    canReviewProposals,
    planGrowthReadiness,
    minimumTaskBudgetCents: AI_WORKER_TASK_BUDGET_CENTS,
  });

  return (
    <main className="min-h-screen bg-[#faf9f7] text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <AuthenticatedAppNav
          currentPath="/dashboard"
          userEmail={session.user.email}
          emailVerified={Boolean(session.user.emailVerified)}
        />
        {showCheckoutSuccess ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            Checkout completed successfully. Your workspace is ready for the
            next onboarding, campaign, and billing steps.
          </div>
        ) : null}
        {params?.inviteStatus === "accepted" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            Workspace invite accepted successfully. This dashboard now reflects
            the invited workspace scope.
          </div>
        ) : null}
        {workspaceSwitchState === "switched" ? (
          <div className="mb-6 rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900 shadow-sm">
            Workspace scope updated successfully. All dashboard data now
            reflects the selected workspace.
          </div>
        ) : null}
        {workspaceSwitchState === "denied" ? (
          <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 shadow-sm">
            That workspace is not assigned to your account. Choose one of your
            permitted workspaces instead.
          </div>
        ) : null}
        {workspaceSwitchState === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            We could not switch the workspace just now. Please retry once the
            API is healthy.
          </div>
        ) : null}
        {verifyEmailState === "sent" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            Verification email sent. Open the latest message in your inbox to
            unlock billing and live outbound actions.
          </div>
        ) : null}
        {verifyEmailState === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            We could not send a verification email just now. Please retry in a
            moment.
          </div>
        ) : null}
        {activationContext ? (
          <section className="mb-6 rounded-lg border border-teal-200 bg-teal-50/70 p-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
                  Activation context attached
                </p>
                <h2 className="mt-2 text-lg font-semibold tracking-normal text-slate-950">
                  {activationContext.title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                  {activationContext.detail}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {activationContext.metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-md border border-teal-200 bg-white px-3 py-2"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-800">
                        {metric.label}
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-600">
                  {activationContext.reassurance}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <Link
                  href={settingsBlueprintHandoffUrl}
                  className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Save workspace blueprint
                </Link>
                <Link
                  href="/get-started"
                  className="inline-flex items-center justify-center rounded-md border border-teal-300 bg-white px-4 py-2.5 text-sm font-semibold text-teal-950 transition hover:border-teal-500"
                >
                  Review onboarding
                </Link>
              </div>
            </div>
          </section>
        ) : null}
        {params?.approvalStatus === "approved" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            Approval saved. Any permitted workspace state change has been
            applied and audited.
          </div>
        ) : null}
        {params?.approvalStatus === "rejected" ? (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-800 shadow-sm">
            Proposal rejected. No outreach state changed.
          </div>
        ) : null}
        {params?.approvalStatus === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            {params.approvalMessage ??
              "We could not save that approval decision just now."}
          </div>
        ) : null}
        {params?.campaignStatus === "dispatched" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            Campaign dispatch accepted. Provider delivery and activity state
            were recorded for review.
          </div>
        ) : null}
        {params?.campaignStatus === "created" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            {params.campaignMessage ??
              "Campaign draft created. Review and approve it before dispatch."}
          </div>
        ) : null}
        {params?.campaignStatus === "approved" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            {params.campaignMessage ??
              "Campaign approved. Dispatch remains guarded by provider and usage checks."}
          </div>
        ) : null}
        {params?.campaignStatus === "review_required" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            {params.campaignMessage ??
              "Campaign dispatch requires manual review before delivery."}
          </div>
        ) : null}
        {params?.campaignStatus === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {params.campaignMessage ??
                    "We could not dispatch that campaign just now."}
                </p>
                {upgradeCta ? (
                  <p className="mt-1 leading-6 text-amber-800">
                    {upgradeCta.description}
                  </p>
                ) : null}
              </div>
              {upgradeCta ? (
                <Link
                  href={upgradeCta.checkoutPath}
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Upgrade to {upgradeCta.planName}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
        {params?.callStatus === "dispatched" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            Call dispatch accepted. Provider state, usage, and meeting outcome
            signals were recorded for review.
          </div>
        ) : null}
        {params?.callStatus === "review_required" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            {params.callMessage ??
              "Call dispatch requires manual review before provider delivery."}
          </div>
        ) : null}
        {params?.callStatus === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {params.callMessage ??
                    "We could not dispatch that call just now."}
                </p>
                {upgradeCta ? (
                  <p className="mt-1 leading-6 text-amber-800">
                    {upgradeCta.description}
                  </p>
                ) : null}
              </div>
              {upgradeCta ? (
                <Link
                  href={upgradeCta.checkoutPath}
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Upgrade to {upgradeCta.planName}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
        {params?.sourceStatus === "created" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            Lead source run created. Review the new evidence before approving
            outreach.
          </div>
        ) : null}
        {params?.sourceStatus === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
	                <p className="font-medium">
	                  {params.sourceMessage ??
	                    "We could not start that lead source run just now."}
	                </p>
	                {sourceGovernanceContext ? (
	                  <p className="mt-1 leading-6 text-amber-800">
	                    {sourceGovernanceContext.controlsSummary}
	                  </p>
	                ) : upgradeCta ? (
	                  <p className="mt-1 leading-6 text-amber-800">
	                    {upgradeCta.description}
	                  </p>
	                ) : null}
	              </div>
	              {sourceGovernanceContext ? (
	                <Link
	                  href={sourceGovernanceContext.settingsPath}
	                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
	                >
	                  Review source governance
	                </Link>
	              ) : upgradeCta ? (
	                <Link
	                  href={upgradeCta.checkoutPath}
	                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
	                >
                  Upgrade to {upgradeCta.planName}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
        {params?.discoverStatus === "created" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            {params.discoverMessage ??
              "Multi-source discovery created source runs for review."}
          </div>
        ) : null}
        {params?.discoverStatus === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
	                <p className="font-medium">
	                  {params.discoverMessage ??
	                    "We could not start multi-source discovery just now."}
	                </p>
	                {discoverGovernanceContext ? (
	                  <p className="mt-1 leading-6 text-amber-800">
	                    {discoverGovernanceContext.controlsSummary}
	                  </p>
	                ) : upgradeCta ? (
	                  <p className="mt-1 leading-6 text-amber-800">
	                    {upgradeCta.description}
	                  </p>
	                ) : null}
	              </div>
	              {discoverGovernanceContext ? (
	                <Link
	                  href={discoverGovernanceContext.settingsPath}
	                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
	                >
	                  Review source governance
	                </Link>
	              ) : upgradeCta ? (
	                <Link
	                  href={upgradeCta.checkoutPath}
	                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
	                >
                  Upgrade to {upgradeCta.planName}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
        {params?.meetingStatus === "created" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            {params.meetingMessage ??
              "Meeting scheduled. The lead is now in meeting follow-through."}
          </div>
        ) : null}
        {params?.meetingStatus === "updated" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            {params.meetingMessage ?? "Meeting outcome updated."}
          </div>
        ) : null}
        {params?.meetingStatus === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            {params.meetingMessage ??
              "We could not save that meeting update just now."}
          </div>
        ) : null}
        {params?.workerStatus === "proposed" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            AI worker task proposal created. Review it in the approval inbox
            before any worker action proceeds.
          </div>
        ) : null}
        {params?.workerStatus === "completed" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            {params.workerMessage ?? "AI worker dry-run result recorded."}
          </div>
        ) : null}
        {params?.workerStatus === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {params.workerMessage ??
                    "We could not create that AI worker proposal just now."}
                </p>
                {upgradeCta ? (
                  <p className="mt-1 leading-6 text-amber-800">
                    {upgradeCta.description}
                  </p>
                ) : null}
              </div>
              {upgradeCta ? (
                <Link
                  href={upgradeCta.checkoutPath}
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Upgrade to {upgradeCta.planName}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
        {params?.commandStatus === "proposed" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            Command proposal created. Review it in the approval inbox before any
            workspace effect.
          </div>
        ) : null}
        {params?.commandStatus === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            {params.commandMessage ??
              "That command could not create an approval proposal."}
          </div>
        ) : null}
        {!session.user.emailVerified ? (
          <div className="mb-6">
            <EmailVerificationBanner
              email={session.user.email}
              returnTo="/dashboard"
            />
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Operator cockpit
                </span>
                <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950">
                  Workspace readiness, revenue motion, and approval gates in one
                  view.
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  {dashboard.workspace.organizationName} is operating{" "}
                  {workspaceMemberships.length === 1
                    ? "one workspace"
                    : `${workspaceMemberships.length} workspaces`}{" "}
                  across onboarding, source evidence, outreach review, meetings,
                  billing, and AI worker approvals.
                </p>
              </div>
              <StatusPill
                label={cockpit.overallLabel}
                tone={cockpit.overallTone}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {dashboard.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <p className="text-2xl font-semibold tracking-tight text-slate-950">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {metric.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Signal
                    </th>
                    <th scope="col" className="px-3 py-2">
                      State
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Why it matters
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Next
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cockpit.signals.map((signal) => (
                    <tr key={signal.id} className="align-top">
                      <td className="px-3 py-3 font-medium text-slate-950">
                        {signal.label}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${cockpitToneClassName(signal.tone)}`}
                        >
                          {signal.value}
                        </span>
                      </td>
                      <td className="max-w-md px-3 py-3 leading-6 text-slate-600">
                        {signal.detail}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={signal.href}
                          className="inline-flex rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
                        >
                          {signal.actionLabel}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/billing"
                className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Manage billing
              </Link>
              <Link
                href="/settings"
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Workspace settings
              </Link>
              <Link
                href="/get-started"
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Review onboarding
              </Link>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <WorkspaceSwitcher
                memberships={workspaceMemberships}
                returnTo="/dashboard"
                compact
              />
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Workspace
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">
                  {dashboard.workspace.workspaceName}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Keep rollout risk, subscription state, and activation blockers
                  visible before operators run lead or outreach work.
                </p>
              </div>
              <StatusPill
                label={dashboard.subscription.status.replace("_", " ")}
                tone={
                  dashboard.subscription.status === "active" ? "good" : "warn"
                }
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
              {[
                { label: "Plan", value: cockpit.summary.planKey },
                {
                  label: "State",
                  value: cockpit.summary.subscriptionStatus.replace("_", " "),
                },
                {
                  label: "Needs review",
                  value: String(cockpit.summary.needsReview),
                },
                { label: "Blocked", value: String(cockpit.summary.blocked) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              {readinessChecklist.map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {item.detail}
                      </p>
                    </div>
                    <StatusPill
                      label={item.status}
                      tone={item.status === "ready" ? "good" : "warn"}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              {[
                dashboard.workspace.region,
                dashboard.subscription.planKey,
                dashboard.subscription.status,
                dashboard.onboarding.status,
                cockpit.summary.emailVerified
                  ? "email verified"
                  : "verify email",
              ].map((value) => (
                <StatusPill
                  key={value}
                  label={value.replace("_", " ")}
                  tone={value === "verify email" ? "warn" : "neutral"}
                />
              ))}
            </div>
          </aside>
        </section>

        <div className="mt-10 space-y-10">
          <Section
            id="revenue-forecast"
            title="Revenue forecast"
            description="Weighted pipeline, target coverage, and next revenue actions derived from the Sales Blueprint and current workspace state."
          >
            {revenueForecast ? (
              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Forecast model
                    </p>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      {revenueForecast.title}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {revenueForecast.summary}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <StatusPill
                      label={revenueForecast.posture.replace(/_/g, " ")}
                      tone={revenueForecastTone(revenueForecast.posture)}
                    />
                    <StatusPill
                      label={`${revenueForecast.assumptions.targetCoveragePercent}% coverage`}
                      tone={
                        revenueForecast.assumptions.targetCoveragePercent >= 75
                          ? "good"
                          : "warn"
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  {revenueForecast.metrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {metric.label}
                        </p>
                        <StatusPill label={metric.tone} tone={metric.tone} />
                      </div>
                      <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                        {metric.value}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        {metric.detail}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-5 p-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                  <div className="overflow-x-auto">
                    <table className="min-w-[720px] divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <tr>
                          <th scope="col" className="px-3 py-3">
                            Stage
                          </th>
                          <th scope="col" className="px-3 py-3">
                            Leads
                          </th>
                          <th scope="col" className="px-3 py-3">
                            Weight
                          </th>
                          <th scope="col" className="px-3 py-3">
                            Value
                          </th>
                          <th scope="col" className="px-3 py-3">
                            Signal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {revenueForecast.stages.map((stage) => (
                          <tr key={stage.id} className="align-top">
                            <td className="px-3 py-3">
                              <p className="font-medium text-slate-950">
                                {stage.label}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {stage.detail}
                              </p>
                            </td>
                            <td className="px-3 py-3 font-semibold text-slate-950">
                              {stage.leadCount}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {Math.round(stage.weight * 100)}%
                            </td>
                            <td className="px-3 py-3 font-medium text-slate-950">
                              {formatUsd(stage.estimatedValue)}
                            </td>
                            <td className="px-3 py-3">
                              <StatusPill
                                label={stage.tone}
                                tone={stage.tone}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Assumptions
                      </p>
                      <KeyValueList
                        items={[
                          {
                            label: "Contract value",
                            value: formatUsd(
                              revenueForecast.assumptions.averageContractValue,
                            ),
                          },
                          {
                            label: "Lead target",
                            value: String(
                              revenueForecast.assumptions.monthlyLeadTarget,
                            ),
                          },
                          {
                            label: "Meeting target",
                            value: String(
                              revenueForecast.assumptions.meetingTarget,
                            ),
                          },
                          {
                            label: "Target value",
                            value: formatUsd(
                              revenueForecast.assumptions.targetPipelineValue,
                            ),
                          },
                        ]}
                      />
                    </div>

                    <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                      {revenueForecast.nextActions.map((action) => (
                        <div key={action.id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              href={action.href}
                              className="text-sm font-semibold text-slate-950 underline-offset-4 hover:underline"
                            >
                              {action.label}
                            </Link>
                            <StatusPill
                              label={action.urgency}
                              tone={action.urgency}
                            />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {action.detail}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {action.evidence.map((item) => (
                              <span
                                key={`${action.id}-${item}`}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3">
                  {revenueForecast.guardrails.slice(0, 3).map((guardrail) => (
                    <span
                      key={guardrail}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {guardrail}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyStateCard
                title="Revenue forecast unavailable"
                description="The rest of the workspace remains available while forecast assumptions reload from the API."
              />
            )}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <DataCard
                eyebrow="Accounting handoff"
                title="Revenue reconciliation"
                summary={`${revenueReconciliation.summary.completedMeetingCount} completed ${
                  revenueReconciliation.summary.completedMeetingCount === 1
                    ? "meeting"
                    : "meetings"
                } packaged for manual accounting review.`}
              >
                <KeyValueList
                  items={[
                    {
                      label: "Actual value",
                      value: formatMoneyCents(
                        revenueReconciliation.summary.actualValueCents,
                        revenueReconciliation.summary.currency,
                      ),
                    },
                    {
                      label: "Valued meetings",
                      value: String(
                        revenueReconciliation.summary.valuedMeetingCount,
                      ),
                    },
                    {
                      label: "Missing values",
                      value: String(
                        revenueReconciliation.summary.missingValueCount,
                      ),
                    },
                    {
                      label: "Subscription",
                      value:
                        revenueReconciliation.summary.subscriptionStatus.replace(
                          /_/g,
                          " ",
                        ),
                    },
                  ]}
                />
                <a
                  href="/api/revenue/reconciliation"
                  download={revenueReconciliation.csv.filename}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500"
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                  Download reconciliation CSV
                </a>
                <p className="text-xs leading-5 text-slate-500">
                  Manual handoff only. Review CRM, invoice, payment, tax, and
                  accounting policy before booking revenue.
                </p>
              </DataCard>
              <DataCard
                eyebrow="Reconciliation checks"
                title="Close value readiness"
                summary={`${revenueReconciliation.summary.wonLeadWithoutMeetingCount} won ${
                  revenueReconciliation.summary.wonLeadWithoutMeetingCount === 1
                    ? "lead"
                    : "leads"
                } still need a completed meeting record before accounting handoff.`}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {revenueReconciliation.metrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {metric.label}
                        </p>
                        <StatusPill label={metric.tone} tone={metric.tone} />
                      </div>
                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {metric.value}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {metric.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </DataCard>
            </div>
            {conversionIntegrationReadiness ? (
              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Conversion integration readiness
                    </p>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                      Live CRM, calendar, accounting, invoice, and payment
                      workflows stay blocked until deployment-owned controls are
                      configured and reviewed.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      label={conversionIntegrationReadiness.posture}
                      tone={
                        conversionIntegrationReadiness.posture === "ready"
                          ? "good"
                          : conversionIntegrationReadiness.posture === "blocked"
                            ? "blocked"
                            : "warn"
                      }
                    />
                    <StatusPill
                      label={`${conversionIntegrationReadiness.summary.configuredControls}/4 ready`}
                      tone={
                        conversionIntegrationReadiness.summary
                          .configuredControls === 4
                          ? "good"
                          : "warn"
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
                  <KeyValueList
                    items={[
                      {
                        label: "CRM records",
                        value: String(
                          conversionIntegrationReadiness.summary.crmRecords,
                        ),
                      },
                      {
                        label: "Missing contacts",
                        value: String(
                          conversionIntegrationReadiness.summary
                            .missingContactRecords,
                        ),
                      },
                    ]}
                  />
                  <KeyValueList
                    items={[
                      {
                        label: "Calendar-ready",
                        value: String(
                          conversionIntegrationReadiness.summary
                            .readyCalendarMeetings,
                        ),
                      },
                      {
                        label: "Completed",
                        value: String(
                          conversionIntegrationReadiness.summary
                            .completedMeetings,
                        ),
                      },
                    ]}
                  />
                  <KeyValueList
                    items={[
                      {
                        label: "Valued meetings",
                        value: String(
                          conversionIntegrationReadiness.summary.valuedMeetings,
                        ),
                      },
                      {
                        label: "Missing values",
                        value: String(
                          conversionIntegrationReadiness.summary
                            .missingValueRecords,
                        ),
                      },
                    ]}
                  />
                  <KeyValueList
                    items={[
                      {
                        label: "Closed value",
                        value: formatMoneyCents(
                          conversionIntegrationReadiness.summary
                            .actualValueCents,
                          revenueReconciliation.summary.currency,
                        ),
                      },
                      {
                        label: "Blocked controls",
                        value: String(
                          conversionIntegrationReadiness.summary
                            .blockedControls,
                        ),
                      },
                    ]}
                  />
                </div>
                <div className="grid gap-3 border-t border-slate-200 px-4 py-4 md:grid-cols-2">
                  {conversionIntegrationReadiness.controls.map((control) => (
                    <div
                      key={control.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">
                          {control.title}
                        </p>
                        <StatusPill
                          label={control.status.replace("_", " ")}
                          tone={control.tone}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {control.detail}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {control.nextAction}
                      </p>
                      {control.blockers.length > 0 ? (
                        <p className="mt-2 text-xs leading-5 text-amber-800">
                          {control.blockers[0]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3">
                  {conversionIntegrationReadiness.guardrails
                    .slice(0, 3)
                    .map((guardrail) => (
                      <span
                        key={guardrail}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {guardrail}
                      </span>
                    ))}
                </div>
              </div>
            ) : (
              <EmptyStateCard
                title="Conversion integration readiness unavailable"
                description="Manual CRM, calendar, and revenue exports remain available, but live sync readiness did not load."
              />
            )}
          </Section>

          <Section
            title="Business understanding"
            description="Conversational onboarding with structured outputs, so the rest of the workflow stays anchored to a real business profile."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <DataCard
                eyebrow={blueprint?.status ?? "blueprint"}
                title="Sales blueprint"
                summary={
                  blueprint
                    ? `${blueprint.readinessScore}/100 readiness for governed lead planning.`
                    : "Save a workspace blueprint in Settings to anchor lead discovery and outreach."
                }
              >
                <KeyValueList
                  items={[
                    {
                      label: "Lead target",
                      value: blueprint
                        ? String(blueprint.monthlyLeadTarget)
                        : "n/a",
                    },
                    {
                      label: "Meeting target",
                      value: blueprint
                        ? String(blueprint.meetingTarget)
                        : "n/a",
                    },
                    {
                      label: "Automation",
                      value:
                        blueprint?.automationMode.replace("_", " ") ??
                        "approval gated",
                    },
                  ]}
                />
                {blueprint?.readinessGaps[0] ? (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                    {blueprint.readinessGaps[0]}
                  </p>
                ) : null}
              </DataCard>

              <DataCard
                eyebrow={dashboard.onboarding.currentStep}
                title="Onboarding session"
                summary={`Status: ${dashboard.onboarding.status}`}
              >
                {dashboard.onboarding.transcript.length > 0 ? (
                  <ul className="space-y-2">
                    {dashboard.onboarding.transcript
                      .slice(-3)
                      .map((message, index) => (
                        <li
                          key={`${message.role}-${index}`}
                          className="rounded-2xl bg-slate-50 px-3 py-3"
                        >
                          <span className="font-medium capitalize text-slate-900">
                            {message.role}:
                          </span>{" "}
                          {message.content}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>No onboarding transcript is available yet.</p>
                )}
              </DataCard>

              <DataCard
                eyebrow="Structured profile"
                title={profile?.businessName ?? "Profile pending"}
                summary={
                  profile?.summary ??
                  "Finalize onboarding to generate the business profile."
                }
              >
                <KeyValueList
                  items={[
                    {
                      label: "Audience",
                      value: profile?.targetAudience ?? "n/a",
                    },
                    {
                      label: "Regions",
                      value: profile?.regions.join(", ") ?? "n/a",
                    },
                    {
                      label: "Channels",
                      value: profile?.channels.join(", ") ?? "n/a",
                    },
                  ]}
                />
              </DataCard>
            </div>
          </Section>

          <Section
            id="content-demand"
            title="Content demand engine"
            description="Blueprint-informed SEO opportunities that can turn buyer pain, regions, and source evidence into reviewable demand assets."
          >
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {contentOpportunityPlan?.workspaceBusinessName ??
                      dashboard.workspace.workspaceName}
                  </p>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {contentOpportunityPlan?.summary ??
                      "Content opportunities are unavailable until the workspace API returns a plan."}
                  </p>
                  {contentOpportunityPlan?.blockers.length ? (
                    <p className="mt-2 text-sm leading-6 text-amber-800">
                      {contentOpportunityPlan.blockers[0]}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <StatusPill
                    label={
                      contentPublishingBlocked
                        ? "review required"
                        : "brief ready"
                    }
                    tone={contentPublishingBlocked ? "warn" : "good"}
                  />
                  <StatusPill
                    label={`${contentOpportunities.length} opportunities`}
                  />
                </div>
              </div>

              {contentDemandRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[1180px] divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          Opportunity
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Demand evidence
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Capture
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Review posture
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Next action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {contentDemandRows.map((row) => (
                        <tr key={row.id} className="align-top">
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <p className="font-medium text-slate-950">
                                {row.title}
                              </p>
                              <p className="text-xs leading-5 text-slate-500">
                                {row.audience}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <StatusPill label={row.intentLabel} />
                                <StatusPill label={row.funnelStageLabel} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="grid gap-3 text-xs leading-5 text-slate-600">
                              <div>
                                <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">
                                  Keywords
                                </p>
                                <p className="mt-1">
                                  {row.keywordSummary.visible.join(", ")}
                                </p>
                                {row.keywordSummary.overflowLabel ? (
                                  <p className="mt-1 text-slate-500">
                                    {row.keywordSummary.overflowLabel}
                                  </p>
                                ) : null}
                              </div>
                              <div>
                                <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">
                                  Source signals
                                </p>
                                <p className="mt-1">
                                  {row.sourceSignalSummary.visible.join(", ")}
                                </p>
                                {row.sourceSignalSummary.overflowLabel ? (
                                  <p className="mt-1 text-slate-500">
                                    {row.sourceSignalSummary.overflowLabel}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-3 text-sm text-slate-600">
                              <p>{row.leadCaptureOffer}</p>
                              <div className="flex flex-wrap gap-2">
                                {row.channelSummary.visible.map((channel) => (
                                  <StatusPill key={channel} label={channel} />
                                ))}
                                {row.channelSummary.overflowLabel ? (
                                  <StatusPill
                                    label={row.channelSummary.overflowLabel}
                                  />
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                <StatusPill
                                  label={row.statusLabel}
                                  tone={row.statusTone}
                                />
                                <StatusPill
                                  label={row.priorityLabel}
                                  tone={row.priorityTone}
                                />
                              </div>
                              <ul className="space-y-2 text-xs leading-5 text-slate-600">
                                {row.guardrailSummary.visible.map(
                                  (guardrail) => (
                                    <li key={guardrail}>{guardrail}</li>
                                  ),
                                )}
                              </ul>
                              {row.guardrailSummary.overflowLabel ? (
                                <p className="text-xs text-slate-500">
                                  {row.guardrailSummary.overflowLabel}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {row.nextAction}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4">
                  <EmptyStateCard
                    title="No content opportunities ready"
                    description="Save a complete Sales Blueprint in Settings before building SEO briefs from workspace context."
                  />
                </div>
              )}

              {contentOpportunityPlan?.guardrails.length ? (
                <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3">
                  {contentOpportunityPlan.guardrails
                    .slice(0, 4)
                    .map((guardrail) => (
                      <span
                        key={guardrail}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {guardrail}
                      </span>
                    ))}
                </div>
              ) : null}
            </div>
          </Section>

          <Section
            id="lead-collection"
            title="Lead collection engine"
            description="Source planning, source runs, and qualification visibility before leads enter outbound campaigns."
          >
            {sourceAcquisitionReadiness ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Source acquisition readiness
                    </span>
                    <h3 className="mt-2 text-base font-semibold text-slate-950">
                      {sourceAcquisitionReadiness.summary.readySources} ready ·{" "}
                      {sourceAcquisitionReadiness.summary.needsReviewSources}{" "}
                      review ·{" "}
                      {sourceAcquisitionReadiness.summary.blockedSources}{" "}
                      blocked
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {sourceAcquisitionReadiness.posture === "ready"
                        ? "Source lanes are ready for governed review handoff with configured providers."
                        : sourceAcquisitionReadiness.posture === "blocked"
                          ? "Source acquisition is blocked until missing evidence, compliance checks, or source runs are corrected."
                          : "Source acquisition has reviewable evidence, but production expansion still needs provider and cost controls."}
                    </p>
                  </div>
                  <StatusPill
                    label={sourceAcquisitionReadiness.posture}
                    tone={sourceReadinessTone}
                  />
                </div>

                <div className="grid border-t border-slate-200 bg-slate-50/70 text-sm md:grid-cols-4">
                  {[
                    {
                      label: "Avg quality",
                      value: `${sourceAcquisitionReadiness.summary.averageQualityScore}/100`,
                    },
                    {
                      label: "Evidence",
                      value: `${sourceAcquisitionReadiness.summary.evidenceSignals} signals`,
                    },
                    {
                      label: "Dedupe",
                      value: `${sourceAcquisitionReadiness.summary.dedupedCandidates} removed`,
                    },
                    {
                      label: "Providers",
                      value: `${sourceAcquisitionReadiness.summary.mockSourceProviders} mock`,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="border-b border-slate-200 px-4 py-3 md:border-b-0 md:border-r last:md:border-r-0"
                    >
                      <p className="text-xs font-medium text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto border-t border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white text-xs uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          Source
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Provider
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Quality
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Evidence
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sourceAcquisitionReadiness.lanes.map((lane) => (
                        <tr
                          key={`${lane.source}-${lane.provider}`}
                          className="align-top"
                        >
                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              <p className="font-semibold text-slate-950">
                                {lane.source}
                              </p>
                              <StatusPill
                                label={lane.status.replace("_", " ")}
                                tone={lane.tone}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <p className="font-medium text-slate-900">
                              {lane.provider}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {lane.providerMode ?? "mode unknown"} ·{" "}
                              {lane.providerReadiness ?? "readiness unknown"}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <p className="font-medium text-slate-900">
                              {lane.qualityScore}/100
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {lane.acceptanceRatePct}% accepted
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <p>
                              {lane.evidenceSignals} signals ·{" "}
                              {lane.complianceChecks} checks
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {lane.dedupedCandidates} deduped ·{" "}
                              {lane.rejectedCandidates} rejected
                            </p>
                          </td>
                          <td className="max-w-sm px-4 py-3 text-slate-700">
                            <p className="leading-6">{lane.nextAction}</p>
                            {lane.blockers.length > 0 ? (
                              <p className="mt-2 text-xs leading-5 text-rose-700">
                                {lane.blockers[0]}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 border-t border-slate-200 px-4 py-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sourceAcquisitionReadiness.controls.map((control) => (
                    <div
                      key={control.id}
                      className={`rounded-lg border px-3 py-3 text-sm ${cockpitToneClassName(control.tone)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold">{control.title}</p>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                          {control.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2 leading-6">{control.detail}</p>
                    </div>
                  ))}
                </div>

                {sourceAcquisitionReadiness.summary.productionBlockers.length >
                0 ? (
                  <div className="border-t border-slate-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                    {sourceAcquisitionReadiness.summary.productionBlockers
                      .slice(0, 2)
                      .join(" · ")}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyStateCard
                title="Source acquisition readiness unavailable"
                description="Source run cards are still available, but aggregate source readiness did not load."
              />
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DataCard
                eyebrow="Source plan"
                title={dashboard.sourcePlan?.summary ?? "No source plan yet"}
                summary={
                  dashboard.sourcePlan?.rationale ??
                  "Complete onboarding to produce a source plan."
                }
              >
	                {sourceRunOptions.length ? (
	                  <ul className="flex flex-wrap gap-2">
	                    {sourceRunOptions.map((option) => (
	                      <li
	                        key={option.source}
	                        className={
	                          option.disabled
	                            ? "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
	                            : "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
	                        }
	                      >
	                        {option.label}
	                      </li>
	                    ))}
	                  </ul>
	                ) : null}
	                {sourceRunOptions.length ? (
	                  <>
	                    {sourceProviderGovernanceRunGate ? (
	                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
	                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	                          <div>
	                            <p className="font-semibold">
	                              Configured source lanes need governance first
	                            </p>
	                            <p className="mt-1 text-xs leading-5 text-amber-800">
	                              {sourceProviderGovernanceRunGate.controlsSummary}
	                            </p>
	                          </div>
	                          <Link
	                            href={sourceProviderGovernanceRunGate.settingsPath}
	                            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
	                          >
	                            Review source governance
	                          </Link>
	                        </div>
	                      </div>
	                    ) : null}
	                    <form
	                      action="/api/leads/source-run"
	                      method="post"
	                      className="space-y-3"
	                    >
	                      <input type="hidden" name="returnTo" value="/dashboard" />
                      <label
                        htmlFor="source-run-source"
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                      >
                        Source
                      </label>
                      <div className="flex flex-col gap-3 sm:flex-row">
	                        <select
	                          id="source-run-source"
	                          name="source"
	                          defaultValue={defaultSourceRunOption?.source}
	                          className="min-h-11 flex-1 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-500"
	                        >
	                          {sourceRunOptions.map((option) => (
	                            <option
	                              key={option.source}
	                              value={option.source}
	                              disabled={option.disabled}
	                            >
	                              {option.label}
	                            </option>
	                          ))}
	                        </select>
	                        <button
	                          type="submit"
	                          disabled={sourceRunBlocked}
	                          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
	                        >
	                          <Search aria-hidden="true" className="h-4 w-4" />
	                          {sourceRunBlocked
	                            ? "Source governance required"
	                            : "Run guarded source pass"}
	                        </button>
	                      </div>
	                      <p className="text-xs leading-5 text-slate-500">
	                        {sourceRunBlocked
	                          ? "Configured source lanes are held until governance is ready; no provider work will be created from this control."
	                          : "Creates source evidence and qualified leads for review; outreach still requires approval."}
	                      </p>
	                    </form>
                    <form
                      action="/api/leads/discover"
                      method="post"
                      className="space-y-3 border-t border-slate-200 pt-3"
                    >
                      <input type="hidden" name="returnTo" value="/dashboard" />
                      <label
                        htmlFor="discover-limit-sources"
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                      >
                        Multi-source discovery
                      </label>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <select
                          id="discover-limit-sources"
                          name="limitSources"
                          defaultValue={String(defaultSourceDiscoveryLimit)}
                          className="min-h-11 flex-1 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-500"
                        >
                          {sourceDiscoveryOptions.map((count) => (
                            <option key={count} value={count}>
                              {count} {count === 1 ? "source" : "sources"}
                            </option>
                          ))}
                        </select>
	                        <button
	                          type="submit"
	                          disabled={sourceDiscoveryGovernanceBlocked}
	                          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
	                        >
	                          <Search aria-hidden="true" className="h-4 w-4" />
	                          {sourceDiscoveryGovernanceBlocked
	                            ? "Governance required"
	                            : "Run discovery"}
	                        </button>
	                      </div>
	                      <p className="text-xs leading-5 text-slate-500">
	                        {sourceDiscoveryGovernanceBlocked
	                          ? "Multi-source discovery is held because at least one planned configured source lane needs governance."
	                          : "Creates reviewable runs across planned sources; outreach remains approval-gated."}
	                      </p>
	                    </form>
	                  </>
                ) : (
                  <Link
                    href="/settings"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                  >
                    Build source plan
                  </Link>
                )}
              </DataCard>

              {dashboard.sourceRuns.length > 0 ? (
                dashboard.sourceRuns.map((run) => {
                  const insight = buildSourceRunReviewInsight(run);

                  return (
                    <DataCard
                      key={run.id}
                      eyebrow={run.source}
                      title={run.status}
                      summary={run.summary}
                    >
                      <div className="flex flex-wrap gap-2">
                        <StatusPill label={run.providerMode} />
                        <StatusPill
                          label={`${run.qualityScore}/100 quality`}
                          tone={
                            run.qualityScore >= 80
                              ? "good"
                              : run.qualityScore < 60
                                ? "blocked"
                                : "warn"
                          }
                        />
                        <StatusPill label={insight.label} tone={insight.tone} />
                      </div>
                      <KeyValueList
                        items={[
                          {
                            label: "Candidates",
                            value: String(run.candidatesFound),
                          },
                          { label: "Deduped", value: String(run.dedupedCount) },
                          {
                            label: "Qualified",
                            value: String(run.qualifiedCount),
                          },
                          {
                            label: "Rejected",
                            value: String(run.rejectedCount),
                          },
                          {
                            label: "Acceptance",
                            value: insight.acceptanceRateLabel,
                          },
                          { label: "Freshness", value: run.freshness },
                        ]}
                      />
                      <div
                        className={`rounded-2xl border px-3 py-2 text-xs leading-5 ${cockpitToneClassName(insight.tone)}`}
                      >
                        <p className="font-semibold">{insight.label}</p>
                        <p className="mt-1">{insight.decisionDetail}</p>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.14em]">
                          {insight.complianceSummary}
                        </p>
                      </div>
                      {run.evidence.length > 0 ? (
                        <div className="space-y-2">
                          <p className="font-medium text-slate-900">Evidence</p>
                          {run.evidence.slice(0, 2).map((item) => (
                            <div
                              key={`${run.id}-${item.label}-${item.value}`}
                              className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-emerald-950"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="font-medium">
                                  {item.label}
                                </span>
                                <span className="text-xs font-semibold">
                                  {item.confidence}%
                                </span>
                              </div>
                              <p className="mt-1 text-xs leading-5 text-emerald-800">
                                {item.value}
                                {item.detail ? ` · ${item.detail}` : ""}
                              </p>
                            </div>
                          ))}
                          <p className="text-xs leading-5 text-slate-500">
                            Top signal: {insight.topEvidenceLabel}
                          </p>
                        </div>
                      ) : null}
                      {run.rejectionReasons.length > 0 ? (
                        <div className="space-y-2">
                          <p className="font-medium text-slate-900">
                            Rejected evidence
                          </p>
                          {run.rejectionReasons.slice(0, 2).map((reason) => (
                            <p
                              key={`${run.id}-${reason.reason}`}
                              className="rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-2 text-xs leading-5 text-rose-900"
                            >
                              <span className="font-semibold">
                                {reason.count} {reason.reason}:
                              </span>{" "}
                              {reason.detail}
                            </p>
                          ))}
                          <p className="text-xs leading-5 text-slate-500">
                            Top rejection: {insight.topRejectionLabel}
                          </p>
                        </div>
                      ) : null}
                      {run.complianceChecks.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {run.complianceChecks.slice(0, 3).map((check) => (
                            <StatusPill
                              key={`${run.id}-${check}`}
                              label={check}
                              tone="good"
                            />
                          ))}
                        </div>
                      ) : null}
                      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                        {run.nextAction}
                      </p>
                    </DataCard>
                  );
                })
              ) : (
                <EmptyStateCard
                  title="No source runs recorded"
                  description="Run lead discovery after onboarding to populate source activity and qualification output."
                />
              )}
            </div>
          </Section>

          <Section
            id="leads"
            title="Lead dashboard"
            description="Qualified leads, status changes, and last-touch visibility across the current workspace."
          >
            {dashboard.leads.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {dashboard.leads.map((lead) => (
                  <DataCard
                    key={lead.id}
                    eyebrow={lead.status}
                    title={lead.fullName}
                    summary={`${lead.company ?? "Unknown company"} · ${lead.source}`}
                  >
                    <KeyValueList
                      items={[
                        { label: "Score", value: String(lead.score) },
                        {
                          label: "Last touchpoint",
                          value: lead.lastTouchpoint,
                        },
                        { label: "Email", value: lead.email ?? "n/a" },
                        { label: "Phone", value: lead.phone ?? "n/a" },
                      ]}
                    />
                    {lead.phone &&
                    (lead.status === "qualified" ||
                      lead.status === "contacted") ? (
                      <form
                        action="/api/calls/dispatch"
                        method="post"
                        className="space-y-3"
                      >
                        <input
                          type="hidden"
                          name="returnTo"
                          value="/dashboard"
                        />
                        <input type="hidden" name="leadId" value={lead.id} />
                        <input type="hidden" name="provider" value="twilio" />
                        <button
                          type="submit"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <PhoneCall aria-hidden="true" className="h-4 w-4" />
                          Dispatch guarded call
                        </button>
                        <p className="text-xs leading-5 text-slate-500">
                          Rechecks verified email, call-channel access,
                          suppression, usage, and provider-cost budget.
                        </p>
                      </form>
                    ) : null}
                  </DataCard>
                ))}
              </div>
            ) : (
              <EmptyStateCard
                title="No leads yet"
                description="Leads will appear here after source runs generate qualified records for the workspace."
              />
            )}
          </Section>

          <Section
            id="outreach-operations"
            title="Outreach operations"
            description="Campaign state, approval status, and personalized activity records across your outbound motion."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {outreachSequencePlan ? (
                <DataCard
                  eyebrow="Sequence plan"
                  title={outreachSequencePlan.title}
                  summary={outreachSequencePlan.summary}
                >
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      label={outreachSequencePlan.posture.replaceAll("_", " ")}
                      tone={outreachSequenceTone(outreachSequencePlan.posture)}
                    />
                    <StatusPill
                      label={`${outreachSequencePlan.steps.length} steps`}
                    />
                    <StatusPill
                      label={`${outreachSequencePlan.candidates.length} leads`}
                    />
                  </div>
                  <KeyValueList
                    items={outreachSequencePlan.metrics.map((metric) => ({
                      label: metric.label,
                      value: metric.value,
                    }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    {outreachSequencePlan.channels.map((channel) => (
                      <StatusPill
                        key={channel.channel}
                        label={`${channel.label}: ${channel.status.replaceAll("_", " ")}`}
                        tone={channel.tone}
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {outreachSequencePlan.steps.slice(0, 3).map((step) => (
                      <div
                        key={step.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900">
                            Day {step.dayOffset}: {step.title}
                          </p>
                          <StatusPill
                            label={step.channel}
                            tone={
                              step.riskLevel === "high" ? "warn" : "neutral"
                            }
                          />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {step.objective}
                        </p>
                        <p className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                          {step.sampleBody}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-2">
                    {outreachSequencePlan.nextActions
                      .slice(0, 2)
                      .map((action) => (
                        <Link
                          key={action.id}
                          href={action.href}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500"
                        >
                          {action.label}
                          <ExternalLink
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </Link>
                      ))}
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    {outreachSequencePlan.guardrails[0]}
                  </p>
                </DataCard>
              ) : (
                <DataCard
                  eyebrow="Sequence plan"
                  title="Outreach sequence plan unavailable"
                  summary="Reviewable multi-step outreach guidance could not be loaded from the API."
                >
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                    Sequence planning will return here when the read-only
                    outreach endpoint is reachable.
                  </p>
                </DataCard>
              )}

              {outboundChannelReadiness ? (
                <DataCard
                  eyebrow="Channel readiness"
                  title="Outbound channels"
                  summary="Plan access, quota, provider, cost, approval, and policy posture for each outbound lane."
                >
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      label={outboundChannelReadiness.posture}
                      tone={outboundChannelReadinessTone(
                        outboundChannelReadiness.posture,
                      )}
                    />
                    <StatusPill
                      label={`${outboundChannelReadiness.summary.liveDispatchChannels.length} live`}
                      tone={
                        outboundChannelReadiness.summary.liveDispatchChannels
                          .length > 0
                          ? "good"
                          : "blocked"
                      }
                    />
                    <StatusPill
                      label={`${outboundChannelReadiness.summary.reviewOnlyChannels.length} review-only`}
                      tone={
                        outboundChannelReadiness.summary.reviewOnlyChannels
                          .length > 0
                          ? "warn"
                          : "neutral"
                      }
                    />
                  </div>
                  <KeyValueList
                    items={outboundChannelReadiness.metrics.map((metric) => ({
                      label: metric.label,
                      value: metric.value,
                    }))}
                  />
                  <div className="space-y-2">
                    {outboundChannelReadiness.channels.map((channel) => (
                      <div
                        key={channel.channel}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900">
                            {channel.label}
                          </p>
                          <StatusPill
                            label={channel.status.replaceAll("_", " ")}
                            tone={channel.tone}
                          />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {channel.detail}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {channel.blockers.length > 0
                            ? `Blockers: ${channel.blockers.slice(0, 2).join(", ")}`
                            : channel.quotaRemaining !== null
                              ? `${channel.quotaRemaining.toLocaleString("en-US")} remaining on ${channel.quotaMetric}.`
                              : "No live provider mutation is available from this lane."}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    {outboundChannelReadiness.guardrails[0]}
                  </p>
                </DataCard>
              ) : (
                <DataCard
                  eyebrow="Channel readiness"
                  title="Outbound readiness unavailable"
                  summary="Channel readiness could not be loaded from the API."
                >
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                    Channel posture will return here when the readiness
                    endpoint is reachable.
                  </p>
                </DataCard>
              )}

              <DataCard
                eyebrow="Campaign draft"
                title="Create review campaign"
                summary={`${qualifiedLeadCount} qualified ${
                  qualifiedLeadCount === 1 ? "lead is" : "leads are"
                } ready for a draft campaign.`}
              >
                <form
                  action="/api/campaigns/create"
                  method="post"
                  className="space-y-3"
                >
                  <input type="hidden" name="returnTo" value="/dashboard" />
                  <div className="space-y-2">
                    <label
                      htmlFor="campaign-create-name"
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                    >
                      Campaign name
                    </label>
                    <input
                      id="campaign-create-name"
                      name="name"
                      defaultValue="Qualified lead first touch"
                      minLength={3}
                      required
                      className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-500"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="space-y-2">
                      <label
                        htmlFor="campaign-create-channel"
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                      >
                        Channel
                      </label>
                      <select
                        id="campaign-create-channel"
                        name="channel"
                        defaultValue="email"
                        className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-500"
                      >
                        <option value="email">Email</option>
                        <option value="linkedin">LinkedIn review</option>
                      </select>
                    </div>
                    <label className="flex min-h-11 items-center gap-2 self-end rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        name="highRiskChannel"
                        value="true"
                        className="h-4 w-4 rounded border-slate-300 text-slate-950"
                      />
                      High risk
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={qualifiedLeadCount === 0}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Send aria-hidden="true" className="h-4 w-4" />
                    Create draft campaign
                  </button>
                  <p className="text-xs leading-5 text-slate-500">
                    Creates a draft only; approval and dispatch gates still run
                    before outreach.
                  </p>
                </form>
              </DataCard>
              {dashboard.campaigns.length > 0 ? (
                dashboard.campaigns.map((campaign) => {
                  const dispatchReadinessGate =
                    buildCampaignDispatchReadinessGate(
                      campaign,
                      outboundChannelReadiness,
                    );

                  return (
                    <DataCard
                      key={campaign.id}
                      eyebrow={campaign.channel}
                      title={campaign.name}
                      summary={campaign.nextActionAt}
                    >
                      <KeyValueList
                        items={[
                          { label: "Stage", value: campaign.stage },
                          {
                            label: "Approved",
                            value: campaign.approved ? "yes" : "no",
                          },
                          {
                            label: "Leads enrolled",
                            value: String(campaign.leadsEnrolled),
                          },
                        ]}
                      />
                      {campaign.approved && !campaign.firstActionCompleted ? (
                        <div className="space-y-3">
                          {dispatchReadinessGate ? (
                            <div
                              className={
                                dispatchReadinessGate.tone === "blocked"
                                  ? "rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900"
                                  : "rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
                              }
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1 space-y-1">
                                  <p className="font-semibold">
                                    {dispatchReadinessGate.title}
                                  </p>
                                  <p>{dispatchReadinessGate.detail}</p>
                                  <p>{dispatchReadinessGate.blockerSummary}</p>
                                </div>
                                <Link
                                  href={dispatchReadinessGate.actionHref}
                                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-current px-3 py-1.5 font-semibold"
                                >
                                  {dispatchReadinessGate.actionLabel}
                                  <ExternalLink
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5"
                                  />
                                </Link>
                              </div>
                            </div>
                          ) : null}
                          <form
                            action={`/api/campaigns/${campaign.id}/dispatch`}
                            method="post"
                            className="space-y-3"
                          >
                            <input
                              type="hidden"
                              name="returnTo"
                              value="/dashboard"
                            />
                            <button
                              type="submit"
                              disabled={Boolean(dispatchReadinessGate)}
                              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              <Send aria-hidden="true" className="h-4 w-4" />
                              {dispatchReadinessGate
                                ? "Resolve dispatch readiness"
                                : "Dispatch approved touch"}
                            </button>
                            <p className="text-xs leading-5 text-slate-500">
                              Rechecks verified email, suppression,
                              entitlements, and provider-cost budget first.
                            </p>
                          </form>
                        </div>
                      ) : campaign.approved ? (
                        <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
                          First approved touch is already recorded.
                        </p>
                      ) : canReviewProposals ? (
                        <form
                          action={`/api/campaigns/${campaign.id}/approve`}
                          method="post"
                          className="space-y-3"
                        >
                          <input
                            type="hidden"
                            name="returnTo"
                            value="/dashboard"
                          />
                          <button
                            type="submit"
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            <CheckCircle2
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                            Approve campaign
                          </button>
                          <p className="text-xs leading-5 text-slate-500">
                            Approves the draft only; dispatch still rechecks
                            verified email, entitlements, suppression, and
                            provider budget.
                          </p>
                        </form>
                      ) : (
                        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                          Owner or admin access with verified email is required
                          before dispatch approval.
                        </p>
                      )}
                    </DataCard>
                  );
                })
              ) : (
                <EmptyStateCard
                  title="No campaigns yet"
                  description="Approved campaigns will appear here once outbound is configured for this workspace."
                />
              )}

              {dashboard.activities.length > 0
                ? dashboard.activities.map((activity) => (
                    <DataCard
                      key={activity.id}
                      eyebrow={activity.type}
                      title={activity.subject}
                      summary={activity.preview}
                    >
                      <KeyValueList
                        items={[
                          { label: "Status", value: activity.status },
                          { label: "Lead", value: activity.personalizedFor },
                        ]}
                      />
                    </DataCard>
                  ))
                : null}
            </div>
          </Section>

          <Section
            id="calls-and-meetings"
            title="Calls and meetings"
            description="Call records, review state, and meeting outcomes for operator-visible follow-through."
          >
            {conversionBrief ? (
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Conversion brief
                    </span>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      {conversionBrief.title}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {conversionBrief.summary}
                    </p>
                  </div>
                  <StatusPill
                    label={conversionBrief.posture.replace(/_/g, " ")}
                    tone={conversionBriefTone(conversionBrief.posture)}
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {conversionBrief.metrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {metric.label}
                        </p>
                        <StatusPill label={metric.tone} tone={metric.tone} />
                      </div>
                      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                        {metric.value}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        {metric.detail}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-slate-950">
                        Next actions
                      </h4>
                      <span className="text-xs font-medium text-slate-500">
                        {conversionBrief.nextActions.length} open
                      </span>
                    </div>
                    <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                      {conversionBrief.nextActions.map((action) => (
                        <div key={action.id} className="p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <Link
                                href={action.href}
                                className="text-sm font-semibold text-slate-950 underline-offset-4 hover:underline"
                              >
                                {action.label}
                              </Link>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {action.detail}
                              </p>
                            </div>
                            <StatusPill
                              label={action.urgency}
                              tone={action.urgency}
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {action.evidence.map((item) => (
                              <span
                                key={`${action.id}-${item}`}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-950">
                      Lead focus
                    </h4>
                    {conversionBrief.leadFocus.length > 0 ? (
                      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                        {conversionBrief.leadFocus.map((lead) => (
                          <div key={lead.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <Link
                                  href={lead.href}
                                  className="text-sm font-semibold text-slate-950 underline-offset-4 hover:underline"
                                >
                                  {lead.fullName}
                                </Link>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  {lead.company ?? lead.contact}
                                </p>
                              </div>
                              <StatusPill
                                label={`${lead.score}`}
                                tone="neutral"
                              />
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {lead.reason}
                            </p>
                            <p className="mt-2 text-xs font-medium leading-5 text-slate-700">
                              {lead.recommendedAction}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyStateCard
                        title="No meeting candidates"
                        description="The current workspace has no qualified or contacted lead waiting for a manual meeting handoff."
                      />
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  {conversionBrief.guardrails.slice(0, 3).map((guardrail) => (
                    <span
                      key={guardrail}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {guardrail}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyStateCard
                title="Conversion brief unavailable"
                description="Lead, call, and meeting records are still visible below while the operator brief reloads."
              />
            )}
            {conversionWorkQueue ? (
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Work queue
                    </span>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      {conversionWorkQueue.title}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {conversionWorkQueue.summary}
                    </p>
                  </div>
                  <StatusPill
                    label={conversionWorkQueue.posture}
                    tone={
                      conversionWorkQueue.posture === "blocked"
                        ? "blocked"
                        : conversionWorkQueue.posture === "overdue"
                          ? "warn"
                          : conversionWorkQueue.posture === "ready"
                            ? "warn"
                            : "good"
                    }
                  />
                </div>

                {conversionFollowUpInsight ? (
                  <div className="mt-5 border-y border-slate-200 py-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Conversion follow-up
                          </span>
                          <StatusPill
                            label={conversionFollowUpInsight.label}
                            tone={conversionFollowUpInsight.tone}
                          />
                        </div>
                        <h4 className="mt-2 text-base font-semibold tracking-tight text-slate-950">
                          {conversionFollowUpInsight.headline}
                        </h4>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                          {conversionFollowUpInsight.detail}
                        </p>
                        <p className="mt-2 text-xs font-medium leading-5 text-slate-700">
                          {conversionFollowUpInsight.riskSummary}
                        </p>
                      </div>
                      <div
                        className={`rounded-lg border px-4 py-3 ${cockpitToneClassName(
                          conversionFollowUpInsight.tone,
                        )}`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                          Top move
                        </p>
                        {conversionFollowUpInsight.primaryAction ? (
                          <>
                            <Link
                              href={
                                conversionFollowUpInsight.primaryAction.href
                              }
                              className="mt-2 block text-sm font-semibold underline-offset-4 hover:underline"
                            >
                              {conversionFollowUpInsight.primaryAction.label}
                            </Link>
                            <p className="mt-1 text-xs font-medium leading-5">
                              {conversionFollowUpInsight.primaryAction.title} ·{" "}
                              {conversionFollowUpInsight.primaryAction.dueLabel}
                            </p>
                            <p className="mt-2 text-xs leading-5">
                              {conversionFollowUpInsight.primaryAction.detail}
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 text-sm leading-6">
                            No conversion task is waiting for operator action.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {conversionFollowUpInsight.lanes.map((lane) => (
                        <div
                          key={lane.id}
                          className="border-l border-slate-200 pl-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {lane.label}
                            </p>
                            <StatusPill label={lane.tone} tone={lane.tone} />
                          </div>
                          <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                            {lane.value}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {lane.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-xs leading-5 text-slate-500">
                      {conversionFollowUpInsight.guardrailSummary}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {conversionWorkQueue.metrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {metric.label}
                        </p>
                        <StatusPill label={metric.tone} tone={metric.tone} />
                      </div>
                      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                        {metric.value}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        {metric.detail}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
                  <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.55fr)_8rem_7rem]">
                    <span>Task</span>
                    <span className="hidden lg:block">Suggested action</span>
                    <span>Due</span>
                    <span className="hidden lg:block">Urgency</span>
                  </div>
                  {conversionWorkQueue.items.length > 0 ? (
                    <div className="divide-y divide-slate-200">
                      {conversionWorkQueue.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.55fr)_8rem_7rem]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={item.href}
                                className="text-sm font-semibold text-slate-950 underline-offset-4 hover:underline"
                              >
                                {item.title}
                              </Link>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {item.type.replace(/_/g, " ")}
                              </span>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {item.detail}
                            </p>
                            {item.lead ? (
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {item.lead.fullName} ·{" "}
                                {item.lead.company ?? item.lead.contact} · score{" "}
                                {item.lead.score}
                              </p>
                            ) : null}
                          </div>
                          <p className="hidden text-sm leading-6 text-slate-600 lg:block">
                            {item.suggestedAction}
                          </p>
                          <div className="flex items-start gap-2 text-sm font-medium text-slate-700">
                            <Clock3
                              aria-hidden="true"
                              className="mt-0.5 h-4 w-4 shrink-0"
                            />
                            <span>{item.dueLabel}</span>
                          </div>
                          <div className="hidden lg:block">
                            <StatusPill
                              label={item.urgency}
                              tone={conversionWorkQueueUrgencyTone(
                                item.urgency,
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-5">
                      <EmptyStateCard
                        title="No conversion tasks"
                        description="Open meeting, call review, handoff, and value-capture tasks will appear here as pipeline state changes."
                      />
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  {conversionWorkQueue.guardrails
                    .slice(0, 3)
                    .map((guardrail) => (
                      <span
                        key={guardrail}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {guardrail}
                      </span>
                    ))}
                </div>
              </div>
            ) : (
              <EmptyStateCard
                title="Conversion work queue unavailable"
                description="Meeting scheduling and outcome controls remain available while the queue reloads."
              />
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DataCard
                eyebrow="CRM handoff"
                title="Manual CRM export"
                summary={`${crmHandoff.summary.totalRecords} lead records packaged for operator-reviewed CRM import.`}
              >
                <KeyValueList
                  items={[
                    {
                      label: "Open pipeline",
                      value: String(crmHandoff.summary.openPipelineCount),
                    },
                    {
                      label: "Closed won",
                      value: String(crmHandoff.summary.closedWonCount),
                    },
                    {
                      label: "Missing contact",
                      value: String(crmHandoff.summary.missingContactCount),
                    },
                    {
                      label: "Captured value",
                      value: formatMoneyCents(
                        crmHandoff.summary.valueCapturedCents,
                        crmHandoff.summary.currency,
                      ),
                    },
                  ]}
                />
                <a
                  href="/api/conversion/crm-handoff"
                  download={crmHandoff.csv.filename}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500"
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                  Download CRM CSV
                </a>
                <p className="text-xs leading-5 text-slate-500">
                  Manual export only. Review consent, suppression, and field
                  mapping before CRM import.
                </p>
              </DataCard>
              <DataCard
                eyebrow="Meeting handoff"
                title="Schedule conversion meeting"
                summary={`${meetingCandidateLeads.length} ${
                  meetingCandidateLeads.length === 1 ? "lead" : "leads"
                } ready for a manual meeting handoff.`}
              >
                <form
                  action="/api/meetings/create"
                  method="post"
                  className="space-y-3"
                >
                  <input type="hidden" name="returnTo" value="/dashboard" />
                  <div className="space-y-2">
                    <label
                      htmlFor="meeting-create-lead"
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                    >
                      Lead
                    </label>
                    <select
                      id="meeting-create-lead"
                      name="leadId"
                      disabled={meetingCandidateLeads.length === 0}
                      className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {meetingCandidateLeads.length > 0 ? (
                        meetingCandidateLeads.map((lead) => (
                          <option key={lead.id} value={lead.id}>
                            {lead.fullName} · {lead.company ?? lead.source} ·{" "}
                            {lead.status}
                          </option>
                        ))
                      ) : (
                        <option>No eligible lead</option>
                      )}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="meeting-create-time"
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                      >
                        Scheduled time
                      </label>
                      <input
                        id="meeting-create-time"
                        type="datetime-local"
                        name="scheduledFor"
                        required
                        disabled={meetingCandidateLeads.length === 0}
                        className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="meeting-create-owner"
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                      >
                        Owner
                      </label>
                      <input
                        id="meeting-create-owner"
                        name="owner"
                        defaultValue={
                          session.user.name ?? session.user.email ?? "sales-ops"
                        }
                        minLength={2}
                        required
                        disabled={meetingCandidateLeads.length === 0}
                        className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="meeting-create-notes"
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                    >
                      Notes
                    </label>
                    <textarea
                      id="meeting-create-notes"
                      name="notes"
                      defaultValue="Manual meeting booked from dashboard conversion workflow."
                      rows={2}
                      minLength={2}
                      required
                      disabled={meetingCandidateLeads.length === 0}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={meetingCandidateLeads.length === 0}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    <CalendarPlus aria-hidden="true" className="h-4 w-4" />
                    Schedule meeting
                  </button>
                  <p className="text-xs leading-5 text-slate-500">
                    Creates a scheduled meeting and moves the lead into
                    conversion follow-through.
                  </p>
                </form>
              </DataCard>
              {dashboard.calls.length > 0 ? (
                dashboard.calls.map((call) => (
                  <DataCard
                    key={call.id}
                    eyebrow={call.provider}
                    title={call.disposition}
                    summary={
                      call.summary || "No call summary has been recorded yet."
                    }
                  >
                    <KeyValueList
                      items={[
                        { label: "Status", value: call.status },
                        {
                          label: "Review required",
                          value: call.reviewRequired ? "yes" : "no",
                        },
                      ]}
                    />
                  </DataCard>
                ))
              ) : (
                <EmptyStateCard
                  title="No calls yet"
                  description="Voice activity appears here after call records are created or provider events land."
                />
              )}

              {dashboard.meetings.length > 0
                ? dashboard.meetings.map((meeting) => {
                    const calendarHandoff = meetingCalendarHandoffs.get(
                      meeting.id,
                    );
                    const googleCalendarLink = calendarHandoff?.links.find(
                      (link) => link.provider === "google",
                    );
                    const outlookCalendarLink = calendarHandoff?.links.find(
                      (link) => link.provider === "outlook",
                    );

                    return (
                      <DataCard
                        key={meeting.id}
                        eyebrow={meeting.status}
                        title={meeting.owner}
                        summary={meeting.notes}
                      >
                        <KeyValueList
                          items={[
                            { label: "Scheduled", value: meeting.scheduledFor },
                            { label: "Lead", value: meeting.leadId },
                            {
                              label: "Actual value",
                              value:
                                meeting.dealValueCents > 0
                                  ? formatMoneyCents(
                                      meeting.dealValueCents,
                                      meeting.dealCurrency,
                                    )
                                  : "not recorded",
                            },
                          ]}
                        />
                        {calendarHandoff?.ready ? (
                          <div className="border-t border-slate-200 pt-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  Calendar handoff
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                  {calendarHandoff.meeting.title}
                                </p>
                              </div>
                              <StatusPill
                                label="operator triggered"
                                tone="neutral"
                              />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {googleCalendarLink ? (
                                <a
                                  href={googleCalendarLink.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-slate-500"
                                >
                                  <ExternalLink
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5"
                                  />
                                  Google
                                </a>
                              ) : null}
                              {outlookCalendarLink ? (
                                <a
                                  href={outlookCalendarLink.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-slate-500"
                                >
                                  <ExternalLink
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5"
                                  />
                                  Outlook
                                </a>
                              ) : null}
                              <a
                                href={`/api/meetings/${meeting.id}/calendar`}
                                download={calendarHandoff.ics?.filename}
                                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-slate-500"
                              >
                                <Download
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                />
                                ICS
                              </a>
                            </div>
                          </div>
                        ) : calendarHandoff &&
                          calendarHandoff.blockers.length > 0 ? (
                          <p className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
                            {calendarHandoff.blockers[0]}
                          </p>
                        ) : null}
                        <form
                          action={`/api/meetings/${meeting.id}/update`}
                          method="post"
                          className="space-y-3"
                        >
                          <input
                            type="hidden"
                            name="returnTo"
                            value="/dashboard"
                          />
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(90px,0.3fr)_auto]">
                            <div className="space-y-2">
                              <label
                                htmlFor={`meeting-status-${meeting.id}`}
                                className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                              >
                                Outcome
                              </label>
                              <select
                                id={`meeting-status-${meeting.id}`}
                                name="status"
                                defaultValue={meeting.status}
                                className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-500"
                              >
                                <option value="pending">Pending</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="completed">Completed</option>
                                <option value="canceled">Canceled</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label
                                htmlFor={`meeting-deal-value-${meeting.id}`}
                                className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                              >
                                Deal value
                              </label>
                              <input
                                id={`meeting-deal-value-${meeting.id}`}
                                name="dealValue"
                                type="number"
                                min="0"
                                step="1"
                                defaultValue={
                                  meeting.dealValueCents > 0
                                    ? String(
                                        Math.round(
                                          meeting.dealValueCents / 100,
                                        ),
                                      )
                                    : ""
                                }
                                placeholder="0"
                                className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <label
                                htmlFor={`meeting-deal-currency-${meeting.id}`}
                                className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                              >
                                Currency
                              </label>
                              <input
                                id={`meeting-deal-currency-${meeting.id}`}
                                name="dealCurrency"
                                defaultValue={meeting.dealCurrency}
                                minLength={3}
                                maxLength={3}
                                className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium uppercase text-slate-900 outline-none transition focus:border-slate-500"
                              />
                            </div>
                            <button
                              type="submit"
                              className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              <CheckCircle2
                                aria-hidden="true"
                                className="h-4 w-4"
                              />
                              Save outcome
                            </button>
                          </div>
                          <label
                            htmlFor={`meeting-notes-${meeting.id}`}
                            className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                          >
                            Outcome note
                          </label>
                          <textarea
                            id={`meeting-notes-${meeting.id}`}
                            name="notes"
                            defaultValue={
                              meeting.notes ||
                              "Meeting outcome updated from dashboard."
                            }
                            rows={2}
                            minLength={2}
                            required
                            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <p className="text-xs leading-5 text-slate-500">
                            Completed meetings mark the lead won and can record
                            actual contract value; canceled meetings mark it
                            lost.
                          </p>
                        </form>
                      </DataCard>
                    );
                  })
                : null}
            </div>
          </Section>

          <Section
            id="ai-workers"
            title="AI worker control plane"
            description="Workspace-scoped AI worker registry, budget posture, task ledger, and approval-gated execution controls."
          >
            {aiWorkerControlPlane ? (
              <div className="space-y-4">
                <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white/90 p-5 text-sm shadow-sm shadow-slate-200/60 sm:grid-cols-3 xl:grid-cols-6">
                  {[
                    {
                      label: "Active",
                      value: String(aiWorkerControlPlane.summary.active),
                    },
                    {
                      label: "Paused",
                      value: String(aiWorkerControlPlane.summary.paused),
                    },
                    {
                      label: "Disabled",
                      value: String(aiWorkerControlPlane.summary.disabled),
                    },
                    {
                      label: "Pending",
                      value: String(
                        aiWorkerControlPlane.summary.pendingApproval,
                      ),
                    },
                    {
                      label: "Blocked",
                      value: String(aiWorkerControlPlane.summary.blocked),
                    },
                    {
                      label: "Budget",
                      value: `${formatCents(aiWorkerControlPlane.summary.budgetUsedCents)} / ${formatCents(aiWorkerControlPlane.summary.budgetLimitCents)}`,
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/60">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Budget readiness
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">
                        {aiWorkerBudgetReadiness.title}
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        {aiWorkerBudgetReadiness.summary}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill
                        label={aiWorkerBudgetReadiness.posture.replaceAll(
                          "_",
                          " ",
                        )}
                        tone={aiWorkerBudgetReadiness.tone}
                      />
                      <StatusPill
                        label={
                          aiWorkerBudgetReadiness.canProposeNextTask
                            ? "proposal ready"
                            : "proposal gated"
                        }
                        tone={
                          aiWorkerBudgetReadiness.canProposeNextTask
                            ? "good"
                            : aiWorkerBudgetReadiness.tone === "blocked"
                              ? "blocked"
                              : "warn"
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(220px,0.75fr)_minmax(0,1.25fr)]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <KeyValueList items={aiWorkerBudgetReadiness.metrics} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {aiWorkerBudgetReadiness.signals.map((signal) => (
                        <div
                          key={signal.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                {signal.label}
                              </p>
                              <p className="mt-2 font-semibold text-slate-950">
                                {signal.value}
                              </p>
                            </div>
                            <StatusPill
                              label={signal.tone}
                              tone={signal.tone}
                            />
                          </div>
                          <p className="mt-3 text-xs leading-5 text-slate-600">
                            {signal.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                    {aiWorkerBudgetReadiness.guardrails[0]}
                  </p>
                </div>

                {aiWorkerExecutionReadiness ? (
                  <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/60">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Execution readiness
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-950">
                          {aiWorkerExecutionReadiness.title}
                        </h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                          {aiWorkerExecutionReadiness.summary}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill
                          label={aiWorkerExecutionReadiness.posture.replaceAll(
                            "_",
                            " ",
                          )}
                          tone={aiWorkerExecutionReadiness.tone}
                        />
                        <StatusPill label="live tools blocked" tone="blocked" />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(220px,0.7fr)_minmax(0,1fr)_minmax(260px,0.8fr)]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <KeyValueList
                          items={aiWorkerExecutionReadiness.metrics
                            .slice(0, 5)
                            .map((metric) => ({
                              label: metric.label,
                              value: metric.value,
                            }))}
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {aiWorkerExecutionReadiness.checks.map((check) => (
                          <div
                            key={check.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                {check.label}
                              </p>
                              <StatusPill
                                label={check.status}
                                tone={check.tone}
                              />
                            </div>
                            <p className="mt-3 text-xs leading-5 text-slate-600">
                              {check.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Dry-run harness
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-950">
                              {
                                aiWorkerExecutionReadiness.dryRunCandidates
                                  .length
                              }{" "}
                              candidate
                              {aiWorkerExecutionReadiness.dryRunCandidates
                                .length === 1
                                ? ""
                                : "s"}
                            </p>
                          </div>
                          <StatusPill
                            label={
                              aiWorkerExecutionReadiness.dryRunCandidates
                                .length > 0
                                ? "reviewable"
                                : "waiting"
                            }
                            tone={
                              aiWorkerExecutionReadiness.dryRunCandidates
                                .length > 0
                                ? "good"
                                : "warn"
                            }
                          />
                        </div>
                        {aiWorkerExecutionReadiness.dryRunCandidates.length >
                        0 ? (
                          <div className="mt-3 space-y-3">
                            {aiWorkerExecutionReadiness.dryRunCandidates
                              .slice(0, 2)
                              .map((candidate) => (
                                <div
                                  key={candidate.runId}
                                  className="rounded-2xl bg-white px-3 py-2"
                                >
                                  <p className="text-sm font-semibold text-slate-950">
                                    {candidate.title}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-slate-600">
                                    {candidate.workerName} ·{" "}
                                    {formatCents(candidate.expectedCostCents)}
                                  </p>
                                  <p className="mt-2 text-xs leading-5 text-slate-600">
                                    Fallback: {candidate.fallback}
                                  </p>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-xs leading-5 text-slate-600">
                            Approve a worker task before dry-run rehearsal
                            appears here.
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                      {aiWorkerExecutionReadiness.liveExecution.detail}
                    </p>
                  </div>
                ) : (
                  <EmptyStateCard
                    title="AI worker execution readiness unavailable"
                    description="The dashboard could not load the read-only execution harness report. Worker proposals remain approval-gated."
                  />
                )}

                {aiWorkerMarginReadiness ? (
                  <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/60">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Margin readiness
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-950">
                          {aiWorkerMarginReadiness.title}
                        </h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                          {aiWorkerMarginReadiness.summary}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill
                          label={aiWorkerMarginReadiness.posture.replaceAll(
                            "_",
                            " ",
                          )}
                          tone={aiWorkerMarginReadiness.tone}
                        />
                        <StatusPill label="live scale blocked" tone="blocked" />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(220px,0.65fr)_minmax(0,1fr)_minmax(260px,0.8fr)]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <KeyValueList
                          items={aiWorkerMarginReadiness.metrics.map(
                            (metric) => ({
                              label: metric.label,
                              value: metric.value,
                            }),
                          )}
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {aiWorkerMarginReadiness.checks.map((check) => (
                          <div
                            key={check.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                {check.label}
                              </p>
                              <StatusPill
                                label={check.status}
                                tone={check.tone}
                              />
                            </div>
                            <p className="mt-3 text-xs leading-5 text-slate-600">
                              {check.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Production controls
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-950">
                              {
                                aiWorkerMarginReadiness.requiredCapabilities.filter(
                                  (capability) => capability.status === "met",
                                ).length
                              }{" "}
                              of{" "}
                              {
                                aiWorkerMarginReadiness.requiredCapabilities
                                  .length
                              }{" "}
                              ready
                            </p>
                          </div>
                          <StatusPill
                            label={
                              aiWorkerMarginReadiness.requiredCapabilities.every(
                                (capability) => capability.status === "met",
                              )
                                ? "ready"
                                : "controls missing"
                            }
                            tone={
                              aiWorkerMarginReadiness.requiredCapabilities.every(
                                (capability) => capability.status === "met",
                              )
                                ? "good"
                                : "warn"
                            }
                          />
                        </div>
                        <div className="mt-3 space-y-3">
                          {aiWorkerMarginReadiness.requiredCapabilities.map(
                            (capability) => (
                              <div
                                key={capability.id}
                                className="rounded-2xl bg-white px-3 py-2"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm font-semibold text-slate-950">
                                    {capability.label}
                                  </p>
                                  <StatusPill
                                    label={capability.status}
                                    tone={
                                      capability.status === "met"
                                        ? "good"
                                        : capability.status === "blocked"
                                          ? "blocked"
                                          : "warn"
                                    }
                                  />
                                </div>
                                <p className="mt-2 text-xs leading-5 text-slate-600">
                                  {capability.detail}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                        {aiWorkerMarginReadiness.recommendedPlan ? (
                          <Link
                            href={
                              aiWorkerMarginReadiness.recommendedPlan
                                .checkoutPath
                            }
                            className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            Review{" "}
                            {aiWorkerMarginReadiness.recommendedPlan.planName}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                      {aiWorkerMarginReadiness.liveScale.detail}
                    </p>
                  </div>
                ) : (
                  <EmptyStateCard
                    title="AI worker margin readiness unavailable"
                    description="The dashboard could not load AI-worker cost and entitlement posture. Worker proposals remain approval-gated."
                  />
                )}

                <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.35fr)_minmax(280px,0.95fr)]">
                  <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Registry
                    </p>
                    <div className="mt-4 space-y-3">
                      {aiWorkers.map((worker) => (
                        <div
                          key={worker.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">
                                {worker.name}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-600">
                                {worker.role}
                              </p>
                            </div>
                            <StatusPill
                              label={worker.status}
                              tone={
                                worker.status === "active" ? "good" : "warn"
                              }
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <StatusPill
                              label={worker.riskLevel}
                              tone={
                                worker.riskLevel === "low" ? "good" : "warn"
                              }
                            />
                            <StatusPill label={`owner: ${worker.ownerRole}`} />
                            <StatusPill
                              label={`${worker.allowedTools.length} tools`}
                            />
                          </div>
                          <p className="mt-3 text-xs font-medium text-slate-700">
                            {formatCents(worker.budgetUsedCents)} used of{" "}
                            {formatCents(worker.monthlyBudgetCents)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/60">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Execution ledger
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-950">
                          Worker task ledger
                        </h3>
                      </div>
                      <StatusPill label="approval gated" tone="warn" />
                    </div>

                    {aiWorkerRuns.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {aiWorkerRuns.slice(0, 5).map((run) => (
                          <div
                            key={run.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-950">
                                  {run.title}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                  {run.workerName} · {run.detail}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <StatusPill
                                  label={run.status}
                                  tone={
                                    run.status === "approved" ||
                                    run.status === "completed"
                                      ? "good"
                                      : "warn"
                                  }
                                />
                                <StatusPill label={run.riskLevel} />
                              </div>
                            </div>
                            <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                              <KeyValueList
                                items={[
                                  {
                                    label: "Approval",
                                    value:
                                      run.approvalProposalId ?? "not linked",
                                  },
                                  {
                                    label: "Expected cost",
                                    value: formatCents(run.expectedCostCents),
                                  },
                                  {
                                    label: "Actual cost",
                                    value: formatCents(run.actualCostCents),
                                  },
                                  {
                                    label: "Completed",
                                    value: run.completedAt ?? "not completed",
                                  },
                                ]}
                              />
                              <div className="space-y-3">
                                <p className="rounded-2xl bg-white px-3 py-2 text-xs leading-5 text-slate-700">
                                  {run.resultSummary ??
                                    run.blockedReason ??
                                    run.proposedAction}
                                </p>
                                {run.status === "approved" &&
                                canReviewProposals ? (
                                  <form
                                    action={`/api/ai-workers/runs/${run.id}/complete`}
                                    method="post"
                                    className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3"
                                  >
                                    <input
                                      type="hidden"
                                      name="returnTo"
                                      value="/dashboard#ai-workers"
                                    />
                                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                                      <div className="space-y-2">
                                        <label
                                          htmlFor={`worker-result-${run.id}`}
                                          className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                                        >
                                          Dry-run result
                                        </label>
                                        <textarea
                                          id={`worker-result-${run.id}`}
                                          name="resultSummary"
                                          rows={2}
                                          minLength={8}
                                          required
                                          defaultValue="Dry-run completed inside the governed harness; no external provider, CRM, calendar, billing, or outreach tool ran automatically."
                                          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs leading-5 text-slate-900 outline-none transition focus:border-slate-500"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <label
                                          htmlFor={`worker-cost-${run.id}`}
                                          className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                                        >
                                          Cost
                                        </label>
                                        <input
                                          id={`worker-cost-${run.id}`}
                                          name="actualCost"
                                          type="number"
                                          min="0"
                                          step="1"
                                          defaultValue={String(
                                            Math.round(
                                              run.expectedCostCents / 100,
                                            ),
                                          )}
                                          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-500"
                                        />
                                      </div>
                                    </div>
                                    <button
                                      type="submit"
                                      className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                                    >
                                      Record dry-run result
                                    </button>
                                    <p className="text-[11px] leading-5 text-slate-500">
                                      Completion records cost and summary only;
                                      it does not run worker tools.
                                    </p>
                                  </form>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <EmptyStateCard
                          title="No worker tasks yet"
                          description="Worker proposals and blocked task attempts will appear here once the control plane is used."
                        />
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Inspector
                    </p>
                    {selectedWorker ? (
                      <div className="mt-4 space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-950">
                            {selectedWorker.name}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {selectedWorker.description}
                          </p>
                        </div>
                        <KeyValueList
                          items={[
                            { label: "Status", value: selectedWorker.status },
                            {
                              label: "Owner role",
                              value: selectedWorker.ownerRole,
                            },
                            {
                              label: "Monthly budget",
                              value: formatCents(
                                selectedWorker.monthlyBudgetCents,
                              ),
                            },
                            {
                              label: "Remaining",
                              value: formatCents(
                                selectedWorkerRemainingBudgetCents,
                              ),
                            },
                            {
                              label: "Last action",
                              value: selectedWorker.lastActionAt ?? "none",
                            },
                          ]}
                        />
                        <div className="space-y-2">
                          <p className="font-medium text-slate-900">
                            Guardrails
                          </p>
                          {selectedWorker.guardrails
                            .slice(0, 3)
                            .map((guardrail) => (
                              <p
                                key={guardrail}
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                              >
                                {guardrail}
                              </p>
                            ))}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            Allowed tools
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedWorker.allowedTools.map((tool) => (
                              <StatusPill key={tool} label={tool} tone="good" />
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            Blocked tools
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedWorker.blockedTools.map((tool) => (
                              <StatusPill key={tool} label={tool} tone="warn" />
                            ))}
                          </div>
                        </div>
                        {canProposeWorkerTask ? (
                          <form
                            action="/api/ai-workers/tasks/propose"
                            method="post"
                          >
                            <input
                              type="hidden"
                              name="returnTo"
                              value="/dashboard"
                            />
                            <input
                              type="hidden"
                              name="workerId"
                              value={selectedWorker.id}
                            />
                            <input
                              type="hidden"
                              name="title"
                              value={`Review next ${selectedWorker.name} task`}
                            />
                            <input
                              type="hidden"
                              name="detail"
                              value={`Create a governed task proposal for ${selectedWorker.name} using only allowed tools and current workspace guardrails.`}
                            />
                            <input
                              type="hidden"
                              name="proposedAction"
                              value={`Prepare a bounded ${selectedWorker.role.toLowerCase()} task, write it to the approval ledger, and wait for operator review before any external action.`}
                            />
                            <input
                              type="hidden"
                              name="riskLevel"
                              value={selectedWorker.riskLevel}
                            />
                            <input
                              type="hidden"
                              name="expectedCostCents"
                              value={String(AI_WORKER_TASK_BUDGET_CENTS)}
                            />
                            <input
                              type="hidden"
                              name="requiredRole"
                              value={selectedWorker.ownerRole}
                            />
                            <button
                              type="submit"
                              disabled={!selectedWorkerCanReceiveProposal}
                              className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                            >
                              Propose guarded task
                            </button>
                            {!selectedWorkerCanReceiveProposal ? (
                              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                Worker must be active with at least{" "}
                                {formatCents(AI_WORKER_TASK_BUDGET_CENTS)}{" "}
                                remaining budget before a task proposal can be
                                created.
                              </p>
                            ) : null}
                          </form>
                        ) : (
                          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            Owner or admin access with verified email is
                            required to propose worker tasks.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <EmptyStateCard
                          title="No workers registered"
                          description="The workspace has no AI worker registry yet."
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyStateCard
                title="AI worker control plane unavailable"
                description="The dashboard is reachable, but the worker registry could not be loaded from the API."
              />
            )}
          </Section>

          <Section
            id="approval-inbox"
            title="Action center"
            description="Operator tasks, subscription visibility, and the items that still need a human decision."
          >
            <div className="space-y-4">
              {actionProposalResponse ? (
                <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white/90 p-5 text-sm shadow-sm shadow-slate-200/60 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Pending
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">
                      {actionProposalResponse.summary.pending}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      High risk
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-amber-700">
                      {actionProposalResponse.summary.highRisk}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Approved
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-700">
                      {actionProposalResponse.summary.approved}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Rejected
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-700">
                      {actionProposalResponse.summary.rejected}
                    </p>
                  </div>
                </div>
              ) : null}

              {pendingProposals.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {pendingProposals.map((proposal) => (
                    <article
                      key={proposal.id}
                      className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/60"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {proposal.proposedBy} proposal
                          </p>
                          <h3 className="mt-3 text-lg font-semibold text-slate-950">
                            {proposal.title}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusPill label={proposal.status} />
                          <StatusPill
                            label={proposal.riskLevel}
                            tone={
                              proposal.riskLevel === "low" ? "good" : "warn"
                            }
                          />
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {proposal.detail}
                      </p>
                      <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                        <KeyValueList
                          items={[
                            { label: "Target", value: proposal.targetLabel },
                            {
                              label: "Type",
                              value: proposal.type.replaceAll("_", " "),
                            },
                            {
                              label: "Requested by",
                              value: proposal.requestedBy ?? "system",
                            },
                          ]}
                        />
                        <div className="space-y-2">
                          <p className="font-medium text-slate-900">
                            Guardrails
                          </p>
                          {proposal.guardrails.slice(0, 2).map((guardrail) => (
                            <p
                              key={guardrail}
                              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              {guardrail}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                        <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-emerald-900">
                          {proposal.expectedEffect}
                        </p>
                        <p className="rounded-2xl bg-amber-50 px-3 py-2 text-amber-900">
                          {proposal.rollbackPlan}
                        </p>
                      </div>
                      {canReviewProposals ? (
                        <form
                          action={`/api/action-proposals/${proposal.id}/review`}
                          method="post"
                          className="mt-4 space-y-3"
                        >
                          <input
                            type="hidden"
                            name="returnTo"
                            value="/dashboard"
                          />
                          <label
                            htmlFor={`proposal-note-${proposal.id}`}
                            className="text-sm font-medium text-slate-800"
                          >
                            Review note
                          </label>
                          <textarea
                            id={`proposal-note-${proposal.id}`}
                            name="note"
                            defaultValue="Reviewed from dashboard approval inbox."
                            rows={2}
                            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="submit"
                              name="decision"
                              value="approve"
                              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              Approve
                            </button>
                            <button
                              type="submit"
                              name="decision"
                              value="reject"
                              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                            >
                              Reject
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          Owner or admin access with verified email is required
                          to review this proposal.
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {dashboard.actionItems.length > 0 ? (
                  dashboard.actionItems.map((item) => (
                    <DataCard
                      key={item.id}
                      eyebrow={item.urgency}
                      title={item.title}
                      summary={item.detail}
                    />
                  ))
                ) : (
                  <EmptyStateCard
                    title="No action items right now"
                    description="Sensitive or blocked workflow steps will appear here when the system needs an operator."
                  />
                )}

                {planGrowthReadiness ? (
                  <DataCard
                    eyebrow="Growth"
                    title={planGrowthReadiness.title}
                    summary={planGrowthReadiness.summary}
                  >
                    <div className="flex flex-wrap gap-2">
                      <StatusPill
                        label={planGrowthReadiness.posture.replaceAll("_", " ")}
                        tone={planGrowthReadinessTone(
                          planGrowthReadiness.posture,
                        )}
                      />
                      {planGrowthReadiness.recommendedPlan ? (
                        <StatusPill
                          label={`next: ${planGrowthReadiness.recommendedPlan.planName}`}
                          tone="warn"
                        />
                      ) : null}
                    </div>
                    <KeyValueList
                      items={planGrowthReadiness.metrics
                        .slice(0, 4)
                        .map((metric) => ({
                          label: metric.label,
                          value: metric.value,
                        }))}
                    />
                    <div className="space-y-2">
                      {planGrowthReadiness.signals.slice(0, 4).map((signal) => (
                        <div
                          key={signal.id}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-slate-900">
                              {signal.title}
                            </p>
                            <StatusPill
                              label={signal.tone}
                              tone={signal.tone}
                            />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {signal.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-2">
                      {planGrowthReadiness.nextActions
                        .slice(0, 2)
                        .map((action) => (
                          <Link
                            key={action.id}
                            href={action.href}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500"
                          >
                            {action.label}
                            <ExternalLink
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                          </Link>
                        ))}
                    </div>
                    <p className="text-xs leading-5 text-slate-500">
                      {planGrowthReadiness.guardrails[0]}
                    </p>
                  </DataCard>
                ) : (
                  <DataCard
                    eyebrow="Growth"
                    title="Plan growth readiness unavailable"
                    summary="Plan pressure guidance could not be loaded from the API."
                  >
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                      Usage limits, provider budget, channel fit, and upgrade
                      guidance will return here when the readiness endpoint is
                      reachable.
                    </p>
                  </DataCard>
                )}

                <DataCard
                  eyebrow="Managed support"
                  title={managedSupportFit.title}
                  summary={managedSupportFit.summary}
                >
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      label={managedSupportFit.posture.replaceAll("_", " ")}
                      tone={managedSupportFit.tone}
                    />
                    <StatusPill label={managedSupportFit.package.tier} />
                  </div>
                  <KeyValueList items={managedSupportFit.metrics} />
                  <div className="divide-y divide-slate-200 border-y border-slate-200">
                    {managedSupportFit.signals.slice(0, 4).map((signal) => (
                      <div key={signal.id} className="py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">
                              {signal.label}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {signal.detail}
                            </p>
                          </div>
                          <StatusPill label={signal.value} tone={signal.tone} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={managedSupportFit.contactHref}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500"
                  >
                    {managedSupportFit.contactLabel}
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </Link>
                  <p className="text-xs leading-5 text-slate-500">
                    {managedSupportFit.guardrails[0]}
                  </p>
                </DataCard>

                {managedServiceReadiness ? (
                  <DataCard
                    eyebrow="Managed readiness"
                    title={managedServiceReadiness.title}
                    summary={managedServiceReadiness.summary}
                  >
                    <div className="flex flex-wrap gap-2">
                      <StatusPill
                        label={managedServiceReadiness.posture.replaceAll("_", " ")}
                        tone={
                          managedServiceReadiness.posture === "blocked"
                            ? "blocked"
                            : managedServiceReadiness.posture === "needs_operator_review"
                              ? "warn"
                              : "good"
                        }
                      />
                      <StatusPill
                        label={managedServiceReadiness.recommendedPackage.tier}
                      />
                    </div>
                    <KeyValueList
                      items={managedServiceReadiness.metrics
                        .slice(0, 4)
                        .map((metric) => ({
                          label: metric.label,
                          value: metric.value,
                        }))}
                    />
                    <div className="space-y-2">
                      {managedServiceReadiness.controls
                        .slice(0, 4)
                        .map((control) => (
                          <div
                            key={control.id}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium text-slate-900">
                                {control.title}
                              </p>
                              <StatusPill
                                label={control.tone}
                                tone={control.tone}
                              />
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {control.detail}
                            </p>
                          </div>
                        ))}
                    </div>
                    <div className="grid gap-2">
                      {managedServiceReadiness.nextActions
                        .slice(0, 2)
                        .map((action) => (
                          <Link
                            key={action.id}
                            href={action.href}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500"
                          >
                            {action.label}
                            <ExternalLink
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                          </Link>
                        ))}
                    </div>
                    <p className="text-xs leading-5 text-slate-500">
                      {managedServiceReadiness.guardrails[0]}
                    </p>
                  </DataCard>
                ) : (
                  <DataCard
                    eyebrow="Managed readiness"
                    title="Managed service readiness unavailable"
                    summary="Commercial delivery readiness could not be loaded from the API."
                  >
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                      Scope policy, SOW, delivery owner, provider-cost
                      boundary, support capacity, and approval workload will
                      return here when the readiness endpoint is reachable.
                    </p>
                  </DataCard>
                )}

                <DataCard
                  eyebrow="Subscription"
                  title={dashboard.subscription.planKey}
                  summary={dashboard.subscription.status}
                >
                  <KeyValueList
                    items={[
                      {
                        label: "Seats",
                        value: String(dashboard.subscription.seats),
                      },
                      {
                        label: "Usage",
                        value: `${dashboard.subscription.monthlyUsage}/${dashboard.subscription.usageLimit}`,
                      },
                    ]}
                  />
                </DataCard>

                <DataCard
                  eyebrow="Compliance"
                  title="Suppression controls"
                  summary="Unsubscribe, do-not-contact, complaint, and hard-bounce records are checked before live outreach dispatch."
                >
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label="email" tone="good" />
                    <StatusPill label="voice" tone="good" />
                    <StatusPill label="audit ready" />
                  </div>
                </DataCard>

                <DataCard
                  eyebrow="Operations"
                  title={operationalHealth.title}
                  summary={operationalHealth.summary}
                >
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      label={operationalHealth.label}
                      tone={operationalHealth.posture}
                    />
                    <StatusPill
                      label={
                        operationalHealth.latestEvidenceAt
                          ? `evidence ${formatAuditTime(operationalHealth.latestEvidenceAt)}`
                          : "no recent audit"
                      }
                    />
                  </div>
                  <KeyValueList items={operationalHealth.metrics} />
                  <div className="divide-y divide-slate-200 border-y border-slate-200">
                    {operationalHealth.signals.map((signal) => (
                      <div key={signal.id} className="py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">
                              {signal.label}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {signal.detail}
                            </p>
                          </div>
                          <StatusPill label={signal.value} tone={signal.tone} />
                        </div>
                        {signal.evidence.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {signal.evidence.slice(0, 3).map((item) => (
                              <span
                                key={`${signal.id}-${item}`}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    {operationalHealth.guardrails[0]}
                  </p>
                </DataCard>

                <DataCard
                  eyebrow="Audit"
                  title="Recent evidence"
                  summary={
                    auditLog
                      ? `${auditLog.summary.totalReturned} recent events summarized without raw payload exposure.`
                      : "Recent audit evidence is temporarily unavailable."
                  }
                >
                  {auditLog && auditLog.events.length > 0 ? (
                    <div className="space-y-3">
                      <KeyValueList
                        items={[
                          {
                            label: "Sensitive",
                            value: String(auditLog.summary.sensitiveCount),
                          },
                          {
                            label: "Review",
                            value: String(auditLog.summary.reviewCount),
                          },
                          {
                            label: "Requests",
                            value: String(auditLog.summary.requestCount),
                          },
                          {
                            label: "Retention",
                            value:
                              auditLog.summary.retention.mode ===
                              "retention_window"
                                ? `${auditLog.summary.retention.retentionDays}d`
                                : "not configured",
                          },
                          {
                            label: "Excluded",
                            value: String(
                              auditLog.summary.retention.excludedEvents,
                            ),
                          },
                        ]}
                      />
                      <a
                        href="/api/audit/export"
                        download
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500"
                      >
                        <Download aria-hidden="true" className="h-4 w-4" />
                        Download audit JSON
                      </a>
                      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                        {auditLog.events.slice(0, 4).map((event) => (
                          <div key={event.id} className="p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <StatusPill
                                label={event.severity}
                                tone={
                                  event.severity === "info" ? "neutral" : "warn"
                                }
                              />
                              <span className="text-xs text-slate-500">
                                {formatAuditTime(event.createdAt)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {event.summary}
                            </p>
                            {event.evidence.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {event.evidence.slice(0, 3).map((item) => (
                                  <span
                                    key={`${event.id}-${item}`}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs leading-5 text-slate-500">
                        Manual export only. Hash chain covers sanitized event
                        summaries, not raw provider or request bodies.
                      </p>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                      Recent authenticated requests and sensitive workflow
                      events will appear here after the server records them.
                    </p>
                  )}
                </DataCard>
              </div>
            </div>
          </Section>

          <Section
            title="AI command center"
            description="Governed control surfaces for workspace status, approvals, Telegram readiness, and future AI worker orchestration."
          >
            {commandCenterBrief ? (
              <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        label={commandCenterBrief.posture.replaceAll("_", " ")}
                        tone={
                          commandCenterBrief.posture === "blocked"
                            ? "blocked"
                            : commandCenterBrief.posture === "review_required"
                              ? "warn"
                              : "good"
                        }
                      />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Operator brief
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">
                      {commandCenterBrief.title}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {commandCenterBrief.summary}
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      {commandCenterBrief.metrics.map((metric) => (
                        <div
                          key={metric.id}
                          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {metric.label}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-lg font-semibold text-slate-950">
                              {metric.value}
                            </span>
                            <StatusPill
                              label={metric.tone}
                              tone={metric.tone}
                            />
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-600">
                            {metric.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Next actions
                      </p>
                      <span className="text-xs text-slate-500">
                        {commandCenterBrief.generatedAt.slice(0, 10)}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {commandCenterBrief.nextActions.map((action) => (
                        <Link
                          key={action.id}
                          href={action.href}
                          className="block rounded-md border border-slate-200 bg-white px-3 py-2 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="font-semibold text-slate-950">
                              {action.label}
                            </p>
                            <StatusPill
                              label={action.urgency}
                              tone={action.urgency}
                            />
                          </div>
                          <p className="mt-1 text-sm leading-5 text-slate-600">
                            {action.detail}
                          </p>
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {action.evidence.join(" · ")}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {commandCenterPolicies ? (
              <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill label={commandCenterPolicies.actor.role} />
                      <StatusPill
                        label={
                          commandCenterPolicies.actor.emailVerified
                            ? "verified"
                            : "email blocked"
                        }
                        tone={
                          commandCenterPolicies.actor.emailVerified
                            ? "good"
                            : "blocked"
                        }
                      />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Policy explanations
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">
                      Command intents are governed before execution
                    </h3>
                    {commandPolicyCounts ? (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        {commandPolicyCounts.blocked} blocked,{" "}
                        {commandPolicyCounts.approvalGated} approval-gated,{" "}
                        {commandPolicyCounts.readOnly} read-only.
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs text-slate-500">
                    {commandCenterPolicies.generatedAt.slice(0, 10)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {commandCenterPolicies.policies.map((policy) => (
                    <Link
                      key={policy.intent}
                      href={policy.nextAction.href}
                      className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {policy.label}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                            {policy.channel.replaceAll("_", " ")} ·{" "}
                            {policy.requiredRole} · {policy.riskLevel}
                          </p>
                        </div>
                        <StatusPill
                          label={policy.decision.replaceAll("_", " ")}
                          tone={policyDecisionTone(policy.decision)}
                        />
                      </div>
                      <p className="mt-3 text-sm leading-5 text-slate-600">
                        {policy.summary}
                      </p>
                      <div className="mt-3 space-y-2">
                        {policy.preconditions
                          .slice(0, 2)
                          .map((precondition) => (
                            <div
                              key={`${policy.intent}-${precondition.id}`}
                              className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-white px-2 py-2"
                            >
                              <div>
                                <p className="text-xs font-semibold text-slate-900">
                                  {precondition.label}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  {precondition.detail}
                                </p>
                              </div>
                              <StatusPill
                                label={precondition.status}
                                tone={policyPreconditionTone(
                                  precondition.status,
                                )}
                              />
                            </div>
                          ))}
                      </div>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {policy.evidence.slice(0, 2).join(" · ")}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            {commandPreviewExamples.length > 0 ? (
              <div
                id="ai-command-preview"
                className="mb-4 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill label="preview only" />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Command dry runs
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">
                      Commands are interpreted before they can execute
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {commandPreviewExamples.length} deterministic previews,{" "}
                      {
                        commandPreviewExamples.filter(
                          (preview) => preview.requestedMutation,
                        ).length
                      }{" "}
                      mutation requests,{" "}
                      {
                        commandPreviewExamples.filter(
                          (preview) => preview.executionMode === "blocked",
                        ).length
                      }{" "}
                      blocked.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {commandPreviewExamples[0]?.generatedAt.slice(0, 10)}
                  </span>
                </div>

                <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200">
                  {commandPreviewExamples.map((preview) => (
                    <div
                      key={`${preview.command.channel}-${preview.command.normalizedText}`}
                      className="grid gap-3 bg-slate-50 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.55fr)]"
                    >
                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-xs text-slate-800">
                              {preview.command.text}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                              {preview.command.channel.replaceAll("_", " ")} ·{" "}
                              {preview.match.intent.replaceAll("_", " ")} ·{" "}
                              {preview.match.confidence}%
                            </p>
                          </div>
                          <StatusPill
                            label={preview.executionMode.replaceAll("_", " ")}
                            tone={policyDecisionTone(preview.policy.decision)}
                          />
                        </div>
                        <p className="mt-3 text-sm leading-5 text-slate-600">
                          {preview.operatorMessage}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill
                            label={preview.policy.riskLevel}
                            tone={policyDecisionTone(preview.policy.decision)}
                          />
                          <StatusPill
                            label={
                              preview.requestedMutation
                                ? "mutation request"
                                : "read-only"
                            }
                            tone={preview.requestedMutation ? "warn" : "good"}
                          />
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {preview.guardrails.slice(0, 2).join(" ")}
                        </p>
                        {preview.executionMode === "requires_approval" ? (
                          <form
                            action="/api/command-center/proposals"
                            method="post"
                            className="mt-3"
                          >
                            <input
                              type="hidden"
                              name="returnTo"
                              value="/dashboard#ai-command-preview"
                            />
                            <input
                              type="hidden"
                              name="commandText"
                              value={preview.command.text}
                            />
                            <input
                              type="hidden"
                              name="channel"
                              value={preview.command.channel}
                            />
                            <button
                              type="submit"
                              className="inline-flex rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                            >
                              Create proposal
                            </button>
                          </form>
                        ) : (
                          <Link
                            href={preview.safeNextStep.href}
                            className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-50"
                          >
                            {preview.safeNextStep.label}
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {commandCenter.capabilities.map((capability) => (
                <DataCard
                  key={capability.id}
                  eyebrow={capability.status}
                  title={capability.title}
                  summary={capability.summary}
                >
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      label={
                        capability.accessible
                          ? "role ready"
                          : `requires ${capability.requiredRole}`
                      }
                      tone={capability.accessible ? "good" : "warn"}
                    />
                    <StatusPill
                      label={capability.riskLevel}
                      tone={capabilityTone(capability.status)}
                    />
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {capability.guardrails.slice(0, 3).map((guardrail) => (
                      <li
                        key={guardrail}
                        className="rounded-2xl bg-slate-50 px-3 py-2"
                      >
                        {guardrail}
                      </li>
                    ))}
                  </ul>
                </DataCard>
              ))}
            </div>
          </Section>

          <Section
            title="Platform modules"
            description="Implementation roadmap visibility for the broader product footprint that surrounds the current workspace experience."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {platformModules.map((module) => (
                <DataCard
                  key={module.slug}
                  eyebrow={module.phase}
                  title={module.title}
                  summary={module.summary}
                >
                  <ul className="space-y-2 text-sm text-slate-700">
                    {module.capabilities.map((capability) => (
                      <li
                        key={capability}
                        className="rounded-2xl bg-slate-50 px-3 py-2"
                      >
                        {capability}
                      </li>
                    ))}
                  </ul>
                </DataCard>
              ))}
            </div>
          </Section>
        </div>

        <p className="mt-10 text-sm leading-6 text-slate-500">
          This workspace runs on the tenant-scoped API and Postgres-backed
          foundation added in this project, but provider integrations may still
          operate in mock, partial, or environment-specific modes depending on
          configuration.
        </p>
      </div>
    </main>
  );
}
