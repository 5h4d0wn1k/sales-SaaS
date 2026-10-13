import {
  parseBlueprintContactContext,
  type PublicSalesBlueprintContactContext,
} from "./public-sales-blueprint";
import { parseAiSdrContactContext, type AiSdrContactContext } from "./ai-sdr-context";
import {
  parseComparisonContactContext,
  type ComparisonContactContext,
} from "./comparison-context";
import {
  parseLeadGenerationContactContext,
  type LeadGenerationContactContext,
} from "./lead-generation-context";
import {
  parseMeetingConversionContactContext,
  type MeetingConversionContactContext,
} from "./meeting-conversion-context";
import {
  parseOutboundAutomationContactContext,
  type OutboundAutomationContactContext,
} from "./outbound-automation-context";
import {
  parseTelegramCommandCenterContactContext,
  type TelegramCommandCenterContactContext,
} from "./telegram-command-center-context";
import { parseRoiContactContext, type RoiContactContext } from "./roi-contact-context";
import {
  parseSalesAutomationPlatformContactContext,
  type SalesAutomationPlatformContactContext,
} from "./sales-automation-platform-context";
import { formatCurrency, formatNumber } from "./revenue-impact-calculator";
import { getResourceArticle } from "./resources";
import {
  parseSolutionSegmentContactContext,
  type SolutionSegmentContactContext,
} from "./solution-segments";
import { PRICING_PLANS } from "@sales/shared";
import {
  formatChannels,
  formatProviderBudget,
  formatUsageLimit,
} from "./pricing-display";

export type AcquisitionSearchParams = Record<string, string | string[] | undefined>;

export type GetStartedAcquisitionContext = {
  source:
    | "sales_blueprint"
    | "roi_calculator"
    | "solution_segment"
    | "pricing_plan"
    | "ai_sales_automation_platform"
    | "ai_sdr_software"
    | "ai_lead_generation_software"
    | "ai_outbound_sales_automation"
    | "ai_sales_meeting_scheduler"
    | "telegram_sales_command_center"
    | "sales_tool_comparison"
    | "resource_article";
  label: string;
  title: string;
  detail: string;
  metrics: Array<{
    label: string;
    value: string;
  }>;
  reassurance: string;
};

export type SettingsBlueprintPrefill = {
  sourceLabel: string;
  title: string;
  detail: string;
  fields: {
    industry?: string;
    targetAudience?: string;
    regions?: string;
    goals?: string;
    channels?: string;
    constraints?: string;
    summary?: string;
    icpSummary?: string;
    sourceChannels?: string;
    outreachChannels?: string;
    searchKeywords?: string;
    monthlyLeadTarget?: number;
    meetingTarget?: number;
    averageContractValue?: number;
    automationMode?: "assistive" | "approval_gated" | "supervised_autonomy";
    approvalRequiredFor?: string;
    complianceNotes?: string;
  };
};

const settingsHandoffParamKeys = [
  "plan",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "solutionSegment",
  "segment",
  "monthlyLeadGoal",
  "budgetRange",
  "roiQualifiedRate",
  "roiMeetingRate",
  "roiCloseRate",
  "roiAcv",
  "roiBudget",
  "roiHoursSaved",
  "roiAnnualNet",
  "blueprintSegment",
  "blueprintIndustry",
  "blueprintAudience",
  "blueprintMeetings",
  "blueprintAcv",
  "blueprintReadiness",
  "blueprintLevel",
  "blueprintSources",
  "blueprintOutreach",
  "blueprintRegions",
  "blueprintConstraints",
  "blueprintPlan",
  "managedPackage",
  "managedIntent",
  "pricingIntent",
  "resource",
  "resourceIntent",
  "platformIntent",
  "aiSdrIntent",
  "leadGenIntent",
  "outboundIntent",
  "meetingIntent",
  "telegramIntent",
  "comparisonIntent",
] as const;

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function compactList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  );
}

function listField(values: Array<string | null | undefined>) {
  const items = compactList(values);
  return items.length ? items.join(", ") : undefined;
}

