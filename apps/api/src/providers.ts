import type {
  CallRecord,
  CampaignRecord,
  DashboardResponse,
  DispatchCallResponse,
  DispatchCampaignResponse,
  LeadRecord,
  ProviderHealth,
  ProviderReadinessStatus,
  ProviderSummary,
  SourcePlan,
} from "@sales/shared";
import { getProviderEstimatedUnitCostCents } from "@sales/shared";

type RuntimeMode = "mock" | "configured";

type SourceAdapter = {
  provider: string;
  sourceKeys: string[];
  mode: RuntimeMode;
  estimatedCostCents: number;
  supports(plan: SourcePlan | null): boolean;
  run(storageRun: {
    source: string;
    run: DashboardResponse["sourceRuns"][number];
    accepted: LeadRecord[];
    rejected: LeadRecord[];
  }): string;
};

type OutreachAdapter = {
  provider: string;
  channels: string[];
  mode: RuntimeMode;
  estimatedCostCents: number;
  supports(channel: string): boolean;
  dispatch(input: {
    campaign: CampaignRecord;
    activity: DashboardResponse["activities"][number] | null;
    lead: LeadRecord | null;
  }): Promise<Omit<DispatchCampaignResponse, "campaign" | "activity">>;
};

type VoiceAdapter = {
  provider: string;
  mode: RuntimeMode;
  estimatedCostCents: number;
  dispatch(input: {
    call: CallRecord;
    lead: LeadRecord | null;
  }): Promise<Omit<DispatchCallResponse, "call"> & { outcome: "accepted" | "review_required" }>;
};

function configured(value: string | undefined): RuntimeMode {
  return value ? "configured" : "mock";
}

class ProviderRequestError extends Error {
  constructor(readonly status: number, statusText: string) {
    super(`${status} ${statusText}`.trim());
    this.name = "ProviderRequestError";
  }
}

function providerFailureDetail(provider: string, error: unknown) {
  const status = error instanceof ProviderRequestError ? ` (${error.status})` : "";
  return `${provider} dispatch failed${status}; operator review required before retrying provider delivery.`;
}

function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function hasTwilioConfig() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER &&
    process.env.TWILIO_TWIML_URL,
  );
}

function hasSourceProviderConfig(envName: string) {
  return Boolean(process.env.SOURCE_PROVIDER_API_KEY || process.env[envName]);
}

function sourceProviderSecretRequirement(envName: string) {
  return process.env.SOURCE_PROVIDER_API_KEY ? ["SOURCE_PROVIDER_API_KEY"] : [envName];
}

function missingSecrets(envNames: string[]) {
  return envNames.filter((name) => !process.env[name]);
}

function readinessFor(input: {
  mode: ProviderHealth["mode"];
  missingSecrets?: string[];
  disabled?: boolean;
  blockedWhenMissing?: boolean;
}): ProviderReadinessStatus {
  if (input.disabled || input.mode === "disabled") {
    return "disabled";
  }

  if ((input.missingSecrets?.length ?? 0) > 0) {
    return input.blockedWhenMissing ? "blocked" : "guarded";
  }

  return input.mode === "configured" ? "configured" : "guarded";
}

async function postJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new ProviderRequestError(response.status, response.statusText);
  }

  return response.text();
}

const sourceAdapters: SourceAdapter[] = [
  {
    provider: "website-crawler",
    sourceKeys: ["website"],
    mode: hasSourceProviderConfig("WEBSITE_SOURCE_PROVIDER_API_KEY") ? "configured" : "mock",
    estimatedCostCents: getProviderEstimatedUnitCostCents("website-crawler"),
    supports: (plan) => Boolean(plan?.sources.includes("website")),
    run: (result) =>
      `Website crawler processed ${result.run.candidatesFound} public pages, removed ${result.run.dedupedCount} duplicates, and scored source quality at ${result.run.qualityScore}/100.`,
  },
  {
    provider: "search-intelligence",
    sourceKeys: ["search"],
    mode: hasSourceProviderConfig("SEARCH_SOURCE_PROVIDER_API_KEY") ? "configured" : "mock",
    estimatedCostCents: getProviderEstimatedUnitCostCents("search-intelligence"),
    supports: (plan) => Boolean(plan?.sources.includes("search")),
    run: (result) =>
      `Search intelligence routed discovery across indexed results with ${result.run.evidence.length} evidence signal${result.run.evidence.length === 1 ? "" : "s"} retained for review.`,
  },
  {
    provider: "directory-harvester",
    sourceKeys: ["directory"],
    mode: hasSourceProviderConfig("DIRECTORY_SOURCE_PROVIDER_API_KEY") ? "configured" : "mock",
    estimatedCostCents: getProviderEstimatedUnitCostCents("directory-harvester"),
    supports: (plan) => Boolean(plan?.sources.includes("directory")),
    run: (result) =>
      `Directory harvester checked commercial directories and recorded ${result.run.rejectionReasons.length} rejection reason group${result.run.rejectionReasons.length === 1 ? "" : "s"}.`,
  },
];

