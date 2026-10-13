import { z } from "zod";
import {
  leadRecordSchema,
  providerHealthSchema,
  providerSummarySchema,
  sourcePlanSchema,
  sourceRunProviderModeSchema,
  sourceRunSchema,
  type LeadRecord,
  type ProviderHealth,
  type ProviderSummary,
  type SourcePlan,
  type SourceRun,
} from "./domain";

export const sourceAcquisitionReadinessStatusSchema = z.enum([
  "ready",
  "needs_review",
  "missing",
  "blocked",
]);

export const sourceAcquisitionReadinessToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const sourceAcquisitionReadinessLaneSchema = z.object({
  source: z.string(),
  provider: z.string(),
  planned: z.boolean(),
  status: sourceAcquisitionReadinessStatusSchema,
  tone: sourceAcquisitionReadinessToneSchema,
  providerMode: sourceRunProviderModeSchema.nullable(),
  providerReadiness: providerHealthSchema.shape.readiness.nullable(),
  runCount: z.number().int().min(0),
  latestRunId: z.string().nullable(),
  qualityScore: z.number().int().min(0).max(100),
  acceptanceRatePct: z.number().int().min(0).max(100),
  candidatesFound: z.number().int().min(0),
  acceptedLeads: z.number().int().min(0),
  rejectedCandidates: z.number().int().min(0),
  dedupedCandidates: z.number().int().min(0),
  evidenceSignals: z.number().int().min(0),
  rejectionGroups: z.number().int().min(0),
  complianceChecks: z.number().int().min(0),
  freshness: z.string(),
  detail: z.string(),
  nextAction: z.string(),
  blockers: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
});

export const sourceAcquisitionReadinessControlSchema = z.object({
  id: z.enum([
    "source_plan",
    "source_run_evidence",
    "dedupe_rejection_review",
    "compliance_handoff",
    "provider_posture",
    "provider_terms_policy",
    "rate_limit_consent_policy",
    "invoice_reconciliation",
    "source_quality_governance",
    "production_expansion",
  ]),
  title: z.string(),
  status: sourceAcquisitionReadinessStatusSchema,
  tone: sourceAcquisitionReadinessToneSchema,
  detail: z.string(),
  evidence: z.array(z.string()).default([]),
});

