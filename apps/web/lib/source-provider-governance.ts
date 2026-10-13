import type { SourceAcquisitionReadinessResponse } from "@sales/shared";

export type SourceProviderGovernanceContext = {
  message: string;
  controlsSummary: string;
  settingsPath: string;
};

type SourceProviderGovernanceControl = {
  id?: unknown;
  label?: unknown;
};

const SOURCE_PROVIDER_GOVERNANCE_CODE = "source_provider_governance_required";
const SETTINGS_PROVIDER_READINESS_PATH = "/settings#provider-readiness";
const MAX_PARAM_LENGTH = 240;
const sourceProviderGovernanceControlIds = new Set([
  "provider_terms_policy",
  "rate_limit_consent_policy",
  "invoice_reconciliation",
  "source_quality_governance",
]);

const fallbackControlLabels: Record<string, string> = {
  provider_terms_policy: "provider terms",
  rate_limit_policy: "rate limits",
  consent_policy: "consent policy",
  invoice_reconciliation: "invoice reconciliation",
  source_quality_governance: "source-quality governance",
};

function safeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PARAM_LENGTH) {
    return null;
  }

  return trimmed;
}

function controlLabel(control: SourceProviderGovernanceControl) {
  const label = safeText(control.label);
  if (label) {
    return label.replace(/^Source-provider\s+/i, "").replace(/^Source-/, "");
  }

  const id = safeText(control.id);
  return id ? fallbackControlLabels[id] ?? id.replace(/_/g, " ") : null;
}

function controlsSummary(labels: string[]) {
  if (labels.length === 0) {
    return "Configure source-provider terms, rate limits, consent, invoice reconciliation, and quality governance before provider-backed evidence runs.";
  }

  return `Missing source governance: ${labels.slice(0, 5).join(", ")}.`;
}

export function buildSourceProviderGovernanceRunGate(
  readiness: SourceAcquisitionReadinessResponse | null | undefined,
): SourceProviderGovernanceContext | null {
  if (!readiness || readiness.summary.configuredSourceProviders === 0) {
    return null;
  }

  const missingControlTitles = readiness.controls
    .filter(
      (control) =>
        sourceProviderGovernanceControlIds.has(control.id) &&
        control.status !== "ready",
    )
    .map((control) => control.title);

  if (missingControlTitles.length === 0) {
    return null;
  }

  return {
    message:
      "Configured source-provider work is blocked until source governance is configured.",
    controlsSummary: controlsSummary(missingControlTitles),
    settingsPath: SETTINGS_PROVIDER_READINESS_PATH,
  };
}

export function normalizeSourceProviderGovernanceError(
  value: unknown,
): SourceProviderGovernanceContext | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    code?: unknown;
    missingControls?: unknown;
  };
  if (candidate.code !== SOURCE_PROVIDER_GOVERNANCE_CODE) {
    return null;
  }

  const labels = Array.isArray(candidate.missingControls)
    ? candidate.missingControls
        .map((control) => controlLabel(control as SourceProviderGovernanceControl))
        .filter((label): label is string => Boolean(label))
    : [];

  return {
    message:
      "Configured source-provider work is blocked until source governance is configured.",
    controlsSummary: controlsSummary(labels),
    settingsPath: SETTINGS_PROVIDER_READINESS_PATH,
  };
}

export function appendSourceProviderGovernanceSearchParams(
  pathname: string,
  prefix: "source" | "discover",
  context: SourceProviderGovernanceContext,
) {
  const url = new URL(pathname, "http://localhost");
  url.searchParams.set(`${prefix}Gate`, "governance");
  url.searchParams.set(`${prefix}Controls`, context.controlsSummary);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function readSourceProviderGovernanceSearchParams(
  searchParams: Record<string, string | undefined> | null | undefined,
  prefix: "source" | "discover",
): SourceProviderGovernanceContext | null {
  if (!searchParams || searchParams[`${prefix}Gate`] !== "governance") {
    return null;
  }

  return {
    message:
      "Configured source-provider work is blocked until source governance is configured.",
    controlsSummary:
      safeText(searchParams[`${prefix}Controls`]) ??
      controlsSummary([]),
    settingsPath: SETTINGS_PROVIDER_READINESS_PATH,
  };
}
