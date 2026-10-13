import { z } from "zod";
import {
  activityStatusSchema,
  callStatusSchema,
  dashboardResponseSchema,
  leadStatusSchema,
  meetingStatusSchema,
  type DashboardResponse,
  type LeadRecord,
} from "./domain";

export const crmHandoffStageSchema = z.enum([
  "prospect",
  "qualified",
  "contacted",
  "meeting_booked",
  "closed_won",
  "closed_lost",
]);

export const crmHandoffToneSchema = z.enum(["good", "warn", "blocked", "neutral"]);

export const crmHandoffMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: crmHandoffToneSchema,
});

export const crmHandoffRecordSchema = z.object({
  leadId: z.string(),
  fullName: z.string(),
  company: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  source: z.string(),
  status: leadStatusSchema,
  score: z.number().int().min(0).max(100),
  crmStage: crmHandoffStageSchema,
  lastTouchpoint: z.string(),
  latestMeetingId: z.string().nullable(),
  latestMeetingStatus: meetingStatusSchema.nullable(),
  latestMeetingAt: z.string().nullable(),
  latestMeetingOwner: z.string().nullable(),
  latestCallStatus: callStatusSchema.nullable(),
  latestCallDisposition: z.string().nullable(),
  latestActivityStatus: activityStatusSchema.nullable(),
  latestActivitySubject: z.string().nullable(),
  actualValueCents: z.number().int().min(0),
  dealCurrency: z.string(),
  nextAction: z.string(),
});

