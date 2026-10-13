import { z } from "zod";

export const auditLogSeveritySchema = z.enum(["info", "review", "sensitive"]);

export const auditLogSourceEventSchema = z.object({
  id: z.string(),
  organizationId: z.string().nullable().default(null),
  actorType: z.string(),
  actorId: z.string().nullable().default(null),
  eventType: z.string(),
  payload: z.record(z.unknown()).default({}),
  createdAt: z.string(),
});

export const auditLogEventSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  actorType: z.string(),
  actorId: z.string().nullable(),
  createdAt: z.string(),
  summary: z.string(),
  severity: auditLogSeveritySchema,
  scope: z.object({
    organizationId: z.string().nullable(),
    workspaceId: z.string().nullable(),
  }),
  target: z.object({
    kind: z.string().nullable(),
    id: z.string().nullable(),
  }),
  evidence: z.array(z.string()),
  payloadKeys: z.array(z.string()),
});

export const auditLogResponseSchema = z.object({
  surface: z.literal("audit-log"),
  version: z.string(),
  generatedAt: z.string(),
  summary: z.object({
    totalReturned: z.number().int().min(0),
    sensitiveCount: z.number().int().min(0),
    reviewCount: z.number().int().min(0),
    requestCount: z.number().int().min(0),
    latestEventAt: z.string().nullable(),
    retention: z
      .object({
        mode: z.enum(["not_configured", "retention_window"]),
        retentionDays: z.number().int().positive().nullable(),
        cutoffAt: z.string().nullable(),
        excludedEvents: z.number().int().min(0),
      })
      .default({
        mode: "not_configured",
        retentionDays: null,
        cutoffAt: null,
        excludedEvents: 0,
      }),
  }),
  events: z.array(auditLogEventSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export const auditExportHashEntrySchema = z.object({
  sequence: z.number().int().min(1),
  eventId: z.string(),
  eventType: z.string(),
  createdAt: z.string(),
  previousHash: z.string(),
  hash: z.string(),
});

export const auditExportResponseSchema = z.object({
  surface: z.literal("audit-export"),
  version: z.string(),
  generatedAt: z.string(),
  summary: z.object({
    totalEvents: z.number().int().min(0),
    sensitiveCount: z.number().int().min(0),
    reviewCount: z.number().int().min(0),
    requestCount: z.number().int().min(0),
    firstEventAt: z.string().nullable(),
    latestEventAt: z.string().nullable(),
    algorithm: z.literal("SHA-256"),
    payloadMode: z.literal("sanitized"),
    chainHead: z.string(),
    retention: z
      .object({
        mode: z.enum(["not_configured", "retention_window"]),
        retentionDays: z.number().int().positive().nullable(),
        cutoffAt: z.string().nullable(),
        excludedEvents: z.number().int().min(0),
      })
      .default({
        mode: "not_configured",
        retentionDays: null,
        cutoffAt: null,
        excludedEvents: 0,
      }),
  }),
  events: z.array(auditLogEventSchema),
  hashChain: z.array(auditExportHashEntrySchema),
  file: z.object({
    filename: z.string(),
    contentType: z.literal("application/json; charset=utf-8"),
    content: z.string(),
  }),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type AuditLogSourceEvent = z.infer<typeof auditLogSourceEventSchema>;
export type AuditLogEvent = z.infer<typeof auditLogEventSchema>;
export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;
export type AuditExportHashEntry = z.infer<typeof auditExportHashEntrySchema>;
export type AuditExportResponse = z.infer<typeof auditExportResponseSchema>;

const emptyHash = "0".repeat(64);

function stringPayload(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberPayload(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeId(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = stringPayload(payload, key);
    if (value) {
      return value;
    }
  }

  return null;
}

function sanitizeFilename(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "audit-export";
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sortEventsChronologically(a: AuditLogEvent, b: AuditLogEvent) {
  const aTime = Date.parse(a.createdAt);
  const bTime = Date.parse(b.createdAt);
  const safeATime = Number.isNaN(aTime) ? 0 : aTime;
  const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
  const delta = safeATime - safeBTime;

  return delta === 0 ? a.id.localeCompare(b.id) : delta;
}

export function resolveAuditRetentionWindow(input: {
  retentionDays?: number | null;
  generatedAt?: string;
}) {
  const retentionDays = input.retentionDays;

  const normalizedDays =
    typeof retentionDays === "number" && Number.isFinite(retentionDays)
      ? Math.trunc(retentionDays)
      : null;

  if (
    typeof retentionDays !== "number" ||
    !Number.isFinite(retentionDays) ||
    normalizedDays === null ||
    normalizedDays <= 0
  ) {
    return {
      mode: "not_configured" as const,
      retentionDays: null,
      cutoffAt: null,
    };
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const generatedAtMs = Date.parse(generatedAt);
  const safeGeneratedAtMs = Number.isNaN(generatedAtMs)
    ? Date.now()
    : generatedAtMs;
  const cutoffAt = new Date(
    safeGeneratedAtMs - normalizedDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  return {
    mode: "retention_window" as const,
    retentionDays: normalizedDays,
    cutoffAt,
  };
}

function applyRetentionWindow(
  events: AuditLogEvent[],
  retention: ReturnType<typeof resolveAuditRetentionWindow>,
) {
  if (!retention.cutoffAt) {
    return {
      events,
      excludedEvents: 0,
    };
  }

  const cutoffMs = Date.parse(retention.cutoffAt);
  const retainedEvents = events.filter((event) => {
    const eventMs = Date.parse(event.createdAt);
    return !Number.isNaN(eventMs) && eventMs >= cutoffMs;
  });

  return {
    events: retainedEvents,
    excludedEvents: events.length - retainedEvents.length,
  };
}

function severityForEvent(eventType: string, payload: Record<string, unknown>) {
  const method = stringPayload(payload, "method")?.toUpperCase();
  const path = stringPayload(payload, "path") ?? "";

  if (
    eventType.startsWith("action_proposal.") ||
    eventType.includes("proposal")
  ) {
    return "review" as const;
  }

  if (eventType.startsWith("telegram.command.pause")) {
    return "review" as const;
  }

  if (method && method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    return "sensitive" as const;
  }

  if (
    /billing|payment|invoice|stripe|razorpay|campaign|call|meeting|suppression|webhook|provider|sales_blueprint|ai_worker|telegram\.integration/i.test(
      eventType,
    ) ||
    /billing|campaign|call|meeting|suppression|providers|telegram|ai-workers/i.test(
      path,
    )
  ) {
    return "sensitive" as const;
  }

  return "info" as const;
}

function summaryForEvent(eventType: string, payload: Record<string, unknown>) {
  const method = stringPayload(payload, "method")?.toUpperCase();
  const path = stringPayload(payload, "path");
  const status = numberPayload(payload, "status");

  if (method && path) {
    return `${method} ${path} returned ${status ?? "unknown"} in the server audit trail.`;
  }

  if (eventType.startsWith("action_proposal.")) {
    const decision =
      stringPayload(payload, "decision") ??
      eventType.replace("action_proposal.", "");
    const proposalId =
      stringPayload(payload, "proposalId") ?? "unknown proposal";
    const type = stringPayload(payload, "type") ?? "action proposal";
    return `${decision} ${type.replace(/_/g, " ")} ${proposalId}.`;
  }

  if (eventType.startsWith("telegram.command.")) {
    const command =
      stringPayload(payload, "command") ??
      eventType.replace("telegram.command.", "");
    const result = stringPayload(payload, "result") ?? "recorded";
    return `Telegram /${command} command ${result.replace(/_/g, " ")}.`;
  }

  if (eventType === "sales_blueprint.upsert") {
    const score = numberPayload(payload, "readinessScore");
    return `Sales Blueprint saved${score === null ? "" : ` with readiness ${score}/100`}.`;
  }

  if (eventType === "ai_worker_task.blocked") {
    const workerName = stringPayload(payload, "workerName") ?? "AI worker";
    return `${workerName} task was blocked before execution.`;
  }

  if (eventType === "ai_worker_task.completed") {
    const workerName = stringPayload(payload, "workerName") ?? "AI worker";
    return `${workerName} dry-run result was recorded without live tool execution.`;
  }

  if (eventType.includes(".")) {
    return `${eventType.replace(/[._]/g, " ")} recorded.`;
  }

  return "Audit event recorded.";
}

function evidenceForEvent(payload: Record<string, unknown>) {
  const evidence: string[] = [];
  const requestId = stringPayload(payload, "requestId");
  const workspaceId = stringPayload(payload, "workspaceId");
  const proposalId = stringPayload(payload, "proposalId");
  const targetId = stringPayload(payload, "targetId");
  const provider = stringPayload(payload, "provider");
  const verified = payload.verified;
  const status = numberPayload(payload, "status");
  const durationMs = numberPayload(payload, "durationMs");

  if (requestId) {
    evidence.push(`request ${requestId}`);
  }

  if (workspaceId) {
    evidence.push(`workspace ${workspaceId}`);
  }

  if (proposalId) {
    evidence.push(`proposal ${proposalId}`);
  }

  if (targetId) {
    evidence.push(`target ${targetId}`);
  }

  if (provider) {
    evidence.push(`provider ${provider}`);
  }

  if (typeof verified === "boolean") {
    evidence.push(
      verified ? "verified provider event" : "unverified provider event",
    );
  }

  if (status !== null) {
    evidence.push(`status ${status}`);
  }

  if (durationMs !== null) {
    evidence.push(`${durationMs}ms`);
  }

  return evidence.slice(0, 6);
}

export function sanitizeAuditLogEvent(
  event: AuditLogSourceEvent,
): AuditLogEvent {
  const source = auditLogSourceEventSchema.parse(event);
  const payload = source.payload;
  const workspaceId = stringPayload(payload, "workspaceId");
  const targetId = safeId(payload, [
    "targetId",
    "proposalId",
    "activityId",
    "callId",
    "meetingId",
    "workerId",
    "runId",
  ]);
  const targetKind =
    stringPayload(payload, "targetKind") ??
    (targetId
      ? (source.eventType.split(".")[0]?.replace(/_/g, "-") ?? null)
      : null);

  return auditLogEventSchema.parse({
    id: source.id,
    eventType: source.eventType,
    actorType: source.actorType,
    actorId: source.actorId,
    createdAt: source.createdAt,
    summary: summaryForEvent(source.eventType, payload),
    severity: severityForEvent(source.eventType, payload),
    scope: {
      organizationId: source.organizationId,
      workspaceId,
    },
    target: {
      kind: targetKind,
      id: targetId,
    },
    evidence: evidenceForEvent(payload),
    payloadKeys: Object.keys(payload)
      .filter((key) => !["body", "ip", "userAgent"].includes(key))
      .sort(),
  });
}

export function buildAuditLogResponse(input: {
  events: AuditLogSourceEvent[] | AuditLogEvent[];
  generatedAt?: string;
  retentionDays?: number | null;
}): AuditLogResponse {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const parsedEvents = input.events.map((event) => {
    const parsedEvent = auditLogEventSchema.safeParse(event);
    return parsedEvent.success
      ? parsedEvent.data
      : sanitizeAuditLogEvent(event as AuditLogSourceEvent);
  });
  const retention = resolveAuditRetentionWindow({
    retentionDays: input.retentionDays,
    generatedAt,
  });
  const { events, excludedEvents } = applyRetentionWindow(
    parsedEvents,
    retention,
  );

  return auditLogResponseSchema.parse({
    surface: "audit-log",
    version: "2026-06-05.audit-log-retention",
    generatedAt,
    summary: {
      totalReturned: events.length,
      sensitiveCount: events.filter((event) => event.severity === "sensitive")
        .length,
      reviewCount: events.filter((event) => event.severity === "review").length,
      requestCount: events.filter((event) => event.eventType.startsWith("api."))
        .length,
      latestEventAt: events[0]?.createdAt ?? null,
      retention: {
        ...retention,
        excludedEvents,
      },
    },
    events,
    guardrails: [
      "Recent audit log is read-only and does not expose raw request, webhook, or provider payload bodies.",
      "Audit records are scoped to the authenticated organization and summarized for operator review.",
      retention.cutoffAt
        ? `Operator-facing audit evidence is limited to events on or after ${retention.cutoffAt}.`
        : "No retention window is configured for operator-facing audit evidence.",
      "Use provider, billing, and database systems of record for formal compliance export or legal discovery.",
    ],
    unavailableClaims: [
      "Hosted SIEM streaming, destructive retention deletion jobs, immutable object-lock archives, and legal discovery workflows are not available unless separately configured.",
    ],
  });
}

export async function buildAuditExport(input: {
  events: AuditLogSourceEvent[] | AuditLogEvent[];
  workspaceName?: string;
  generatedAt?: string;
  retentionDays?: number | null;
}): Promise<AuditExportResponse> {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const parsedEvents = input.events
    .map((event) => {
      const parsedEvent = auditLogEventSchema.safeParse(event);
      return parsedEvent.success
        ? parsedEvent.data
        : sanitizeAuditLogEvent(event as AuditLogSourceEvent);
    })
    .sort(sortEventsChronologically);
  const retention = resolveAuditRetentionWindow({
    retentionDays: input.retentionDays,
    generatedAt,
  });
  const { events, excludedEvents } = applyRetentionWindow(
    parsedEvents,
    retention,
  );

  const hashChain: AuditExportHashEntry[] = [];
  let previousHash = emptyHash;

  for (const [index, event] of events.entries()) {
    const sequence = index + 1;
    const hash = await sha256Hex(
      canonicalJson({
        sequence,
        previousHash,
        event,
      }),
    );

    hashChain.push({
      sequence,
      eventId: event.id,
      eventType: event.eventType,
      createdAt: event.createdAt,
      previousHash,
      hash,
    });
    previousHash = hash;
  }

  const chainHead = hashChain.at(-1)?.hash ?? emptyHash;
  const summary = {
    totalEvents: events.length,
    sensitiveCount: events.filter((event) => event.severity === "sensitive")
      .length,
    reviewCount: events.filter((event) => event.severity === "review").length,
    requestCount: events.filter((event) => event.eventType.startsWith("api."))
      .length,
    firstEventAt: events[0]?.createdAt ?? null,
    latestEventAt: events.at(-1)?.createdAt ?? null,
    algorithm: "SHA-256" as const,
    payloadMode: "sanitized" as const,
    chainHead,
    retention: {
      ...retention,
      excludedEvents,
    },
  };
  const exportPayload = {
    surface: "audit-export",
    version: "2026-06-04.audit-export",
    generatedAt,
    summary,
    events,
    hashChain,
    guardrails: [
      "Export contains sanitized audit summaries only; raw request bodies, webhook bodies, IP values, user-agent values, and provider payload bodies are excluded.",
      "Hash chain covers the sanitized event representation in chronological order.",
      retention.cutoffAt
        ? `Export is limited to retained events on or after ${retention.cutoffAt}.`
        : "Export is not retention-limited because no audit retention window is configured.",
      "Validate the final chain head against the exported file before relying on the package for operational review.",
    ],
  };

  return auditExportResponseSchema.parse({
    ...exportPayload,
    file: {
      filename: `${sanitizeFilename(input.workspaceName ?? "workspace")}-audit-export.json`,
      contentType: "application/json; charset=utf-8",
      content: `${JSON.stringify(exportPayload, null, 2)}\n`,
    },
    unavailableClaims: [
      "This manual export is not a hosted SIEM stream, legal discovery workflow, immutable object-lock archive, or destructive retention deletion job.",
    ],
  });
}
