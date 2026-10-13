import type { ProviderSummary } from "@sales/shared";
import { clientIpProxyHeadersTrusted } from "./client-ip";
import { isOriginOnlyUrl, normalizeHttpOrigin } from "./frontend-origin";
import { buildApiReleaseMetadata, type ReleaseMetadata } from "./release";
import type { SalesStorage } from "./storage";

type ReadinessCheckStatus = "ready" | "warning" | "blocked";

type ReadinessCheck = {
  id: string;
  status: ReadinessCheckStatus;
  detail: string;
};

const AUTH_SECRET_MIN_LENGTH = 32;
const INSECURE_AUTH_SECRET_PATTERNS = [
  /your-secret/i,
  /change.*production/i,
  /change-me/i,
  /placeholder/i,
  /dummy/i,
  /test-auth-secret/i,
];
const PLACEHOLDER_FRONTEND_HOST_PATTERNS = [
  /^localhost$/i,
  /^127(?:\.\d{1,3}){3}$/i,
  /^\[?::1\]?$/i,
  /(^|\.)example\.(com|org|net)$/i,
  /\.example$/i,
  /\.test$/i,
  /\.invalid$/i,
];

export type ApiReadiness = {
  status: "ready" | "blocked";
  service: "sales-api";
  release: ReleaseMetadata;
  environment: string;
  generatedAt: string;
  checks: {
    core: ReadinessCheck[];
    providers: {
      status: "ready" | "warning";
      configured: number;
      guarded: number;
      blocked: number;
      disabled: number;
      productionBlockerCount: number;
    };
  };
  blockers: string[];
  warnings: string[];
};

function runtimeEnvironment() {
  return process.env.NODE_ENV || "development";
}

function storageReadinessCheck(
  storageMode: SalesStorage["mode"],
  environment: string,
): ReadinessCheck {
  const productionRequiresPostgres = environment === "production";

  if (productionRequiresPostgres && storageMode !== "postgres") {
    return {
      id: "storage",
      status: "blocked",
      detail: "Production API readiness requires Postgres storage; memory storage is demo-only.",
    };
  }

  return {
    id: "storage",
    status: storageMode === "postgres" ? "ready" : "warning",
    detail:
      storageMode === "postgres"
        ? "Durable Postgres storage is active."
        : "Memory storage is active for local or demo mode only.",
  };
}

function authSecretReadinessCheck(
  authSecret: string | null | undefined,
  environment: string,
): ReadinessCheck {
  const normalizedSecret = authSecret?.trim() ?? "";

  if (!normalizedSecret) {
    return {
      id: "auth-secret",
      status: "blocked",
      detail: "AUTH_SECRET is required before the API can serve authenticated traffic.",
    };
  }

  const looksInsecure =
    normalizedSecret.length < AUTH_SECRET_MIN_LENGTH ||
    INSECURE_AUTH_SECRET_PATTERNS.some((pattern) => pattern.test(normalizedSecret));

  if (environment === "production" && looksInsecure) {
    return {
      id: "auth-secret",
      status: "blocked",
      detail:
        "Production AUTH_SECRET must be a non-placeholder secret with at least 32 characters.",
    };
  }

  if (looksInsecure) {
    return {
      id: "auth-secret",
      status: "warning",
      detail:
        "AUTH_SECRET is configured for local or test use, but production requires a non-placeholder secret with at least 32 characters.",
    };
  }

  return {
    id: "auth-secret",
    status: "ready",
    detail: "Auth session secret is configured with production-safe length and placeholder checks.",
  };
}

