import crypto from "crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  organizationMemberships,
  organizations,
  subscriptions,
  users,
  workspaceInvitations,
  workspaceMemberships,
  workspaces,
} from "@sales/database";
import { sendWorkspaceInvitationEmail, type InvitationEmailDelivery } from "./team-invitation-delivery";

type MembershipRole = "owner" | "admin" | "member";

type DatabaseExecutor = {
  select: typeof db.select;
  insert: typeof db.insert;
  update: typeof db.update;
  delete: typeof db.delete;
};

export interface TenantUserRecord {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  organizationId?: string | null;
  activeWorkspaceId?: string | null;
}

export interface ResolvedTenantAccess {
  organizationId: string;
  workspaceId: string;
  role: MembershipRole;
}

export interface WorkspaceMembershipSummary extends ResolvedTenantAccess {
  organizationName: string;
  workspaceName: string;
  active: boolean;
}

export interface WorkspaceTeamMemberSummary {
  userId: string;
  email: string;
  displayName: string | null;
  workspaceRole: MembershipRole;
  organizationRole: MembershipRole;
  activeWorkspace: boolean;
  currentUser: boolean;
}

export interface WorkspaceInvitationSummary {
  id: string;
  email: string;
  role: MembershipRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  workspaceId: string;
  workspaceName: string;
  organizationId: string;
  organizationName: string;
  invitedByName: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface CreateWorkspaceInvitationResult {
  invitation: WorkspaceInvitationSummary;
  delivery: InvitationEmailDelivery;
}

export interface TeamActorContext extends ResolvedTenantAccess {
  id: string;
  email: string;
  name?: string | null;
}

export class TenantAccessError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "TenantAccessError";
  }
}

function coerceMembershipRole(role?: string | null): MembershipRole {
  if (role === "owner" || role === "admin") {
    return role;
  }

  return "member";
}

