import { afterEach, describe, expect, it, vi } from "vitest";
import { isTrustedMutationOrigin, rejectCrossOriginMutation } from "../lib/same-origin";

function request(headers: Record<string, string> = {}) {
  return new Request("https://app.winrate.ai/api/campaigns/create", {
    method: "POST",
    headers,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("same-origin mutation guard", () => {
  it("allows requests without origin evidence for privacy-stripped same-site form posts", () => {
    expect(isTrustedMutationOrigin(request())).toBe(true);
  });

  it("allows the current request origin", () => {
    expect(isTrustedMutationOrigin(request({ origin: "https://app.winrate.ai" }))).toBe(true);
  });

  it("allows explicitly configured app origins", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://workspace.winrate.ai");

    expect(isTrustedMutationOrigin(request({ origin: "https://workspace.winrate.ai" }))).toBe(true);
  });

  it("allows non-cross-site fetch metadata without origin evidence", () => {
    expect(isTrustedMutationOrigin(request({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isTrustedMutationOrigin(request({ "sec-fetch-site": "same-site" }))).toBe(true);
    expect(isTrustedMutationOrigin(request({ "sec-fetch-site": "none" }))).toBe(true);
  });

  it("rejects explicit cross-site fetch metadata before trusting missing or spoofed origin evidence", () => {
    expect(isTrustedMutationOrigin(request({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(
      isTrustedMutationOrigin(
        request({
          origin: "https://app.winrate.ai",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(false);
  });

  it("rejects mismatched origin or referer evidence", async () => {
    expect(isTrustedMutationOrigin(request({ origin: "https://evil.example" }))).toBe(false);
    expect(isTrustedMutationOrigin(request({ referer: "https://evil.example/dashboard" }))).toBe(false);

    const response = rejectCrossOriginMutation(request({ origin: "https://evil.example" }));

    expect(response?.status).toBe(403);
    expect(response?.headers.get("cache-control")).toBe("no-store");
    await expect(response?.json()).resolves.toEqual({
      error: "Cross-origin mutation requests are not allowed",
    });
  });
});
