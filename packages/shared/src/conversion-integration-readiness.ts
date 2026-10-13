import { z } from "zod";
import { buildCrmHandoff } from "./crm-handoff";
import { buildRevenueReconciliation } from "./revenue-reconciliation";
import { dashboardResponseSchema, type DashboardResponse } from "./domain";

export const conversionIntegrationReadinessStatusSchema = z.enum([
  "ready",
  "needs_review",
  "missing",
  "blocked",
]);

export const conversionIntegrationReadinessToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const conversionIntegrationReadinessControlSchema = z.object({
  id: z.enum([
    "crm_sync",
    "calendar_sync",
    "accounting_sync",
    "invoice_payment_matching",
  ]),
  title: z.string(),
  status: conversionIntegrationReadinessStatusSchema,
  tone: conversionIntegrationReadinessToneSchema,
  detail: z.string(),
  nextAction: z.string(),
  evidence: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
});

export const conversionIntegrationReadinessConfigSchema = z.object({
  crmSyncConfigured: z.boolean().default(false),
  crmFieldMappingConfigured: z.boolean().default(false),
  calendarSyncConfigured: z.boolean().default(false),
  calendarAvailabilityConfigured: z.boolean().default(false),
  accountingSyncConfigured: z.boolean().default(false),
  revenueRecognitionPolicyConfigured: z.boolean().default(false),
  invoiceMatchingConfigured: z.boolean().default(false),
  paymentReconciliationConfigured: z.boolean().default(false),
});

