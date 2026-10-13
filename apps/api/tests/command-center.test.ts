import { afterEach, describe, expect, it, vi } from "vitest";
import {
  actionProposalSchema,
  commandCenterBriefResponseSchema,
  commandCenterCapabilitiesResponseSchema,
  commandCenterCommandPreviewSchema,
  commandCenterCommandProposalResponseSchema,
  commandCenterPolicyCatalogResponseSchema,
} from "@sales/shared";

const APP_BOOT_TIMEOUT_MS = 30000;

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("../src/middleware/auth");
});

async function loadAppWithAuth(role: "owner" | "admin" | "member") {
  vi.resetModules();
  vi.doMock("../src/middleware/auth", async () => {
    const actual = await vi.importActual<typeof import("../src/middleware/auth")>(
      "../src/middleware/auth",
    );

    return {
      ...actual,
      authMiddleware: async (c: any, next: () => Promise<void>) => {
        c.set("user", {
          id: "user-command-center",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-command-center",
          workspaceId: "ws-command-center",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("command center capability route", () => {
  it("returns a governed capability catalog for authenticated owners", async () => {
    const app = await loadAppWithAuth("owner");
    const response = await app.request("/v1/command-center/capabilities");
    const body = commandCenterCapabilitiesResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.surface).toBe("command-center");
    expect(body.actorRole).toBe("owner");
    expect(body.capabilities.find((item) => item.id === "workspace-status")).toMatchObject({
      status: "available",
      accessible: true,
    });
    expect(body.capabilities.find((item) => item.id === "telegram-control")).toMatchObject({
      status: "beta",
      accessible: true,
    });
    expect(
      body.capabilities.find((item) => item.id === "telegram-control")?.guardrails,
    ).toContain("per-chat command throttling");
    expect(body.unavailableClaims).toContain(
      "Fully autonomous AI workers are not generally available.",
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("keeps high-risk command surfaces inaccessible to member actors", async () => {
    const app = await loadAppWithAuth("member");
    const response = await app.request("/v1/command-center/capabilities");
    const body = commandCenterCapabilitiesResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.actorRole).toBe("member");
    expect(body.capabilities.find((item) => item.id === "workspace-status")).toMatchObject({
      accessible: true,
    });
    expect(body.capabilities.find((item) => item.id === "telegram-control")).toMatchObject({
      status: "beta",
      accessible: false,
    });
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/command-center/capabilities");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Authentication required",
    });

    if (previousBypass === undefined) {
      delete process.env.ALLOW_TEST_AUTH_BYPASS;
    } else {
      process.env.ALLOW_TEST_AUTH_BYPASS = previousBypass;
    }
  }, APP_BOOT_TIMEOUT_MS);

  it("returns a governed operator brief for the active workspace", async () => {
    const app = await loadAppWithAuth("owner");
    const response = await app.request("/v1/command-center/brief");
    const body = commandCenterBriefResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.surface).toBe("command-center-brief");
    expect(body.workspace.name).toBeTruthy();
    expect(body.metrics.map((metric) => metric.id)).toEqual(
      expect.arrayContaining(["approvals", "providers", "pipeline", "meetings", "telegram"]),
    );
    expect(body.nextActions.length).toBeGreaterThan(0);
    expect(body.guardrails).toContain("Read-only operator brief; no workspace state changes are made.");
    expect(body.unavailableClaims).toContain(
      "Telegram cannot mutate outreach, approve actions, or run autonomous operations without in-app owner approval.",
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("returns role-aware command policy explanations for the active workspace", async () => {
    const app = await loadAppWithAuth("member");
    const response = await app.request("/v1/command-center/policies");
    const body = commandCenterPolicyCatalogResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.surface).toBe("command-center-policy");
    expect(body.actor.role).toBe("member");
    expect(body.policies.find((policy) => policy.intent === "summarize_workspace")).toMatchObject({
      decision: "read_only",
      requiredRole: "member",
    });
    expect(body.policies.find((policy) => policy.intent === "approve_action")).toMatchObject({
      decision: "blocked",
      requiredRole: "admin",
    });
    expect(
      body.policies.find((policy) => policy.intent === "telegram_mutate_outreach"),
    ).toMatchObject({
      decision: "blocked",
      riskLevel: "critical",
      channel: "telegram",
    });
    expect(body.unavailableClaims).toContain(
      "Unsupported scraping, browser automation, auto-connect, or auto-DM workflows are not supported.",
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("previews command intent without mutating workspace state", async () => {
    const app = await loadAppWithAuth("owner");
    const response = await app.request("/v1/command-center/preview", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        commandText: "Approve the pending campaign from Telegram",
        channel: "telegram",
      }),
    });
    const body = commandCenterCommandPreviewSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      surface: "command-center-command-preview",
      previewOnly: true,
      executionMode: "blocked",
      requestedMutation: true,
      match: {
        intent: "telegram_mutate_outreach",
      },
      policy: {
        decision: "blocked",
        channel: "telegram",
      },
    });
    expect(body.guardrails).toContain("Command preview is deterministic and read-only.");
  }, APP_BOOT_TIMEOUT_MS);

  it("converts eligible command previews into pending approval proposals", async () => {
    const app = await loadAppWithAuth("admin");
    const response = await app.request("/v1/command-center/proposals", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        commandText: "Run source evidence for this workspace",
        channel: "in_app",
      }),
    });
    const body = commandCenterCommandProposalResponseSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(body.preview).toMatchObject({
      previewOnly: true,
      executionMode: "requires_approval",
      match: {
        intent: "run_source_evidence",
      },
    });
    expect(body.proposal).toMatchObject({
      status: "pending",
      type: "lead_source_run",
      proposedBy: "operator",
      requiredRole: "admin",
    });

    const proposalsResponse = await app.request("/v1/action-proposals?status=pending");
    const proposals = await proposalsResponse.json();
    expect(
      proposals.proposals.some((proposal: unknown) => {
        const parsed = actionProposalSchema.parse(proposal);
        return parsed.id === body.proposal.id && parsed.status === "pending";
      }),
    ).toBe(true);
  }, APP_BOOT_TIMEOUT_MS);

  it("refuses blocked command proposal creation", async () => {
    const app = await loadAppWithAuth("owner");
    const response = await app.request("/v1/command-center/proposals", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        commandText: "Scrape LinkedIn and auto-DM every lead",
        channel: "telegram",
      }),
    });
    const body = (await response.json()) as { error: string; preview: unknown };
    const preview = commandCenterCommandPreviewSchema.parse(body.preview);

    expect(response.status).toBe(409);
    expect(body.error).toContain("Unsupported automation");
    expect(preview).toMatchObject({
      executionMode: "blocked",
      match: {
        intent: "unsupported_automation",
      },
    });
  }, APP_BOOT_TIMEOUT_MS);
});
