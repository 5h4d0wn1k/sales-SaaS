import { afterEach, describe, expect, it, vi } from "vitest";

async function loadRoute() {
  vi.resetModules();
  return import("../app/.well-known/security.txt/route");
}

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("security.txt route", () => {
  it("serves responsible disclosure metadata without claiming a bounty program", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T00:00:00.000Z"));
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://salesxgrowth.com");

    const { GET } = await loadRoute();
    const response = GET();
    const body = await response.text();

    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(body).toContain("Contact: mailto:hello@salesxgrowth.com");
    expect(body).toContain("Expires: 2026-12-02T00:00:00.000Z");
    expect(body).toContain("Canonical: https://salesxgrowth.com/.well-known/security.txt");
    expect(body).toContain("Policy: https://salesxgrowth.com/trust");
    expect(body).toContain("Preferred-Languages: en");
    expect(body.toLowerCase()).not.toContain("bug bounty");
    expect(body.toLowerCase()).not.toContain("safe harbor");
  });
});