export const conversionIntegrationReadinessResponseSchema = z.object({
  surface: z.literal("conversion-integration-readiness"),
  version: z.string(),
  generatedAt: z.string(),
  posture: z.enum(["ready", "guarded", "blocked"]),
  summary: z.object({
    crmRecords: z.number().int().min(0),
    missingContactRecords: z.number().int().min(0),
    readyCalendarMeetings: z.number().int().min(0),
    completedMeetings: z.number().int().min(0),
    valuedMeetings: z.number().int().min(0),
    missingValueRecords: z.number().int().min(0),
    wonLeadsWithoutMeetings: z.number().int().min(0),
    actualValueCents: z.number().int().min(0),
    configuredControls: z.number().int().min(0),
    blockedControls: z.number().int().min(0),
  }),
  controls: z.array(conversionIntegrationReadinessControlSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type ConversionIntegrationReadinessStatus = z.infer<
  typeof conversionIntegrationReadinessStatusSchema
>;
export type ConversionIntegrationReadinessTone = z.infer<
  typeof conversionIntegrationReadinessToneSchema
>;
export type ConversionIntegrationReadinessConfig = z.infer<
  typeof conversionIntegrationReadinessConfigSchema
>;
export type ConversionIntegrationReadinessControl = z.infer<
  typeof conversionIntegrationReadinessControlSchema
>;
export type ConversionIntegrationReadinessResponse = z.infer<
  typeof conversionIntegrationReadinessResponseSchema
>;

function toneForStatus(
  status: ConversionIntegrationReadinessStatus,
): ConversionIntegrationReadinessTone {
  if (status === "ready") {
    return "good";
  }

  if (status === "blocked") {
    return "blocked";
  }

  if (status === "missing") {
    return "neutral";
  }

  return "warn";
}

function configuredEvidence(label: string, configured: boolean) {
  return `${label} ${configured ? "configured" : "not configured"}`;
}

function controlStatus(input: {
  ready: boolean;
  missing?: boolean;
  blocked?: boolean;
}) {
  if (input.blocked) {
    return "blocked" as const;
  }

  if (input.missing) {
    return "missing" as const;
  }

  return input.ready ? ("ready" as const) : ("needs_review" as const);
}

function formatCents(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function buildConversionIntegrationReadiness(input: {
  dashboard: DashboardResponse;
  config?: Partial<ConversionIntegrationReadinessConfig>;
  generatedAt?: string;
}): ConversionIntegrationReadinessResponse {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const config = conversionIntegrationReadinessConfigSchema.parse(
    input.config ?? {},
  );
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const crmHandoff = buildCrmHandoff({ dashboard, generatedAt });
  const revenueReconciliation = buildRevenueReconciliation({
    dashboard,
    generatedAt,
  });
  const readyCalendarMeetings = dashboard.meetings.filter(
    (meeting) => meeting.status === "pending" || meeting.status === "scheduled",
  ).length;

  const crmBlockers = unique([
    ...(crmHandoff.summary.totalRecords === 0
      ? ["No CRM handoff records are available for mapping review."]
      : []),
    ...(crmHandoff.summary.missingContactCount > 0
      ? ["CRM handoff still contains records missing email and phone data."]
      : []),
    ...(!config.crmSyncConfigured
      ? ["External CRM sync is not configured for this deployment."]
      : []),
    ...(!config.crmFieldMappingConfigured
      ? ["CRM field mapping policy is not configured for this deployment."]
      : []),
  ]);
  const crmStatus = controlStatus({
    ready:
      config.crmSyncConfigured &&
      config.crmFieldMappingConfigured &&
      crmHandoff.summary.totalRecords > 0 &&
      crmHandoff.summary.missingContactCount === 0,
    missing: crmHandoff.summary.totalRecords === 0,
    blocked: crmHandoff.summary.missingContactCount > 0,
  });

  const calendarBlockers = unique([
    ...(readyCalendarMeetings === 0
      ? ["No pending or scheduled meetings are ready for calendar sync review."]
      : []),
    ...(!config.calendarSyncConfigured
      ? ["Writable calendar sync is not configured for this deployment."]
      : []),
    ...(!config.calendarAvailabilityConfigured
      ? ["Calendar availability and reminder policy is not configured."]
      : []),
  ]);
  const calendarStatus = controlStatus({
    ready:
      config.calendarSyncConfigured &&
      config.calendarAvailabilityConfigured &&
      readyCalendarMeetings > 0,
    missing: readyCalendarMeetings === 0,
  });

  const accountingBlockers = unique([
    ...(revenueReconciliation.summary.completedMeetingCount === 0
      ? ["No completed meetings are available for accounting sync review."]
      : []),
    ...(revenueReconciliation.summary.missingValueCount > 0
      ? [
          "Completed meetings still need actual contract value before accounting sync.",
        ]
      : []),
    ...(revenueReconciliation.summary.wonLeadWithoutMeetingCount > 0
      ? [
          "Closed-won leads still need completed meeting records before accounting sync.",
        ]
      : []),
    ...(!config.accountingSyncConfigured
      ? ["External accounting sync is not configured for this deployment."]
      : []),
    ...(!config.revenueRecognitionPolicyConfigured
      ? ["Revenue-recognition policy is not configured for this deployment."]
      : []),
  ]);
  const accountingStatus = controlStatus({
    ready:
      config.accountingSyncConfigured &&
      config.revenueRecognitionPolicyConfigured &&
      revenueReconciliation.summary.completedMeetingCount > 0 &&
      revenueReconciliation.summary.missingValueCount === 0 &&
      revenueReconciliation.summary.wonLeadWithoutMeetingCount === 0,
    missing: revenueReconciliation.summary.completedMeetingCount === 0,
    blocked:
      revenueReconciliation.summary.missingValueCount > 0 ||
      revenueReconciliation.summary.wonLeadWithoutMeetingCount > 0,
  });

  const invoiceBlockers = unique([
    ...(revenueReconciliation.summary.actualValueCents === 0
      ? [
          "No recorded closed value is available for invoice or payment matching.",
        ]
      : []),
    ...(!config.invoiceMatchingConfigured
      ? ["Invoice matching workflow is not configured for this deployment."]
      : []),
    ...(!config.paymentReconciliationConfigured
      ? [
          "Payment reconciliation workflow is not configured for this deployment.",
        ]
      : []),
  ]);
  const invoiceStatus = controlStatus({
    ready:
      config.invoiceMatchingConfigured &&
      config.paymentReconciliationConfigured &&
      revenueReconciliation.summary.actualValueCents > 0,
    missing: revenueReconciliation.summary.actualValueCents === 0,
  });

  const controls: ConversionIntegrationReadinessControl[] = [
    {
      id: "crm_sync",
      title: "CRM sync readiness",
      status: crmStatus,
      tone: toneForStatus(crmStatus),
      detail:
        crmStatus === "ready"
          ? "CRM sync, field mapping, and contact data are ready for an integration launch review."
          : "Use the manual CRM export until CRM sync, field mapping, and contact quality are ready.",
      nextAction:
        crmStatus === "ready"
          ? "Run a scoped CRM sync pilot with audit review before broad activation."
          : "Resolve CRM mapping and missing-contact blockers before enabling live sync.",
      evidence: [
        `${crmHandoff.summary.totalRecords} CRM handoff record${crmHandoff.summary.totalRecords === 1 ? "" : "s"}`,
        `${crmHandoff.summary.missingContactCount} missing-contact record${crmHandoff.summary.missingContactCount === 1 ? "" : "s"}`,
        configuredEvidence("CRM sync", config.crmSyncConfigured),
        configuredEvidence("field mapping", config.crmFieldMappingConfigured),
      ],
      blockers: crmBlockers,
    },
    {
      id: "calendar_sync",
      title: "Calendar sync readiness",
      status: calendarStatus,
      tone: toneForStatus(calendarStatus),
      detail:
        calendarStatus === "ready"
          ? "Calendar sync, availability rules, and ready meetings are available for launch review."
          : "Keep using manual calendar handoff until writable sync and availability controls are configured.",
      nextAction:
        calendarStatus === "ready"
          ? "Pilot writable calendar sync with a reviewed meeting queue."
          : "Configure calendar sync, availability policy, and reminder ownership before live sync.",
      evidence: [
        `${readyCalendarMeetings} pending or scheduled meeting${readyCalendarMeetings === 1 ? "" : "s"}`,
        configuredEvidence("calendar sync", config.calendarSyncConfigured),
        configuredEvidence(
          "availability policy",
          config.calendarAvailabilityConfigured,
        ),
      ],
      blockers: calendarBlockers,
    },
    {
      id: "accounting_sync",
      title: "Accounting sync readiness",
      status: accountingStatus,
      tone: toneForStatus(accountingStatus),
      detail:
        accountingStatus === "ready"
          ? "Completed meeting values and accounting policy are ready for a governed sync pilot."
          : "Keep revenue reconciliation manual until value capture and accounting policy are complete.",
      nextAction:
        accountingStatus === "ready"
          ? "Run accounting sync against a reviewed closed-won sample before scale."
          : "Resolve missing values, won-lead records, accounting sync, and revenue policy blockers.",
      evidence: [
        `${revenueReconciliation.summary.completedMeetingCount} completed meeting${revenueReconciliation.summary.completedMeetingCount === 1 ? "" : "s"}`,
        `${revenueReconciliation.summary.missingValueCount} missing value record${revenueReconciliation.summary.missingValueCount === 1 ? "" : "s"}`,
        `${revenueReconciliation.summary.wonLeadWithoutMeetingCount} won lead without meeting${revenueReconciliation.summary.wonLeadWithoutMeetingCount === 1 ? "" : "s"}`,
        configuredEvidence("accounting sync", config.accountingSyncConfigured),
        configuredEvidence(
          "revenue policy",
          config.revenueRecognitionPolicyConfigured,
        ),
      ],
      blockers: accountingBlockers,
    },
    {
      id: "invoice_payment_matching",
      title: "Invoice and payment matching",
      status: invoiceStatus,
      tone: toneForStatus(invoiceStatus),
      detail:
        invoiceStatus === "ready"
          ? "Recorded closed value, invoice matching, and payment reconciliation are ready for review."
          : "Invoice and payment matching remain manual until closed value and reconciliation controls exist.",
      nextAction:
        invoiceStatus === "ready"
          ? "Compare closed value against invoice and payment records before automating reconciliation."
          : "Configure invoice matching and payment reconciliation before claiming revenue automation.",
      evidence: [
        `${formatCents(revenueReconciliation.summary.actualValueCents)} recorded closed value`,
        configuredEvidence(
          "invoice matching",
          config.invoiceMatchingConfigured,
        ),
        configuredEvidence(
          "payment reconciliation",
          config.paymentReconciliationConfigured,
        ),
      ],
      blockers: invoiceBlockers,
    },
  ];

  const configuredControls = controls.filter(
    (control) => control.status === "ready",
  ).length;
  const blockedControls = controls.filter(
    (control) => control.status === "blocked",
  ).length;
  const posture =
    blockedControls > 0
      ? "blocked"
      : configuredControls === controls.length
        ? "ready"
        : "guarded";

  return conversionIntegrationReadinessResponseSchema.parse({
    surface: "conversion-integration-readiness",
    version: "2026-06-05.conversion-integration-readiness",
    generatedAt,
    posture,
    summary: {
      crmRecords: crmHandoff.summary.totalRecords,
      missingContactRecords: crmHandoff.summary.missingContactCount,
      readyCalendarMeetings,
      completedMeetings: revenueReconciliation.summary.completedMeetingCount,
      valuedMeetings: revenueReconciliation.summary.valuedMeetingCount,
      missingValueRecords: revenueReconciliation.summary.missingValueCount,
      wonLeadsWithoutMeetings:
        revenueReconciliation.summary.wonLeadWithoutMeetingCount,
      actualValueCents: revenueReconciliation.summary.actualValueCents,
      configuredControls,
      blockedControls,
    },
    controls,
    guardrails: [
      "Conversion integration readiness is read-only and does not mutate CRM, calendar, accounting, invoice, payment, billing, or provider records.",
      "Manual CRM export, calendar handoff, and revenue reconciliation remain available while live sync controls are guarded.",
      "Live CRM, calendar, accounting, invoice, and payment workflows require deployment-owned provider configuration, field mapping, policy review, and audit monitoring.",
      "Closed-won values must be reviewed by operators before accounting, revenue-recognition, invoice, or payment automation is trusted.",
    ],
    unavailableClaims: [
      "Automatic CRM mutation without reviewed field mapping and operator approval.",
      "Writable calendar sync, availability management, or automated reminders without configured calendar controls.",
      "Live accounting sync, invoice matching, payment settlement, tax advice, or revenue-recognition automation without deployment-specific integrations.",
      "Guaranteed conversion, revenue lift, or closed-won attribution from readiness reporting.",
    ],
  });
}
