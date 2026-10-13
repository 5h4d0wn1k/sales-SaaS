import type { ContactBudgetRange } from "./roi-contact-context";

export type MeetingConversionIntent =
  | "workspace_start"
  | "rollout_review"
  | "calendar_handoff"
  | "conversion_review"
  | "pricing_review";

export type MeetingConversionContactSearchParams = Record<
  string,
  string | string[] | undefined
> & {
  utm_source?: string | string[];
  meetingIntent?: string | string[];
};

export type MeetingConversionContactContext = {
  label: "AI sales meeting scheduler";
  intent: MeetingConversionIntent;
  intentLabel: string;
  sourcePath: "/ai-sales-meeting-scheduler";
  budgetRange: ContactBudgetRange;
  monthlyLeadGoal: 400;
  meetingTarget: 40;
  channels: string[];
  goals: string[];
};

export const meetingConversionUtmSource = "ai_sales_meeting_scheduler";

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeIntent(value: string | undefined): MeetingConversionIntent {
  if (
    value === "workspace_start" ||
    value === "rollout_review" ||
    value === "calendar_handoff" ||
    value === "conversion_review" ||
    value === "pricing_review"
  ) {
    return value;
  }

  return "conversion_review";
}

function intentLabel(intent: MeetingConversionIntent) {
  if (intent === "workspace_start") {
    return "Workspace start";
  }

  if (intent === "rollout_review") {
    return "Rollout review";
  }

  if (intent === "calendar_handoff") {
    return "Calendar handoff";
  }

  if (intent === "pricing_review") {
    return "Pricing review";
  }

  return "Conversion review";
}

export function buildMeetingConversionContactUrl(
  intent: MeetingConversionIntent = "conversion_review",
) {
  const params = new URLSearchParams({
    intent: "managed_services",
    utm_source: meetingConversionUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "meeting_conversion",
    meetingIntent: intent,
  });

  return `/contact?${params.toString()}`;
}

export function buildMeetingConversionGetStartedUrl(
  intent: MeetingConversionIntent = "workspace_start",
) {
  const params = new URLSearchParams({
    utm_source: meetingConversionUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "meeting_conversion",
    meetingIntent: intent,
  });

  return `/get-started?${params.toString()}`;
}

export function buildMeetingConversionPricingUrl(
  intent: MeetingConversionIntent = "pricing_review",
) {
  const params = new URLSearchParams({
    utm_source: meetingConversionUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "meeting_conversion",
    meetingIntent: intent,
  });

  return `/pricing?${params.toString()}`;
}

export function parseMeetingConversionContactContext(
  params: MeetingConversionContactSearchParams | undefined,
): MeetingConversionContactContext | null {
  const source = firstParam(params?.utm_source)?.trim();

  if (source !== meetingConversionUtmSource) {
    return null;
  }

  const intent = normalizeIntent(firstParam(params?.meetingIntent)?.trim());

  return {
    label: "AI sales meeting scheduler",
    intent,
    intentLabel: intentLabel(intent),
    sourcePath: "/ai-sales-meeting-scheduler",
    budgetRange: "1500_5000",
    monthlyLeadGoal: 400,
    meetingTarget: 40,
    channels: ["email", "call", "telegram"],
    goals: [
      "Improve meetings and conversion",
      "Launch approval-gated outreach",
      "Connect Telegram command center",
      "Add managed rollout support",
      "Generate qualified leads",
    ],
  };
}

export function formatMeetingConversionContactMessage(
  context: MeetingConversionContactContext,
) {
  return [
    "AI sales meeting scheduler context attached for review:",
    `Intent: ${context.intentLabel}`,
    `Meeting target: ${context.meetingTarget.toLocaleString()} / month`,
    "Buyer is evaluating a lead-to-meeting conversion workflow for conversion work queues, manual calendar handoff, meeting outcome capture, actual value capture, CRM and revenue export readiness, and Telegram visibility.",
    "Please review current lead, call, meeting, calendar handoff, outcome hygiene, forecast posture, CRM/accounting export needs, and whether self-serve setup or managed rollout support is the right next step.",
    "No autonomous scheduling, live calendar sync, reminder automation, provider work, billing change, accounting mutation, or Telegram-controlled mutation should start from this context without normal workspace gates.",
  ].join("\n");
}
