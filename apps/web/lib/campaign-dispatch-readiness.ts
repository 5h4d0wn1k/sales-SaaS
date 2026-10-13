import type {
  CampaignRecord,
  OutboundChannel,
  OutboundChannelReadinessResponse,
} from "@sales/shared";

export type CampaignDispatchReadinessGateTone = "warn" | "blocked";

export type CampaignDispatchReadinessGate = {
  title: string;
  detail: string;
  blockerSummary: string;
  tone: CampaignDispatchReadinessGateTone;
  actionHref: string;
  actionLabel: string;
};

const OUTREACH_OPERATIONS_PATH = "/dashboard#outreach-operations";
const CALLS_AND_MEETINGS_PATH = "/dashboard#calls-and-meetings";
const PROVIDER_READINESS_PATH = "/settings#provider-readiness";
const outboundChannels = new Set<OutboundChannel>([
  "email",
  "call",
  "linkedin",
  "sms",
]);

function normalizeCampaignChannel(channel: string): OutboundChannel | null {
  const normalized = channel.trim().toLowerCase();
  const channelKey = normalized === "voice" ? "call" : normalized;

  return outboundChannels.has(channelKey as OutboundChannel)
    ? (channelKey as OutboundChannel)
    : null;
}

function blockersFor(
  channel: OutboundChannelReadinessResponse["channels"][number] | undefined,
) {
  if (!channel) {
    return "Channel readiness is unavailable for this campaign.";
  }

  if (channel.blockers.length > 0) {
    return `Blockers: ${channel.blockers.slice(0, 3).join(", ")}.`;
  }

  return channel.detail;
}

function actionFor(
  channel: OutboundChannel | null,
  readinessChannel: OutboundChannelReadinessResponse["channels"][number] | undefined,
) {
  if (channel === "call") {
    return {
      actionHref: CALLS_AND_MEETINGS_PATH,
      actionLabel: "Open call workflow",
    };
  }

  if (readinessChannel?.status === "needs_review") {
    return {
      actionHref: OUTREACH_OPERATIONS_PATH,
      actionLabel: "Review sequence plan",
    };
  }

  return {
    actionHref: PROVIDER_READINESS_PATH,
    actionLabel: "Review readiness",
  };
}

export function buildCampaignDispatchReadinessGate(
  campaign: Pick<
    CampaignRecord,
    "approved" | "channel" | "firstActionCompleted"
  >,
  readiness: Pick<OutboundChannelReadinessResponse, "channels"> | null | undefined,
): CampaignDispatchReadinessGate | null {
  if (!campaign.approved || campaign.firstActionCompleted) {
    return null;
  }

  const channel = normalizeCampaignChannel(campaign.channel);
  const readinessChannel = channel
    ? readiness?.channels.find((entry) => entry.channel === channel)
    : undefined;

  if (
    channel === "email" &&
    readinessChannel?.status === "ready" &&
    readinessChannel.liveDispatchImplemented
  ) {
    return null;
  }

  if (channel === "call") {
    return {
      title: "Voice campaigns use the call workflow",
      detail:
        "Campaign dispatch is limited to email and review-gated LinkedIn; live voice work starts from the guarded call queue.",
      blockerSummary: blockersFor(readinessChannel),
      tone: "warn",
      ...actionFor(channel, readinessChannel),
    };
  }

  if (!channel) {
    return {
      title: "Campaign channel is unsupported",
      detail:
        "This campaign cannot be dispatched until its channel matches a supported outbound workflow.",
      blockerSummary: `Unsupported channel: ${campaign.channel || "unknown"}.`,
      tone: "blocked",
      ...actionFor(channel, readinessChannel),
    };
  }

  if (!readinessChannel) {
    return {
      title: "Channel readiness unavailable",
      detail:
        "Dispatch stays disabled until the outbound readiness endpoint confirms this channel is safe to use.",
      blockerSummary: blockersFor(readinessChannel),
      tone: "blocked",
      ...actionFor(channel, readinessChannel),
    };
  }

  return {
    title: `${readinessChannel.label} dispatch is not live-ready`,
    detail:
      readinessChannel.status === "needs_review"
        ? "This campaign can stay in human review, but live campaign dispatch is disabled for this channel."
        : readinessChannel.detail,
    blockerSummary: blockersFor(readinessChannel),
    tone: readinessChannel.status === "needs_review" ? "warn" : "blocked",
    ...actionFor(channel, readinessChannel),
  };
}