const outreachAdapters: OutreachAdapter[] = [
  {
    provider: "smtp-primary",
    channels: ["email"],
    mode: configured(process.env.SMTP_HOST),
    estimatedCostCents: getProviderEstimatedUnitCostCents("smtp-primary"),
    supports: (channel) => channel === "email",
    async dispatch({ activity }) {
      return {
        provider: "smtp-primary",
        mode: configured(process.env.SMTP_HOST),
        externalId: null,
        deliveryStatus: "queued",
        detail: activity
          ? `Queued email delivery for ${activity.personalizedFor} using the app-owned SMTP path.`
          : "No activity available to dispatch.",
      };
    },
  },
  {
    provider: "resend-fallback",
    channels: ["email"],
    mode: hasResendConfig() ? "configured" : "mock",
    estimatedCostCents: getProviderEstimatedUnitCostCents("resend-fallback"),
    supports: (channel) => channel === "email",
    async dispatch({ activity, lead }) {
      if (!activity || !lead?.email || !hasResendConfig()) {
        return {
          provider: "resend-fallback",
          mode: hasResendConfig() ? "configured" : "mock",
          externalId: null,
          deliveryStatus: "queued",
          detail: activity
            ? `Fallback email provider is in ${hasResendConfig() ? "configured" : "mock"} mode for ${activity.personalizedFor}.`
            : "No activity available to dispatch.",
        };
      }

      try {
        const responseText = await postJson("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "content-type": "application/json",
            "Idempotency-Key": `${activity.campaignId}:${activity.id}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL,
            to: [lead.email],
            subject: activity.subject,
            html: `<p>${activity.preview}</p>`,
          }),
        });

        const parsed = JSON.parse(responseText) as { id?: string };

        return {
          provider: "resend-fallback",
          mode: "configured",
          deliveryStatus: "sent",
          externalId: parsed.id ?? null,
          detail: `Resend accepted the personalized message for ${activity.personalizedFor} at ${lead.email}.`,
        };
      } catch (error) {
        return {
          provider: "resend-fallback",
          mode: "configured",
          deliveryStatus: "review_required",
          externalId: null,
          detail: providerFailureDetail("Resend email", error),
        };
      }
    },
  },
  {
    provider: "linkedin-outreach",
    channels: ["linkedin"],
    mode: "mock",
    estimatedCostCents: getProviderEstimatedUnitCostCents("linkedin-outreach"),
    supports: (channel) => channel === "linkedin",
    async dispatch({ activity }) {
      return {
        provider: "linkedin-outreach",
        mode: "mock",
        externalId: null,
        deliveryStatus: "review_required",
        detail: activity
          ? `LinkedIn outreach remains review-gated for ${activity.personalizedFor}.`
          : "No activity available to dispatch.",
      };
    },
  },
];

const voiceAdapters: VoiceAdapter[] = [
  {
    provider: "twilio-voice",
    mode: hasTwilioConfig() ? "configured" : "mock",
    estimatedCostCents: getProviderEstimatedUnitCostCents("twilio-voice"),
    async dispatch({ call, lead }) {
      if (!lead?.phone || !hasTwilioConfig()) {
        return {
          provider: "twilio-voice",
          mode: hasTwilioConfig() ? "configured" : "mock",
          externalId: null,
          outcome: "accepted",
          detail: call.reviewRequired
            ? "Call completed with low-confidence transcript and needs operator review."
            : "Voice provider completed the call and returned a positive disposition.",
        };
      }

      const auth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
      ).toString("base64");

      const form = new URLSearchParams({
        To: lead.phone,
        From: process.env.TWILIO_FROM_NUMBER!,
        Url: process.env.TWILIO_TWIML_URL!,
        ...(process.env.TWILIO_STATUS_CALLBACK_URL
          ? {
            StatusCallback: process.env.TWILIO_STATUS_CALLBACK_URL,
            StatusCallbackEvent: "initiated ringing answered completed",
          }
          : {}),
      });

      try {
        const responseText = await postJson(
          `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Calls.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "content-type": "application/x-www-form-urlencoded",
            },
            body: form.toString(),
          },
        );

        const parsed = JSON.parse(responseText) as { sid?: string };

        return {
          provider: "twilio-voice",
          mode: "configured",
          externalId: parsed.sid ?? null,
          outcome: "accepted",
          detail: `Twilio call dispatch accepted for ${lead.phone}.`,
        };
      } catch (error) {
        return {
          provider: "twilio-voice",
          mode: "configured",
          externalId: null,
          outcome: "review_required",
          detail: providerFailureDetail("Twilio voice", error),
        };
      }
    },
  },
];

