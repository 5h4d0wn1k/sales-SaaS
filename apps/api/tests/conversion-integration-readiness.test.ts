import { afterEach, describe, expect, it, vi } from "vitest";
import { conversionIntegrationReadinessResponseSchema } from "@sales/shared";

const APP_BOOT_TIMEOUT_MS = 30000;

afterEach(() => {
  vi.unstubAllEnvs();
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
          id: "user-conversion-readiness",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-conversion-readiness",
          workspaceId: "ws-conversion-readiness",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("conversion integration readiness route", () => {
  it(
    "returns guarded readiness without claiming live CRM, calendar, or accounting sync",
    async () => {
      const app = await loadAppWithAuth("member");
      const response = await app.request(
        "/v1/conversion/integration-readiness",
      );
      const body = conversionIntegrationReadinessResponseSchema.parse(
        await response.json(),
      );

      expect(response.status).toBe(200);
      expect(body.surface).toBe("conversion-integration-readiness");
      expect(body.summary.crmRecords).toBeGreaterThan(0);
      expect(body.controls.map((control) => control.id)).toEqual([
        "crm_sync",
        "calendar_sync",
        "accounting_sync",
        "invoice_payment_matching",
      ]);
      expect(
        body.controls.find((control) => control.id === "crm_sync"),
      ).toMatchObject({
        blockers: expect.arrayContaining([
          "External CRM sync is not configured for this deployment.",
        ]),
      });
      expect(body.guardrails.join(" ")).toContain("read-only");
      expect(body.unavailableClaims.join(" ")).toContain(
        "Live accounting sync",
      );
    },
    APP_BOOT_TIMEOUT_MS,
  );

  it(
    "reflects configured deployment flags in conversion integration controls",
    async () => {
      vi.stubEnv("CRM_SYNC_CONFIGURED", "true");
      vi.stubEnv("CRM_FIELD_MAPPING_CONFIGURED", "true");
      vi.stubEnv("CALENDAR_SYNC_CONFIGURED", "true");
      vi.stubEnv("CALENDAR_AVAILABILITY_CONFIGURED", "true");
      vi.stubEnv("ACCOUNTING_SYNC_CONFIGURED", "true");
      vi.stubEnv("REVENUE_RECOGNITION_POLICY_CONFIGURED", "true");
      vi.stubEnv("INVOICE_MATCHING_CONFIGURED", "true");
      vi.stubEnv("PAYMENT_RECONCILIATION_CONFIGURED", "true");

      const app = await loadAppWithAuth("admin");
      const response = await app.request(
        "/v1/conversion/integration-readiness",
      );
      const body = conversionIntegrationReadinessResponseSchema.parse(
        await response.json(),
      );

      expect(response.status).toBe(200);
      expect(
        body.controls.find((control) => control.id === "crm_sync")?.evidence,
      ).toEqual(
        expect.arrayContaining([
          "CRM sync configured",
          "field mapping configured",
        ]),
      );
      expect(
        body.controls.find(
          (control) => control.id === "invoice_payment_matching",
        )?.evidence,
      ).toEqual(
        expect.arrayContaining([
          "invoice matching configured",
          "payment reconciliation configured",
        ]),
      );
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
      const response = await app.request(
        "/v1/conversion/integration-readiness",
      );

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
});
