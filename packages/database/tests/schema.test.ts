import { describe, expect, it } from "vitest";
import {
  organizations,
  organizationMemberships,
  subscriptions,
  workspaceInvitations,
  workspaceMemberships,
} from "../src/schema";

describe("database schema", () => {
  it("exposes critical SaaS tables", () => {
    expect(organizations[Symbol.for("drizzle:Name")]).toBe("organizations");
    expect(subscriptions[Symbol.for("drizzle:Name")]).toBe("subscriptions");
    expect(organizationMemberships[Symbol.for("drizzle:Name")]).toBe("organization_memberships");
    expect(workspaceMemberships[Symbol.for("drizzle:Name")]).toBe("workspace_memberships");
    expect(workspaceInvitations[Symbol.for("drizzle:Name")]).toBe("workspace_invitations");
  });
});
