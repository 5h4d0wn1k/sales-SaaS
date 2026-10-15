import { afterEach, describe, expect, it, vi } from "vitest";

type TestAuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  emailVerified: boolean;
  organizationId: string;
  workspaceId: string;
};

const authenticatedOwner: TestAuthenticatedUser = {
  id: "user-1",
  email: "owner@example.com",
  name: "Owner Example",
  role: "owner",
  emailVerified: true,
  organizationId: "org-1",
  workspaceId: "ws-1",
};

async function loadAppWithTeamMocks(options?: {
  user?: TestAuthenticatedUser;
  members?: Array<{
    userId: string;
    email: string;
    displayName: string | null;
    workspaceRole: "owner" | "admin" | "member";
    organizationRole: "owner" | "admin" | "member";
    activeWorkspace: boolean;
    currentUser: boolean;
  }>;
  invitations?: Array<{
    id: string;
    email: string;
    role: "owner" | "admin" | "member";
    status: "pending" | "accepted" | "revoked" | "expired";
    workspaceId: string;
    workspaceName: string;
    organizationId: string;
    organizationName: string;
    invitedByName: string;
    expiresAt: string;
    acceptedAt: string | null;
  }>;
}) {
  const actualAuth = await vi.importActual<typeof import("../src/middleware/auth")>(
    "../src/middleware/auth",
  );
  const actualTenantAccess = await vi.importActual<typeof import("../src/tenant-access")>(
    "../src/tenant-access",
  );

  const listWorkspaceTeamMembersForActorMock = vi.fn(async () => options?.members ?? []);
  const listWorkspaceInvitationsForActorMock = vi.fn(async () => options?.invitations ?? []);
  const createWorkspaceInvitationForActorMock = vi.fn(async () => ({
    invitation: {
      id: "invite-1",
      email: "teammate@example.com",
      role: "member" as const,
      status: "pending" as const,
      workspaceId: "ws-1",
      workspaceName: "Default Workspace",
      organizationId: "org-1",
      organizationName: "Northstar Labs",
      invitedByName: "Owner Example",
      expiresAt: new Date("2026-05-11T00:00:00.000Z").toISOString(),
      acceptedAt: null,
    },
    delivery: {
      mode: "preview" as const,
      previewUrl:
        "http://localhost:3000/get-started?invite=preview&inviteEmail=teammate%40example.com",
    },
  }));
  const revokeWorkspaceInvitationForActorMock = vi.fn(async () => ({
    id: "invite-1",
    email: "teammate@example.com",
    role: "member" as const,
    status: "revoked" as const,
    workspaceId: "ws-1",
    workspaceName: "Default Workspace",
    organizationId: "org-1",
    organizationName: "Northstar Labs",
    invitedByName: "Owner Example",
    expiresAt: new Date("2026-05-11T00:00:00.000Z").toISOString(),
    acceptedAt: null,
  }));
  const acceptWorkspaceInvitationForUserMock = vi.fn(async () => ({
    ok: true,
    access: {
      organizationId: "org-1",
      workspaceId: "ws-1",
      role: "member" as const,
    },
    memberships: [],
  }));
  const updateWorkspaceTeamMemberRoleForActorMock = vi.fn(async () => ({
    member: {
      userId: "user-2",
      email: "teammate@example.com",
      displayName: "Teammate Example",
      workspaceRole: "admin" as const,
      organizationRole: "admin" as const,
      activeWorkspace: false,
      currentUser: false,
    },
  }));
  const removeWorkspaceTeamMemberForActorMock = vi.fn(async () => ({
    removedUserId: "user-2",
    removedEmail: "teammate@example.com",
  }));
  const transferWorkspaceOwnershipForActorMock = vi.fn(async () => ({
    transferredToUserId: "user-2",
    transferredToEmail: "teammate@example.com",
  }));

  vi.doMock("../src/middleware/auth", () => ({
    ...actualAuth,
    authMiddleware: async (c: any, next: () => Promise<void>) => {
      c.set("user", options?.user ?? authenticatedOwner);
      await next();
    },
  }));
  vi.doMock("../src/tenant-access", () => ({
    ...actualTenantAccess,
    listWorkspaceTeamMembersForActor: listWorkspaceTeamMembersForActorMock,
    listWorkspaceInvitationsForActor: listWorkspaceInvitationsForActorMock,
    createWorkspaceInvitationForActor: createWorkspaceInvitationForActorMock,
    revokeWorkspaceInvitationForActor: revokeWorkspaceInvitationForActorMock,
    acceptWorkspaceInvitationForUser: acceptWorkspaceInvitationForUserMock,
    updateWorkspaceTeamMemberRoleForActor: updateWorkspaceTeamMemberRoleForActorMock,
    removeWorkspaceTeamMemberForActor: removeWorkspaceTeamMemberForActorMock,
    transferWorkspaceOwnershipForActor: transferWorkspaceOwnershipForActorMock,
  }));

  vi.resetModules();
  const { createApp } = await import("../src/app");

  return {
    app: createApp(),
    TenantAccessError: actualTenantAccess.TenantAccessError,
    listWorkspaceTeamMembersForActorMock,
    listWorkspaceInvitationsForActorMock,
    createWorkspaceInvitationForActorMock,
    revokeWorkspaceInvitationForActorMock,
    acceptWorkspaceInvitationForUserMock,
    updateWorkspaceTeamMemberRoleForActorMock,
    removeWorkspaceTeamMemberForActorMock,
    transferWorkspaceOwnershipForActorMock,
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("../src/middleware/auth");
  vi.doUnmock("../src/tenant-access");
});

