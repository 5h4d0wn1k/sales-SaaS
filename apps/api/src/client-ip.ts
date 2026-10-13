const UNTRUSTED_PROXY_CLIENT_KEY = "untrusted-proxy";

function configuredBoolean(value: string | undefined) {
  if (!value?.trim()) {
    return null;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function explicitProxyHeaderTrust() {
  return (
    configuredBoolean(process.env.RATE_LIMIT_TRUST_PROXY_HEADERS) ??
    configuredBoolean(process.env.TRUST_PROXY_HEADERS)
  );
}

export function clientIpProxyHeadersTrusted(environment = process.env.NODE_ENV || "development") {
  const explicitTrust = explicitProxyHeaderTrust();

  if (explicitTrust !== null) {
    return explicitTrust;
  }

  return environment !== "production";
}

export function normalizeClientIpFromHeaders(input: {
  forwardedFor?: string | null;
  realIp?: string | null;
  cloudflareConnectingIp?: string | null;
  environment?: string;
  trustProxyHeaders?: boolean;
}) {
  const trustProxyHeaders =
    input.trustProxyHeaders ??
    clientIpProxyHeadersTrusted(input.environment ?? process.env.NODE_ENV ?? "development");

  if (!trustProxyHeaders) {
    return UNTRUSTED_PROXY_CLIENT_KEY;
  }

  const cloudflareClient = input.cloudflareConnectingIp?.trim();
  const forwardedClient = input.forwardedFor?.split(",")[0]?.trim();
  const directClient = input.realIp?.trim();

  return cloudflareClient || forwardedClient || directClient || "unknown";
}
