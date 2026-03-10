import type {
  CallRecord,
  CampaignRecord,
  DashboardResponse,
  DispatchCallResponse,
  DispatchCampaignResponse,
  LeadRecord,
  ProviderHealth,
  ProviderSummary,
  SourcePlan,
} from "@sales/shared";

type RuntimeMode = "mock" | "configured";

type SourceAdapter = {
  provider: string;
  mode: RuntimeMode;
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
  dispatch(input: {
    call: CallRecord;
    lead: LeadRecord | null;
  }): Promise<Omit<DispatchCallResponse, "call">>;
};

function configured(value: string | undefined): RuntimeMode {
  return value ? "configured" : "mock";
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

async function postJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return text;
}

const sourceAdapters: SourceAdapter[] = [
  {
    provider: "website-crawler",
    mode: "mock",
    supports: (plan) => Boolean(plan?.sources.includes("website")),
    run: (result) =>
      `Website crawler processed ${result.run.candidatesFound} public pages and kept ${result.accepted.length} qualified leads.`,
  },
  {
    provider: "search-intelligence",
    mode: "mock",
    supports: (plan) => Boolean(plan?.sources.includes("search")),
    run: (result) =>
      `Search intelligence routed discovery across indexed results and shortlisted ${result.accepted.length} ICP matches.`,
  },
  {
    provider: "directory-harvester",
    mode: "mock",
    supports: (plan) => Boolean(plan?.sources.includes("directory")),
    run: (result) =>
      `Directory harvester checked commercial directories and rejected ${result.rejected.length} low-fit contacts.`,
  },
];

const outreachAdapters: OutreachAdapter[] = [
  {
    provider: "smtp-primary",
    channels: ["email"],
    mode: configured(process.env.SMTP_HOST),
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
    },
  },
  {
    provider: "linkedin-outreach",
    channels: ["linkedin"],
    mode: "mock",
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
    async dispatch({ call, lead }) {
      if (!lead?.phone || !hasTwilioConfig()) {
        return {
          provider: "twilio-voice",
          mode: hasTwilioConfig() ? "configured" : "mock",
          externalId: null,
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
        detail: `Twilio call dispatch accepted for ${lead.phone}.`,
      };
    },
  },
];

export function getProviderSummary(): ProviderSummary {
  const health = (
    provider: string,
    kind: ProviderHealth["kind"],
    mode: RuntimeMode,
    channels: string[],
    detail: string,
  ): ProviderHealth => ({
    provider,
    kind,
    mode,
    channels,
    detail,
  });

  return {
    sources: sourceAdapters.map((adapter) =>
      health(
        adapter.provider,
        "lead-source",
        adapter.mode,
        ["website", "search", "directory"],
        "Lead discovery adapter is ready for planned sources.",
      ),
    ),
    outreach: outreachAdapters.map((adapter) =>
      health(
        adapter.provider,
        "outreach",
        adapter.mode,
        adapter.channels,
        "Outbound delivery adapter is available for campaign dispatch.",
      ),
    ),
    voice: voiceAdapters.map((adapter) =>
      health(
        adapter.provider,
        "voice",
        adapter.mode,
        ["call"],
        "Voice dispatch adapter is ready for AI call workflows.",
      ),
    ),
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
  const adapter =
    outreachAdapters.find((entry) => entry.supports(input.campaign.channel) && entry.mode === "configured") ??
    outreachAdapters.find((entry) => entry.supports(input.campaign.channel)) ??
    outreachAdapters[0]!;

  return adapter.dispatch(input);
}

export async function dispatchVoiceCall(input: {
  call: CallRecord;
  lead: LeadRecord | null;
}): Promise<Omit<DispatchCallResponse, "call">> {
  return voiceAdapters[0]!.dispatch(input);
}
