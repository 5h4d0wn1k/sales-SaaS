import { z } from "zod";
import type { AuditLogResponse } from "./audit-log";

export const auditComplianceReadinessStatusSchema = z.enum([
  "ready",
  "needs_configuration",
  "missing",
]);

export const auditComplianceReadinessToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
]);

export const auditComplianceReadinessStepSchema = z.object({
  id: z.enum([
    "manual_export",
    "retention_policy",
    "siem_streaming",
    "immutable_archive",
    "legal_discovery",
  ]),
  title: z.string(),
  status: auditComplianceReadinessStatusSchema,
  tone: auditComplianceReadinessToneSchema,
  detail: z.string(),
  requiredConfig: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
});

export const auditComplianceReadinessResponseSchema = z.object({
  surface: z.literal("audit-compliance-readiness"),
  version: z.string(),
  generatedAt: z.string(),
  posture: z.enum(["ready", "guarded", "blocked"]),
  summary: z.object({
    ready: z.number().int().min(0),
    needsConfiguration: z.number().int().min(0),
    missing: z.number().int().min(0),
    latestEventAt: z.string().nullable(),
    manualExportMode: z.literal("sanitized_hash_chain"),
  }),
  steps: z.array(auditComplianceReadinessStepSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type AuditComplianceReadinessStatus = z.infer<
  typeof auditComplianceReadinessStatusSchema
>;
export type AuditComplianceReadinessTone = z.infer<
  typeof auditComplianceReadinessToneSchema
>;
export type AuditComplianceReadinessStep = z.infer<
  typeof auditComplianceReadinessStepSchema
>;
export type AuditComplianceReadinessResponse = z.infer<
  typeof auditComplianceReadinessResponseSchema
>;

export type AuditComplianceReadinessConfig = {
  retentionDays?: number | null;
  siemStreamingConfigured?: boolean;
  immutableArchiveConfigured?: boolean;
  legalDiscoveryOwner?: string | null;
};

function statusTone(
  status: AuditComplianceReadinessStatus,
): AuditComplianceReadinessTone {
  if (status === "ready") {
    return "good";
  }

  return status === "missing" ? "blocked" : "warn";
}

function configuredOwner(value?: string | null) {
  return typeof value === "string" && value.trim().length >= 2;
}

function retentionStatus(days?: number | null): AuditComplianceReadinessStatus {
  if (typeof days !== "number" || !Number.isFinite(days) || days <= 0) {
    return "missing";
  }

  return days >= 90 ? "ready" : "needs_configuration";
}

export function buildAuditComplianceReadiness(input: {
  auditLog?: AuditLogResponse | null;
  config?: AuditComplianceReadinessConfig;
  generatedAt?: string;
}): AuditComplianceReadinessResponse {
  const config = input.config ?? {};
  const retention = retentionStatus(config.retentionDays);
  const siem: AuditComplianceReadinessStatus = config.siemStreamingConfigured
    ? "ready"
    : "needs_configuration";
  const archive: AuditComplianceReadinessStatus =
    config.immutableArchiveConfigured ? "ready" : "needs_configuration";
  const discovery: AuditComplianceReadinessStatus = configuredOwner(
    config.legalDiscoveryOwner,
  )
    ? "ready"
    : "needs_configuration";
  const latestEventAt = input.auditLog?.summary.latestEventAt ?? null;
  const retentionApplied =
    input.auditLog?.summary.retention.mode === "retention_window";
  const retentionCutoffAt = input.auditLog?.summary.retention.cutoffAt ?? null;
  const retentionExcludedEvents =
    input.auditLog?.summary.retention.excludedEvents ?? 0;
  const steps: AuditComplianceReadinessStep[] = [
    {
      id: "manual_export",
      title: "Manual hash-chain export",
      status: "ready",
      tone: "good",
      detail:
        "Operators can download a sanitized JSON audit package with a SHA-256 hash chain for review evidence.",
      requiredConfig: ["/v1/audit/export"],
      evidence: [
        "sanitized event summaries",
        "SHA-256 chain head",
        latestEventAt
          ? `latest event ${latestEventAt}`
          : "no recent event timestamp loaded",
      ],
    },
    {
      id: "retention_policy",
      title: "Retention policy",
      status: retention,
      tone: statusTone(retention),
      detail:
        retention === "ready"
          ? `Audit retention is declared for ${config.retentionDays} days and applied to operator-facing audit evidence.`
          : "Declare an audit retention window before making retention-controlled audit claims.",
      requiredConfig: ["AUDIT_RETENTION_DAYS"],
      evidence:
        typeof config.retentionDays === "number" &&
        Number.isFinite(config.retentionDays)
          ? [
              `configured days ${config.retentionDays}`,
              retentionApplied
                ? `retention cutoff ${retentionCutoffAt}`
                : "retention window not applied to loaded audit evidence",
              `${retentionExcludedEvents} event${retentionExcludedEvents === 1 ? "" : "s"} excluded by retention window`,
            ]
          : ["retention days not configured"],
    },
    {
      id: "siem_streaming",
      title: "SIEM streaming",
      status: siem,
      tone: statusTone(siem),
      detail:
        siem === "ready"
          ? "A deployment-owned SIEM stream is marked configured."
          : "Configure a deployment-owned SIEM or log-stream destination before claiming hosted audit streaming.",
      requiredConfig: ["AUDIT_SIEM_STREAM_URL"],
      evidence: [
        siem === "ready"
          ? "stream destination configured"
          : "stream destination not configured",
      ],
    },
    {
      id: "immutable_archive",
      title: "Immutable archive",
      status: archive,
      tone: statusTone(archive),
      detail:
        archive === "ready"
          ? "A deployment-owned immutable audit archive is marked configured."
          : "Configure immutable object-lock or equivalent archival storage before claiming immutable audit retention.",
      requiredConfig: ["AUDIT_ARCHIVE_BUCKET"],
      evidence: [
        archive === "ready"
          ? "archive destination configured"
          : "archive destination not configured",
      ],
    },
    {
      id: "legal_discovery",
      title: "Legal discovery owner",
      status: discovery,
      tone: statusTone(discovery),
      detail:
        discovery === "ready"
          ? "A legal discovery or compliance evidence owner is declared for audit requests."
          : "Declare who owns audit evidence review, customer requests, and legal discovery before enterprise rollout.",
      requiredConfig: ["AUDIT_LEGAL_DISCOVERY_OWNER"],
      evidence: [
        discovery === "ready"
          ? "legal discovery owner configured"
          : "legal discovery owner not configured",
      ],
    },
  ];
  const ready = steps.filter((step) => step.status === "ready").length;
  const needsConfiguration = steps.filter(
    (step) => step.status === "needs_configuration",
  ).length;
  const missing = steps.filter((step) => step.status === "missing").length;
  const posture =
    missing > 0 ? "blocked" : needsConfiguration > 0 ? "guarded" : "ready";

  return auditComplianceReadinessResponseSchema.parse({
    surface: "audit-compliance-readiness",
    version: "2026-06-05.audit-compliance-readiness",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    posture,
    summary: {
      ready,
      needsConfiguration,
      missing,
      latestEventAt,
      manualExportMode: "sanitized_hash_chain",
    },
    steps,
    guardrails: [
      "Readiness exposes configuration presence and sanitized evidence only; SIEM URLs, archive buckets, and owner names are not returned.",
      "Manual exports are evidence packages for operator review, not a hosted SIEM, immutable archive, or legal discovery workflow.",
      "Keep raw request bodies, webhook bodies, provider payloads, IP values, and user-agent values out of operator-facing audit evidence.",
    ],
    unavailableClaims: [
      "Destructive retention deletion jobs, hosted SIEM streaming, immutable archive writes, and legal discovery workflows require deployment-specific integrations.",
    ],
  });
}