function buildOrganizationSlug(nameOrEmail: string, userId: string) {
  const base = nameOrEmail
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${base || "workspace"}-${userId.slice(0, 8)}`;
}

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function generateInvitationToken() {
  return crypto.randomBytes(24).toString("hex");
}

function hashInvitationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function rolePriority(role: MembershipRole) {
  if (role === "owner") {
    return 3;
  }

  if (role === "admin") {
    return 2;
  }

  return 1;
}

function maxRole(left: MembershipRole, right: MembershipRole): MembershipRole {
  return rolePriority(left) >= rolePriority(right) ? left : right;
}

async function ensureOrganizationWorkspace(
  executor: DatabaseExecutor,
  organizationId: string,
) {
  const existing = await executor
    .select({
      id: workspaces.id,
      organizationId: workspaces.organizationId,
    })
    .from(workspaces)
    .where(eq(workspaces.organizationId, organizationId))
    .orderBy(asc(workspaces.createdAt), asc(workspaces.id));

  if (existing.length > 0) {
    return existing;
  }

  const [workspace] = await executor
    .insert(workspaces)
    .values({
      organizationId,
      name: "Default Workspace",
      industry: "Unknown",
    })
    .returning({
      id: workspaces.id,
      organizationId: workspaces.organizationId,
    });

  return workspace ? [workspace] : [];
}

async function ensureLegacyMembershipBackfill(
  executor: DatabaseExecutor,
  user: TenantUserRecord,
) {
  if (!user.organizationId) {
    return [];
  }

  const role = coerceMembershipRole(user.role);

  const existingOrgMemberships = await executor
    .select({
      id: organizationMemberships.id,
    })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, user.organizationId),
        eq(organizationMemberships.userId, user.id),
      ),
    )
    .limit(1);

  if (existingOrgMemberships.length === 0) {
    await executor.insert(organizationMemberships).values({
      organizationId: user.organizationId,
      userId: user.id,
      role,
    });
  }

  const organizationWorkspaces = await ensureOrganizationWorkspace(executor, user.organizationId);
  if (organizationWorkspaces.length === 0) {
    return [];
  }

  const existingWorkspaceMemberships = await executor
    .select({
      workspaceId: workspaceMemberships.workspaceId,
    })
    .from(workspaceMemberships)
    .where(eq(workspaceMemberships.userId, user.id));

  const existingWorkspaceIds = new Set(existingWorkspaceMemberships.map((row) => row.workspaceId));
  const missingWorkspaceMemberships = organizationWorkspaces
    .filter((workspace) => !existingWorkspaceIds.has(workspace.id))
    .map((workspace) => ({
      workspaceId: workspace.id,
      userId: user.id,
      role,
    }));

  if (missingWorkspaceMemberships.length > 0) {
    await executor.insert(workspaceMemberships).values(missingWorkspaceMemberships);
  }

  if (!user.activeWorkspaceId) {
    await executor
      .update(users)
      .set({
        activeWorkspaceId: organizationWorkspaces[0]!.id,
      })
      .where(eq(users.id, user.id));
  }

  return organizationWorkspaces;
}

async function loadWorkspaceMemberships(
  executor: DatabaseExecutor,
  userId: string,
) {
  return executor
    .select({
      organizationId: workspaces.organizationId,
      organizationName: organizations.name,
      workspaceId: workspaceMemberships.workspaceId,
      workspaceName: workspaces.name,
      role: workspaceMemberships.role,
    })
    .from(workspaceMemberships)
    .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.id))
    .innerJoin(organizations, eq(workspaces.organizationId, organizations.id))
    .innerJoin(
      organizationMemberships,
      and(
        eq(organizationMemberships.userId, workspaceMemberships.userId),
        eq(organizationMemberships.organizationId, workspaces.organizationId),
      ),
    )
    .where(eq(workspaceMemberships.userId, userId))
    .orderBy(asc(organizations.createdAt), asc(workspaces.createdAt), asc(workspaces.id));
}

async function persistActiveWorkspaceSelection(
  executor: DatabaseExecutor,
  userId: string,
  selection: ResolvedTenantAccess,
) {
  await executor
    .update(users)
    .set({
      organizationId: selection.organizationId,
      activeWorkspaceId: selection.workspaceId,
      role: selection.role,
    })
    .where(eq(users.id, userId));
}

export async function ensureUserTenantAccess(
  user: TenantUserRecord,
): Promise<ResolvedTenantAccess> {
  if (!user.organizationId) {
    const role = "owner" as const;

    return db.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizations)
        .values({
          name: user.name || `${user.email}'s Workspace`,
          slug: buildOrganizationSlug(user.name || user.email, user.id),
          region: "global",
        })
        .returning();

      const [workspace] = await tx
        .insert(workspaces)
        .values({
          organizationId: organization.id,
          name: "Default Workspace",
          industry: "Unknown",
        })
        .returning();

      await tx.insert(organizationMemberships).values({
        organizationId: organization.id,
        userId: user.id,
        role,
      });
      await tx.insert(workspaceMemberships).values({
        workspaceId: workspace.id,
        userId: user.id,
        role,
      });
      await tx
        .update(users)
        .set({
          organizationId: organization.id,
          activeWorkspaceId: workspace.id,
          role,
        })
        .where(eq(users.id, user.id));
      await tx.insert(subscriptions).values({
        organizationId: organization.id,
        planKey: "free",
        status: "trialing",
        usageLimit: 100,
        seats: 1,
      });

      return {
        organizationId: organization.id,
        workspaceId: workspace.id,
        role,
      };
    });
  }

  return db.transaction(async (tx) => {
    await ensureLegacyMembershipBackfill(tx, user);
    const memberships = await loadWorkspaceMemberships(tx, user.id);

    if (memberships.length === 0) {
      throw new TenantAccessError(
        "No workspace access is configured for this account.",
        403,
        "no_workspace_access",
      );
    }

    const selected =
      memberships.find((membership) => membership.workspaceId === user.activeWorkspaceId) ??
      (memberships.length === 1 ? memberships[0] : null);

    if (!selected) {
      await tx
        .update(users)
        .set({
          activeWorkspaceId: null,
        })
        .where(eq(users.id, user.id));

      throw new TenantAccessError(
        "Select a workspace before continuing.",
        409,
        "workspace_selection_required",
      );
    }

    const access = {
      organizationId: selected.organizationId,
      workspaceId: selected.workspaceId,
      role: coerceMembershipRole(selected.role),
    } satisfies ResolvedTenantAccess;

    if (
      user.activeWorkspaceId !== access.workspaceId ||
      user.organizationId !== access.organizationId ||
      user.role !== access.role
    ) {
      await persistActiveWorkspaceSelection(tx, user.id, access);
    }

    return access;
  });
}

