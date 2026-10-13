import type { ContentOpportunity, ContentOpportunityStatus } from "@sales/shared";
import type { DashboardCockpitTone } from "./dashboard-cockpit";

function titleCase(value: string) {
  const acronyms: Record<string, string> = {
    ai: "AI",
    seo: "SEO",
  };

  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => {
      const acronym = acronyms[part.toLowerCase()];

      if (acronym) {
        return acronym;
      }

      return part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part;
    })
    .join(" ");
}

function summarizeList(values: string[], limit: number) {
  const visible = values.slice(0, limit);
  const hiddenCount = Math.max(0, values.length - visible.length);

  return {
    visible,
    overflowLabel: hiddenCount > 0 ? `+${hiddenCount} more` : null,
  };
}

function statusLabel(status: ContentOpportunityStatus) {
  if (status === "ready_for_brief") {
    return "Brief ready";
  }

  if (status === "blocked") {
    return "Blocked";
  }

  return "Needs review";
}

function statusTone(status: ContentOpportunityStatus): DashboardCockpitTone {
  if (status === "ready_for_brief") {
    return "good";
  }

  if (status === "blocked") {
    return "blocked";
  }

  return "warn";
}

function priorityTone(priority: number): DashboardCockpitTone {
  return priority >= 85 ? "good" : priority >= 75 ? "warn" : "neutral";
}

export function buildContentDemandRows(opportunities: ContentOpportunity[]) {
  return opportunities.map((opportunity) => ({
    id: opportunity.id,
    title: opportunity.title,
    audience: opportunity.audience,
    intentLabel: titleCase(opportunity.intent),
    funnelStageLabel: titleCase(opportunity.funnelStage),
    keywordSummary: summarizeList(opportunity.targetKeywords, 3),
    sourceSignalSummary: summarizeList(opportunity.sourceSignals, 3),
    channelSummary: summarizeList(opportunity.suggestedChannels, 3),
    guardrailSummary: summarizeList(opportunity.guardrails, 2),
    leadCaptureOffer: opportunity.leadCaptureOffer,
    priorityLabel: `${opportunity.priority}/100`,
    priorityTone: priorityTone(opportunity.priority),
    statusLabel: statusLabel(opportunity.status),
    statusTone: statusTone(opportunity.status),
    nextAction: opportunity.nextAction,
  }));
}
