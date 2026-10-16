import { describe, expect, it } from "vitest";
import {
  getAllowedFrontendOrigins,
  isAllowedFrontendReturnUrl,
  isOriginOnlyUrl,
  normalizeHttpOrigin,
} from "../src/frontend-origin";

describe("frontend origin helpers", () => {
  it("normalizes frontend URLs to browser origin strings", () => {
    expect(normalizeHttpOrigin("https://app.salesxgrowth.com/")).toBe(
      "https://app.salesxgrowth.com",
    );
    expect(normalizeHttpOrigin("https://app.salesxgrowth.com/settings?tab=billing")).toBe(
      "https://app.salesxgrowth.com",
    );
    expect(normalizeHttpOrigin("javascript:alert(1)")).toBeNull();
    expect(normalizeHttpOrigin("not a url")).toBeNull();
  });

  it("distinguishes origin-only deployment values from paths or fragments", () => {
    expect(isOriginOnlyUrl("https://app.salesxgrowth.com")).toBe(true);
    expect(isOriginOnlyUrl("https://app.salesxgrowth.com/")).toBe(true);
    expect(isOriginOnlyUrl("https://app.salesxgrowth.com/settings")).toBe(false);
    expect(isOriginOnlyUrl("https://app.salesxgrowth.com?from=deploy")).toBe(false);
    expect(isOriginOnlyUrl("https://user:pass@app.salesxgrowth.com")).toBe(false);
  });

  it("uses normalized origins for checkout return URL allowlists", () => {
    const allowedOrigins = getAllowedFrontendOrigins({
      frontendUrl: "https://app.salesxgrowth.com/",
      environment: "production",
    });

    expect(allowedOrigins).toEqual(new Set(["https://app.salesxgrowth.com"]));
    expect(
      isAllowedFrontendReturnUrl(
        "https://app.salesxgrowth.com/billing/success?session=1",
        allowedOrigins,
      ),
    ).toBe(true);
    expect(
      isAllowedFrontendReturnUrl("https://evil.example/billing/success", allowedOrigins),
    ).toBe(false);
  });
});
