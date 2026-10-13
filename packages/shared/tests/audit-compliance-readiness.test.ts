import { describe, expect, it } from "vitest";
import { buildAuditLogResponse } from "../src/audit-log";
import {
  auditComplianceReadinessResponseSchema,
  buildAuditComplianceReadiness,
} from "../src/audit-compliance-readiness";

const generatedAt = "2026-06-05T12:00:00.000Z";

describe("audit compliance readiness", () => {
  it("reports guarded posture when external evidence controls are not configured", () => {
    const auditLog = buildAuditLogResponse({
      generatedAt,
      events: [
        {
          id: "audit-1",
          organizationId: "org-1",
          actorType: "user",
          actorId: "user-1",
          eventType: "api.get./v1/dashboard",
          createdAt: generatedAt,
          payload: {
            requestId: "req-1",
            method: "GET",
            path: "/v1/dashboard",
            status: 200,
            body: {
              hidden: true,
            },
          },
        },
      ],
    });
    const readiness = auditComplianceReadinessResponseSchema.parse(
      buildAuditComplianceReadiness({
        auditLog,
        generatedAt,
        config: {},
      }),
    );

    expect(readiness).toMatchObject({
      surface: "audit-compliance-readiness",
      posture: "blocked",
      summary: {
        ready: 1,
        missing: 1,
        latestEventAt: generatedAt,
        manualExportMode: "sanitized_hash_chain",
      },
    });
    expect(
      readiness.steps.find((step) => step.id === "manual_export"),
    ).toMatchObject({
      status: "ready",
      evidence: expect.arrayContaining([`latest event ${generatedAt}`]),
    });
    expect(
      readiness.steps.find((step) => step.id === "retention_policy"),
    ).toMatchObject({
      status: "missing",
      requiredConfig: ["AUDIT_RETENTION_DAYS"],
    });
    expect(readiness.unavailableClaims[0]).toContain(
      "Destructive retention deletion jobs",
    );
  });

  it("reports ready posture when deployment-owned audit controls are configured", () => {
    const auditLog = buildAuditLogResponse({
      generatedAt,
      retentionDays: 365,
      events: [
        {
          id: "audit-1",
          organizationId: "org-1",
          actorType: "user",
          actorId: "user-1",
          eventType: "api.get./v1/dashboard",
          createdAt: generatedAt,
          payload: {
            requestId: "req-1",
            method: "GET",
            path: "/v1/dashboard",
            status: 200,
          },
        },
      ],
    });
    const readiness = buildAuditComplianceReadiness({
      auditLog,
      generatedAt,
      config: {
        retentionDays: 365,
        siemStreamingConfigured: true,
        immutableArchiveConfigured: true,
        legalDiscoveryOwner: "security",
      },
    });

    expect(readiness.posture).toBe("ready");
    expect(readiness.summary).toMatchObject({
      ready: 5,
      needsConfiguration: 0,
      missing: 0,
    });
    expect(readiness.steps.every((step) => step.status === "ready")).toBe(true);
    expect(
      readiness.steps.find((step) => step.id === "retention_policy"),
    ).toMatchObject({
      evidence: expect.arrayContaining([
        "retention cutoff 2025-06-05T12:00:00.000Z",
        "0 events excluded by retention window",
      ]),
    });
    expect(JSON.stringify(readiness)).not.toContain("security@example.com");
  });
});