function selectOutreachAdapter(channel: string) {
  return (
    outreachAdapters.find((entry) => entry.supports(channel) && entry.mode === "configured") ??
    outreachAdapters.find((entry) => entry.supports(channel)) ??
    null
  );
}

function selectedProviderCostCents(adapter: { mode: RuntimeMode; estimatedCostCents: number }) {
  return adapter.mode === "configured" ? adapter.estimatedCostCents : 0;
}

function selectSourceAdapter(source: string) {
  const normalized = source.trim().toLowerCase();

  return sourceAdapters.find((entry) =>
    entry.provider === normalized || entry.sourceKeys.includes(normalized)
  );
}

export function estimateLeadSourceProviderCostCents(source: string) {
  const adapter = selectSourceAdapter(source);
  return adapter ? selectedProviderCostCents(adapter) : 0;
}

export function sourceProviderModeFor(source: string): RuntimeMode {
  return selectSourceAdapter(source)?.mode ?? "mock";
}

export function estimateCampaignDispatchProviderCostCents(channel: string) {
  const adapter = selectOutreachAdapter(channel);
  return adapter ? selectedProviderCostCents(adapter) : 0;
}

export const CAMPAIGN_DISPATCH_UNSUPPORTED_CHANNEL_CODE =
  "campaign_dispatch_channel_unsupported";

export function campaignDispatchUnsupportedDetail(channel: string) {
  const normalized = channel.trim().toLowerCase();

  if (normalized === "call" || normalized === "voice") {
    return "Voice outreach must use the dedicated call dispatch workflow at /v1/calls/dispatch; campaign dispatch only supports email and review-gated LinkedIn.";
  }

  if (normalized === "sms") {
    return "SMS campaign dispatch is not implemented yet; campaign dispatch only supports email and review-gated LinkedIn.";
  }

  return `Campaign dispatch does not support ${channel || "this"} channel; only email and review-gated LinkedIn are available.`;
}

export function isCampaignDispatchChannelSupported(channel: string) {
  return Boolean(selectOutreachAdapter(channel));
}

export function estimateVoiceCallProviderCostCents() {
  return selectedProviderCostCents(voiceAdapters[0]!);
}

