import { Resend } from "resend";
import {
  CONTACT_INTAKE_SENSITIVE_REDACTION,
  type ContactIntakeNotification,
  type ContactIntakeRecord,
} from "@sales/shared";

function isNotificationConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM_EMAIL &&
      process.env.CONTACT_INTAKE_TO_EMAIL,
  );
}

function safeText(value: string) {
  return value.replace(/[<>&]/g, (char) => {
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    return "&amp;";
  });
}

function safeHeaderText(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function utmString(submission: ContactIntakeRecord, key: string) {
  const value = submission.utm[key];
  return typeof value === "string" && value.trim() ? value.trim() : "not provided";
}

function optionalUtmString(submission: ContactIntakeRecord, key: string) {
  const value = submission.utm[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sourceAttributionLines(submission: ContactIntakeRecord) {
  return [
    `Source path: ${submission.sourcePath || "not provided"}`,
    `Referrer: ${submission.referrer || "not provided"}`,
  ];
}

function integrationAttributionLines(submission: ContactIntakeRecord) {
  const integration = optionalUtmString(submission, "integration");
  const integrationIntent = optionalUtmString(submission, "integrationIntent");
  const integrationStatus = optionalUtmString(submission, "integrationStatus");
  const integrationCommercialPath = optionalUtmString(
    submission,
    "integrationCommercialPath",
  );

  if (!integration && !integrationIntent && !integrationStatus && !integrationCommercialPath) {
    return [];
  }

  return [
    `Requested integration: ${integration ?? "not provided"}`,
    `Integration intent: ${integrationIntent ?? "not provided"}`,
    `Integration status: ${integrationStatus ?? "not provided"}`,
    `Integration commercial path: ${integrationCommercialPath ?? "not provided"}`,
  ];
}

function revenueAttributionLines(submission: ContactIntakeRecord) {
  const pricingPlan = optionalUtmString(submission, "pricingPlan");
  const pricingIntent = optionalUtmString(submission, "pricingIntent");
  const managedPackage = optionalUtmString(submission, "managedPackage");
  const managedIntent = optionalUtmString(submission, "managedIntent");

  if (!pricingPlan && !pricingIntent && !managedPackage && !managedIntent) {
    return [];
  }

  return [
    `Pricing plan: ${pricingPlan ?? "not provided"}`,
    `Pricing intent: ${pricingIntent ?? "not provided"}`,
    `Managed package: ${managedPackage ?? "not provided"}`,
    `Managed intent: ${managedIntent ?? "not provided"}`,
  ];
}

function sensitiveContentLines(submission: ContactIntakeRecord) {
  const searchable = JSON.stringify({
    name: submission.name,
    companyName: submission.companyName,
    website: submission.website,
    role: submission.role,
    teamSize: submission.teamSize,
    message: submission.message,
    sourcePath: submission.sourcePath,
    referrer: submission.referrer,
    utm: submission.utm,
  });

  return searchable.includes(CONTACT_INTAKE_SENSITIVE_REDACTION)
    ? [
        "Sensitive content: Secret-like values were redacted before storage and notification.",
      ]
    : [];
}

function contactIntakeSummary(submission: ContactIntakeRecord) {
  return [
    `Priority: ${submission.priority} (${submission.qualificationScore}/100)`,
    `Intent: ${submission.intent}`,
    ...sourceAttributionLines(submission),
    `Acquisition source: ${utmString(submission, "source")}`,
    `Acquisition medium: ${utmString(submission, "medium")}`,
    `Acquisition campaign: ${utmString(submission, "campaign")}`,
    ...revenueAttributionLines(submission),
    `Solution segment: ${utmString(submission, "solutionSegment")}`,
    `Segment label: ${utmString(submission, "segment")}`,
    ...integrationAttributionLines(submission),
    `Company: ${submission.companyName}`,
    `Website: ${submission.website || "not provided"}`,
    `Contact: ${submission.name} <${submission.email}>`,
    `Role: ${submission.role || "not provided"}`,
    `Team size: ${submission.teamSize || "not provided"}`,
    `Monthly lead goal: ${submission.monthlyLeadGoal}`,
    `Timeline: ${submission.timeline}`,
    `Budget posture: ${submission.budgetRange}`,
    `Goals: ${submission.goals.length > 0 ? submission.goals.join(", ") : "not provided"}`,
    `Channels: ${submission.channels.length > 0 ? submission.channels.join(", ") : "not provided"}`,
    `Routing: ${submission.routingRecommendation}`,
    ...sensitiveContentLines(submission),
    "",
    submission.message,
  ].join("\n");
}

export async function notifyContactIntake(
  submission: ContactIntakeRecord,
): Promise<ContactIntakeNotification> {
  const recipient = process.env.CONTACT_INTAKE_TO_EMAIL;

  if (!isNotificationConfigured() || !recipient) {
    return {
      mode: process.env.NODE_ENV === "production" ? "unavailable" : "preview",
      provider: "resend",
      detail:
        "Contact intake was captured, but notification email is not configured. Set RESEND_API_KEY, RESEND_FROM_EMAIL, and CONTACT_INTAKE_TO_EMAIL.",
    };
  }

  const summary = contactIntakeSummary(submission);
  const subject = [
    `[salesxgrowth ${submission.priority}]`,
    safeHeaderText(submission.companyName),
    safeHeaderText(submission.intent.replace(/_/g, " ")),
  ].join(" ");
  const html = summary
    .split("\n")
    .map((line) => (line ? `<p>${safeText(line)}</p>` : "<br />"))
    .join("");

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: recipient,
      replyTo: submission.email,
      subject,
      text: summary,
      html,
    });

    return {
      mode: "email",
      provider: "resend",
      detail: "Contact intake notification email was queued.",
    };
  } catch (error) {
    console.error("Contact intake notification failed:", error);
    return {
      mode: "failed",
      provider: "resend",
      detail:
        "Contact intake was captured, but notification email failed. Check Resend delivery configuration and logs.",
    };
  }
}