export async function listWorkspaceMembershipsForUser(
  user: TenantUserRecord,
): Promise<WorkspaceMembershipSummary[]> {
  if (!user.organizationId) {
    await ensureUserTenantAccess(user);
  }

  return db.transaction(async (tx) => {
    if (user.organizationId) {
      await ensureLegacyMembershipBackfill(tx, user);
    }

    const memberships = await loadWorkspaceMemberships(tx, user.id);
    if (memberships.length === 0) {
      throw new TenantAccessError(
        "No workspace access is configured for this account.",
        403,
        "no_workspace_access",
      );
    }

    const [freshUser] = await tx
      .select({
        activeWorkspaceId: users.activeWorkspaceId,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    return memberships.map((membership) => ({
      organizationId: membership.organizationId,
      organizationName: membership.organizationName,
      workspaceId: membership.workspaceId,
      workspaceName: membership.workspaceName,
      role: coerceMembershipRole(membership.role),
      active: membership.workspaceId === freshUser?.activeWorkspaceId,
    }));
  });
}

export async function selectActiveWorkspaceForUser(
  userId: string,
  workspaceId: string,
): Promise<ResolvedTenantAccess> {
  const [membership] = await db
    .select({
      organizationId: workspaces.organizationId,
      workspaceId: workspaceMemberships.workspaceId,
      role: workspaceMemberships.role,
    })
    .from(workspaceMemberships)
    .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.id))
    .innerJoin(
      organizationMemberships,
      and(
        eq(organizationMemberships.userId, workspaceMemberships.userId),
        eq(organizationMemberships.organizationId, workspaces.organizationId),
      ),
    )
    .where(
      and(
        eq(workspaceMemberships.userId, userId),
        eq(workspaceMemberships.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new TenantAccessError(
      "Workspace access is not available for this account.",
      403,
      "workspace_access_denied",
    );
  }

  const access = {
    organizationId: membership.organizationId,
    workspaceId: membership.workspaceId,
    role: coerceMembershipRole(membership.role),
  } satisfies ResolvedTenantAccess;

  await persistActiveWorkspaceSelection(db, userId, access);
  return access;
}

function toWorkspaceInvitationSummary(row: {
  id: string;
  email: string;
  role: string;
  status: string;
  workspaceId: string;
  workspaceName: string;
  organizationId: string;
  organizationName: string;
  invitedByName: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
}): WorkspaceInvitationSummary {
  return {
    id: row.id,
    email: row.email,
    role: coerceMembershipRole(row.role),
    status: row.status as WorkspaceInvitationSummary["status"],
    workspaceId: row.workspaceId,
    workspaceName: row.workspaceName,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    invitedByName: row.invitedByName ?? "Workspace owner",
    expiresAt: row.expiresAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
  };
}

async function expireWorkspaceInvitations(invitationIds: string[]) {
  if (invitationIds.length === 0) {
    return;
  }

  await db
    .update(workspaceInvitations)
    .set({
      status: "expired",
      updatedAt: new Date(),
    })
    .where(inArray(workspaceInvitations.id, invitationIds));
}

export async function listWorkspaceTeamMembersForActor(
  actor: TeamActorContext,
): Promise<WorkspaceTeamMemberSummary[]> {
  const members = await db
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      workspaceRole: workspaceMemberships.role,
      organizationRole: organizationMemberships.role,
      activeWorkspaceId: users.activeWorkspaceId,
    })
    .from(workspaceMemberships)
    .innerJoin(users, eq(workspaceMemberships.userId, users.id))
    .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.id))
    .innerJoin(
      organizationMemberships,
      and(
        eq(organizationMemberships.userId, users.id),
        eq(organizationMemberships.organizationId, workspaces.organizationId),
      ),
    )
    .where(eq(workspaceMemberships.workspaceId, actor.workspaceId))
    .orderBy(asc(users.createdAt), asc(users.id));

  return members.map((member) => ({
    userId: member.userId,
    email: member.email,
    displayName: member.displayName,
    workspaceRole: coerceMembershipRole(member.workspaceRole),
    organizationRole: coerceMembershipRole(member.organizationRole),
    activeWorkspace: member.activeWorkspaceId === actor.workspaceId,
    currentUser: member.userId === actor.id,
  }));
}