export function getProviderSummary(): ProviderSummary {
  const health = (input: {
    provider: string;
    kind: ProviderHealth["kind"];
    mode: ProviderHealth["mode"];
    channels: string[];
    detail: string;
    requiredSecrets?: string[];
    liveAction: string;
    guardrails?: string[];
    blockedWhenMissing?: boolean;
    productionBlockers?: string[];
  }): ProviderHealth => {
    const requiredSecrets = input.requiredSecrets ?? [];
    const missing = missingSecrets(requiredSecrets);
    const readiness = readinessFor({
      mode: input.mode,
      missingSecrets: missing,
      blockedWhenMissing: input.blockedWhenMissing,
    });
    const productionBlockers =
      readiness === "configured"
        ? []
        : input.productionBlockers ?? (
          missing.length > 0
            ? [`${input.provider} missing ${missing.join(", ")}`]
            : []
        );

    return {
      provider: input.provider,
      kind: input.kind,
      mode: input.mode,
      channels: input.channels,
      detail: input.detail,
      readiness,
      requiredSecrets,
      missingSecrets: missing,
      liveAction: input.liveAction,
      guardrails: input.guardrails ?? [],
      lastVerifiedAt: null,
      productionBlockers,
    };
  };

  const smtpSecrets = ["SMTP_HOST"];
  const resendSecrets = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"];
  const twilioSecrets = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_NUMBER",
    "TWILIO_TWIML_URL",
  ];
  const stripeSecrets = ["STRIPE_SECRET_KEY"];
  const razorpaySecrets = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"];
  const resendWebhookSecrets = ["RESEND_WEBHOOK_SECRET"];
  const stripeWebhookSecrets = ["STRIPE_WEBHOOK_SECRET"];
  const razorpayWebhookSecrets = ["RAZORPAY_WEBHOOK_SECRET"];
  const telegramSecrets = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"];
  const sourceProviderSecrets: Record<string, string[]> = {
    "website-crawler": sourceProviderSecretRequirement("WEBSITE_SOURCE_PROVIDER_API_KEY"),
    "search-intelligence": sourceProviderSecretRequirement("SEARCH_SOURCE_PROVIDER_API_KEY"),
    "directory-harvester": sourceProviderSecretRequirement("DIRECTORY_SOURCE_PROVIDER_API_KEY"),
  };
  const accountLifecycleEmailSecrets = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "FRONTEND_URL"];
  const contactIntakeNotificationSecrets = [
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "CONTACT_INTAKE_TO_EMAIL",
  ];
  const emailDeliveryConfigured =
    missingSecrets(smtpSecrets).length === 0 || missingSecrets(resendSecrets).length === 0;

  const summaryGroups = {
    sources: sourceAdapters.map((adapter) =>
      health({
        provider: adapter.provider,
        kind: "lead-source",
        mode: adapter.mode,
        channels: adapter.sourceKeys,
        detail: "Lead discovery adapter is available for planned source workflows with source-run evidence review.",
        requiredSecrets: sourceProviderSecrets[adapter.provider] ?? [],
        liveAction: adapter.mode === "configured"
          ? "Configured source runs can consume provider-cost budget after lead and budget entitlements pass."
          : "Demo-safe source run; production expansion needs provider-specific setup.",
        guardrails: [
          "Provider-cost budget check before configured source work",
          "Lead quality scoring",
          "Rejected-lead tracking",
          "Suppression-aware dispatch before outreach",
        ],
        productionBlockers: adapter.mode === "configured"
          ? ["Configured source adapter still returns reviewable evidence and must not be marketed as universal scraping."]
          : [
            "Lead-source adapter is still mock-backed and should not be marketed as universal scraping.",
          ],
      }),
    ),
    outreach: outreachAdapters.map((adapter) =>
      health({
        provider: adapter.provider,
        kind: "outreach",
        mode: adapter.mode,
        channels: adapter.channels,
        detail: "Outbound delivery adapter is available for campaign dispatch.",
        requiredSecrets:
          adapter.provider === "smtp-primary"
            ? smtpSecrets
            : adapter.provider === "resend-fallback"
              ? resendSecrets
              : [],
        liveAction:
          adapter.provider === "linkedin-outreach"
            ? "Review-only drafting; no automated social-platform sending."
            : emailDeliveryConfigured
              ? "Email dispatch can use configured delivery after approvals and suppression checks."
              : "Email dispatch remains guarded until an SMTP or Resend sender is configured.",
        guardrails: [
          "Approval required before first outbound action",
          "Suppression check before provider delivery",
          "Provider webhook events are recorded when configured",
        ],
        productionBlockers:
          adapter.provider === "linkedin-outreach"
            ? ["LinkedIn remains review-gated; auto-connect or auto-DM is not supported."]
            : emailDeliveryConfigured
              ? []
              : ["No production email sender is configured."],
      }),
    ),
    voice: voiceAdapters.map((adapter) =>
      health({
        provider: adapter.provider,
        kind: "voice",
        mode: adapter.mode,
        channels: ["call"],
        detail: "Voice dispatch adapter is available for AI call workflows.",
        requiredSecrets: twilioSecrets,
        liveAction: hasTwilioConfig()
          ? "Voice calls can dispatch after call review and suppression checks."
          : "Voice calls stay blocked/guarded until Twilio credentials and TwiML URL are configured.",
        guardrails: [
          "Call review posture",
          "Suppression check before provider delivery",
          "Twilio signature verification for status callbacks",
        ],
        blockedWhenMissing: true,
        productionBlockers: hasTwilioConfig() ? [] : ["Twilio voice credentials are incomplete."],
      }),
    ),
    billing: [
      health({
        provider: "stripe",
        kind: "billing",
        mode: missingSecrets(stripeSecrets).length === 0 ? "configured" : "mock",
        channels: ["checkout", "portal", "webhook"],
        detail: "Stripe billing routes support checkout, portal, cancellation, and webhooks.",
        requiredSecrets: stripeSecrets,
        liveAction: "Paid checkout and subscription lifecycle management.",
        guardrails: [
          "Owner/admin billing authorization",
          "Email verification required for billing mutations",
          "Webhook idempotency records",
        ],
        blockedWhenMissing: true,
      }),
      health({
        provider: "razorpay",
        kind: "billing",
        mode: missingSecrets(razorpaySecrets).length === 0 ? "configured" : "mock",
        channels: ["checkout", "subscription", "webhook"],
        detail: "Razorpay billing routes support checkout and subscription webhooks.",
        requiredSecrets: razorpaySecrets,
        liveAction: "India-friendly subscription checkout path.",
        guardrails: [
          "Owner/admin billing authorization",
          "Email verification required for billing mutations",
          "Webhook signature verification",
        ],
        blockedWhenMissing: true,
      }),
    ],
    webhooks: [
      health({
        provider: "resend-webhook",
        kind: "webhook",
        mode: missingSecrets(resendWebhookSecrets).length === 0 ? "configured" : "mock",
        channels: ["email-events"],
        detail: "Resend webhook verifies provider events before applying delivery state.",
        requiredSecrets: resendWebhookSecrets,
        liveAction: "Email provider events can update outreach activity state.",
        guardrails: ["Svix signature verification", "Provider event audit record"],
        blockedWhenMissing: true,
      }),
      health({
        provider: "account-lifecycle-email",
        kind: "webhook",
        mode: missingSecrets(accountLifecycleEmailSecrets).length === 0
          ? "configured"
          : "mock",
        channels: ["email-verification", "password-reset", "workspace-invites"],
        detail:
          "Account lifecycle email supports verification, password reset, and workspace invite delivery.",
        requiredSecrets: accountLifecycleEmailSecrets,
        liveAction:
          "Verification, password reset, and invite emails can be delivered through Resend with production app links.",
        guardrails: [
          "Production missing-email configuration blocks invite creation instead of creating unusable invites",
          "Verification and reset tokens are short-lived and hashed at rest",
          "Workspace invite acceptance is constrained to the invited email address",
        ],
        blockedWhenMissing: true,
      }),
      health({
        provider: "stripe-webhook",
        kind: "webhook",
        mode: missingSecrets(stripeWebhookSecrets).length === 0 ? "configured" : "mock",
        channels: ["billing-events"],
        detail: "Stripe webhook handles subscription and payment lifecycle events.",
        requiredSecrets: stripeWebhookSecrets,
        liveAction: "Billing events can update subscription state idempotently.",
        guardrails: ["Stripe signature verification", "Payment idempotency"],
        blockedWhenMissing: true,
      }),
      health({
        provider: "razorpay-webhook",
        kind: "webhook",
        mode: missingSecrets(razorpayWebhookSecrets).length === 0 ? "configured" : "mock",
        channels: ["billing-events"],
        detail: "Razorpay webhook handles subscription and payment lifecycle events.",
        requiredSecrets: razorpayWebhookSecrets,
        liveAction: "Billing events can update subscription state idempotently.",
        guardrails: ["HMAC signature verification", "Payment idempotency"],
        blockedWhenMissing: true,
      }),
      health({
        provider: "twilio-status-callback",
        kind: "webhook",
        mode: missingSecrets(["TWILIO_AUTH_TOKEN"]).length === 0 ? "configured" : "mock",
        channels: ["voice-events"],
        detail: "Twilio voice status callback verifies call lifecycle updates.",
        requiredSecrets: ["TWILIO_AUTH_TOKEN"],
        liveAction: "Voice provider events can update call state after signature verification.",
        guardrails: ["Twilio signature verification", "Ambiguous target protection"],
        blockedWhenMissing: true,
      }),
      health({
        provider: "contact-intake-notification",
        kind: "webhook",
        mode: missingSecrets(contactIntakeNotificationSecrets).length === 0
          ? "configured"
          : "mock",
        channels: ["inbound-intake", "email-alert"],
        detail: "Public contact intake can notify the team after a request is durably captured.",
        requiredSecrets: contactIntakeNotificationSecrets,
        liveAction:
          "High-intent contact and managed-service requests notify the configured team inbox.",
        guardrails: [
          "Durable capture happens before notification",
          "Notification failure does not drop the intake request",
          "Reply-to uses the buyer email for manual follow-up",
        ],
        blockedWhenMissing: true,
      }),
    ],
    chat: [
      health({
        provider: "telegram-command-center",
        kind: "chat",
        mode: missingSecrets(telegramSecrets).length === 0 ? "configured" : "mock",
        channels: ["telegram", "command-center"],
        detail: "Telegram command center supports safe read-only operator briefs, deterministic aliases, status checks, and a guarded pause request.",
        requiredSecrets: telegramSecrets,
        liveAction: "Read-only workspace control; mutating commands require in-app owner approval.",
        guardrails: [
          "Secret-header webhook verification",
          "Hashed chat binding",
          "Replay protection",
          "Emergency disable",
          "Command audit trail",
        ],
        blockedWhenMissing: true,
      }),
    ],
  } satisfies Omit<ProviderSummary, "summary">;

  const allProviders = [
    ...summaryGroups.sources,
    ...summaryGroups.outreach,
    ...summaryGroups.voice,
    ...summaryGroups.billing,
    ...summaryGroups.webhooks,
    ...summaryGroups.chat,
  ];
  const blockerSet = new Set<string>();
  for (const provider of allProviders) {
    for (const blocker of provider.productionBlockers) {
      blockerSet.add(blocker);
    }
  }

  return {
    ...summaryGroups,
    summary: {
      configured: allProviders.filter((provider) => provider.readiness === "configured").length,
      guarded: allProviders.filter((provider) => provider.readiness === "guarded").length,
      blocked: allProviders.filter((provider) => provider.readiness === "blocked").length,
      disabled: allProviders.filter((provider) => provider.readiness === "disabled").length,
      productionBlockers: Array.from(blockerSet),
    },
  };
}

