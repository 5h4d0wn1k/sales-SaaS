import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

async function loadRoute(response: Response) {
  vi.resetModules();
  const fetchMock = vi.fn(async () => response);

  vi.stubGlobal("fetch", fetchMock);
  vi.doMock("@/lib/server-api-auth", () => ({
    createServerApiHeaders: vi.fn(async () => new Headers({
      authorization: "Bearer token",
      "content-type": "application/json",
    })),
    getServerApiBaseUrl: vi.fn(() => "https://api.example.com"),
  }));
  vi.doMock("@/lib/return-to", async () => import("../lib/return-to"));

  const route = await import("../app/api/command-center/proposals/route");
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(form: Record<string, string>) {
  return new Request("http://localhost/api/command-center/proposals", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  }) as NextRequest;
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.unstubAllGlobals();
});

describe("command center proposal proxy route", () => {
  it("creates an approval proposal through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(
        JSON.stringify({
          surface: "command-center-command-proposal",
          version: "2026-06-04.command-proposal",
          generatedAt: "2026-06-04T00:00:00.000Z",
          preview: {
            surface: "command-center-command-preview",
            version: "2026-06-04.command-preview",
            generatedAt: "2026-06-04T00:00:00.000Z",
            previewOnly: true,
            command: {
              text: "Run source evidence",
              normalizedText: "run source evidence",
              channel: "in_app",
            },
            match: {
              intent: "run_source_evidence",
              confidence: 82,
              matchedPhrase: "source evidence",
            },
            policy: {
              intent: "run_source_evidence",
              label: "Run source evidence",
              decision: "requires_approval",
              riskLevel: "medium",
              requiredRole: "admin",
              channel: "in_app",
              summary: "Lead-source evidence requests must be reviewed.",
              preconditions: [],
              guardrails: [],
              evidence: ["/v1/dashboard"],
              nextAction: {
                label: "Review source plan",
                href: "/dashboard#source-plan",
              },
            },
            executionMode: "requires_approval",
            requestedMutation: true,
            operatorMessage: "Run source evidence must be converted into an approval-gated workflow before execution.",
            safeNextStep: {
              label: "Review source plan",
              href: "/dashboard#source-plan",
            },
            audit: {
              eventType: "command_preview",
              requiredForExecution: true,
            },
            guardrails: ["Command preview is deterministic and read-only."],
            unavailableClaims: [],
          },
          proposal: {
            id: "appr_1",
            type: "lead_source_run",
            status: "pending",
            riskLevel: "medium",
            title: "Review command source evidence run",
            detail: "Review command source evidence.",
            proposedBy: "operator",
            targetKind: "source_plan",
            targetId: "plan_1",
            targetLabel: "Source plan",
            payloadSummary: "Run source evidence.",
            payload: {},
            guardrails: [],
            expectedEffect: "Run can be reviewed.",
            rollbackPlan: "Reject the proposal.",
            requiredRole: "admin",
            requestedBy: "owner@example.com",
            reviewedBy: null,
            reviewNote: null,
            auditEventId: null,
            createdAt: "2026-06-04T00:00:00.000Z",
            reviewedAt: null,
            expiresAt: null,
          },
          detail: "Command converted into a pending approval proposal. No provider work ran.",
          guardrails: ["Approval inbox review is required."],
        }),
        {
          status: 201,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard#ai-command-preview",
      commandText: "Run source evidence",
      channel: "in_app",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("commandStatus")).toBe("proposed");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/command-center/proposals",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({
          commandText: "Run source evidence",
          channel: "in_app",
        }),
      }),
    );
  });

  it("returns command proposal errors to the dashboard", async () => {
    const { POST } = await loadRoute(
      new Response(
        JSON.stringify({
          error: "Unsupported automation is blocked by the current command policy.",
        }),
        {
          status: 409,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      commandText: "Scrape LinkedIn and auto-DM every lead",
      channel: "telegram",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("commandStatus")).toBe("error");
    expect(location.searchParams.get("commandMessage")).toBe(
      "Unsupported automation is blocked by the current command policy.",
    );
  });
});