function splitChannels(channels: string[]) {
  const sourceTokens = new Set(["website", "search", "directory", "content", "crm"]);
  const sourceChannels = channels.filter((channel) =>
    sourceTokens.has(channel.trim().toLowerCase().replace(/[_\s]+/g, "-")),
  );
  const outreachChannels = channels.filter(
    (channel) =>
      !sourceTokens.has(channel.trim().toLowerCase().replace(/[_\s]+/g, "-")),
  );

  return {
    sourceChannels,
    outreachChannels,
  };
}

function numberField(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}

function buildDirectionalPrefill({
  sourceLabel,
  intentLabel,
  monthlyLeadGoal,
  meetingTarget,
  channels,
  goals,
}: {
  sourceLabel: string;
  intentLabel?: string;
  monthlyLeadGoal?: number;
  meetingTarget?: number;
  channels: string[];
  goals: string[];
}): SettingsBlueprintPrefill {
  const split = splitChannels(channels);

  return {
    sourceLabel,
    title: `${sourceLabel} context ready for blueprint review`,
    detail:
      "This public-site context can prefill planning fields, but the operator still needs to confirm the actual offer, ICP, voice, provider posture, and compliance notes before saving.",
    fields: {
      goals: listField(goals),
      channels: listField(channels),
      sourceChannels: listField(split.sourceChannels),
      outreachChannels: listField(split.outreachChannels),
      monthlyLeadTarget: monthlyLeadGoal,
      meetingTarget,
      automationMode: "approval_gated",
      approvalRequiredFor: listField([
        "first outreach",
        "phone calls",
        "new channels",
        "Telegram command proposals",
      ]),
      summary: intentLabel
        ? `${sourceLabel} ${intentLabel.toLowerCase()} context is attached for workspace setup review.`
        : `${sourceLabel} context is attached for workspace setup review.`,
      complianceNotes:
        "Review source evidence, suppression rules, provider readiness, and approval policy before live work.",
    },
  };
}

function blueprintContext(
  context: PublicSalesBlueprintContactContext,
): GetStartedAcquisitionContext {
  return {
    source: "sales_blueprint",
    label: "Sales Blueprint Builder",
    title: "Sales Blueprint context attached",
    detail:
      "Your ICP, target, source-channel, outreach-channel, and guardrail assumptions can guide workspace setup after signup.",
    metrics: [
      { label: "Readiness", value: `${context.readinessScore}/100` },
      { label: "Lead target", value: `${formatNumber(context.monthlyLeadTarget, 0)}/mo` },
      { label: "Meetings", value: `${formatNumber(context.meetingTarget, 0)}/mo` },
      { label: "ACV", value: formatCurrency(context.averageContractValue) },
    ],
    reassurance:
      "No lead sourcing or outreach starts automatically; the workspace still requires review, provider readiness, and approval gates.",
  };
}

function roiContext(context: RoiContactContext): GetStartedAcquisitionContext {
  return {
    source: "roi_calculator",
    label: "ROI Calculator",
    title: "ROI calculator context attached",
    detail:
      "Your modeled lead volume, funnel assumptions, budget posture, and annual net-impact scenario can guide plan and rollout review.",
    metrics: [
      { label: "Lead goal", value: `${formatNumber(context.monthlyLeadGoal, 0)}/mo` },
      { label: "Qualified", value: `${formatNumber(context.qualifiedRate, 1)}%` },
      { label: "Meeting rate", value: `${formatNumber(context.meetingRate, 1)}%` },
      { label: "Annual net", value: formatCurrency(context.annualNetImpact) },
    ],
    reassurance:
      "This is a scenario, not a guarantee; workspace setup still depends on business context, source evidence, and approval-gated execution.",
  };
}

