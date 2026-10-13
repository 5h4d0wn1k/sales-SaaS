import { NextResponse } from "next/server";
import { buildWebReleaseMetadata } from "@/lib/release";
import webPackage from "../../package.json";

export const dynamic = "force-dynamic";

type ApiReadinessPayload = {
  status?: string;
  service?: string;
  blockers?: unknown;
  warnings?: unknown;
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
const PLACEHOLDER_API_HOST_PATTERNS = [
  /^localhost$/i,
  /^127(?:\.\d{1,3}){3}$/i,
  /^\[?::1\]?$/i,
  /(^|\.)example\.(com|org|net)$/i,
  /\.example$/i,
  /\.test$/i,
  /\.invalid$/i,
];

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

function stringDetails(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((detail): detail is string => typeof detail === "string").slice(0, 12);
}

function authSecretReadiness(environment: string) {
  const authSecret = process.env.AUTH_SECRET?.trim() ?? "";

  if (!authSecret) {
    return {
      status: environment === "production" ? "blocked" : "warning",
      detail:
        environment === "production"
          ? "AUTH_SECRET is required before web can serve production traffic."
          : "AUTH_SECRET is not configured for local or test readiness.",
    };
  }

  const looksInsecure =
    authSecret.length < AUTH_SECRET_MIN_LENGTH ||
    INSECURE_AUTH_SECRET_PATTERNS.some((pattern) => pattern.test(authSecret));

  if (environment === "production" && looksInsecure) {
    return {
      status: "blocked",
      detail:
        "Production AUTH_SECRET must be a non-placeholder secret with at least 32 characters.",
    };
  }

  if (looksInsecure) {
    return {
      status: "warning",
      detail:
        "AUTH_SECRET is configured for local or test use, but production requires a non-placeholder secret with at least 32 characters.",
    };
  }

  return {
    status: "ready",
    detail: "Auth session secret is configured with production-safe length and placeholder checks.",
  };
}

function apiUrlReadiness(environment: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";

  if (!apiUrl) {
    return {
      status: environment === "production" ? "blocked" : "warning",
      detail:
        environment === "production"
          ? "NEXT_PUBLIC_API_URL is required before web can serve production traffic."
          : "NEXT_PUBLIC_API_URL is not configured; local readiness will fall back to localhost.",
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(apiUrl);
  } catch {
    return {
      status: environment === "production" ? "blocked" : "warning",
      detail: "NEXT_PUBLIC_API_URL must be a valid absolute URL.",
    };
  }

  const hostLooksPlaceholder = PLACEHOLDER_API_HOST_PATTERNS.some((pattern) =>
    pattern.test(parsedUrl.hostname)
  );
  const productionUnsafe =
    parsedUrl.protocol !== "https:" || hostLooksPlaceholder || parsedUrl.username || parsedUrl.password;

  if (environment === "production" && productionUnsafe) {
    return {
      status: "blocked",
      detail:
        "Production NEXT_PUBLIC_API_URL must be a real HTTPS API origin, not localhost, credentials, or a reserved example host.",
    };
  }

  if (productionUnsafe) {
    return {
      status: "warning",
      detail:
        "NEXT_PUBLIC_API_URL is acceptable for local use, but production requires a real HTTPS API origin.",
    };
  }

  return {
    status: "ready",
    detail: "API origin is configured with a production-safe URL.",
  };
}

async function fetchApiReadiness() {
  const response = await fetch(`${apiBaseUrl().replace(/\/$/, "")}/ready`, {
    cache: "no-store",
    signal: AbortSignal.timeout(2500),
  });
  const payload = (await response.json().catch(() => ({}))) as ApiReadinessPayload;
  const blockerDetails = stringDetails(payload.blockers);
  const warningDetails = stringDetails(payload.warnings);

  return {
    ok: response.ok && payload.status === "ready",
    statusCode: response.status,
    status: payload.status ?? "unknown",
    service: payload.service ?? "unknown",
    blockers: blockerDetails.length,
    warnings: warningDetails.length,
    blockerDetails,
    warningDetails,
  };
}

export async function GET() {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const environment = process.env.NODE_ENV || "development";
  const authSecret = authSecretReadiness(environment);
  const apiUrl = apiUrlReadiness(environment);

  if (apiUrl.status === "blocked") {
    blockers.push(apiUrl.detail);
  }

  if (authSecret.status === "blocked") {
    blockers.push(authSecret.detail);
  }

  if (apiUrl.status === "warning") {
    warnings.push(apiUrl.detail);
  }

  if (authSecret.status === "warning") {
    warnings.push(authSecret.detail);
  }

  let api = {
    ok: false,
    statusCode: 0,
    status: "unreachable",
    service: "sales-api",
    blockers: 0,
    warnings: 0,
    blockerDetails: [] as string[],
    warningDetails: [] as string[],
  };

  if (blockers.length === 0) {
    try {
      api = await fetchApiReadiness();
      warnings.push(...api.warningDetails.map((detail) => `API: ${detail}`));

      if (!api.ok) {
        blockers.push("API readiness is not ready.");
        blockers.push(...api.blockerDetails.map((detail) => `API: ${detail}`));
      }
    } catch {
      blockers.push("API readiness endpoint is unreachable.");
    }
  }

  return NextResponse.json(
    {
      status: blockers.length > 0 ? "blocked" : "ready",
      service: "sales-web",
      version: webPackage.version,
      release: buildWebReleaseMetadata(),
      environment,
      generatedAt: new Date().toISOString(),
      checks: {
        web: {
          authSecret,
          apiUrl,
        },
        api,
      },
      blockers,
      warnings,
    },
    {
      status: blockers.length > 0 ? 503 : 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