export async function listWorkspaceInvitationsForActor(
  actor: TeamActorContext,
): Promise<WorkspaceInvitationSummary[]> {
  const rows = await db
    .select({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      status: workspaceInvitations.status,
      workspaceId: workspaceInvitations.workspaceId,
      workspaceName: workspaces.name,
      organizationId: organizations.id,
      organizationName: organizations.name,
      invitedByName: users.displayName,
      expiresAt: workspaceInvitations.expiresAt,
      acceptedAt: workspaceInvitations.acceptedAt,
    })
    .from(workspaceInvitations)
    .innerJoin(workspaces, eq(workspaceInvitations.workspaceId, workspaces.id))
    .innerJoin(organizations, eq(workspaces.organizationId, organizations.id))
    .innerJoin(users, eq(workspaceInvitations.invitedByUserId, users.id))
    .where(eq(workspaceInvitations.workspaceId, actor.workspaceId))
    .orderBy(desc(workspaceInvitations.createdAt));

  const now = Date.now();
  const expiredIds = rows
    .filter((row) => row.status === "pending" && row.expiresAt.getTime() < now)
    .map((row) => row.id);

  if (expiredIds.length > 0) {
    await expireWorkspaceInvitations(expiredIds);
  }

  return rows
    .filter((row) => row.status === "pending" && row.expiresAt.getTime() >= now)
    .map((row) => toWorkspaceInvitationSummary(row));
}

