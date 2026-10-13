import { afterEach, describe, expect, it, vi } from "vitest";
import {
  auditComplianceReadinessResponseSchema,
  auditExportResponseSchema,
  auditLogResponseSchema,
} from "@sales/shared";

const APP_BOOT_TIMEOUT_MS = 30000;
const AUDIT_ENV_NAMES = [
  "AUDIT_RETENTION_DAYS",
  "AUDIT_SIEM_STREAM_URL",
  "AUDIT_ARCHIVE_BUCKET",
  "AUDIT_LEGAL_DISCOVERY_OWNER",
] as const;
const previousAuditEnv = Object.fromEntries(
  AUDIT_ENV_NAMES.map((name) => [name, process.env[name]]),
) as Record<(typeof AUDIT_ENV_NAMES)[number], string | undefined>;

afterEach(() => {
  for (const name of AUDIT_ENV_NAMES) {
    const value = previousAuditEnv[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("../src/middleware/auth");
});

async function loadAppWithAuth(role: "owner" | "admin" | "member") {
  vi.resetModules();
  vi.doMock("../src/middleware/auth", async () => {
    const actual = await vi.importActual<
      typeof import("../src/middleware/auth")
    >("../src/middleware/auth");

    return {
      ...actual,
      authMiddleware: async (c: any, next: () => Promise<void>) => {
        c.set("user", {
          id: "user-audit-log",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-audit-log",
          workspaceId: "ws-audit-log",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("recent audit log route", () => {
  it(
    "returns sanitized recent audit evidence for authenticated operators",
    async () => {
      const app = await loadAppWithAuth("member");

      const dashboardResponse = await app.request("/v1/dashboard", {
        headers: {
          "x-request-id": "req-audit-log-test",
        },
      });
      expect(dashboardResponse.status).toBe(200);

      const response = await app.request("/v1/audit/recent?limit=10");
      const body = auditLogResponseSchema.parse(await response.json());

      expect(response.status).toBe(200);
      expect(body.surface).toBe("audit-log");
      expect(body.summary.totalReturned).toBeGreaterThan(0);
      expect(body.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: "api.get./v1/dashboard",
            summary:
              "GET /v1/dashboard returned 200 in the server audit trail.",
            payloadKeys: expect.arrayContaining([
              "method",
              "path",
              "requestId",
              "status",
            ]),
          }),
        ]),
      );
      expect(body.events.flatMap((event) => event.payloadKeys)).not.toContain(
        "ip",
      );
      expect(body.guardrails[0]).toContain("read-only");
      expect(body.summary.retention.mode).toBe("not_configured");
    },
    APP_BOOT_TIMEOUT_MS,
  );

  it(
    "requires authentication when the test bypass is disabled",
    async () => {
      const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
      process.env.ALLOW_TEST_AUTH_BYPASS = "false";
      vi.resetModules();

      const { createApp } = await import("../src/app");
      const app = createApp();
      const response = await app.request("/v1/audit/recent");

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        error: "Authentication required",
      });

      if (previousBypass === undefined) {
        delete process.env.ALLOW_TEST_AUTH_BYPASS;
      } else {
        process.env.ALLOW_TEST_AUTH_BYPASS = previousBypass;
      }
    },
    APP_BOOT_TIMEOUT_MS,
  );

  it(
    "returns a sanitized tamper-evident manual audit export",
    async () => {
      const app = await loadAppWithAuth("owner");

      const dashboardResponse = await app.request("/v1/dashboard", {
        headers: {
          "x-request-id": "req-audit-export-test",
        },
      });
      expect(dashboardResponse.status).toBe(200);

      const response = await app.request("/v1/audit/export");
      const body = auditExportResponseSchema.parse(await response.json());

      expect(response.status).toBe(200);
      expect(body.surface).toBe("audit-export");
      expect(body.summary.totalEvents).toBeGreaterThan(0);
      expect(body.summary.algorithm).toBe("SHA-256");
      expect(body.summary.payloadMode).toBe("sanitized");
      expect(body.summary.chainHead).toMatch(/^[a-f0-9]{64}$/);
      expect(body.hashChain.length).toBe(body.events.length);
      expect(body.file.filename).toMatch(/audit-export\.json$/);
      expect(body.file.content).toContain(body.summary.chainHead);
      expect(body.file.content).not.toContain("userAgent");
      expect(body.summary.retention.mode).toBe("not_configured");
      expect(body.guardrails[0]).toContain("sanitized audit summaries");
      expect(body.unavailableClaims[0]).toContain("SIEM");
    },
    APP_BOOT_TIMEOUT_MS,
  );

  it(
    "reports audit compliance readiness without exposing deployment destinations",
    async () => {
      delete process.env.AUDIT_RETENTION_DAYS;
      delete process.env.AUDIT_SIEM_STREAM_URL;
      delete process.env.AUDIT_ARCHIVE_BUCKET;
      delete process.env.AUDIT_LEGAL_DISCOVERY_OWNER;
      const app = await loadAppWithAuth("admin");

      await app.request("/v1/dashboard", {
        headers: {
          "x-request-id": "req-audit-readiness-test",
        },
      });

      const response = await app.request("/v1/audit/compliance-readiness");
      const body = auditComplianceReadinessResponseSchema.parse(
        await response.json(),
      );

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        surface: "audit-compliance-readiness",
        posture: "blocked",
        summary: {
          manualExportMode: "sanitized_hash_chain",
        },
      });
      expect(
        body.steps.find((step) => step.id === "manual_export"),
      ).toMatchObject({
        status: "ready",
      });
      expect(
        body.steps.find((step) => step.id === "retention_policy"),
      ).toMatchObject({
        status: "missing",
        requiredConfig: ["AUDIT_RETENTION_DAYS"],
      });
    },
    APP_BOOT_TIMEOUT_MS,
  );

  it(
    "marks deployment-owned audit controls ready when configured",
    async () => {
      process.env.AUDIT_RETENTION_DAYS = "365";
      process.env.AUDIT_SIEM_STREAM_URL =
        "https://siem.example.internal/stream";
      process.env.AUDIT_ARCHIVE_BUCKET = "audit-archive-prod";
      process.env.AUDIT_LEGAL_DISCOVERY_OWNER = "security@example.com";
      const app = await loadAppWithAuth("owner");

      const response = await app.request("/v1/audit/compliance-readiness");
      const body = auditComplianceReadinessResponseSchema.parse(
        await response.json(),
      );
      const serialized = JSON.stringify(body);

      expect(response.status).toBe(200);
      expect(body.posture).toBe("ready");
      expect(body.summary).toMatchObject({
        ready: 5,
        needsConfiguration: 0,
        missing: 0,
      });
      expect(
        body.steps.find((step) => step.id === "retention_policy"),
      ).toMatchObject({
        evidence: expect.arrayContaining([
          "0 events excluded by retention window",
        ]),
      });
      expect(serialized).not.toContain("https://siem.example.internal");
      expect(serialized).not.toContain("audit-archive-prod");
      expect(serialized).not.toContain("security@example.com");
    },
    APP_BOOT_TIMEOUT_MS,
  );
});