function solutionSegmentContext(
  context: SolutionSegmentContactContext,
): GetStartedAcquisitionContext {
  return {
    source: "solution_segment",
    label: "Solution segment",
    title: "Solution segment context attached",
    detail:
      "Your selected segment page can guide workspace setup, rollout review, and the first sales operating workflow after signup.",
    metrics: [
      { label: "Segment", value: context.segmentLabel },
      { label: "Mode", value: "Approval-gated" },
      { label: "Path", value: "Workspace or rollout" },
      { label: "Source", value: "SEO" },
    ],
    reassurance:
      "No lead sourcing, outreach, provider work, or Telegram-controlled mutation starts automatically from this context.",
  };
}

function salesAutomationPlatformContext(
  context: SalesAutomationPlatformContactContext,
): GetStartedAcquisitionContext {
  return {
    source: "ai_sales_automation_platform",
    label: "AI sales automation platform",
    title: "Platform workflow context attached",
    detail:
      "Your full-platform evaluation can guide Sales Blueprint setup, source evidence review, outreach sequencing, meeting conversion, Telegram command visibility, provider readiness, plan fit, and managed rollout review.",
    metrics: [
      { label: "Intent", value: context.intentLabel },
      { label: "Lead target", value: `${formatNumber(context.monthlyLeadGoal, 0)}/mo` },
      { label: "Mode", value: "Governed workflow" },
      { label: "Path", value: "Full platform" },
    ],
    reassurance:
      "No broad live source expansion, hidden outreach, provider work, autonomous scheduling, billing changes, AI-worker execution, external tool execution, or Telegram-controlled mutation starts automatically from this platform context.",
  };
}

function aiSdrContext(context: AiSdrContactContext): GetStartedAcquisitionContext {
  return {
    source: "ai_sdr_software",
    label: "AI SDR software",
    title: "AI SDR evaluation context attached",
    detail:
      "Your AI SDR software evaluation can guide Sales Blueprint setup, source evidence review, provider readiness, Telegram visibility, and managed rollout planning.",
    metrics: [
      { label: "Intent", value: context.intentLabel },
      { label: "Lead target", value: `${formatNumber(context.monthlyLeadGoal, 0)}/mo` },
      { label: "Mode", value: "Approval-gated" },
      { label: "Path", value: "Self-serve or managed" },
    ],
    reassurance:
      "No lead sourcing, outreach, provider work, billing changes, or Telegram-controlled mutation starts automatically from this AI SDR context.",
  };
}

function leadGenerationContext(
  context: LeadGenerationContactContext,
): GetStartedAcquisitionContext {
  return {
    source: "ai_lead_generation_software",
    label: "AI lead generation software",
    title: "Lead generation context attached",
    detail:
      "Your lead-generation software evaluation can guide Sales Blueprint setup, source-channel planning, lead evidence review, provider readiness, outreach handoff, and conversion follow-through.",
    metrics: [
      { label: "Intent", value: context.intentLabel },
      { label: "Lead target", value: `${formatNumber(context.monthlyLeadGoal, 0)}/mo` },
      { label: "Mode", value: "Evidence-first" },
      { label: "Path", value: "Source plan" },
    ],
    reassurance:
      "No live scraping, lead sourcing, enrichment purchase, outreach, provider work, billing changes, or Telegram-controlled mutation starts automatically from this lead-generation context.",
  };
}

function outboundAutomationContext(
  context: OutboundAutomationContactContext,
): GetStartedAcquisitionContext {
  return {
    source: "ai_outbound_sales_automation",
    label: "AI outbound sales automation",
    title: "Outbound automation context attached",
    detail:
      "Your outbound automation evaluation can guide Sales Blueprint setup, sequence planning, channel-fit review, suppression checks, provider readiness, approval proposals, and meeting handoff.",
    metrics: [
      { label: "Intent", value: context.intentLabel },
      { label: "Lead target", value: `${formatNumber(context.monthlyLeadGoal, 0)}/mo` },
      { label: "Mode", value: "Approval-gated" },
      { label: "Path", value: "Sequence plan" },
    ],
    reassurance:
      "No live sends, calls, social actions, SMS, provider work, billing changes, or Telegram-controlled mutation starts automatically from this outbound context.",
  };
}