function frontendUrlReadinessCheck(
  frontendUrl: string | null | undefined,
  environment: string,
): ReadinessCheck {
  const normalizedUrl = frontendUrl?.trim() ?? "";

  if (!normalizedUrl) {
    return {
      id: "frontend-url",
      status: environment === "production" ? "blocked" : "warning",
      detail:
        environment === "production"
          ? "FRONTEND_URL is required before API CORS, checkout redirects, and lifecycle links can serve production traffic."
          : "FRONTEND_URL is not configured; local flows will fall back to localhost links.",
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return {
      id: "frontend-url",
      status: environment === "production" ? "blocked" : "warning",
      detail: "FRONTEND_URL must be a valid absolute URL.",
    };
  }

  const hostLooksPlaceholder = PLACEHOLDER_FRONTEND_HOST_PATTERNS.some((pattern) =>
    pattern.test(parsedUrl.hostname)
  );
  const productionUnsafe =
    parsedUrl.protocol !== "https:" ||
    hostLooksPlaceholder ||
    !isOriginOnlyUrl(normalizedUrl);

  if (environment === "production" && productionUnsafe) {
    return {
      id: "frontend-url",
      status: "blocked",
      detail:
        "Production FRONTEND_URL must be a real HTTPS application origin, not localhost, credentials, paths, query strings, fragments, or a reserved example host.",
    };
  }

  if (productionUnsafe) {
    return {
      id: "frontend-url",
      status: "warning",
      detail:
        "FRONTEND_URL is acceptable for local use, but production requires a real HTTPS application origin.",
    };
  }

  return {
    id: "frontend-url",
    status: "ready",
    detail: `Frontend origin ${normalizeHttpOrigin(normalizedUrl)} is configured for CORS, checkout redirects, and lifecycle links.`,
  };
}

function productionRateLimitsExternallyEnforced() {
  return (
    process.env.DURABLE_RATE_LIMITS_ENABLED === "true" ||
    process.env.RATE_LIMIT_BACKEND === "durable" ||
    process.env.RATE_LIMIT_BACKEND === "edge"
  );
}

function rateLimitReadinessCheck(
  environment: string,
  externallyEnforced: boolean,
): ReadinessCheck {
  if (environment !== "production") {
    return {
      id: "rate-limits",
      status: "ready",
      detail: "Process-local API rate limits are acceptable for local and test mode.",
    };
  }

  if (externallyEnforced) {
    return {
      id: "rate-limits",
      status: "ready",
      detail: "Production rate limiting is configured outside the process-local fallback.",
    };
  }

  return {
    id: "rate-limits",
    status: "blocked",
    detail:
      "Global, auth lifecycle, and public intake rate limits are process-local; configure edge/WAF or durable rate limiting before horizontal production scale.",
  };
}

function clientIpHeaderReadinessCheck(
  environment: string,
  externallyEnforced: boolean,
): ReadinessCheck {
  if (environment !== "production") {
    return {
      id: "client-ip-headers",
      status: "ready",
      detail: "Forwarded client IP headers are trusted in local and test mode.",
    };
  }

  if (externallyEnforced) {
    return {
      id: "client-ip-headers",
      status: "ready",
      detail: "External edge or durable rate limiting owns production client identity before the API fallback.",
    };
  }

  if (clientIpProxyHeadersTrusted(environment)) {
    return {
      id: "client-ip-headers",
      status: "ready",
      detail:
        "Production API is configured to trust proxy client-IP headers; ingress must strip or overwrite spoofed forwarding headers.",
    };
  }

  return {
    id: "client-ip-headers",
    status: "warning",
    detail:
      "Production API does not trust forwarded client-IP headers without RATE_LIMIT_TRUST_PROXY_HEADERS=true; anonymous fallback buckets are conservative until an edge or trusted proxy is configured.",
  };
}

export function buildApiReadiness(input: {
  storageMode: SalesStorage["mode"];
  providerSummary: ProviderSummary;
  generatedAt?: Date;
  authSecret?: string | null;
  authSecretConfigured?: boolean;
  frontendUrl?: string | null;
  rateLimitsExternallyEnforced?: boolean;
  environment?: string;
  release?: ReleaseMetadata;
}): ApiReadiness {
  const environment = input.environment ?? runtimeEnvironment();
  const providerBlockers = input.providerSummary.summary.productionBlockers;
  const externallyEnforced =
    input.rateLimitsExternallyEnforced ?? productionRateLimitsExternallyEnforced();
  const core = [
    storageReadinessCheck(input.storageMode, environment),
    authSecretReadinessCheck(
      input.authSecret ?? (
        input.authSecretConfigured === false ? null : process.env.AUTH_SECRET
      ),
      environment,
    ),
    frontendUrlReadinessCheck(input.frontendUrl ?? process.env.FRONTEND_URL, environment),
    rateLimitReadinessCheck(environment, externallyEnforced),
    clientIpHeaderReadinessCheck(environment, externallyEnforced),
  ];
  const blockers = core
    .filter((check) => check.status === "blocked")
    .map((check) => check.detail);
  const warnings = core
    .filter((check) => check.status === "warning")
    .map((check) => check.detail);

  return {
    status: blockers.length > 0 ? "blocked" : "ready",
    service: "sales-api",
    release: input.release ?? buildApiReleaseMetadata(),
    environment,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    checks: {
      core,
      providers: {
        status: providerBlockers.length > 0 ? "warning" : "ready",
        configured: input.providerSummary.summary.configured,
        guarded: input.providerSummary.summary.guarded,
        blocked: input.providerSummary.summary.blocked,
        disabled: input.providerSummary.summary.disabled,
        productionBlockerCount: providerBlockers.length,
      },
    },
    blockers,
    warnings: [...warnings, ...providerBlockers].slice(0, 12),
  };
}
