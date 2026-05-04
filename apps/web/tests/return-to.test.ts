import { describe, expect, it } from "vitest";
import { appendStatusParam, resolveReturnTo } from "../lib/return-to";

describe("return-to helpers", () => {
  it("keeps relative in-app return targets and rejects unsafe redirects", () => {
    expect(resolveReturnTo("/billing?tab=history", "/dashboard")).toBe("/billing?tab=history");
    expect(resolveReturnTo("https://evil.example.com", "/dashboard")).toBe("/dashboard");
    expect(resolveReturnTo("//evil.example.com", "/dashboard")).toBe("/dashboard");
  });

  it("appends status parameters without dropping the existing path", () => {
    expect(appendStatusParam("/billing?tab=history", "workspace", "switched")).toBe(
      "/billing?tab=history&workspace=switched",
    );
  });
});