function meetingConversionContext(
  context: MeetingConversionContactContext,
): GetStartedAcquisitionContext {
  return {
    source: "ai_sales_meeting_scheduler",
    label: "AI sales meeting scheduler",
    title: "Meeting conversion context attached",
    detail:
      "Your sales meeting scheduler evaluation can guide conversion queue review, manual calendar handoff, meeting outcome capture, forecast posture, CRM export readiness, revenue handoff, and Telegram visibility.",
    metrics: [
      { label: "Intent", value: context.intentLabel },
      { label: "Lead target", value: `${formatNumber(context.monthlyLeadGoal, 0)}/mo` },
      { label: "Meetings", value: `${formatNumber(context.meetingTarget, 0)}/mo` },
      { label: "Mode", value: "Manual handoff" },
    ],
    reassurance:
      "No autonomous scheduling, live calendar sync, reminder automation, provider work, billing changes, accounting mutation, or Telegram-controlled mutation starts automatically from this meeting context.",
  };
}

function telegramCommandCenterContext(
  context: TelegramCommandCenterContactContext,
): GetStartedAcquisitionContext {
  return {
    source: "telegram_sales_command_center",
    label: "Telegram sales command center",
    title: "Telegram command context attached",
    detail:
      "Your Telegram command-center evaluation can guide bot setup, workspace chat binding, policy preview, read-only command posture, approval-gated proposal routing, provider readiness, and audit evidence.",
    metrics: [
      { label: "Intent", value: context.intentLabel },
      { label: "Lead target", value: `${formatNumber(context.monthlyLeadGoal, 0)}/mo` },
      { label: "Mode", value: "Read-only + proposals" },
      { label: "Path", value: "Telegram setup" },
    ],
    reassurance:
      "No campaign approval, call dispatch, billing change, provider mutation, AI-worker execution, external tool execution, or Telegram-controlled outreach mutation starts automatically from this Telegram context.",
  };
}

function comparisonContext(
  context: ComparisonContactContext,
): GetStartedAcquisitionContext {
  return {
    source: "sales_tool_comparison",
    label: "Sales tool comparison",
    title: "Sales tool comparison context attached",
    detail:
      "Your comparison of CRM-only tools, outreach sequencers, lead-list vendors, agencies, and AI agents can guide the first workspace setup path.",
    metrics: [
      { label: "Intent", value: context.intentLabel },
      { label: "Lead target", value: `${formatNumber(context.monthlyLeadGoal, 0)}/mo` },
      { label: "Mode", value: "Approval-gated" },
      { label: "Path", value: "Stack review" },
    ],
    reassurance:
      "No lead sourcing, outreach, provider work, billing changes, or Telegram-controlled mutation starts automatically from this comparison context.",
  };
}

const pricingFitIntents: Record<
  string,
  {
    label: string;
    detail: string;
  }
> = {
  fit_validate: {
    label: "Validation",
    detail:
      "The pricing advisor mapped this validation-stage workspace to the selected plan so setup can focus on account creation, dashboard visibility, and a first reviewable workflow.",
  },
  fit_founder_launch: {
    label: "Founder-led launch",
    detail:
      "The pricing advisor mapped this founder-led launch path to the selected plan so setup can focus on source review, email-first workflows, and approval-gated outreach.",
  },
  fit_active_team: {
    label: "Active campaign team",
    detail:
      "The pricing advisor mapped this active-team rollout path to the selected plan so setup can focus on higher lead capacity, calls, provider-budget review, and approval-gated campaign work.",
  },
  fit_scale_operations: {
    label: "Scale governed operations",
    detail:
      "The pricing advisor mapped this governed-scale path to the selected plan so setup can focus on multi-seat operations, channel readiness, source evidence, and rollout controls.",
  },
};

