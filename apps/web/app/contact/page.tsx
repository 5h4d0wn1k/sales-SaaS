import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  Mail,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { HeroHeader } from "../../components/blocks/hero-section";
import { Button } from "../../components/ui/button";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import {
  formatRoiContactMessage,
  parseRoiContactContext,
  type RoiContactSearchParams,
} from "@/lib/roi-contact-context";
import {
  formatSalesAutomationPlatformContactMessage,
  parseSalesAutomationPlatformContactContext,
  type SalesAutomationPlatformContactSearchParams,
} from "@/lib/sales-automation-platform-context";
import {
  formatBlueprintContactMessage,
  parseBlueprintContactContext,
} from "@/lib/public-sales-blueprint";
import {
  formatAiSdrContactMessage,
  parseAiSdrContactContext,
  type AiSdrContactSearchParams,
} from "@/lib/ai-sdr-context";
import {
  formatLeadGenerationContactMessage,
  parseLeadGenerationContactContext,
  type LeadGenerationContactSearchParams,
} from "@/lib/lead-generation-context";
import {
  formatOutboundAutomationContactMessage,
  parseOutboundAutomationContactContext,
  type OutboundAutomationContactSearchParams,
} from "@/lib/outbound-automation-context";
import {
  formatMeetingConversionContactMessage,
  parseMeetingConversionContactContext,
  type MeetingConversionContactSearchParams,
} from "@/lib/meeting-conversion-context";
import {
  formatTelegramCommandCenterContactMessage,
  parseTelegramCommandCenterContactContext,
  type TelegramCommandCenterContactSearchParams,
} from "@/lib/telegram-command-center-context";
import {
  formatComparisonContactMessage,
  parseComparisonContactContext,
  type ComparisonContactSearchParams,
} from "@/lib/comparison-context";
import {
  formatSolutionSegmentContactMessage,
  getSolutionSegmentContactDefaults,
  parseSolutionSegmentContactContext,
  type SolutionSegmentSearchParams,
} from "@/lib/solution-segments";
import {
  formatIntegrationContactMessage,
  parseIntegrationContactContext,
  type IntegrationContactSearchParams,
} from "@/lib/integrations";
import {
  formatManagedServiceContactMessage,
  parseManagedServiceContactContext,
  type ManagedServicesContactSearchParams,
} from "@/lib/managed-services";
import {
  parsePricingContactContext,
  type PricingContactSearchParams,
} from "@/lib/pricing-display";
import {
  formatResourceContactMessage,
  parseResourceContactContext,
  type ResourceContactSearchParams,
} from "@/lib/resources";
import { buildContactStatusView } from "@/lib/contact-status";
import { buildContactPageJsonLd } from "@/lib/contact-seo";
import {
  getDefaultOpenGraphImage,
  getDefaultTwitterCard,
  jsonLd,
  siteConfig,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact salesxgrowth for AI sales onboarding and managed rollout",
  description:
    "Contact salesxgrowth for beta onboarding, managed sales implementation, provider readiness, billing questions, or AI-assisted sales workflow planning.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact salesxgrowth for AI sales onboarding and managed rollout",
    description:
      "Share your sales workflow context, rollout needs, provider readiness, and managed-service questions with salesxgrowth.",
    url: "/contact",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
  twitter: getDefaultTwitterCard(
    "Contact salesxgrowth for AI sales onboarding and managed rollout",
    "Share your sales workflow context, rollout needs, provider readiness, and managed-service questions with salesxgrowth.",
  ),
};

type ContactSearchParams = RoiContactSearchParams &
  SalesAutomationPlatformContactSearchParams &
  AiSdrContactSearchParams &
  LeadGenerationContactSearchParams &
  OutboundAutomationContactSearchParams &
  MeetingConversionContactSearchParams &
  TelegramCommandCenterContactSearchParams &
  ComparisonContactSearchParams &
  SolutionSegmentSearchParams &
  IntegrationContactSearchParams &
  ManagedServicesContactSearchParams &
  ResourceContactSearchParams &
  PricingContactSearchParams & {
    contactStatus?: string;
    contactMessage?: string;
    contactPriority?: string;
    intent?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };

