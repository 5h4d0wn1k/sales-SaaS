import { z } from "zod";
import {
  dashboardResponseSchema,
  leadStatusSchema,
  meetingStatusSchema,
  subscriptionStatusSchema,
  type DashboardResponse,
  type LeadRecord,
  type MeetingRecord,
} from "./domain";

export const revenueReconciliationToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const revenueReconciliationStatusSchema = z.enum([
  "recorded_value",
  "missing_value",
  "won_missing_meeting",
]);

export const revenueReconciliationMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: revenueReconciliationToneSchema,
});

export const revenueReconciliationRecordSchema = z.object({
  meetingId: z.string().nullable(),
  leadId: z.string(),
  leadName: z.string(),
  company: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  source: z.string(),
  leadStatus: leadStatusSchema,
  meetingStatus: meetingStatusSchema.nullable(),
  scheduledFor: z.string().nullable(),
  owner: z.string().nullable(),
  dealValueCents: z.number().int().min(0),
  dealCurrency: z.string(),
  revenueStatus: revenueReconciliationStatusSchema,
  planKey: z.string(),
  subscriptionStatus: subscriptionStatusSchema,
  seats: z.number().int().min(1),
  monthlyUsage: z.number().int().min(0),
  usageLimit: z.number().int().positive(),
  nextAction: z.string(),
});