function pricingPlanContext(params: AcquisitionSearchParams | undefined) {
  const source = firstParam(params?.utm_source)?.trim();

  if (source !== "pricing") {
    return null;
  }

  const requestedPlanKey = firstParam(params?.plan)?.trim();
  const plan = PRICING_PLANS.find((candidate) => candidate.key === requestedPlanKey);

  if (!plan) {
    return null;
  }

  const pricingIntent = firstParam(params?.pricingIntent)?.trim();
  const fitIntent = pricingIntent ? pricingFitIntents[pricingIntent] : null;

  if (fitIntent) {
    return {
      source: "pricing_plan",
      label: "Pricing fit",
      title: `${fitIntent.label} fit attached`,
      detail: `${fitIntent.detail} The shared catalog selected ${plan.name} for this stage.`,
      metrics: [
        { label: "Plan", value: plan.name },
        { label: "Lead volume", value: formatUsageLimit(plan.usageLimit) },
        { label: "Provider budget", value: formatProviderBudget(plan.providerCostBudgetCents) },
        { label: "Channels", value: formatChannels(plan.includedChannels) },
      ],
      reassurance:
        "This fit is guidance, not an automatic upgrade or execution trigger; the workspace still requires account setup, checkout when applicable, provider readiness, and approval gates.",
    } satisfies GetStartedAcquisitionContext;
  }

  return {
    source: "pricing_plan",
    label: "Pricing",
    title: `${plan.name} plan selected`,
    detail:
      "Your selected plan can guide workspace setup, usage review, checkout, and upgrade timing after signup.",
    metrics: [
      { label: "Plan", value: plan.name },
      { label: "Lead volume", value: formatUsageLimit(plan.usageLimit) },
      { label: "Provider budget", value: formatProviderBudget(plan.providerCostBudgetCents) },
      { label: "Channels", value: formatChannels(plan.includedChannels) },
    ],
    reassurance:
      "Choosing a plan does not run lead sourcing, provider work, outreach, billing changes, or Telegram mutations without the normal account, checkout, provider, and approval gates.",
  } satisfies GetStartedAcquisitionContext;
}

function resourceArticleContext(params: AcquisitionSearchParams | undefined) {
  const source = firstParam(params?.utm_source)?.trim();

  if (source !== "resources") {
    return null;
  }

  const requestedSlug =
    firstParam(params?.resource)?.trim() || firstParam(params?.utm_campaign)?.trim();
  const article = requestedSlug ? getResourceArticle(requestedSlug) : null;

  if (!article) {
    return null;
  }

  return {
    source: "resource_article",
    label: "Resource guide",
    title: "Guide context attached",
    detail:
      "Your selected guide can shape workspace setup, Sales Blueprint review, provider readiness, and the first approval-gated operating workflow after signup.",
    metrics: [
      { label: "Guide", value: article.category },
      {
        label: "Stage",
        value: article.funnelStage.charAt(0).toUpperCase() + article.funnelStage.slice(1),
      },
      { label: "Mode", value: "Review-first" },
      { label: "Source", value: "Resources" },
    ],
    reassurance:
      "Reading a resource does not run lead sourcing, provider work, outreach, billing changes, or Telegram mutations without the normal workspace gates.",
  } satisfies GetStartedAcquisitionContext;
}

export function parseGetStartedAcquisitionContext(
  params: AcquisitionSearchParams | undefined,
): GetStartedAcquisitionContext | null {
  const blueprint = parseBlueprintContactContext(params);

  if (blueprint) {
    return blueprintContext(blueprint);
  }

  const roi = parseRoiContactContext(params);

  if (roi) {
    return roiContext(roi);
  }

  const solutionSegment = parseSolutionSegmentContactContext(params);

  if (solutionSegment) {
    return solutionSegmentContext(solutionSegment);
  }

  const salesAutomationPlatform = parseSalesAutomationPlatformContactContext(params);

  if (salesAutomationPlatform) {
    return salesAutomationPlatformContext(salesAutomationPlatform);
  }

  const aiSdr = parseAiSdrContactContext(params);

  if (aiSdr) {
    return aiSdrContext(aiSdr);
  }

  const leadGeneration = parseLeadGenerationContactContext(params);

  if (leadGeneration) {
    return leadGenerationContext(leadGeneration);
  }

  const outboundAutomation = parseOutboundAutomationContactContext(params);

  if (outboundAutomation) {
    return outboundAutomationContext(outboundAutomation);
  }

  const meetingConversion = parseMeetingConversionContactContext(params);

  if (meetingConversion) {
    return meetingConversionContext(meetingConversion);
  }

  const telegramCommandCenter = parseTelegramCommandCenterContactContext(params);

  if (telegramCommandCenter) {
    return telegramCommandCenterContext(telegramCommandCenter);
  }

  const comparison = parseComparisonContactContext(params);

  if (comparison) {
    return comparisonContext(comparison);
  }

  const resourceArticle = resourceArticleContext(params);

  if (resourceArticle) {
    return resourceArticle;
  }

  const pricingPlan = pricingPlanContext(params);

  if (pricingPlan) {
    return pricingPlan;
  }

  return null;
}