type ContactPageProps = {
  searchParams?: Promise<ContactSearchParams>;
};

const intentOptions = [
  ["sales_assessment", "Sales workflow assessment"],
  ["managed_services", "Managed rollout support"],
  ["setup_help", "Setup help"],
  ["billing_question", "Billing or plan question"],
  ["product_feedback", "Product feedback"],
  ["partnership", "Partnership"],
] as const;

type ContactIntentValue = (typeof intentOptions)[number][0];

const budgetRangeOptions = [
  ["under_500", "Under $500/mo"],
  ["500_1500", "$500-$1,500/mo"],
  ["1500_5000", "$1,500-$5,000/mo"],
  ["5000_plus", "$5,000+/mo"],
  ["not_sure", "Not sure yet"],
] as const;

type ContactBudgetRangeValue = (typeof budgetRangeOptions)[number][0];

const budgetRangeLabels = Object.fromEntries(budgetRangeOptions);

const goalOptions = [
  "Build a Sales Blueprint",
  "Generate qualified leads",
  "Launch approval-gated outreach",
  "Add managed rollout support",
  "Connect Telegram command center",
  "Improve meetings and conversion",
];

const channelOptions = [
  "email",
  "call",
  "linkedin review",
  "website",
  "directory",
  "telegram",
];

const intakeRows = [
  {
    icon: CheckCircle2,
    title: "Sales-fit routing",
    detail:
      "Submissions are scored by intent, timeline, budget posture, lead target, and selected channels.",
  },
  {
    icon: ShieldCheck,
    title: "No automation bypass",
    detail:
      "Managed support and setup requests do not bypass approval gates, provider readiness, or suppression checks.",
  },
  {
    icon: Clock3,
    title: "Beta response target",
    detail:
      "High-priority setup and managed-service requests target one business day during the public beta.",
  },
];

function firstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeContactIntent(value: string | undefined): ContactIntentValue | undefined {
  return intentOptions.some(([intent]) => intent === value)
    ? (value as ContactIntentValue)
    : undefined;
}

function normalizeBudgetRange(value: string | undefined): ContactBudgetRangeValue | undefined {
  return budgetRangeOptions.some(([range]) => range === value)
    ? (value as ContactBudgetRangeValue)
    : undefined;
}