export const revenueReconciliationResponseSchema = z.object({
  surface: z.literal("revenue-reconciliation"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  summary: z.object({
    completedMeetingCount: z.number().int().min(0),
    valuedMeetingCount: z.number().int().min(0),
    missingValueCount: z.number().int().min(0),
    wonLeadWithoutMeetingCount: z.number().int().min(0),
    actualValueCents: z.number().int().min(0),
    currency: z.string(),
    subscriptionStatus: subscriptionStatusSchema,
    planKey: z.string(),
    seats: z.number().int().min(1),
    monthlyUsage: z.number().int().min(0),
    usageLimit: z.number().int().positive(),
  }),
  metrics: z.array(revenueReconciliationMetricSchema),
  records: z.array(revenueReconciliationRecordSchema),
  csv: z.object({
    filename: z.string(),
    contentType: z.literal("text/csv; charset=utf-8"),
    content: z.string(),
  }),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type RevenueReconciliationRecord = z.infer<typeof revenueReconciliationRecordSchema>;
export type RevenueReconciliationResponse = z.infer<typeof revenueReconciliationResponseSchema>;

const csvHeaders: Array<{ key: keyof RevenueReconciliationRecord; label: string }> = [
  { key: "meetingId", label: "Meeting ID" },
  { key: "leadId", label: "Lead ID" },
  { key: "leadName", label: "Lead name" },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "source", label: "Source" },
  { key: "leadStatus", label: "Lead status" },
  { key: "meetingStatus", label: "Meeting status" },
  { key: "scheduledFor", label: "Scheduled for" },
  { key: "owner", label: "Owner" },
  { key: "dealValueCents", label: "Deal value cents" },
  { key: "dealCurrency", label: "Currency" },
  { key: "revenueStatus", label: "Revenue status" },
  { key: "planKey", label: "Plan key" },
  { key: "subscriptionStatus", label: "Subscription status" },
  { key: "seats", label: "Seats" },
  { key: "monthlyUsage", label: "Monthly usage" },
  { key: "usageLimit", label: "Usage limit" },
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

  return normalized || "revenue-reconciliation";
}

function csvCell(value: unknown) {
  const raw = String(value ?? "").replace(/\0/g, "");
  const spreadsheetSafe = /^[\t\r\n]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${spreadsheetSafe.replace(/"/g, '""')}"`;
}

function buildCsv(records: RevenueReconciliationRecord[]) {
  const header = csvHeaders.map((column) => csvCell(column.label)).join(",");
  const rows = records.map((record) =>
    csvHeaders.map((column) => csvCell(record[column.key])).join(","),
  );

  return [header, ...rows].join("\n") + "\n";
}

function parseTimestamp(value: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function normalizeCurrency(value: string | null | undefined) {
  return /^[A-Za-z]{3}$/.test(value ?? "") ? String(value).toUpperCase() : "USD";
}

function formatCents(cents: number, currency: string) {
  if (currency === "MIXED") {
    return `Mixed ${Math.round(cents / 100).toLocaleString("en-US")}`;
  }

  const normalizedCurrency = normalizeCurrency(currency);

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

function nextActionForRecord(input: {
  meeting: MeetingRecord | null;
  lead: LeadRecord;
  dealValueCents: number;
}) {
  if (!input.meeting) {
    return "Confirm the closed-won source record and add a completed meeting with actual contract value before accounting import.";
  }

  if (input.dealValueCents <= 0) {
    return "Add actual contract value before using this row for accounting or billing reconciliation.";
  }

  return "Review against CRM, invoice, and payment records before accounting import.";
}

function sortRecords(a: RevenueReconciliationRecord, b: RevenueReconciliationRecord) {
  const statusRank: Record<RevenueReconciliationRecord["revenueStatus"], number> = {
    missing_value: 0,
    won_missing_meeting: 1,
    recorded_value: 2,
  };
  const statusDelta = statusRank[a.revenueStatus] - statusRank[b.revenueStatus];
  if (statusDelta !== 0) {
    return statusDelta;
  }

  return parseTimestamp(b.scheduledFor) - parseTimestamp(a.scheduledFor);
}

export function buildRevenueReconciliation(input: {
  dashboard: DashboardResponse;
  generatedAt?: string;
}): RevenueReconciliationResponse {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const completedMeetings = dashboard.meetings.filter(
    (meeting) => meeting.status === "completed",
  );
  const completedMeetingLeadIds = new Set(completedMeetings.map((meeting) => meeting.leadId));
  const leadsById = new Map(dashboard.leads.map((lead) => [lead.id, lead]));
  const fallbackLead = (meeting: MeetingRecord): LeadRecord => ({
    id: meeting.leadId,
    fullName: "Unknown lead",
    email: undefined,
    phone: undefined,
    company: undefined,
    source: "unknown",
    status: "won",
    score: 0,
    lastTouchpoint: "Meeting record without matching lead",
    rejectionReason: null,
  });

  const completedMeetingRecords = completedMeetings.map((meeting): RevenueReconciliationRecord => {
    const lead = leadsById.get(meeting.leadId) ?? fallbackLead(meeting);
    const dealCurrency = normalizeCurrency(meeting.dealCurrency);

    return {
      meetingId: meeting.id,
      leadId: lead.id,
      leadName: lead.fullName,
      company: lead.company ?? null,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      source: lead.source,
      leadStatus: lead.status,
      meetingStatus: meeting.status,
      scheduledFor: meeting.scheduledFor,
      owner: meeting.owner,
      dealValueCents: meeting.dealValueCents,
      dealCurrency,
      revenueStatus: meeting.dealValueCents > 0 ? "recorded_value" : "missing_value",
      planKey: dashboard.subscription.planKey,
      subscriptionStatus: dashboard.subscription.status,
      seats: dashboard.subscription.seats,
      monthlyUsage: dashboard.subscription.monthlyUsage,
      usageLimit: dashboard.subscription.usageLimit,
      nextAction: nextActionForRecord({
        meeting,
        lead,
        dealValueCents: meeting.dealValueCents,
      }),
    };
  });

  const wonLeadWithoutMeetingRecords = dashboard.leads
    .filter((lead) => lead.status === "won" && !completedMeetingLeadIds.has(lead.id))
    .map((lead): RevenueReconciliationRecord => ({
      meetingId: null,
      leadId: lead.id,
      leadName: lead.fullName,
      company: lead.company ?? null,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      source: lead.source,
      leadStatus: lead.status,
      meetingStatus: null,
      scheduledFor: null,
      owner: null,
      dealValueCents: 0,
      dealCurrency: "USD",
      revenueStatus: "won_missing_meeting",
      planKey: dashboard.subscription.planKey,
      subscriptionStatus: dashboard.subscription.status,
      seats: dashboard.subscription.seats,
      monthlyUsage: dashboard.subscription.monthlyUsage,
      usageLimit: dashboard.subscription.usageLimit,
      nextAction: nextActionForRecord({
        meeting: null,
        lead,
        dealValueCents: 0,
      }),
    }));

  const records = [...completedMeetingRecords, ...wonLeadWithoutMeetingRecords].sort(sortRecords);
  const valuedMeetingCount = completedMeetingRecords.filter(
    (record) => record.dealValueCents > 0,
  ).length;
  const missingValueCount = records.filter(
    (record) => record.revenueStatus !== "recorded_value",
  ).length;
  const actualValueCents = completedMeetingRecords.reduce(
    (total, record) => total + record.dealValueCents,
    0,
  );
  const currencies = Array.from(
    new Set(
      completedMeetingRecords
        .filter((record) => record.dealValueCents > 0)
        .map((record) => record.dealCurrency),
    ),
  );
  const currency = currencies.length > 1 ? "MIXED" : currencies[0] ?? "USD";

  return revenueReconciliationResponseSchema.parse({
    surface: "revenue-reconciliation",
    version: "2026-06-04.revenue-reconciliation",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey: dashboard.subscription.planKey,
    },
    summary: {
      completedMeetingCount: completedMeetings.length,
      valuedMeetingCount,
      missingValueCount,
      wonLeadWithoutMeetingCount: wonLeadWithoutMeetingRecords.length,
      actualValueCents,
      currency,
      subscriptionStatus: dashboard.subscription.status,
      planKey: dashboard.subscription.planKey,
      seats: dashboard.subscription.seats,
      monthlyUsage: dashboard.subscription.monthlyUsage,
      usageLimit: dashboard.subscription.usageLimit,
    },
    metrics: [
      {
        id: "actual-value",
        label: "Actual value",
        value: formatCents(actualValueCents, currency),
        detail: `${pluralize(valuedMeetingCount, "completed meeting")} with recorded deal value.`,
        tone: actualValueCents > 0 ? "good" : "neutral",
      },
      {
        id: "valued-meetings",
        label: "Valued meetings",
        value: String(valuedMeetingCount),
        detail: `${pluralize(valuedMeetingCount, "meeting")} can be reviewed against invoice or payment records.`,
        tone: valuedMeetingCount > 0 ? "good" : "neutral",
      },
      {
        id: "missing-values",
        label: "Missing values",
        value: String(missingValueCount),
        detail: `${pluralize(missingValueCount, "record")} needs value or source confirmation before reconciliation.`,
        tone: missingValueCount > 0 ? "warn" : "good",
      },
      {
        id: "subscription",
        label: "Subscription",
        value: dashboard.subscription.status.replace(/_/g, " "),
        detail: `${dashboard.subscription.planKey} plan with ${pluralize(
          dashboard.subscription.seats,
          "seat",
        )} and ${dashboard.subscription.monthlyUsage}/${dashboard.subscription.usageLimit} usage.`,
        tone: dashboard.subscription.status === "active" ? "good" : "warn",
      },
    ],
    records,
    csv: {
      filename: `${sanitizeFilename(
        dashboard.workspace.workspaceName,
      )}-revenue-reconciliation.csv`,
      contentType: "text/csv; charset=utf-8",
      content: buildCsv(records),
    },
    guardrails: [
      "Revenue reconciliation is a manual accounting handoff; no accounting, payment, CRM, or billing provider records are created or mutated.",
      "Review CRM, invoice, payment, tax, and revenue-recognition policy outside this export before booking revenue.",
      "Formula-like CSV values are escaped before download to reduce spreadsheet injection risk.",
      "If multiple currencies appear, reconcile row-level values instead of relying on the summary total.",
    ],
    unavailableClaims: [
      "Live accounting sync, invoice matching, payment settlement, tax advice, and revenue-recognition automation are not available unless separately integrated.",
    ],
  });
}
