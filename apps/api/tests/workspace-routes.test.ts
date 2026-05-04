import { afterEach, describe, expect, it, vi } from "vitest";

const INTEGRATION_TIMEOUT_MS = 30000;

const authenticatedUser = {
  id: "user-1",
  email: "owner@example.com",
  name: "Owner Example",
  role: "owner" as const,
  emailVerified: true,
  organizationId: "org-1",
  workspaceId: "ws-1",
};

async function loadAppWithWorkspaceMocks(options: {
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    workspaceId: string;
    workspaceName: string;
    role: "owner" | "admin" | "member";
    active: boolean;
  }>;
  selectedWorkspace?: {
    organizationId: string;
    workspaceId: string;
    role: "owner" | "admin" | "member";
  };
}) {
  const actualAuth = await vi.importActual<typeof import("../src/middleware/auth")>(
    "../src/middleware/auth",
  );
  const actualTenantAccess = await vi.importActual<typeof import("../src/tenant-access")>(
    "../src/tenant-access",
  );

  const listWorkspaceMembershipsForUserMock = vi.fn(async () => options.memberships);
  const selectActiveWorkspaceForUserMock = vi.fn(async () => {
    return (
      options.selectedWorkspace ?? {
        organizationId: "org-1",
        workspaceId: "ws-2",
        role: "owner" as const,
      }
    );
  });

  vi.doMock("../src/middleware/auth", () => ({
    ...actualAuth,
    authMiddleware: async (c: any, next: () => Promise<void>) => {
      c.set("user", authenticatedUser);
      await next();
    },
  }));
  vi.doMock("../src/tenant-access", () => ({
    ...actualTenantAccess,
    listWorkspaceMembershipsForUser: listWorkspaceMembershipsForUserMock,
    selectActiveWorkspaceForUser: selectActiveWorkspaceForUserMock,
  }));

  vi.resetModules();
  const { createApp } = await import("../src/app");

  return {
    app: createApp(),
    listWorkspaceMembershipsForUserMock,
    selectActiveWorkspaceForUserMock,
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unmock("../src/middleware/auth");
  vi.unmock("../src/tenant-access");
});

describe("workspace account routes", () => {
  it("lists the authenticated user's accessible workspaces", async () => {
    const memberships = [
      {
        organizationId: "org-1",
        organizationName: "Northstar Labs",
        workspaceId: "ws-1",
        workspaceName: "Default Workspace",
        role: "owner" as const,
        active: true,
      },
      {
        organizationId: "org-1",
        organizationName: "Northstar Labs",
        workspaceId: "ws-2",
        workspaceName: "Outbound Lab",
        role: "owner" as const,
        active: false,
      },
    ];
    const { app, listWorkspaceMembershipsForUserMock } = await loadAppWithWorkspaceMocks({
      memberships,
    });

    const response = await app.request("/v1/account/workspaces");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      memberships,
    });
    expect(listWorkspaceMembershipsForUserMock).toHaveBeenCalledWith({
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      role: authenticatedUser.role,
      organizationId: authenticatedUser.organizationId,
      activeWorkspaceId: authenticatedUser.workspaceId,
    });
  }, INTEGRATION_TIMEOUT_MS);

  it("persists explicit workspace selection instead of relying on implicit fallbacks", async () => {
    const memberships = [
      {
        organizationId: "org-1",
        organizationName: "Northstar Labs",
        workspaceId: "ws-1",
        workspaceName: "Default Workspace",
        role: "owner" as const,
        active: false,
      },
      {
        organizationId: "org-1",
        organizationName: "Northstar Labs",
        workspaceId: "ws-2",
        workspaceName: "Outbound Lab",
        role: "owner" as const,
        active: true,
      },
    ];
    const { app, listWorkspaceMembershipsForUserMock, selectActiveWorkspaceForUserMock } =
      await loadAppWithWorkspaceMocks({
        memberships,
        selectedWorkspace: {
          organizationId: "org-1",
          workspaceId: "ws-2",
          role: "owner",
        },
      });

    const response = await app.request("/v1/account/workspaces/select", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: "ws-2",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      memberships,
    });
    expect(selectActiveWorkspaceForUserMock).toHaveBeenCalledWith("user-1", "ws-2");
    expect(listWorkspaceMembershipsForUserMock).toHaveBeenCalledWith({
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      role: "owner",
      organizationId: "org-1",
      activeWorkspaceId: "ws-2",
    });
  }, INTEGRATION_TIMEOUT_MS);
});