function contactChannelsFromBlueprint(
  context: ReturnType<typeof parseBlueprintContactContext>,
) {
  if (!context) {
    return [];
  }

  const channelMap: Record<string, string> = {
    call: "call",
    directory: "directory",
    email: "email",
    linkedin_review: "linkedin review",
    website: "website",
  };

  return [...context.sourceChannels, ...context.outreachChannels]
    .map((channel) => channelMap[channel])
    .filter((channel): channel is string => Boolean(channel));
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = (await searchParams) ?? {};
  const roiContext = parseRoiContactContext(params);
  const salesAutomationPlatformContext = parseSalesAutomationPlatformContactContext(params);
  const aiSdrContext = parseAiSdrContactContext(params);
  const leadGenerationContext = parseLeadGenerationContactContext(params);
  const outboundAutomationContext = parseOutboundAutomationContactContext(params);
  const meetingConversionContext = parseMeetingConversionContactContext(params);
  const telegramCommandCenterContext = parseTelegramCommandCenterContactContext(params);
  const comparisonContext = parseComparisonContactContext(params);
  const resourceContext = parseResourceContactContext(params);
  const blueprintContext = parseBlueprintContactContext(params);
  const solutionSegmentContext = parseSolutionSegmentContactContext(params);
  const solutionSegmentDefaults = solutionSegmentContext
    ? getSolutionSegmentContactDefaults(solutionSegmentContext)
    : null;
  const integrationContext = parseIntegrationContactContext(params);
  const managedServiceContext = parseManagedServiceContactContext(params);
  const pricingContext = parsePricingContactContext(params);
  const hasManagedIntentContext =
    roiContext ||
    salesAutomationPlatformContext ||
    aiSdrContext ||
    leadGenerationContext ||
    outboundAutomationContext ||
    meetingConversionContext ||
    telegramCommandCenterContext ||
    comparisonContext ||
    resourceContext ||
    integrationContext ||
    managedServiceContext;
  const defaultIntent =
    normalizeContactIntent(firstSearchParam(params.intent)) ??
    (hasManagedIntentContext ? "managed_services" : "sales_assessment");
  const defaultBudgetRange =
    roiContext?.budgetRange ??
    salesAutomationPlatformContext?.budgetRange ??
    aiSdrContext?.budgetRange ??
    leadGenerationContext?.budgetRange ??
    outboundAutomationContext?.budgetRange ??
    meetingConversionContext?.budgetRange ??
    telegramCommandCenterContext?.budgetRange ??
    comparisonContext?.budgetRange ??
    resourceContext?.budgetRange ??
    normalizeBudgetRange(firstSearchParam(params.budgetRange)) ??
    managedServiceContext?.budgetRange ??
    solutionSegmentDefaults?.budgetRange ??
    "not_sure";
  const defaultMonthlyLeadGoal = roiContext
    ? roiContext.monthlyLeadGoal
    : salesAutomationPlatformContext
      ? salesAutomationPlatformContext.monthlyLeadGoal
      : aiSdrContext
        ? aiSdrContext.monthlyLeadGoal
        : leadGenerationContext
          ? leadGenerationContext.monthlyLeadGoal
          : outboundAutomationContext
            ? outboundAutomationContext.monthlyLeadGoal
            : meetingConversionContext
              ? meetingConversionContext.monthlyLeadGoal
              : telegramCommandCenterContext
                ? telegramCommandCenterContext.monthlyLeadGoal
                : comparisonContext
                  ? comparisonContext.monthlyLeadGoal
                  : blueprintContext
                    ? blueprintContext.monthlyLeadTarget
                    : undefined;
  const defaultMessage = roiContext
    ? formatRoiContactMessage(roiContext)
    : salesAutomationPlatformContext
      ? formatSalesAutomationPlatformContactMessage(salesAutomationPlatformContext)
      : aiSdrContext
        ? formatAiSdrContactMessage(aiSdrContext)
        : leadGenerationContext
          ? formatLeadGenerationContactMessage(leadGenerationContext)
          : outboundAutomationContext
            ? formatOutboundAutomationContactMessage(outboundAutomationContext)
            : meetingConversionContext
              ? formatMeetingConversionContactMessage(meetingConversionContext)
              : telegramCommandCenterContext
                ? formatTelegramCommandCenterContactMessage(telegramCommandCenterContext)
                : comparisonContext
                  ? formatComparisonContactMessage(comparisonContext)
                  : resourceContext
                    ? formatResourceContactMessage(resourceContext)
                    : blueprintContext
                      ? formatBlueprintContactMessage(blueprintContext)
                      : solutionSegmentContext
                        ? formatSolutionSegmentContactMessage(solutionSegmentContext)
                        : integrationContext
                          ? formatIntegrationContactMessage(integrationContext)
                          : managedServiceContext
                            ? formatManagedServiceContactMessage(managedServiceContext)
                            : undefined;
  const defaultChannels = new Set([
    ...contactChannelsFromBlueprint(blueprintContext),
    ...(salesAutomationPlatformContext?.channels ?? []),
    ...(aiSdrContext?.channels ?? []),
    ...(leadGenerationContext?.channels ?? []),
    ...(outboundAutomationContext?.channels ?? []),
    ...(meetingConversionContext?.channels ?? []),
    ...(telegramCommandCenterContext?.channels ?? []),
    ...(comparisonContext?.channels ?? []),
    ...(resourceContext?.channels ?? []),
    ...(solutionSegmentDefaults?.channels ?? []),
    ...(integrationContext?.channels ?? []),
  ]);
  const defaultGoals = new Set([
    ...(blueprintContext
      ? ["Build a Sales Blueprint", "Generate qualified leads"]
      : []),
    ...(salesAutomationPlatformContext?.goals ?? []),
    ...(aiSdrContext?.goals ?? []),
    ...(leadGenerationContext?.goals ?? []),
    ...(outboundAutomationContext?.goals ?? []),
    ...(meetingConversionContext?.goals ?? []),
    ...(telegramCommandCenterContext?.goals ?? []),
    ...(comparisonContext?.goals ?? []),
    ...(resourceContext?.goals ?? []),
    ...(solutionSegmentDefaults?.goals ?? []),
    ...(managedServiceContext?.goals ?? []),
    ...(integrationContext?.slug === "telegram-command-center"
      ? ["Connect Telegram command center", "Launch approval-gated outreach"]
      : []),
  ]);
  const sourcePath = blueprintContext
    ? "/sales-blueprint"
    : managedServiceContext
      ? `/managed-services#${managedServiceContext.key}`
      : salesAutomationPlatformContext
      ? salesAutomationPlatformContext.sourcePath
      : aiSdrContext
        ? aiSdrContext.sourcePath
        : leadGenerationContext
          ? leadGenerationContext.sourcePath
          : outboundAutomationContext
            ? outboundAutomationContext.sourcePath
            : meetingConversionContext
              ? meetingConversionContext.sourcePath
              : telegramCommandCenterContext
                ? telegramCommandCenterContext.sourcePath
                : comparisonContext
                  ? comparisonContext.sourcePath
                  : resourceContext
                    ? resourceContext.sourcePath
                    : integrationContext
                      ? `/integrations#${integrationContext.slug}`
                      : solutionSegmentContext
                        ? `/solutions/${solutionSegmentContext.slug}`
                        : "/contact";
  const status = buildContactStatusView(
    firstSearchParam(params.contactStatus),
    firstSearchParam(params.contactMessage),
    firstSearchParam(params.contactPriority),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(buildContactPageJsonLd()) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                <MessageSquare className="size-3.5" />
                Contact and rollout intake
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                Tell us what sales system you want salesxgrowth to help launch.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Share your company context, target workflow, lead goals, timeline, and channels.
                salesxgrowth routes the request for beta onboarding, managed implementation, billing,
                support, or product feedback without claiming unsupported automation.
              </p>

              <div className="mt-8 space-y-4">
                {intakeRows.map((row) => {
                  const Icon = row.icon;

                  return (
                    <div key={row.title} className="flex gap-3">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
                        <Icon className="size-4 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold">{row.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {row.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 rounded-lg border bg-background p-5">
                <div className="flex items-start gap-3">
                  <Mail className="mt-1 size-4 text-muted-foreground" />
                  <div>
                    <h2 className="text-sm font-semibold">Email fallback</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      If the form is unavailable, send the same details directly to{" "}
                      <a href="mailto:hello@salesxgrowth.com" className="font-medium text-foreground underline">
                        hello@salesxgrowth.com
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-background">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Revenue intake
                </p>
                <h2 className="mt-1 text-lg font-bold">Route the request with useful context</h2>
              </div>

              {status ? (
                <div className={`m-5 rounded-md border px-4 py-3 ${status.tone}`}>
                  <p className="text-sm font-semibold">{status.title}</p>
                  <p className="mt-1 text-sm leading-6">{status.message}</p>
                  <div className="mt-3 border-t border-current/20 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider">
                      Next steps
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-5">
                      {status.nextSteps.map((step) => (
                        <li key={step} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              <form action="/api/contact/intake" method="post" className="space-y-5 p-5">
                <input
                  type="hidden"
                  name="sourcePath"
                  value={sourcePath}
                />
                <input
                  type="hidden"
                  name="utmSource"
                  value={firstSearchParam(params.utm_source) ?? ""}
                />
                <input
                  type="hidden"
                  name="utmMedium"
                  value={firstSearchParam(params.utm_medium) ?? ""}
                />
                <input
                  type="hidden"
                  name="utmCampaign"
                  value={firstSearchParam(params.utm_campaign) ?? ""}
                />
                <input
                  type="hidden"
                  name="pricingPlan"
                  value={
                    firstSearchParam(params.plan) ??
                    blueprintContext?.recommendedPlanKey ??
                    firstSearchParam(params.blueprintPlan) ??
                    ""
                  }
                />
                <input
                  type="hidden"
                  name="pricingIntent"
                  value={
                    firstSearchParam(params.pricingIntent) ??
                    (blueprintContext?.recommendedPlanKey ? "blueprint_commercial_fit" : "")
                  }
                />
                <input
                  type="hidden"
                  name="managedPackage"
                  value={
                    managedServiceContext?.key ??
                    blueprintContext?.managedPackageKey ??
                    firstSearchParam(params.managedPackage) ??
                    ""
                  }
                />
                <input
                  type="hidden"
                  name="managedIntent"
                  value={
                    managedServiceContext?.intent ??
                    blueprintContext?.managedIntent ??
                    firstSearchParam(params.managedIntent) ??
                    ""
                  }
                />
                <input
                  type="hidden"
                  name="solutionSegment"
                  value={solutionSegmentContext?.slug ?? ""}
                />
                <input
                  type="hidden"
                  name="segment"
                  value={
                    solutionSegmentContext?.segmentLabel ?? firstSearchParam(params.segment) ?? ""
                  }
                />
                <input
                  type="hidden"
                  name="integration"
                  value={integrationContext?.slug ?? ""}
                />
                <input
                  type="hidden"
                  name="integrationIntent"
                  value={integrationContext?.requestedIntent ?? ""}
                />
                <input
                  type="hidden"
                  name="integrationStatus"
                  value={integrationContext?.statusLabel ?? ""}
                />
                <input
                  type="hidden"
                  name="integrationCommercialPath"
                  value={integrationContext?.commercialPathLabel ?? ""}
                />
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="companyWebsiteUrl">Company website URL</label>
                  <input
                    id="companyWebsiteUrl"
                    name="companyWebsiteUrl"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {roiContext ? (
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                      ROI calculator context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                          Lead goal
                        </p>
                        <p className="mt-1 font-semibold">
                          {roiContext.monthlyLeadGoal.toLocaleString()} / month
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                          Budget posture
                        </p>
                        <p className="mt-1 font-semibold">
                          {budgetRangeLabels[roiContext.budgetRange]}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                          Scenario only
                        </p>
                        <p className="mt-1 font-semibold">Reviewed before rollout</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {salesAutomationPlatformContext ? (
                  <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                      Platform workflow context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                          Intent
                        </p>
                        <p className="mt-1 font-semibold">
                          {salesAutomationPlatformContext.intentLabel}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                          Lead target
                        </p>
                        <p className="mt-1 font-semibold">
                          {salesAutomationPlatformContext.monthlyLeadGoal.toLocaleString()} / month
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                          Review posture
                        </p>
                        <p className="mt-1 font-semibold">Governed workflow</p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-teal-200 pt-3 text-xs leading-5 text-teal-900">
                      No broad live source expansion, hidden outreach, provider work, autonomous
                      scheduling, billing change, AI-worker execution, external tool execution, or
                      Telegram-controlled mutation starts from this context.
                    </p>
                  </div>
                ) : null}

                {aiSdrContext ? (
                  <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                      AI SDR evaluation context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                          Intent
                        </p>
                        <p className="mt-1 font-semibold">{aiSdrContext.intentLabel}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                          Lead target
                        </p>
                        <p className="mt-1 font-semibold">
                          {aiSdrContext.monthlyLeadGoal.toLocaleString()} / month
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                          Review posture
                        </p>
                        <p className="mt-1 font-semibold">Approval-gated</p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-teal-200 pt-3 text-xs leading-5 text-teal-900">
                      No lead sourcing, live outreach, provider work, billing change, or
                      Telegram-controlled mutation starts from this context.
                    </p>
                  </div>
                ) : null}

                {leadGenerationContext ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      AI lead generation context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Intent
                        </p>
                        <p className="mt-1 font-semibold">
                          {leadGenerationContext.intentLabel}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Lead target
                        </p>
                        <p className="mt-1 font-semibold">
                          {leadGenerationContext.monthlyLeadGoal.toLocaleString()} / month
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Review posture
                        </p>
                        <p className="mt-1 font-semibold">Evidence-first</p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-emerald-200 pt-3 text-xs leading-5 text-emerald-900">
                      No live scraping, enrichment purchase, outreach, provider work, billing
                      change, or Telegram-controlled mutation starts from this context.
                    </p>
                  </div>
                ) : null}

                {outboundAutomationContext ? (
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                      AI outbound automation context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                          Intent
                        </p>
                        <p className="mt-1 font-semibold">
                          {outboundAutomationContext.intentLabel}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                          Lead target
                        </p>
                        <p className="mt-1 font-semibold">
                          {outboundAutomationContext.monthlyLeadGoal.toLocaleString()} / month
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                          Review posture
                        </p>
                        <p className="mt-1 font-semibold">Approval-gated</p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-blue-200 pt-3 text-xs leading-5 text-blue-900">
                      No live sends, calls, social actions, SMS, provider work, billing change, or
                      Telegram-controlled mutation starts from this context.
                    </p>
                  </div>
                ) : null}

                {meetingConversionContext ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      Meeting conversion context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Intent
                        </p>
                        <p className="mt-1 font-semibold">
                          {meetingConversionContext.intentLabel}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Lead target
                        </p>
                        <p className="mt-1 font-semibold">
                          {meetingConversionContext.monthlyLeadGoal.toLocaleString()} / month
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Meeting target
                        </p>
                        <p className="mt-1 font-semibold">
                          {meetingConversionContext.meetingTarget.toLocaleString()} / month
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-emerald-200 pt-3 text-xs leading-5 text-emerald-900">
                      No autonomous scheduling, live calendar sync, reminder automation, provider
                      work, billing change, accounting mutation, or Telegram-controlled mutation
                      starts from this context.
                    </p>
                  </div>
                ) : null}

                {telegramCommandCenterContext ? (
                  <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                      Telegram command context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                          Intent
                        </p>
                        <p className="mt-1 font-semibold">
                          {telegramCommandCenterContext.intentLabel}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                          Lead target
                        </p>
                        <p className="mt-1 font-semibold">
                          {telegramCommandCenterContext.monthlyLeadGoal.toLocaleString()} / month
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                          Command posture
                        </p>
                        <p className="mt-1 font-semibold">Read-only + proposals</p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-sky-200 pt-3 text-xs leading-5 text-sky-900">
                      No campaign approval, call dispatch, billing change, provider mutation,
                      AI-worker execution, external tool execution, or Telegram-controlled outreach
                      mutation starts from this context.
                    </p>
                  </div>
                ) : null}

                {comparisonContext ? (
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                      Sales tool comparison context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                          Intent
                        </p>
                        <p className="mt-1 font-semibold">{comparisonContext.intentLabel}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                          Lead target
                        </p>
                        <p className="mt-1 font-semibold">
                          {comparisonContext.monthlyLeadGoal.toLocaleString()} / month
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                          Review posture
                        </p>
                        <p className="mt-1 font-semibold">Stack review</p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-blue-200 pt-3 text-xs leading-5 text-blue-900">
                      No lead sourcing, live outreach, provider work, billing change, or
                      Telegram-controlled mutation starts from this comparison context.
                    </p>
                  </div>
                ) : null}

                {resourceContext ? (
                  <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                      Resource guide context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                          Guide
                        </p>
                        <p className="mt-1 font-semibold">{resourceContext.category}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                          Intent
                        </p>
                        <p className="mt-1 font-semibold">{resourceContext.intentLabel}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                          Review posture
                        </p>
                        <p className="mt-1 font-semibold">Guide-to-rollout</p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-indigo-200 pt-3 text-xs leading-5 text-indigo-900">
                      Reading a guide does not start lead sourcing, outreach, provider work,
                      billing changes, service obligations, AI-worker execution, or
                      Telegram-controlled mutation.
                    </p>
                  </div>
                ) : null}

                {blueprintContext ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      Sales Blueprint context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Readiness
                        </p>
                        <p className="mt-1 font-semibold">{blueprintContext.readinessScore}/100</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Lead target
                        </p>
                        <p className="mt-1 font-semibold">
                          {blueprintContext.monthlyLeadTarget.toLocaleString()} / month
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Review posture
                        </p>
                        <p className="mt-1 font-semibold">
                          {blueprintContext.readinessLevel.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    {blueprintContext.recommendedPlanName || blueprintContext.managedPackageTier ? (
                      <dl className="mt-3 grid gap-1.5 border-t border-emerald-200 pt-3 text-xs leading-5 sm:grid-cols-2">
                        {blueprintContext.recommendedPlanName ? (
                          <div>
                            <dt className="font-semibold uppercase tracking-wider text-emerald-700">
                              Recommended plan
                            </dt>
                            <dd className="mt-1 font-semibold text-emerald-950">
                              {blueprintContext.recommendedPlanName}
                            </dd>
                          </div>
                        ) : null}
                        {blueprintContext.managedPackageTier ? (
                          <div>
                            <dt className="font-semibold uppercase tracking-wider text-emerald-700">
                              Managed support
                            </dt>
                            <dd className="mt-1 font-semibold text-emerald-950">
                              {blueprintContext.managedPackageTier}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : null}
                    <p className="mt-3 border-t border-emerald-200 pt-3 text-xs leading-5 text-emerald-900">
                      Plan and managed-service recommendations are guidance for review; no checkout,
                      provider work, lead sourcing, outreach, billing change, AI execution, or
                      Telegram-controlled mutation starts from this context.
                    </p>
                  </div>
                ) : null}

                {solutionSegmentContext ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Solution segment context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Segment
                        </p>
                        <p className="mt-1 font-semibold">
                          {solutionSegmentContext.segmentLabel}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Posture
                        </p>
                        <p className="mt-1 font-semibold">Approval-gated</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Next step
                        </p>
                        <p className="mt-1 font-semibold">Reviewed rollout</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {integrationContext ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                      Integration context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                          Integration
                        </p>
                        <p className="mt-1 font-semibold">{integrationContext.name}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                          Status
                        </p>
                        <p className="mt-1 font-semibold">{integrationContext.statusLabel}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                          Commercial path
                        </p>
                        <p className="mt-1 font-semibold">
                          {integrationContext.commercialPathLabel}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-amber-200 pt-3 text-xs leading-5 text-amber-900">
                      {integrationContext.claimBoundary}
                    </p>
                  </div>
                ) : null}

                {pricingContext ? (
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                      Pricing context attached
                    </p>
                    <p className="mt-2 text-sm leading-6 text-blue-900">
                      {pricingContext.summary}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                          Pricing path
                        </p>
                        <p className="mt-1 font-semibold">{pricingContext.intentLabel}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                          Plan
                        </p>
                        <p className="mt-1 font-semibold">
                          {pricingContext.planName
                            ? `${pricingContext.planName} ${pricingContext.priceLabel ?? ""}`.trim()
                            : "Plan review"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                          Managed path
                        </p>
                        <p className="mt-1 font-semibold">
                          {pricingContext.managedTier ?? "Optional review"}
                        </p>
                      </div>
                    </div>
                    {pricingContext.boundaries.length > 0 ? (
                      <dl className="mt-3 grid gap-1.5 border-t border-blue-200 pt-3">
                        {pricingContext.boundaries.slice(0, 4).map((boundary) => (
                          <div
                            key={boundary.label}
                            className="grid grid-cols-[112px_1fr] gap-2 text-xs leading-5"
                          >
                            <dt className="font-semibold text-blue-700">{boundary.label}</dt>
                            <dd className="font-medium text-blue-950">{boundary.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    <p className="mt-3 border-t border-blue-200 pt-3 text-xs leading-5 text-blue-900">
                      {pricingContext.reassurance}
                    </p>
                  </div>
                ) : null}

                {managedServiceContext ? (
                  <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                      Managed services context attached
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                          Package
                        </p>
                        <p className="mt-1 font-semibold">{managedServiceContext.tier}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                          Budget posture
                        </p>
                        <p className="mt-1 font-semibold">
                          {budgetRangeLabels[managedServiceContext.budgetRange]}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                          Boundary
                        </p>
                        <p className="mt-1 font-semibold">Separate scoped support</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Request type</span>
                    <select
                      name="intent"
                      defaultValue={defaultIntent}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {intentOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Timeline</span>
                    <select
                      name="timeline"
                      defaultValue="this_month"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="this_week">This week</option>
                      <option value="this_month">This month</option>
                      <option value="this_quarter">This quarter</option>
                      <option value="exploring">Exploring</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Name</span>
                    <input
                      required
                      name="name"
                      autoComplete="name"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Priya Shah"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Work email</span>
                    <input
                      required
                      type="email"
                      name="email"
                      autoComplete="email"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="priya@company.com"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Company</span>
                    <input
                      required
                      name="companyName"
                      autoComplete="organization"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="OrbitOps"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Website</span>
                    <input
                      name="website"
                      autoComplete="url"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="https://company.com"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Role</span>
                    <input
                      name="role"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Founder"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Team size</span>
                    <input
                      name="teamSize"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="12"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Monthly lead goal</span>
                    <input
                      name="monthlyLeadGoal"
                      type="number"
                      min="0"
                      defaultValue={defaultMonthlyLeadGoal}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="500"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Budget posture</span>
                    <select
                      name="budgetRange"
                      defaultValue={defaultBudgetRange}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {budgetRangeOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-2">
                    <span className="text-sm font-medium">Likely channels</span>
                    <div className="grid grid-cols-2 gap-2">
                      {channelOptions.map((channel) => (
                        <label
                          key={channel}
                          className="flex items-center gap-2 rounded-md border bg-stone-50 px-3 py-2 text-sm"
                        >
                          <input
                            name="channels"
                            type="checkbox"
                            value={channel}
                            defaultChecked={defaultChannels.has(channel)}
                          />
                          <span>{channel}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">What should the system help with?</legend>
                  <div className="grid gap-2 md:grid-cols-2">
                    {goalOptions.map((goal) => (
                      <label
                        key={goal}
                        className="flex items-center gap-2 rounded-md border bg-stone-50 px-3 py-2 text-sm"
                      >
                        <input
                          name="goals"
                          type="checkbox"
                          value={goal}
                          defaultChecked={defaultGoals.has(goal)}
                        />
                        <span>{goal}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Context, blockers, and ideal outcome</span>
                  <textarea
                    required
                    minLength={20}
                    name="message"
                    rows={5}
                    defaultValue={defaultMessage}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Tell us your current sales motion, target customers, lead sources, outreach channels, rollout timeline, and what success would look like."
                  />
                </label>

                <div className="rounded-md border bg-stone-50 px-4 py-3 text-sm leading-6 text-muted-foreground">
                  We use this information to route your request and prepare a useful first response.
                  Live outreach, provider changes, and high-risk actions still require in-app
                  approval and configured provider readiness.
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" className="gap-2 rounded-md bg-foreground text-background hover:bg-foreground/90">
                    Submit request
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button asChild variant="outline" className="rounded-md">
                    <Link href="/managed-services">Review managed support</Link>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto grid max-w-6xl gap-4 px-6 md:grid-cols-3">
            {[
              ["Setup", "Blueprint, source plan, provider readiness, and launch sequence."],
              ["Support", "Billing, beta feedback, workflow blockers, and account questions."],
              ["Growth", "Managed services, SEO demand planning, lead ops, and conversion review."],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-lg border bg-background p-5">
                <div className="mb-3 flex size-9 items-center justify-center rounded-md border bg-stone-50">
                  <LifeBuoy className="size-4 text-blue-600" />
                </div>
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
