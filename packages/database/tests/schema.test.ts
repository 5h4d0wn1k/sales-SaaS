import { describe, expect, it } from "vitest";
import {
  aiWorkerRuns,
  aiWorkers,
  contactIntakeSubmissions,
  contactSuppressions,
  actionProposals,
  meetings,
  organizations,
  organizationMemberships,
  salesBlueprints,
  subscriptions,
  telegramIntegrations,
  telegramNotificationDeliveries,
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
    expect(contactIntakeSubmissions[Symbol.for("drizzle:Name")]).toBe(
      "contact_intake_submissions",
    );
    expect(contactSuppressions[Symbol.for("drizzle:Name")]).toBe("contact_suppressions");
    expect(telegramIntegrations[Symbol.for("drizzle:Name")]).toBe("telegram_integrations");
    expect(telegramNotificationDeliveries[Symbol.for("drizzle:Name")]).toBe(
      "telegram_notification_deliveries",
    );
    expect(salesBlueprints[Symbol.for("drizzle:Name")]).toBe("sales_blueprints");
    expect(actionProposals[Symbol.for("drizzle:Name")]).toBe("action_proposals");
    expect(aiWorkers[Symbol.for("drizzle:Name")]).toBe("ai_workers");
    expect(aiWorkerRuns[Symbol.for("drizzle:Name")]).toBe("ai_worker_runs");
    expect(meetings.dealValueCents.name).toBe("deal_value_cents");
    expect(meetings.dealCurrency.name).toBe("deal_currency");
  });
});
