import { describe, expect, it } from "vitest";
import {
  buildAuditExport,
  buildAuditLogResponse,
  sanitizeAuditLogEvent,
  auditLogResponseSchema,
  auditExportResponseSchema,
} from "../src/audit-log";

const now = "2026-06-04T12:00:00.000Z";

describe("audit log", () => {
  it("sanitizes API audit payloads without exposing raw request metadata", () => {
    const event = sanitizeAuditLogEvent({
      id: "audit-1",
      organizationId: "org-1",
      actorType: "user",
      actorId: "user-1",
      eventType: "api.post./v1/meetings",
      createdAt: now,
      payload: {
        requestId: "req-123",
        method: "POST",
        path: "/v1/meetings",
        status: 201,
        durationMs: 44,
        ip: "203.0.113.10",
        userAgent: "secret-browser",
        body: {
          notes: "private note",
        },
      },
    });

    expect(event).toMatchObject({
      id: "audit-1",
      severity: "sensitive",
      summary: "POST /v1/meetings returned 201 in the server audit trail.",
      evidence: ["request req-123", "status 201", "44ms"],
    });
    expect(event.payloadKeys).toEqual([
      "durationMs",
      "method",
      "path",
      "requestId",
      "status",
    ]);
  });

  it("summarizes action proposal reviews as review evidence", () => {
    const event = sanitizeAuditLogEvent({
      id: "audit-2",
      organizationId: "org-1",
      actorType: "user",
      actorId: "user-1",
      eventType: "action_proposal.approved",
      createdAt: now,
      payload: {
        workspaceId: "ws-1",
        proposalId: "proposal-1",
        type: "campaign_dispatch",
        decision: "approve",
        targetKind: "campaign",
        targetId: "camp-1",
      },
    });

    expect(event.severity).toBe("review");
    expect(event.summary).toBe("approve campaign dispatch proposal-1.");
    expect(event.scope.workspaceId).toBe("ws-1");
    expect(event.target).toMatchObject({
      kind: "campaign",
      id: "camp-1",
    });
    expect(event.evidence).toEqual(
      expect.arrayContaining([
        "workspace ws-1",
        "proposal proposal-1",
        "target camp-1",
      ]),
    );
  });

  it("builds the recent audit response summary and guardrails", () => {
    const response = auditLogResponseSchema.parse(
      buildAuditLogResponse({
        generatedAt: now,
        events: [
          {
            id: "audit-1",
            organizationId: "org-1",
            actorType: "user",
            actorId: "user-1",
            eventType: "api.get./v1/dashboard",
            createdAt: now,
            payload: {
              method: "GET",
              path: "/v1/dashboard",
              status: 200,
            },
          },
          {
            id: "audit-2",
            organizationId: "org-1",
            actorType: "provider",
            actorId: null,
            eventType: "stripe.invoice.paid",
            createdAt: now,
            payload: {
              verified: true,
              provider: "stripe",
              body: {
                hidden: true,
              },
            },
          },
        ],
      }),
    );

    expect(response.surface).toBe("audit-log");
    expect(response.summary).toMatchObject({
      totalReturned: 2,
      sensitiveCount: 1,
      reviewCount: 0,
      requestCount: 1,
      latestEventAt: now,
    });
    expect(response.events[1].payloadKeys).toEqual(["provider", "verified"]);
    expect(response.guardrails[0]).toContain("read-only");
  });

  it("applies a configured retention window to recent audit evidence", () => {
    const response = auditLogResponseSchema.parse(
      buildAuditLogResponse({
        generatedAt: "2026-06-05T12:00:00.000Z",
        retentionDays: 1,
        events: [
          {
            id: "audit-new",
            organizationId: "org-1",
            actorType: "user",
            actorId: "user-1",
            eventType: "api.get./v1/dashboard",
            createdAt: "2026-06-05T11:00:00.000Z",
            payload: {
              method: "GET",
              path: "/v1/dashboard",
              status: 200,
            },
          },
          {
            id: "audit-old",
            organizationId: "org-1",
            actorType: "user",
            actorId: "user-1",
            eventType: "api.get./v1/dashboard",
            createdAt: "2026-06-03T11:00:00.000Z",
            payload: {
              method: "GET",
              path: "/v1/dashboard",
              status: 200,
            },
          },
        ],
      }),
    );

    expect(response.summary.retention).toMatchObject({
      mode: "retention_window",
      retentionDays: 1,
      cutoffAt: "2026-06-04T12:00:00.000Z",
      excludedEvents: 1,
    });
    expect(response.events.map((event) => event.id)).toEqual(["audit-new"]);
    expect(response.guardrails.join(" ")).toContain("2026-06-04T12:00:00.000Z");
  });

  it("builds a tamper-evident sanitized audit export with a hash chain", async () => {
    const auditExport = auditExportResponseSchema.parse(
      await buildAuditExport({
        workspaceName: "Growth OS",
        generatedAt: now,
        events: [
          {
            id: "audit-new",
            organizationId: "org-1",
            actorType: "user",
            actorId: "user-1",
            eventType: "api.post./v1/campaigns/camp-1/dispatch",
            createdAt: "2026-06-04T12:01:00.000Z",
            payload: {
              requestId: "req-new",
              method: "POST",
              path: "/v1/campaigns/camp-1/dispatch",
              status: 200,
              body: {
                hidden: true,
              },
            },
          },
          {
            id: "audit-old",
            organizationId: "org-1",
            actorType: "user",
            actorId: "user-1",
            eventType: "api.get./v1/dashboard",
            createdAt: "2026-06-04T12:00:00.000Z",
            payload: {
              requestId: "req-old",
              method: "GET",
              path: "/v1/dashboard",
              status: 200,
              ip: "203.0.113.10",
            },
          },
        ],
      }),
    );

    expect(auditExport.surface).toBe("audit-export");
    expect(auditExport.summary).toMatchObject({
      totalEvents: 2,
      sensitiveCount: 1,
      requestCount: 2,
      firstEventAt: "2026-06-04T12:00:00.000Z",
      latestEventAt: "2026-06-04T12:01:00.000Z",
      algorithm: "SHA-256",
      payloadMode: "sanitized",
    });
    expect(auditExport.events.map((event) => event.id)).toEqual([
      "audit-old",
      "audit-new",
    ]);
    expect(auditExport.hashChain).toHaveLength(2);
    expect(auditExport.hashChain[0]).toMatchObject({
      sequence: 1,
      eventId: "audit-old",
      previousHash: "0".repeat(64),
    });
    expect(auditExport.hashChain[1].previousHash).toBe(
      auditExport.hashChain[0].hash,
    );
    expect(auditExport.summary.chainHead).toBe(auditExport.hashChain[1].hash);
    expect(auditExport.file.filename).toBe("growth-os-audit-export.json");
    expect(auditExport.file.content).not.toContain("203.0.113.10");
    expect(auditExport.file.content).not.toContain("hidden");
    expect(JSON.parse(auditExport.file.content)).toMatchObject({
      surface: "audit-export",
      summary: {
        chainHead: auditExport.summary.chainHead,
      },
    });
    expect(auditExport.unavailableClaims[0]).toContain("SIEM");
  });

  it("limits audit exports to the configured retention window before hashing", async () => {
    const auditExport = auditExportResponseSchema.parse(
      await buildAuditExport({
        workspaceName: "Growth OS",
        generatedAt: "2026-06-05T12:00:00.000Z",
        retentionDays: 1,
        events: [
          {
            id: "audit-new",
            organizationId: "org-1",
            actorType: "user",
            actorId: "user-1",
            eventType: "api.post./v1/meetings",
            createdAt: "2026-06-05T11:00:00.000Z",
            payload: {
              method: "POST",
              path: "/v1/meetings",
              status: 201,
            },
          },
          {
            id: "audit-old",
            organizationId: "org-1",
            actorType: "user",
            actorId: "user-1",
            eventType: "api.get./v1/dashboard",
            createdAt: "2026-06-03T11:00:00.000Z",
            payload: {
              method: "GET",
              path: "/v1/dashboard",
              status: 200,
            },
          },
        ],
      }),
    );

    expect(auditExport.summary.retention).toMatchObject({
      mode: "retention_window",
      retentionDays: 1,
      excludedEvents: 1,
    });
    expect(auditExport.events.map((event) => event.id)).toEqual(["audit-new"]);
    expect(auditExport.hashChain).toHaveLength(1);
    expect(auditExport.file.content).not.toContain("audit-old");
  });
});