export async function createWorkspaceInvitationForActor(
  actor: TeamActorContext,
  input: {
    email: string;
    role: MembershipRole;
  },
): Promise<CreateWorkspaceInvitationResult> {
  const email = input.email.trim().toLowerCase();
  const role = coerceMembershipRole(input.role);

  if (email === actor.email.trim().toLowerCase()) {
    throw new TenantAccessError(
      "This account already belongs to the active workspace.",
      409,
      "workspace_member_exists",
    );
  }

  const [workspaceContext] = await db
    .select({
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      organizationId: organizations.id,
      organizationName: organizations.name,
    })
    .from(workspaces)
    .innerJoin(organizations, eq(workspaces.organizationId, organizations.id))
    .where(
      and(
        eq(workspaces.id, actor.workspaceId),
        eq(organizations.id, actor.organizationId),
      ),
    )
    .limit(1);

  if (!workspaceContext) {
    throw new TenantAccessError(
      "Active workspace could not be resolved for invites.",
      404,
      "workspace_not_found",
    );
  }

  const existingMembers = await db
    .select({
      userId: users.id,
    })
    .from(workspaceMemberships)
    .innerJoin(users, eq(workspaceMemberships.userId, users.id))
    .where(
      and(
        eq(workspaceMemberships.workspaceId, actor.workspaceId),
        eq(users.email, email),
      ),
    )
    .limit(1);

  if (existingMembers.length > 0) {
    throw new TenantAccessError(
      "That email already has access to the active workspace.",
      409,
      "workspace_member_exists",
    );
  }

  const [pendingInvite] = await db
    .select({
      id: workspaceInvitations.id,
      expiresAt: workspaceInvitations.expiresAt,
    })
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.workspaceId, actor.workspaceId),
        eq(workspaceInvitations.email, email),
        eq(workspaceInvitations.status, "pending"),
      ),
    )
    .orderBy(desc(workspaceInvitations.createdAt))
    .limit(1);

  if (pendingInvite) {
    if (pendingInvite.expiresAt.getTime() >= Date.now()) {
      throw new TenantAccessError(
        "A pending invite already exists for that email.",
        409,
        "workspace_invite_exists",
      );
    }

    await expireWorkspaceInvitations([pendingInvite.id]);
  }

  const rawToken = generateInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  const [invitation] = await db
    .insert(workspaceInvitations)
    .values({
      organizationId: workspaceContext.organizationId,
      workspaceId: workspaceContext.workspaceId,
      invitedByUserId: actor.id,
      email,
      role,
      tokenHash,
      status: "pending",
      expiresAt,
    })
    .returning({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      status: workspaceInvitations.status,
      workspaceId: workspaceInvitations.workspaceId,
      expiresAt: workspaceInvitations.expiresAt,
      acceptedAt: workspaceInvitations.acceptedAt,
    });

  try {
    const delivery = await sendWorkspaceInvitationEmail({
      email,
      rawToken,
      workspaceName: workspaceContext.workspaceName,
      organizationName: workspaceContext.organizationName,
      invitedByName: actor.name ?? actor.email,
    });

    if (delivery.mode === "unavailable") {
      throw new Error("Invitation delivery is unavailable until outbound email is configured.");
    }

    return {
      invitation: toWorkspaceInvitationSummary({
        ...invitation,
        organizationId: workspaceContext.organizationId,
        organizationName: workspaceContext.organizationName,
        workspaceName: workspaceContext.workspaceName,
        invitedByName: actor.name ?? actor.email,
      }),
      delivery,
    };
  } catch (error) {
    await db.delete(workspaceInvitations).where(eq(workspaceInvitations.id, invitation.id));
    throw error;
  }
}

export async function revokeWorkspaceInvitationForActor(
  actor: TeamActorContext,
  invitationId: string,
): Promise<WorkspaceInvitationSummary> {
  const [invitation] = await db
    .select({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      status: workspaceInvitations.status,
      workspaceId: workspaceInvitations.workspaceId,
      workspaceName: workspaces.name,
      organizationId: organizations.id,
      organizationName: organizations.name,
      invitedByName: users.displayName,
      expiresAt: workspaceInvitations.expiresAt,
      acceptedAt: workspaceInvitations.acceptedAt,
    })
    .from(workspaceInvitations)
    .innerJoin(workspaces, eq(workspaceInvitations.workspaceId, workspaces.id))
    .innerJoin(organizations, eq(workspaces.organizationId, organizations.id))
    .innerJoin(users, eq(workspaceInvitations.invitedByUserId, users.id))
    .where(
      and(
        eq(workspaceInvitations.id, invitationId),
        eq(workspaceInvitations.workspaceId, actor.workspaceId),
      ),
    )
    .limit(1);

  if (!invitation) {
    throw new TenantAccessError("Invitation not found for this workspace.", 404, "invite_not_found");
  }

  if (invitation.status !== "pending") {
    throw new TenantAccessError(
      "Only pending invitations can be revoked.",
      409,
      "invite_not_pending",
    );
  }

  const now = new Date();
  await db
    .update(workspaceInvitations)
    .set({
      status: "revoked",
      revokedAt: now,
      updatedAt: now,
    })
    .where(eq(workspaceInvitations.id, invitation.id));

  return toWorkspaceInvitationSummary({
    ...invitation,
    status: "revoked",
  });
}