export const crmHandoffResponseSchema = z.object({
  surface: z.literal("crm-handoff"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  summary: z.object({
    totalRecords: z.number().int().min(0),
    openPipelineCount: z.number().int().min(0),
    closedWonCount: z.number().int().min(0),
    missingContactCount: z.number().int().min(0),
    valueCapturedCents: z.number().int().min(0),
    currency: z.string(),
  }),
  metrics: z.array(crmHandoffMetricSchema),
  records: z.array(crmHandoffRecordSchema),
  csv: z.object({
    filename: z.string(),
    contentType: z.literal("text/csv; charset=utf-8"),
    content: z.string(),
  }),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type CrmHandoffRecord = z.infer<typeof crmHandoffRecordSchema>;
export type CrmHandoffResponse = z.infer<typeof crmHandoffResponseSchema>;

const csvHeaders: Array<{ key: keyof CrmHandoffRecord; label: string }> = [
  { key: "leadId", label: "Lead ID" },
  { key: "fullName", label: "Full name" },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
  { key: "score", label: "Score" },
  { key: "crmStage", label: "CRM stage" },
  { key: "lastTouchpoint", label: "Last touchpoint" },
  { key: "latestMeetingStatus", label: "Meeting status" },
  { key: "latestMeetingAt", label: "Meeting time" },
  { key: "latestMeetingOwner", label: "Meeting owner" },
  { key: "latestCallStatus", label: "Call status" },
  { key: "latestCallDisposition", label: "Call disposition" },
  { key: "latestActivityStatus", label: "Activity status" },
  { key: "latestActivitySubject", label: "Activity subject" },
  { key: "actualValueCents", label: "Actual value cents" },
  { key: "dealCurrency", label: "Currency" },
  { key: "nextAction", label: "Next action" },
];

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function sanitizeFilename(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "crm-handoff";
}

function csvCell(value: unknown) {
  const raw = String(value ?? "").replace(/\0/g, "");
  const spreadsheetSafe = /^[\t\r\n]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${spreadsheetSafe.replace(/"/g, '""')}"`;
}

function buildCsv(records: CrmHandoffRecord[]) {
  const header = csvHeaders.map((column) => csvCell(column.label)).join(",");
  const rows = records.map((record) =>
    csvHeaders.map((column) => csvCell(record[column.key])).join(","),
  );

  return [header, ...rows].join("\n") + "\n";
}

function crmStageForLead(status: LeadRecord["status"]) {
  if (status === "won") {
    return "closed_won" as const;
  }

  if (status === "lost") {
    return "closed_lost" as const;
  }

  if (status === "new") {
    return "prospect" as const;
  }

  return status;
}

function nextActionForRecord(input: {
  lead: LeadRecord;
  actualValueCents: number;
  latestMeetingStatus: CrmHandoffRecord["latestMeetingStatus"];
}) {
  if (input.lead.status === "won") {
    return input.actualValueCents > 0
      ? "Import as closed-won and reconcile value with billing or accounting when configured."
      : "Record actual closed value before CRM or accounting reconciliation.";
  }

  if (input.lead.status === "lost") {
    return "Keep out of active pipeline unless the account is requalified.";
  }

  if (input.latestMeetingStatus === "scheduled" || input.latestMeetingStatus === "pending") {
    return "Confirm meeting outcome before importing final CRM stage.";
  }

  if (!input.lead.email && !input.lead.phone) {
    return "Add reliable contact data before outreach or CRM import.";
  }

  if (input.lead.status === "contacted") {
    return "Schedule or review follow-up before moving to meeting stage.";
  }

  if (input.lead.status === "qualified") {
    return "Create an operator-reviewed outreach or meeting handoff.";
  }

  return "Qualify the account before adding it to an active CRM sequence.";
}

function parseTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatCents(cents: number, currency: string) {
  const normalizedCurrency = /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${normalizedCurrency} ${Math.round(cents / 100).toLocaleString("en-US")}`;
  }
}

function sortRecords(a: CrmHandoffRecord, b: CrmHandoffRecord) {
  const stageRank: Record<CrmHandoffRecord["crmStage"], number> = {
    closed_won: 0,
    meeting_booked: 1,
    contacted: 2,
    qualified: 3,
    prospect: 4,
    closed_lost: 5,
  };
  const stageDelta = stageRank[a.crmStage] - stageRank[b.crmStage];
  if (stageDelta !== 0) {
    return stageDelta;
  }

  return b.score - a.score;
}

export function buildCrmHandoff(input: {
  dashboard: DashboardResponse;
  generatedAt?: string;
}): CrmHandoffResponse {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const records = dashboard.leads
    .map((lead): CrmHandoffRecord => {
      const meetings = dashboard.meetings
        .filter((meeting) => meeting.leadId === lead.id)
        .sort((a, b) => parseTimestamp(b.scheduledFor) - parseTimestamp(a.scheduledFor));
      const latestMeeting = meetings[0];
      const latestCall = dashboard.calls.find((call) => call.leadId === lead.id);
      const latestActivity = dashboard.activities.find((activity) => activity.leadId === lead.id);
      const actualValueCents = meetings
        .filter((meeting) => meeting.status === "completed")
        .reduce((total, meeting) => total + meeting.dealValueCents, 0);
      const dealCurrency =
        meetings.find((meeting) => meeting.dealValueCents > 0)?.dealCurrency ?? "USD";

      return {
        leadId: lead.id,
        fullName: lead.fullName,
        company: lead.company ?? null,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        source: lead.source,
        status: lead.status,
        score: lead.score,
        crmStage: crmStageForLead(lead.status),
        lastTouchpoint: lead.lastTouchpoint,
        latestMeetingId: latestMeeting?.id ?? null,
        latestMeetingStatus: latestMeeting?.status ?? null,
        latestMeetingAt: latestMeeting?.scheduledFor ?? null,
        latestMeetingOwner: latestMeeting?.owner ?? null,
        latestCallStatus: latestCall?.status ?? null,
        latestCallDisposition: latestCall?.disposition ?? null,
        latestActivityStatus: latestActivity?.status ?? null,
        latestActivitySubject: latestActivity?.subject ?? null,
        actualValueCents,
        dealCurrency,
        nextAction: nextActionForRecord({
          lead,
          actualValueCents,
          latestMeetingStatus: latestMeeting?.status ?? null,
        }),
      };
    })
    .sort(sortRecords);

  const closedWonCount = records.filter((record) => record.crmStage === "closed_won").length;
  const openPipelineCount = records.filter(
    (record) => record.crmStage !== "closed_won" && record.crmStage !== "closed_lost",
  ).length;
  const missingContactCount = records.filter((record) => !record.email && !record.phone).length;
  const valueCapturedCents = records.reduce(
    (total, record) => total + record.actualValueCents,
    0,
  );
  const currency =
    records.find((record) => record.actualValueCents > 0)?.dealCurrency ?? "USD";

  return crmHandoffResponseSchema.parse({
    surface: "crm-handoff",
    version: "2026-06-04.crm-handoff",
    generatedAt,
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey: dashboard.subscription.planKey,
    },
    summary: {
      totalRecords: records.length,
      openPipelineCount,
      closedWonCount,
      missingContactCount,
      valueCapturedCents,
      currency,
    },
    metrics: [
      {
        id: "crm-records",
        label: "CRM records",
        value: String(records.length),
        detail: `${pluralize(records.length, "lead")} ready for manual CRM import review.`,
        tone: records.length > 0 ? "good" : "neutral",
      },
      {
        id: "open-pipeline",
        label: "Open pipeline",
        value: String(openPipelineCount),
        detail: `${pluralize(openPipelineCount, "lead")} still active before closed-won or closed-lost handoff.`,
        tone: openPipelineCount > 0 ? "warn" : "neutral",
      },
      {
        id: "closed-won",
        label: "Closed won",
        value: String(closedWonCount),
        detail: `${pluralize(closedWonCount, "lead")} can be imported as closed-won.`,
        tone: closedWonCount > 0 ? "good" : "neutral",
      },
      {
        id: "missing-contact",
        label: "Missing contact",
        value: String(missingContactCount),
        detail: `${pluralize(missingContactCount, "record")} missing email and phone data.`,
        tone: missingContactCount > 0 ? "warn" : "good",
      },
      {
        id: "captured-value",
        label: "Captured value",
        value: formatCents(valueCapturedCents, currency),
        detail: "Actual completed-meeting value included in the export.",
        tone: valueCapturedCents > 0 ? "good" : "neutral",
      },
    ],
    records,
    csv: {
      filename: `${sanitizeFilename(dashboard.workspace.workspaceName)}-crm-handoff.csv`,
      contentType: "text/csv; charset=utf-8",
      content: buildCsv(records),
    },
    guardrails: [
      "CRM handoff is a manual export; no external CRM records are created or mutated.",
      "Review contact consent, suppression posture, and field mapping before importing into a CRM.",
      "Formula-like CSV values are escaped before download to reduce spreadsheet injection risk.",
    ],
    unavailableClaims: [
      "Live CRM sync, accounting attribution, billing reconciliation, and autonomous CRM updates are not available unless separately configured.",
    ],
  });
}