export function chooseSourceProviders(plan: SourcePlan | null, limit: number) {
  return sourceAdapters.filter((adapter) => adapter.supports(plan)).slice(0, limit);
}

export function summarizeSourceRun(
  adapterName: string,
  result: {
    source: string;
    run: DashboardResponse["sourceRuns"][number];
    accepted: LeadRecord[];
    rejected: LeadRecord[];
  },
) {
  const adapter = sourceAdapters.find((entry) => entry.provider === adapterName);
  return adapter ? adapter.run(result) : "Lead source run completed.";
}

export async function dispatchCampaignActivity(input: {
  campaign: CampaignRecord;
  activity: DashboardResponse["activities"][number] | null;
  lead: LeadRecord | null;
}): Promise<Omit<DispatchCampaignResponse, "campaign" | "activity">> {
  const adapter = selectOutreachAdapter(input.campaign.channel);

  if (!adapter) {
    return {
      provider: "unsupported-campaign-channel",
      mode: "mock",
      externalId: null,
      deliveryStatus: "review_required",
      detail: campaignDispatchUnsupportedDetail(input.campaign.channel),
    };
  }

  return adapter.dispatch(input);
}

export async function dispatchVoiceCall(input: {
  call: CallRecord;
  lead: LeadRecord | null;
}): Promise<Omit<DispatchCallResponse, "call"> & { outcome: "accepted" | "review_required" }> {
  return voiceAdapters[0]!.dispatch(input);
}