export function buildSettingsBlueprintHandoffUrl(
  params: AcquisitionSearchParams | undefined,
) {
  const query = new URLSearchParams();

  for (const key of settingsHandoffParamKeys) {
    const value = firstParam(params?.[key])?.trim();

    if (value) {
      query.set(key, value.slice(0, 500));
    }
  }

  const queryString = query.toString();
  return queryString
    ? `/settings?${queryString}#blueprint-business-name`
    : "/settings#blueprint-business-name";
}

export function buildSettingsBlueprintPrefill(
  params: AcquisitionSearchParams | undefined,
): SettingsBlueprintPrefill | null {
  const blueprint = parseBlueprintContactContext(params);

  if (blueprint) {
    const goals = [
      blueprint.monthlyLeadTarget
        ? `Generate ${formatNumber(blueprint.monthlyLeadTarget, 0)} qualified leads per month`
        : null,
      blueprint.meetingTarget
        ? `Book ${formatNumber(blueprint.meetingTarget, 0)} reviewed sales meetings per month`
        : null,
      blueprint.recommendedPlanName
        ? `Review ${blueprint.recommendedPlanName} plan fit before scaling`
        : null,
      blueprint.managedPackageTier
        ? `Review ${blueprint.managedPackageTier} managed rollout support`
        : null,
    ];
    const channels = [...blueprint.sourceChannels, ...blueprint.outreachChannels];

    return {
      sourceLabel: "Sales Blueprint Builder",
      title: "Public Sales Blueprint ready to save",
      detail:
        "The public builder supplied ICP, targets, channels, regions, and guardrails. Review the missing offer and voice details before saving this as the workspace blueprint.",
      fields: {
        industry: blueprint.industry || undefined,
        targetAudience: blueprint.targetAudience || undefined,
        regions: listField(blueprint.regions),
        goals: listField(goals),
        channels: listField(channels),
        constraints: listField(blueprint.constraints),
        summary:
          blueprint.industry || blueprint.targetAudience
            ? `Sales Blueprint for ${blueprint.targetAudience || "the target audience"}${blueprint.industry ? ` in ${blueprint.industry}` : ""}.`
            : undefined,
        icpSummary: blueprint.targetAudience || undefined,
        sourceChannels: listField(blueprint.sourceChannels),
        outreachChannels: listField(blueprint.outreachChannels),
        searchKeywords: listField([blueprint.industry, blueprint.targetAudience]),
        monthlyLeadTarget: numberField(blueprint.monthlyLeadTarget),
        meetingTarget: numberField(blueprint.meetingTarget),
        averageContractValue: numberField(blueprint.averageContractValue),
        automationMode:
          blueprint.readinessLevel === "needs_context" ? "assistive" : "approval_gated",
        approvalRequiredFor: listField([
          "first outreach",
          "phone calls",
          "new channels",
          "source-provider expansion",
        ]),
        complianceNotes: listField([
          ...blueprint.constraints,
          "Review source evidence before outreach",
          "Keep live work approval-gated",
        ]),
      },
    };
  }

  const roi = parseRoiContactContext(params);

  if (roi) {
    return buildDirectionalPrefill({
      sourceLabel: "ROI calculator",
      intentLabel: "scenario",
      monthlyLeadGoal: numberField(roi.monthlyLeadGoal),
      meetingTarget: numberField((roi.monthlyLeadGoal * roi.qualifiedRate * roi.meetingRate) / 10000),
      channels: ["website", "directory", "email", "call"],
      goals: [
        `Review ${formatNumber(roi.monthlyLeadGoal, 0)} monthly lead scenario`,
        `Improve qualified-to-meeting conversion toward ${formatNumber(roi.meetingRate, 1)}%`,
        `Track outcomes against ${formatCurrency(roi.averageContractValue)} average contract value`,
      ],
    });
  }

  const solutionSegment = parseSolutionSegmentContactContext(params);

  if (solutionSegment) {
    return buildDirectionalPrefill({
      sourceLabel: solutionSegment.segmentLabel,
      intentLabel: solutionSegment.page.intent,
      channels: solutionSegment.page.contactDefaults.channels,
      goals: solutionSegment.page.contactDefaults.goals,
    });
  }

  const salesAutomationPlatform = parseSalesAutomationPlatformContactContext(params);

  if (salesAutomationPlatform) {
    return buildDirectionalPrefill({
      sourceLabel: salesAutomationPlatform.label,
      intentLabel: salesAutomationPlatform.intentLabel,
      monthlyLeadGoal: salesAutomationPlatform.monthlyLeadGoal,
      channels: salesAutomationPlatform.channels,
      goals: salesAutomationPlatform.goals,
    });
  }

  const aiSdr = parseAiSdrContactContext(params);

  if (aiSdr) {
    return buildDirectionalPrefill({
      sourceLabel: aiSdr.label,
      intentLabel: aiSdr.intentLabel,
      monthlyLeadGoal: aiSdr.monthlyLeadGoal,
      channels: aiSdr.channels,
      goals: aiSdr.goals,
    });
  }

  const leadGeneration = parseLeadGenerationContactContext(params);

  if (leadGeneration) {
    return buildDirectionalPrefill({
      sourceLabel: leadGeneration.label,
      intentLabel: leadGeneration.intentLabel,
      monthlyLeadGoal: leadGeneration.monthlyLeadGoal,
      channels: leadGeneration.channels,
      goals: leadGeneration.goals,
    });
  }

  const outboundAutomation = parseOutboundAutomationContactContext(params);

  if (outboundAutomation) {
    return buildDirectionalPrefill({
      sourceLabel: outboundAutomation.label,
      intentLabel: outboundAutomation.intentLabel,
      monthlyLeadGoal: outboundAutomation.monthlyLeadGoal,
      channels: outboundAutomation.channels,
      goals: outboundAutomation.goals,
    });
  }

  const meetingConversion = parseMeetingConversionContactContext(params);

  if (meetingConversion) {
    return buildDirectionalPrefill({
      sourceLabel: meetingConversion.label,
      intentLabel: meetingConversion.intentLabel,
      monthlyLeadGoal: meetingConversion.monthlyLeadGoal,
      meetingTarget: meetingConversion.meetingTarget,
      channels: meetingConversion.channels,
      goals: meetingConversion.goals,
    });
  }

  const telegramCommandCenter = parseTelegramCommandCenterContactContext(params);

  if (telegramCommandCenter) {
    return buildDirectionalPrefill({
      sourceLabel: telegramCommandCenter.label,
      intentLabel: telegramCommandCenter.intentLabel,
      monthlyLeadGoal: telegramCommandCenter.monthlyLeadGoal,
      channels: telegramCommandCenter.channels,
      goals: telegramCommandCenter.goals,
    });
  }

  const comparison = parseComparisonContactContext(params);

  if (comparison) {
    return buildDirectionalPrefill({
      sourceLabel: comparison.label,
      intentLabel: comparison.intentLabel,
      monthlyLeadGoal: comparison.monthlyLeadGoal,
      channels: comparison.channels,
      goals: comparison.goals,
    });
  }

  return null;
}
