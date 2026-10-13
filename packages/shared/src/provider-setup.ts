import { z } from "zod";
import {
  actionProposalRiskLevelSchema,
  createActionProposalInputSchema,
  providerReadinessStatusSchema,
  type CreateActionProposalInput,
} from "./domain";

const providerSetupKindSchema = z.enum([
  "lead-source",
  "outreach",
  "voice",
  "billing",
  "webhook",
  "chat",
]);

const providerSetupModeSchema = z.enum(["mock", "configured", "disabled"]);

const listValueSchema = z.preprocess((value) => {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return raw.flatMap((entry) =>
    String(entry)
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}, z.array(z.string().trim().min(1).max(160)).default([]));

export const providerSetupRequestInputSchema = z.object({
  provider: z.string().trim().min(2).max(120),
  kind: providerSetupKindSchema,
  mode: providerSetupModeSchema.default("mock"),
  readiness: providerReadinessStatusSchema.default("guarded"),
  channels: listValueSchema,
  missingSecrets: listValueSchema,
  productionBlockers: listValueSchema,
  rolloutGoal: z.string().trim().min(8).max(600),
  businessReason: z.string().trim().min(8).max(800),
});

export type ProviderSetupRequestInput = z.infer<typeof providerSetupRequestInputSchema>;

function providerSetupRisk(input: ProviderSetupRequestInput) {
  if (input.kind === "billing" || input.kind === "webhook" || input.kind === "voice") {
    return "high";
  }

  if (input.readiness === "blocked") {
    return "high";
  }

  return actionProposalRiskLevelSchema.parse("medium");
}

function uniq(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function buildProviderSetupActionProposal(
  input: ProviderSetupRequestInput,
  requestedBy: string,
): CreateActionProposalInput {
  const channels = uniq(input.channels);
  const missingSecrets = uniq(input.missingSecrets);
  const productionBlockers = uniq(input.productionBlockers);
  const providerLabel = `${input.provider} ${input.kind.replace("-", " ")}`;
  const evidence = [
    ...missingSecrets.map((secret) => `Missing deployment secret: ${secret}`),
    ...productionBlockers.map((blocker) => `Production blocker: ${blocker}`),
  ];

  return createActionProposalInputSchema.parse({
    type: "provider_setup",
    riskLevel: providerSetupRisk(input),
    title: `Review ${input.provider} setup`,
    detail:
      `${requestedBy} requested a provider setup review for ${input.provider}. ` +
      `Goal: ${input.rolloutGoal} Business reason: ${input.businessReason}`,
    proposedBy: "operator",
    targetKind: "provider",
    targetId: input.provider,
    targetLabel: providerLabel,
    payloadSummary:
      `Prepare ${input.provider} ${input.kind} setup for ${channels.length > 0 ? channels.join(", ") : "workspace"} use. ` +
      `Current readiness is ${input.readiness}.`,
    payload: {
      provider: input.provider,
      kind: input.kind,
      mode: input.mode,
      readiness: input.readiness,
      channels,
      missingSecrets,
      productionBlockers,
      rolloutGoal: input.rolloutGoal,
      businessReason: input.businessReason,
      liveProviderWork: false,
      secretValuesAccepted: false,
    },
    guardrails: [
      "No raw provider secret values were entered or stored by this request.",
      "Approval does not configure credentials, rotate secrets, bill the customer, or run provider work.",
      "Deployment-owned secret storage or an approved vault must be updated outside the browser before live use.",
      "Provider readiness must be rechecked before any campaign, call, billing, webhook, chat, or source workflow runs.",
      ...evidence.slice(0, 6),
    ],
    expectedEffect:
      "An owner or admin can approve the provider setup plan and keep readiness, blockers, and rollout intent in the audit trail.",
    rollbackPlan:
      "Reject this proposal to leave provider readiness unchanged; remove any separately configured deployment secrets through the deployment or vault owner.",
    requiredRole: input.kind === "billing" ? "owner" : "admin",
    requestedBy,
  });
}
