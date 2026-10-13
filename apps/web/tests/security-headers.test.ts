import { describe, expect, it } from "vitest";
import nextConfig, {
  buildWebSecurityHeaders,
  webSecurityHeaders,
} from "../next.config";

function headerValue(key: string) {
  return webSecurityHeaders.find((header) => header.key === key)?.value;
}

describe("web security headers", () => {
  it("applies the security header policy to every web route", async () => {
    const routes = await nextConfig.headers?.();

    expect(routes).toHaveLength(1);
    expect(routes?.[0]).toMatchObject({
      source: "/:path*",
      headers: [...webSecurityHeaders],
    });
  });

  it("blocks framing and object embedding in the content security policy", () => {
    const csp = headerValue("Content-Security-Policy");

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(headerValue("X-Frame-Options")).toBe("DENY");
  });

  it("allows eval only for local Next development tooling", () => {
    const developmentCsp = buildWebSecurityHeaders({ allowUnsafeEval: true }).find(
      (header) => header.key === "Content-Security-Policy",
    )?.value;

    expect(developmentCsp).toContain(
      "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com 'unsafe-eval'",
    );
    expect(headerValue("Content-Security-Policy")).toContain(
      "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
    );
    expect(headerValue("Content-Security-Policy")).not.toContain("'unsafe-eval'");
  });

  it("allows the configured Razorpay checkout script without opening arbitrary scripts", () => {
    const csp = headerValue("Content-Security-Policy");

    expect(csp).toContain("script-src");
    expect(csp).toContain("https://checkout.razorpay.com");
    expect(csp).not.toContain("https://*.razorpay.com");
  });

  it("ships baseline browser hardening headers", () => {
    expect(headerValue("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(headerValue("X-Content-Type-Options")).toBe("nosniff");
    expect(headerValue("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerValue("Permissions-Policy")).toContain("camera=()");
    expect(headerValue("Permissions-Policy")).toContain("microphone=()");
    expect(headerValue("Permissions-Policy")).toContain("geolocation=()");
  });
});
