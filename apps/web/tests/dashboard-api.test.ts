import { afterEach, describe, expect, it, vi } from "vitest";

async function loadDashboardApi(responses: Response[]) {
  vi.resetModules();
  const fetchMock = vi.fn(async () => {
    const response = responses.shift();
    if (!response) {
      throw new Error("Unexpected fetch call");
    }

    return response;
  });

  vi.stubGlobal("fetch", fetchMock);
  class TestServerApiUnauthorizedError extends Error {}
  class TestServerApiWorkspaceSelectionRequiredError extends Error {}

  vi.doMock("@/lib/server-api-auth", () => {
    return {
      ServerApiUnauthorizedError: TestServerApiUnauthorizedError,
      ServerApiWorkspaceSelectionRequiredError: TestServerApiWorkspaceSelectionRequiredError,
      isServerApiUnauthorizedError: (error: unknown) =>
        error instanceof TestServerApiUnauthorizedError,
      isServerApiWorkspaceSelectionRequiredError: (error: unknown) =>
        error instanceof TestServerApiWorkspaceSelectionRequiredError,
      createServerApiHeaders: vi.fn(async () => new Headers({ authorization: "Bearer token" })),
      getServerApiBaseUrl: vi.fn(() => "https://api.example.com"),
    };
  });

  const dashboardApi = await import("../app/api");

  return {
    ...dashboardApi,
    TestServerApiWorkspaceSelectionRequiredError,
    fetchMock,
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unmock("@/lib/server-api-auth");
  vi.unstubAllGlobals();
});

describe("dashboard api helpers", () => {
  it("surfaces workspace selection requirements separately from generic dashboard failures", async () => {
    const { getDashboardData, TestServerApiWorkspaceSelectionRequiredError } = await loadDashboardApi([
      new Response(
        JSON.stringify({
          error: "Select a workspace before continuing.",
          code: "workspace_selection_required",
        }),
        {
          status: 409,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    ]);

    await expect(getDashboardData()).rejects.toBeInstanceOf(
      TestServerApiWorkspaceSelectionRequiredError,
    );
  });

  it("loads workspace memberships for the dashboard switcher", async () => {
    const memberships = [
      {
        organizationId: "org-1",
        organizationName: "Northstar Labs",
        workspaceId: "ws-1",
        workspaceName: "Default Workspace",
        role: "owner",
        active: true,
      },
      {
        organizationId: "org-1",
        organizationName: "Northstar Labs",
        workspaceId: "ws-2",
        workspaceName: "Outbound Lab",
        role: "owner",
        active: false,
      },
    ];
    const { getWorkspaceMemberships } = await loadDashboardApi([
      new Response(JSON.stringify({ memberships }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getWorkspaceMemberships()).resolves.toEqual(memberships);
  });

  it("fails closed when billing data requires an explicit workspace selection", async () => {
    const { getBillingPortalData, TestServerApiWorkspaceSelectionRequiredError } =
      await loadDashboardApi([
        new Response(
          JSON.stringify({
            error: "Select a workspace before continuing.",
            code: "workspace_selection_required",
          }),
          {
            status: 409,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      ]);

    await expect(getBillingPortalData()).rejects.toBeInstanceOf(
      TestServerApiWorkspaceSelectionRequiredError,
    );
  });

  it("loads provider health for workspace settings", async () => {
    const providerSummary = {
      sources: [
        {
          provider: "website-crawler",
          kind: "lead-source",
          mode: "mock",
          channels: ["website"],
          detail: "Lead discovery adapter is ready for planned sources.",
        },
      ],
      outreach: [
        {
          provider: "resend-fallback",
          kind: "outreach",
          mode: "configured",
          channels: ["email"],
          detail: "Outbound delivery adapter is available for campaign dispatch.",
        },
      ],
      voice: [
        {
          provider: "twilio-voice",
          kind: "voice",
          mode: "mock",
          channels: ["call"],
          detail: "Voice dispatch adapter is ready for AI call workflows.",
        },
      ],
    };
    const { getProviderSummary } = await loadDashboardApi([
      new Response(JSON.stringify(providerSummary), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getProviderSummary()).resolves.toEqual(providerSummary);
  });

  it("loads team members for workspace settings", async () => {
    const members = [
      {
        userId: "user-1",
        email: "owner@example.com",
        displayName: "Owner Example",
        workspaceRole: "owner",
        organizationRole: "owner",
        activeWorkspace: true,
        currentUser: true,
      },
    ];
    const { getWorkspaceTeamMembers } = await loadDashboardApi([
      new Response(JSON.stringify({ members }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getWorkspaceTeamMembers()).resolves.toEqual(members);
  });

  it("loads pending workspace invitations for settings", async () => {
    const invitations = [
      {
        id: "invite-1",
        email: "teammate@example.com",
        role: "member",
        status: "pending",
        workspaceId: "ws-1",
        workspaceName: "Default Workspace",
        organizationId: "org-1",
        organizationName: "Northstar Labs",
        invitedByName: "Owner Example",
        expiresAt: new Date("2026-05-11T00:00:00.000Z").toISOString(),
        acceptedAt: null,
      },
    ];
    const { getWorkspaceInvitations } = await loadDashboardApi([
      new Response(JSON.stringify({ invitations }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getWorkspaceInvitations()).resolves.toEqual(invitations);
  });
});