export const sourceAcquisitionReadinessResponseSchema = z.object({
  surface: z.literal("source-acquisition-readiness"),
  version: z.string(),
  generatedAt: z.string(),
  posture: z.enum(["ready", "guarded", "blocked"]),
  summary: z.object({
    plannedSources: z.number().int().min(0),
    runSources: z.number().int().min(0),
    totalRuns: z.number().int().min(0),
    readySources: z.number().int().min(0),
    needsReviewSources: z.number().int().min(0),
    missingSources: z.number().int().min(0),
    blockedSources: z.number().int().min(0),
    configuredSourceProviders: z.number().int().min(0),
    guardedSourceProviders: z.number().int().min(0),
    mockSourceProviders: z.number().int().min(0),
    averageQualityScore: z.number().int().min(0).max(100),
    acceptedLeads: z.number().int().min(0),
    rejectedCandidates: z.number().int().min(0),
    dedupedCandidates: z.number().int().min(0),
    evidenceSignals: z.number().int().min(0),
    complianceChecks: z.number().int().min(0),
    productionBlockers: z.array(z.string()),
  }),
  lanes: z.array(sourceAcquisitionReadinessLaneSchema),
  controls: z.array(sourceAcquisitionReadinessControlSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export const sourceProviderGovernanceConfigSchema = z.object({
  providerTermsConfigured: z.boolean().default(false),
  rateLimitPolicyConfigured: z.boolean().default(false),
  consentPolicyConfigured: z.boolean().default(false),
  invoiceReconciliationConfigured: z.boolean().default(false),
  qualityGovernanceConfigured: z.boolean().default(false),
});

export type SourceAcquisitionReadinessStatus = z.infer<
  typeof sourceAcquisitionReadinessStatusSchema
>;
export type SourceAcquisitionReadinessTone = z.infer<
  typeof sourceAcquisitionReadinessToneSchema
>;
export type SourceAcquisitionReadinessLane = z.infer<
  typeof sourceAcquisitionReadinessLaneSchema
>;
export type SourceAcquisitionReadinessControl = z.infer<
  typeof sourceAcquisitionReadinessControlSchema
>;
export type SourceAcquisitionReadinessResponse = z.infer<
  typeof sourceAcquisitionReadinessResponseSchema
>;
export type SourceProviderGovernanceConfig = z.infer<
  typeof sourceProviderGovernanceConfigSchema
>;

const SOURCE_ALIASES: Array<{ canonical: string; aliases: string[] }> = [
  {
    canonical: "website",
    aliases: ["website", "website-crawler", "site-crawler"],
  },
  {
    canonical: "search",
    aliases: ["search", "search-intelligence", "search-results"],
  },
  {
    canonical: "directory",
    aliases: ["directory", "directory-harvester", "directories"],
  },
  {
    canonical: "csv",
    aliases: ["csv", "csv-import", "spreadsheet"],
  },
];

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function canonicalSource(value: string) {
  const normalized = normalize(value);
  return (
    SOURCE_ALIASES.find((entry) => entry.aliases.includes(normalized))
      ?.canonical ?? normalized
  );
}

function aliasesFor(value: string) {
  const canonical = canonicalSource(value);
  return (
    SOURCE_ALIASES.find((entry) => entry.canonical === canonical)?.aliases ?? [
      canonical,
    ]
  );
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function toneForStatus(
  status: SourceAcquisitionReadinessStatus,
): SourceAcquisitionReadinessTone {
  if (status === "ready") {
    return "good";
  }

  if (status === "blocked") {
    return "blocked";
  }

  return "warn";
}

function matchesSource(run: SourceRun, source: string) {
  return aliasesFor(source).includes(normalize(run.source));
}

function providerForSource(source: string, providers: ProviderHealth[]) {
  const aliases = aliasesFor(source);
  return (
    providers.find((provider) =>
      aliases.includes(normalize(provider.provider)),
    ) ?? null
  );
}

function sourceRunProviderMode(provider: ProviderHealth | null) {
  if (!provider) {
    return null;
  }

  return provider.mode === "mock" || provider.mode === "configured"
    ? provider.mode
    : null;
}

function sourceLeads(source: string, leads: LeadRecord[]) {
  const aliases = aliasesFor(source);
  return leads.filter((lead) => aliases.includes(normalize(lead.source)));
}

function laneBlockers(input: {
  run: SourceRun | null;
  provider: ProviderHealth | null;
  acceptedLeads: number;
}) {
  const blockers: string[] = [];

  if (!input.run) {
    blockers.push(
      "No source run evidence has been captured for this planned lane.",
    );
    return blockers;
  }

  if (input.run.candidatesFound <= 0) {
    blockers.push("Source run did not review any candidates.");
  }

  if (input.run.qualityScore < 60) {
    blockers.push("Quality score is below the minimum review threshold.");
  }

  if (input.run.evidence.length === 0) {
    blockers.push(
      "Accepted leads need source evidence before outreach handoff.",
    );
  }

  if (input.run.complianceChecks.length === 0) {
    blockers.push("Compliance and suppression handoff checks are missing.");
  }

  if (input.acceptedLeads === 0 && input.run.qualifiedCount === 0) {
    blockers.push("No accepted leads are available for review.");
  }

  if (input.provider?.readiness === "blocked") {
    blockers.push(`${input.provider.provider} has blocked provider readiness.`);
  }

  return blockers;
}

function laneStatus(input: {
  run: SourceRun | null;
  provider: ProviderHealth | null;
  blockers: string[];
  acceptanceRatePct: number;
}) {
  if (!input.run) {
    return "missing" as const;
  }

  if (input.blockers.length > 0) {
    return "blocked" as const;
  }

  if (
    input.run.providerMode === "mock" ||
    input.provider?.readiness !== "configured" ||
    input.run.qualityScore < 80 ||
    input.run.rejectedCount > input.run.qualifiedCount ||
    input.acceptanceRatePct < 40
  ) {
    return "needs_review" as const;
  }

  return "ready" as const;
}

function laneDetail(
  status: SourceAcquisitionReadinessStatus,
  run: SourceRun | null,
) {
  if (!run) {
    return "Planned source lane has not produced reviewable source evidence yet.";
  }

  if (status === "blocked") {
    return "Source lane must be corrected before accepted leads can move into outreach review.";
  }

  if (status === "needs_review") {
    return run.providerMode === "mock"
      ? "Evidence is reviewable, but the lane is still mock-backed and not production-scale."
      : "Evidence is present, but quality, rejection pressure, or provider readiness still needs operator review.";
  }

  return "Evidence, quality, provider readiness, and compliance checks are ready for source-review handoff.";
}

function controlStatus(input: {
  ready: boolean;
  blocked?: boolean;
  missing?: boolean;
  needsReview?: boolean;
}) {
  if (input.blocked) {
    return "blocked" as const;
  }

  if (input.missing) {
    return "missing" as const;
  }

  if (input.needsReview) {
    return "needs_review" as const;
  }

  return input.ready ? ("ready" as const) : ("needs_review" as const);
}

function configuredEvidence(label: string, configured: boolean) {
  return `${label} ${configured ? "configured" : "not configured"}`;
}

function sourceProviderGovernanceBlockers(
  config: SourceProviderGovernanceConfig,
  sourceProviders: ProviderHealth[],
) {
  if (sourceProviders.length === 0) {
    return [];
  }

  const blockers: string[] = [];

  if (!config.providerTermsConfigured) {
    blockers.push(
      "Source-provider terms policy is not configured for live source expansion.",
    );
  }

  if (!config.rateLimitPolicyConfigured) {
    blockers.push(
      "Source-provider rate-limit policy is not configured for live source expansion.",
    );
  }

  if (!config.consentPolicyConfigured) {
    blockers.push(
      "Source-provider consent policy is not configured for live source expansion.",
    );
  }

  if (!config.invoiceReconciliationConfigured) {
    blockers.push(
      "Source-provider invoice reconciliation is not configured for live source expansion.",
    );
  }

  if (!config.qualityGovernanceConfigured) {
    blockers.push(
      "Source-quality governance is not configured for live source expansion.",
    );
  }

  return blockers;
}

export function buildSourceAcquisitionReadiness(input: {
  sourcePlan: SourcePlan | null;
  sourceRuns: SourceRun[];
  leads: LeadRecord[];
  providers: ProviderSummary;
  sourceProviderGovernance?: Partial<SourceProviderGovernanceConfig>;
  generatedAt?: string;
}): SourceAcquisitionReadinessResponse {
  const sourcePlan = input.sourcePlan
    ? sourcePlanSchema.parse(input.sourcePlan)
    : null;
  const sourceRuns = z.array(sourceRunSchema).parse(input.sourceRuns);
  const leads = z.array(leadRecordSchema).parse(input.leads);
  const providers = providerSummarySchema.parse(input.providers);
  const sourceProviderGovernance = sourceProviderGovernanceConfigSchema.parse(
    input.sourceProviderGovernance ?? {},
  );
  const sourceProviders = providers.sources;
  const plannedCanonicalSources = unique(
    (sourcePlan?.sources ?? []).map(canonicalSource),
  );
  const runCanonicalSources = unique(
    sourceRuns.map((run) => canonicalSource(run.source)),
  );
  const laneSources = unique([
    ...plannedCanonicalSources,
    ...runCanonicalSources,
  ]);

  const lanes = laneSources.map((source): SourceAcquisitionReadinessLane => {
    const runs = sourceRuns.filter((run) => matchesSource(run, source));
    const latestRun = runs[0] ?? null;
    const provider = providerForSource(source, sourceProviders);
    const leadsForSource = sourceLeads(source, leads);
    const reviewedCandidates = latestRun
      ? Math.max(0, latestRun.candidatesFound - latestRun.dedupedCount)
      : 0;
    const acceptanceRatePct = latestRun
      ? pct(latestRun.qualifiedCount, reviewedCandidates)
      : 0;
    const blockers = laneBlockers({
      run: latestRun,
      provider,
      acceptedLeads: leadsForSource.length,
    });
    const status = laneStatus({
      run: latestRun,
      provider,
      blockers,
      acceptanceRatePct,
    });

    return {
      source,
      provider: provider?.provider ?? latestRun?.source ?? source,
      planned: plannedCanonicalSources.includes(source),
      status,
      tone: toneForStatus(status),
      providerMode: latestRun?.providerMode ?? sourceRunProviderMode(provider),
      providerReadiness: provider?.readiness ?? null,
      runCount: runs.length,
      latestRunId: latestRun?.id ?? null,
      qualityScore: latestRun?.qualityScore ?? 0,
      acceptanceRatePct,
      candidatesFound: latestRun?.candidatesFound ?? 0,
      acceptedLeads: latestRun?.qualifiedCount ?? leadsForSource.length,
      rejectedCandidates: latestRun?.rejectedCount ?? 0,
      dedupedCandidates: latestRun?.dedupedCount ?? 0,
      evidenceSignals: latestRun?.evidence.length ?? 0,
      rejectionGroups: latestRun?.rejectionReasons.length ?? 0,
      complianceChecks: latestRun?.complianceChecks.length ?? 0,
      freshness: latestRun?.freshness ?? "Not recorded",
      detail: laneDetail(status, latestRun),
      nextAction:
        latestRun?.nextAction ??
        "Run a guarded source pass before outreach review.",
      blockers,
      evidence: latestRun
        ? [
            `${latestRun.evidence.length} evidence signal${latestRun.evidence.length === 1 ? "" : "s"}`,
            `${latestRun.rejectionReasons.length} rejection group${latestRun.rejectionReasons.length === 1 ? "" : "s"}`,
            `${latestRun.complianceChecks.length} compliance check${latestRun.complianceChecks.length === 1 ? "" : "s"}`,
          ]
        : ["No source-run evidence recorded"],
    };
  });

  const readySources = lanes.filter((lane) => lane.status === "ready").length;
  const needsReviewSources = lanes.filter(
    (lane) => lane.status === "needs_review",
  ).length;
  const missingSources = lanes.filter(
    (lane) => lane.status === "missing",
  ).length;
  const blockedSources = lanes.filter(
    (lane) => lane.status === "blocked",
  ).length;
  const configuredSourceProviders = sourceProviders.filter(
    (provider) => provider.readiness === "configured",
  ).length;
  const guardedSourceProviders = sourceProviders.filter(
    (provider) => provider.readiness === "guarded",
  ).length;
  const mockSourceProviders = sourceProviders.filter(
    (provider) => provider.mode === "mock",
  ).length;
  const governanceBlockers = sourceProviderGovernanceBlockers(
    sourceProviderGovernance,
    sourceProviders,
  );
  const productionBlockers = unique([
    ...sourceProviders.flatMap((provider) => provider.productionBlockers),
    ...(sourceProviders.some((provider) => provider.mode === "mock")
      ? [
          "Lead-source adapters are still mock-backed and need production provider integrations before scale.",
        ]
      : []),
    ...governanceBlockers,
  ]);

  const sourcePlanStatus = controlStatus({
    ready: Boolean(
      sourcePlan &&
      sourcePlan.sources.length > 0 &&
      sourcePlan.searchTerms.length > 0,
    ),
    missing: !sourcePlan || sourcePlan.sources.length === 0,
  });
  const evidenceStatus = controlStatus({
    ready: lanes.some(
      (lane) => lane.status === "ready" || lane.status === "needs_review",
    ),
    missing: sourceRuns.length === 0,
    blocked: blockedSources > 0,
  });
  const dedupeStatus = controlStatus({
    ready:
      sourceRuns.length > 0 &&
      sourceRuns.every((run) => run.rejectionReasons.length > 0),
    missing: sourceRuns.length === 0,
    needsReview: sourceRuns.some(
      (run) => run.dedupedCount === 0 || run.rejectionReasons.length === 0,
    ),
  });
  const complianceStatus = controlStatus({
    ready:
      sourceRuns.length > 0 &&
      sourceRuns.every((run) => run.complianceChecks.length > 0),
    missing: sourceRuns.length === 0,
    blocked: sourceRuns.some((run) => run.complianceChecks.length === 0),
  });
  const providerStatus = controlStatus({
    ready: sourceProviders.length > 0 && configuredSourceProviders > 0,
    missing: sourceProviders.length === 0,
    blocked: sourceProviders.some(
      (provider) => provider.readiness === "blocked",
    ),
    needsReview: guardedSourceProviders > 0 || mockSourceProviders > 0,
  });
  const providerTermsStatus = controlStatus({
    ready:
      sourceProviders.length > 0 &&
      sourceProviderGovernance.providerTermsConfigured,
    missing: sourceProviders.length === 0,
    blocked:
      sourceProviders.length > 0 &&
      !sourceProviderGovernance.providerTermsConfigured,
  });
  const rateLimitConsentStatus = controlStatus({
    ready:
      sourceProviders.length > 0 &&
      sourceProviderGovernance.rateLimitPolicyConfigured &&
      sourceProviderGovernance.consentPolicyConfigured,
    missing: sourceProviders.length === 0,
    blocked:
      sourceProviders.length > 0 &&
      (!sourceProviderGovernance.rateLimitPolicyConfigured ||
        !sourceProviderGovernance.consentPolicyConfigured),
  });
  const invoiceReconciliationStatus = controlStatus({
    ready:
      sourceProviders.length > 0 &&
      sourceProviderGovernance.invoiceReconciliationConfigured,
    missing: sourceProviders.length === 0,
    blocked:
      sourceProviders.length > 0 &&
      !sourceProviderGovernance.invoiceReconciliationConfigured,
  });
  const sourceQualityGovernanceStatus = controlStatus({
    ready:
      sourceProviders.length > 0 &&
      sourceProviderGovernance.qualityGovernanceConfigured,
    missing: sourceProviders.length === 0,
    blocked:
      sourceProviders.length > 0 &&
      !sourceProviderGovernance.qualityGovernanceConfigured,
  });
  const productionStatus = controlStatus({
    ready: productionBlockers.length === 0 && configuredSourceProviders > 0,
    blocked: productionBlockers.length > 0,
  });

  const controls: SourceAcquisitionReadinessControl[] = [
    {
      id: "source_plan",
      title: "Source plan coverage",
      status: sourcePlanStatus,
      tone:
        sourcePlanStatus === "missing"
          ? "blocked"
          : toneForStatus(sourcePlanStatus),
      detail:
        sourcePlanStatus === "ready"
          ? "Source plan includes target channels and search terms for governed source runs."
          : "Complete onboarding or regenerate the source plan before source acquisition can scale.",
      evidence: [
        `${sourcePlan?.sources.length ?? 0} planned source${(sourcePlan?.sources.length ?? 0) === 1 ? "" : "s"}`,
        `${sourcePlan?.searchTerms.length ?? 0} search term${(sourcePlan?.searchTerms.length ?? 0) === 1 ? "" : "s"}`,
      ],
    },
    {
      id: "source_run_evidence",
      title: "Source-run evidence",
      status: evidenceStatus,
      tone:
        evidenceStatus === "missing"
          ? "blocked"
          : toneForStatus(evidenceStatus),
      detail:
        sourceRuns.length > 0
          ? "Source runs expose accepted evidence, quality score, and review posture before outreach handoff."
          : "Run at least one guarded source pass before moving leads toward outreach review.",
      evidence: [
        `${sourceRuns.length} source run${sourceRuns.length === 1 ? "" : "s"}`,
        `${lanes.reduce((total, lane) => total + lane.evidenceSignals, 0)} evidence signal${lanes.reduce((total, lane) => total + lane.evidenceSignals, 0) === 1 ? "" : "s"}`,
      ],
    },
    {
      id: "dedupe_rejection_review",
      title: "Dedupe and rejection review",
      status: dedupeStatus,
      tone: toneForStatus(dedupeStatus),
      detail:
        dedupeStatus === "ready"
          ? "Source runs retain dedupe and rejection-group evidence for quality review."
          : "Every source run should record duplicate counts and rejection reasons before scaling volume.",
      evidence: [
        `${lanes.reduce((total, lane) => total + lane.dedupedCandidates, 0)} duplicate candidate${lanes.reduce((total, lane) => total + lane.dedupedCandidates, 0) === 1 ? "" : "s"}`,
        `${lanes.reduce((total, lane) => total + lane.rejectionGroups, 0)} rejection group${lanes.reduce((total, lane) => total + lane.rejectionGroups, 0) === 1 ? "" : "s"}`,
      ],
    },
    {
      id: "compliance_handoff",
      title: "Compliance handoff",
      status: complianceStatus,
      tone: toneForStatus(complianceStatus),
      detail:
        complianceStatus === "ready"
          ? "Compliance and suppression handoff checks are recorded before outreach eligibility."
          : "Source runs need compliance checks and suppression handoff evidence before outreach review.",
      evidence: [
        `${lanes.reduce((total, lane) => total + lane.complianceChecks, 0)} compliance check${lanes.reduce((total, lane) => total + lane.complianceChecks, 0) === 1 ? "" : "s"}`,
      ],
    },
    {
      id: "provider_posture",
      title: "Lead-source provider posture",
      status: providerStatus,
      tone: toneForStatus(providerStatus),
      detail:
        providerStatus === "ready"
          ? "At least one lead-source provider is configured for governed source execution."
          : "Lead-source providers remain guarded or mock-backed and need production integration work before scale.",
      evidence: [
        `${configuredSourceProviders} configured source provider${configuredSourceProviders === 1 ? "" : "s"}`,
        `${guardedSourceProviders} guarded source provider${guardedSourceProviders === 1 ? "" : "s"}`,
        `${mockSourceProviders} mock-backed source provider${mockSourceProviders === 1 ? "" : "s"}`,
      ],
    },
    {
      id: "provider_terms_policy",
      title: "Provider terms policy",
      status: providerTermsStatus,
      tone: toneForStatus(providerTermsStatus),
      detail:
        providerTermsStatus === "ready"
          ? "Source-provider terms policy is documented before external source activation."
          : "Document approved provider terms before activating external source providers.",
      evidence: [
        configuredEvidence(
          "terms policy",
          sourceProviderGovernance.providerTermsConfigured,
        ),
      ],
    },
    {
      id: "rate_limit_consent_policy",
      title: "Rate limits and consent",
      status: rateLimitConsentStatus,
      tone: toneForStatus(rateLimitConsentStatus),
      detail:
        rateLimitConsentStatus === "ready"
          ? "Rate-limit and consent policies are configured for governed source-provider use."
          : "Define provider-specific rate limits and consent posture before live source expansion.",
      evidence: [
        configuredEvidence(
          "rate-limit policy",
          sourceProviderGovernance.rateLimitPolicyConfigured,
        ),
        configuredEvidence(
          "consent policy",
          sourceProviderGovernance.consentPolicyConfigured,
        ),
      ],
    },
    {
      id: "invoice_reconciliation",
      title: "Invoice reconciliation",
      status: invoiceReconciliationStatus,
      tone: toneForStatus(invoiceReconciliationStatus),
      detail:
        invoiceReconciliationStatus === "ready"
          ? "Source-provider cost and invoice reconciliation is configured for expansion review."
          : "Configure source-provider invoice reconciliation before production source expansion.",
      evidence: [
        configuredEvidence(
          "invoice reconciliation",
          sourceProviderGovernance.invoiceReconciliationConfigured,
        ),
      ],
    },
    {
      id: "source_quality_governance",
      title: "Source-quality governance",
      status: sourceQualityGovernanceStatus,
      tone: toneForStatus(sourceQualityGovernanceStatus),
      detail:
        sourceQualityGovernanceStatus === "ready"
          ? "Source-quality governance is configured for dedupe, enrichment, and acceptance review."
          : "Configure source-quality governance before increasing provider-backed source volume.",
      evidence: [
        configuredEvidence(
          "quality governance",
          sourceProviderGovernance.qualityGovernanceConfigured,
        ),
      ],
    },
    {
      id: "production_expansion",
      title: "Production expansion gates",
      status: productionStatus,
      tone:
        productionStatus === "blocked"
          ? "blocked"
          : toneForStatus(productionStatus),
      detail:
        productionStatus === "ready"
          ? "No source-provider expansion blockers are visible in the current readiness evidence."
          : "Live source expansion still needs real provider adapters and configured source-provider governance.",
      evidence: productionBlockers.slice(0, 4),
    },
  ];

  const posture =
    !sourcePlan || sourceRuns.length === 0 || blockedSources > 0
      ? "blocked"
      : readySources === laneSources.length &&
          configuredSourceProviders > 0 &&
          productionBlockers.length === 0
        ? "ready"
        : "guarded";

  return sourceAcquisitionReadinessResponseSchema.parse({
    surface: "source-acquisition-readiness",
    version: "2026-06-05.source-acquisition-readiness",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    posture,
    summary: {
      plannedSources: plannedCanonicalSources.length,
      runSources: runCanonicalSources.length,
      totalRuns: sourceRuns.length,
      readySources,
      needsReviewSources,
      missingSources,
      blockedSources,
      configuredSourceProviders,
      guardedSourceProviders,
      mockSourceProviders,
      averageQualityScore: average(
        lanes
          .filter((lane) => lane.runCount > 0)
          .map((lane) => lane.qualityScore),
      ),
      acceptedLeads: lanes.reduce(
        (total, lane) => total + lane.acceptedLeads,
        0,
      ),
      rejectedCandidates: lanes.reduce(
        (total, lane) => total + lane.rejectedCandidates,
        0,
      ),
      dedupedCandidates: lanes.reduce(
        (total, lane) => total + lane.dedupedCandidates,
        0,
      ),
      evidenceSignals: lanes.reduce(
        (total, lane) => total + lane.evidenceSignals,
        0,
      ),
      complianceChecks: lanes.reduce(
        (total, lane) => total + lane.complianceChecks,
        0,
      ),
      productionBlockers,
    },
    lanes,
    controls,
    guardrails: [
      "Source acquisition readiness is read-only and does not call external lead providers.",
      "Mock-backed source lanes can be reviewable but are not production-scale scraping or enrichment.",
      "Accepted source evidence must still pass approval, suppression, provider, and plan checks before outreach.",
      "Provider terms, rate limits, consent posture, invoice reconciliation, and source-quality governance must be configured before live expansion.",
    ],
    unavailableClaims: [
      "Universal autonomous scraping from every source or platform.",
      "Provider-specific enrichment coverage across all lead channels.",
      "Production-scale source expansion without real adapters, configured provider terms checks, rate-limit controls, consent posture, invoice reconciliation, and source-quality governance.",
      "Automatic outreach from source runs without in-app approval and suppression checks.",
    ],
  });
}
