import { eq } from "drizzle-orm";
import {
  db,
  campaigns,
  callTasks,
  leads,
  outreachActivities,
  workspaces,
} from "@sales/database";

type ProviderWebhookTargetKind = "activity" | "call";

export type ProviderWebhookTarget = {
  kind: ProviderWebhookTargetKind;
  id: string;
  organizationId: string;
};

function resolveUniqueProviderWebhookTarget(
  provider: string,
  externalId: string,
  kind: ProviderWebhookTargetKind,
  rows: Array<{ id: string; organizationId: string }>,
) {
  if (rows.length === 0) {
    return null;
  }

  if (rows.length > 1) {
    console.error(
      `Provider webhook target is ambiguous for ${provider}:${externalId}; refusing to update multiple ${kind} records.`,
    );
    return null;
  }

  return {
    kind,
    id: rows[0].id,
    organizationId: rows[0].organizationId,
  } satisfies ProviderWebhookTarget;
}

export async function findUniqueResendWebhookTarget(externalId: string) {
  const rows = await db
    .select({
      id: outreachActivities.id,
      organizationId: workspaces.organizationId,
    })
    .from(outreachActivities)
    .innerJoin(campaigns, eq(outreachActivities.campaignId, campaigns.id))
    .innerJoin(workspaces, eq(campaigns.workspaceId, workspaces.id))
    .where(eq(outreachActivities.providerMessageId, externalId))
    .limit(2);

  return resolveUniqueProviderWebhookTarget("resend", externalId, "activity", rows);
}

export async function findUniqueTwilioWebhookTarget(callSid: string) {
  const rows = await db
    .select({
      id: callTasks.id,
      organizationId: workspaces.organizationId,
    })
    .from(callTasks)
    .innerJoin(leads, eq(callTasks.leadId, leads.id))
    .innerJoin(workspaces, eq(leads.workspaceId, workspaces.id))
    .where(eq(callTasks.providerCallId, callSid))
    .limit(2);

  return resolveUniqueProviderWebhookTarget("twilio", callSid, "call", rows);
}
