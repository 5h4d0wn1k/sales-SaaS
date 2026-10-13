import { describe, expect, it } from "vitest";
import {
  getAllowedFrontendOrigins,
  isAllowedFrontendReturnUrl,
  isOriginOnlyUrl,
  normalizeHttpOrigin,
} from "../src/frontend-origin";

describe("frontend origin helpers", () => {
  it("normalizes frontend URLs to browser origin strings", () => {
    expect(normalizeHttpOrigin("https://app.winrate.ai/")).toBe(
      "https://app.winrate.ai",
    );
    expect(normalizeHttpOrigin("https://app.winrate.ai/settings?tab=billing")).toBe(
      "https://app.winrate.ai",
    );
    expect(normalizeHttpOrigin("javascript:alert(1)")).toBeNull();
    expect(normalizeHttpOrigin("not a url")).toBeNull();
  });

  it("distinguishes origin-only deployment values from paths or fragments", () => {
    expect(isOriginOnlyUrl("https://app.winrate.ai")).toBe(true);
    expect(isOriginOnlyUrl("https://app.winrate.ai/")).toBe(true);
    expect(isOriginOnlyUrl("https://app.winrate.ai/settings")).toBe(false);
    expect(isOriginOnlyUrl("https://app.winrate.ai?from=deploy")).toBe(false);
    expect(isOriginOnlyUrl("https://user:pass@app.winrate.ai")).toBe(false);
  });

  it("uses normalized origins for checkout return URL allowlists", () => {
    const allowedOrigins = getAllowedFrontendOrigins({
      frontendUrl: "https://app.winrate.ai/",
      environment: "production",
    });

    expect(allowedOrigins).toEqual(new Set(["https://app.winrate.ai"]));
    expect(
      isAllowedFrontendReturnUrl(
        "https://app.winrate.ai/billing/success?session=1",
        allowedOrigins,
      ),
    ).toBe(true);
    expect(
      isAllowedFrontendReturnUrl("https://evil.example/billing/success", allowedOrigins),
    ).toBe(false);
  });
});