export async function acceptWorkspaceInvitationForUser(user: TenantUserRecord, token: string) {
  const email = user.email.trim().toLowerCase();
  const tokenHash = hashInvitationToken(token);
  const [invitation] = await db
    .select({
      id: workspaceInvitations.id,
      organizationId: workspaceInvitations.organizationId,
      workspaceId: workspaceInvitations.workspaceId,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      status: workspaceInvitations.status,
      expiresAt: workspaceInvitations.expiresAt,
    })
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.tokenHash, tokenHash),
        eq(workspaceInvitations.email, email),
      ),
    )
    .limit(1);

  if (!invitation) {
    throw new TenantAccessError("Invitation is invalid for this account.", 404, "invite_not_found");
  }

  if (invitation.status !== "pending") {
    throw new TenantAccessError(
      "This invitation is no longer active.",
      409,
      "invite_not_pending",
    );
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    await expireWorkspaceInvitations([invitation.id]);
    throw new TenantAccessError("This invitation has expired.", 409, "invite_expired");
  }

  const inviteRole = coerceMembershipRole(invitation.role);
  const now = new Date();

  await db.transaction(async (tx) => {
    const [orgMembership] = await tx
      .select({
        id: organizationMemberships.id,
        role: organizationMemberships.role,
      })
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, invitation.organizationId),
          eq(organizationMemberships.userId, user.id),
        ),
      )
      .limit(1);

    if (!orgMembership) {
      await tx.insert(organizationMemberships).values({
        organizationId: invitation.organizationId,
        userId: user.id,
        role: inviteRole,
      });
    } else {
      const nextRole = maxRole(coerceMembershipRole(orgMembership.role), inviteRole);
      if (nextRole !== coerceMembershipRole(orgMembership.role)) {
        await tx
          .update(organizationMemberships)
          .set({
            role: nextRole,
            updatedAt: now,
          })
          .where(eq(organizationMemberships.id, orgMembership.id));
      }
    }

    const [workspaceMembership] = await tx
      .select({
        id: workspaceMemberships.id,
        role: workspaceMemberships.role,
      })
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.workspaceId, invitation.workspaceId),
          eq(workspaceMemberships.userId, user.id),
        ),
      )
      .limit(1);

    if (!workspaceMembership) {
      await tx.insert(workspaceMemberships).values({
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: inviteRole,
      });
    } else {
      const nextRole = maxRole(coerceMembershipRole(workspaceMembership.role), inviteRole);
      if (nextRole !== coerceMembershipRole(workspaceMembership.role)) {
        await tx
          .update(workspaceMemberships)
          .set({
            role: nextRole,
            updatedAt: now,
          })
          .where(eq(workspaceMemberships.id, workspaceMembership.id));
      }
    }

    await tx
      .update(workspaceInvitations)
      .set({
        status: "accepted",
        acceptedAt: now,
        acceptedByUserId: user.id,
        updatedAt: now,
      })
      .where(eq(workspaceInvitations.id, invitation.id));
  });

  const access = await selectActiveWorkspaceForUser(user.id, invitation.workspaceId);
  const memberships = await listWorkspaceMembershipsForUser({
    id: user.id,
    email: user.email,
    name: user.name,
    role: access.role,
    organizationId: access.organizationId,
    activeWorkspaceId: access.workspaceId,
  });

  return {
    ok: true as const,
    access,
    memberships,
  };
}

export async function backfillWorkspaceMembershipsForUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return;
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.displayName,
      role: users.role,
      organizationId: users.organizationId,
      activeWorkspaceId: users.activeWorkspaceId,
    })
    .from(users)
    .where(inArray(users.id, userIds));

  for (const user of rows) {
    if (!user.organizationId) {
      continue;
    }

    await db.transaction(async (tx) => {
      await ensureLegacyMembershipBackfill(tx, user);
    });
  }
}