describe("team account routes", () => {
  it("lists the active workspace team for owners and admins", async () => {
    const members = [
      {
        userId: "user-1",
        email: "owner@example.com",
        displayName: "Owner Example",
        workspaceRole: "owner" as const,
        organizationRole: "owner" as const,
        activeWorkspace: true,
        currentUser: true,
      },
    ];
    const { app, listWorkspaceTeamMembersForActorMock } = await loadAppWithTeamMocks({
      members,
    });

    const response = await app.request("/v1/account/team");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ members });
    expect(listWorkspaceTeamMembersForActorMock).toHaveBeenCalledWith({
      id: authenticatedOwner.id,
      email: authenticatedOwner.email,
      name: authenticatedOwner.name,
      role: authenticatedOwner.role,
      organizationId: authenticatedOwner.organizationId,
      workspaceId: authenticatedOwner.workspaceId,
    });
  });

  it("creates workspace invites for verified owners and admins", async () => {
    const { app, createWorkspaceInvitationForActorMock } = await loadAppWithTeamMocks();

    const response = await app.request("/v1/account/team/invitations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "teammate@example.com",
        role: "member",
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      invitation: {
        email: "teammate@example.com",
        role: "member",
      },
      delivery: {
        mode: "preview",
      },
    });
    expect(createWorkspaceInvitationForActorMock).toHaveBeenCalledWith(
      {
        id: authenticatedOwner.id,
        email: authenticatedOwner.email,
        name: authenticatedOwner.name,
        role: authenticatedOwner.role,
        organizationId: authenticatedOwner.organizationId,
        workspaceId: authenticatedOwner.workspaceId,
      },
      {
        email: "teammate@example.com",
        role: "member",
      },
    );
  });

  it("keeps invite writes blocked until the account email is verified", async () => {
    const { app, createWorkspaceInvitationForActorMock } = await loadAppWithTeamMocks({
      user: {
        ...authenticatedOwner,
        emailVerified: false,
      },
    });

    const response = await app.request("/v1/account/team/invitations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "teammate@example.com",
        role: "member",
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "email_verification_required",
    });
    expect(createWorkspaceInvitationForActorMock).not.toHaveBeenCalled();
  });

  it("blocks admins from inviting new admins or owners", async () => {
    const { app, createWorkspaceInvitationForActorMock, TenantAccessError } = await loadAppWithTeamMocks({
      user: {
        ...authenticatedOwner,
        role: "admin",
      },
    });
    createWorkspaceInvitationForActorMock.mockRejectedValueOnce(
      new TenantAccessError(
        "Only workspace owners can invite admins or additional owners.",
        403,
        "invite_role_forbidden",
      ),
    );

    const response = await app.request("/v1/account/team/invitations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@example.com",
        role: "admin",
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "invite_role_forbidden",
    });
  });

  it("blocks members from reading or mutating team administration routes", async () => {
    const { app } = await loadAppWithTeamMocks({
      user: {
        ...authenticatedOwner,
        role: "member",
      },
    });

    const response = await app.request("/v1/account/team");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Insufficient permissions",
    });
  });

  it("updates team member roles for verified owners", async () => {
    const { app, updateWorkspaceTeamMemberRoleForActorMock } = await loadAppWithTeamMocks();

    const response = await app.request("/v1/account/team/members/user-2/role", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        role: "admin",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      member: {
        userId: "user-2",
        workspaceRole: "admin",
      },
    });
    expect(updateWorkspaceTeamMemberRoleForActorMock).toHaveBeenCalledWith(
      {
        id: authenticatedOwner.id,
        email: authenticatedOwner.email,
        name: authenticatedOwner.name,
        role: authenticatedOwner.role,
        organizationId: authenticatedOwner.organizationId,
        workspaceId: authenticatedOwner.workspaceId,
      },
      "user-2",
      {
        role: "admin",
      },
    );
  });

  it("keeps role changes blocked until the account email is verified", async () => {
    const { app, updateWorkspaceTeamMemberRoleForActorMock } = await loadAppWithTeamMocks({
      user: {
        ...authenticatedOwner,
        emailVerified: false,
      },
    });

    const response = await app.request("/v1/account/team/members/user-2/role", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        role: "admin",
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "email_verification_required",
    });
    expect(updateWorkspaceTeamMemberRoleForActorMock).not.toHaveBeenCalled();
  });

  it("surfaces last-owner protection when role changes would orphan the workspace", async () => {
    const { app, updateWorkspaceTeamMemberRoleForActorMock, TenantAccessError } =
      await loadAppWithTeamMocks();
    updateWorkspaceTeamMemberRoleForActorMock.mockRejectedValueOnce(
      new TenantAccessError(
        "At least one owner must keep organization access.",
        409,
        "last_owner_required",
      ),
    );

    const response = await app.request("/v1/account/team/members/user-2/role", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        role: "member",
      }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "last_owner_required",
      error: "At least one owner must keep organization access.",
    });
  });

  it("removes team members for verified owners", async () => {
    const { app, removeWorkspaceTeamMemberForActorMock } = await loadAppWithTeamMocks();

    const response = await app.request("/v1/account/team/members/user-2", {
      method: "DELETE",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      removedUserId: "user-2",
      removedEmail: "teammate@example.com",
    });
    expect(removeWorkspaceTeamMemberForActorMock).toHaveBeenCalledWith(
      {
        id: authenticatedOwner.id,
        email: authenticatedOwner.email,
        name: authenticatedOwner.name,
        role: authenticatedOwner.role,
        organizationId: authenticatedOwner.organizationId,
        workspaceId: authenticatedOwner.workspaceId,
      },
      "user-2",
    );
  });

  it("blocks admins from mutating existing team members", async () => {
    const { app } = await loadAppWithTeamMocks({
      user: {
        ...authenticatedOwner,
        role: "admin",
      },
    });

    const response = await app.request("/v1/account/team/members/user-2/role", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        role: "admin",
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Insufficient permissions",
    });
  });

  it("surfaces last-owner protection when removal would orphan the workspace", async () => {
    const { app, removeWorkspaceTeamMemberForActorMock, TenantAccessError } =
      await loadAppWithTeamMocks();
    removeWorkspaceTeamMemberForActorMock.mockRejectedValueOnce(
      new TenantAccessError(
        "At least one owner must keep organization access.",
        409,
        "last_owner_required",
      ),
    );

    const response = await app.request("/v1/account/team/members/user-2", {
      method: "DELETE",
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "last_owner_required",
      error: "At least one owner must keep organization access.",
    });
  });

  it("transfers ownership for verified owners", async () => {
    const { app, transferWorkspaceOwnershipForActorMock } = await loadAppWithTeamMocks();

    const response = await app.request("/v1/account/team/ownership/transfer", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        targetUserId: "user-2",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      transferredToUserId: "user-2",
      transferredToEmail: "teammate@example.com",
    });
    expect(transferWorkspaceOwnershipForActorMock).toHaveBeenCalledWith(
      {
        id: authenticatedOwner.id,
        email: authenticatedOwner.email,
        name: authenticatedOwner.name,
        role: authenticatedOwner.role,
        organizationId: authenticatedOwner.organizationId,
        workspaceId: authenticatedOwner.workspaceId,
      },
      "user-2",
    );
  });

  it("keeps ownership transfer blocked until the account email is verified", async () => {
    const { app, transferWorkspaceOwnershipForActorMock } = await loadAppWithTeamMocks({
      user: {
        ...authenticatedOwner,
        emailVerified: false,
      },
    });

    const response = await app.request("/v1/account/team/ownership/transfer", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        targetUserId: "user-2",
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "email_verification_required",
    });
    expect(transferWorkspaceOwnershipForActorMock).not.toHaveBeenCalled();
  });

  it("accepts pending invitations for the signed-in account", async () => {
    const { app, acceptWorkspaceInvitationForUserMock } = await loadAppWithTeamMocks();

    const response = await app.request("/v1/account/team/invitations/accept", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        token: "0".repeat(48),
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
    });
    expect(acceptWorkspaceInvitationForUserMock).toHaveBeenCalledWith(
      {
        id: authenticatedOwner.id,
        email: authenticatedOwner.email,
        name: authenticatedOwner.name,
        role: authenticatedOwner.role,
        organizationId: authenticatedOwner.organizationId,
        activeWorkspaceId: authenticatedOwner.workspaceId,
      },
      "0".repeat(48),
    );
  });
});
