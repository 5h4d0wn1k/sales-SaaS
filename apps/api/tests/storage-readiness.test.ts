import { describe, expect, it } from "vitest";
import { hasOrganizationsTable } from "../src/storage-readiness";

describe("hasOrganizationsTable", () => {
  it("returns true for node-postgres style results", () => {
    expect(
      hasOrganizationsTable({
        rows: [{ organizations: "organizations" }],
      }),
    ).toBe(true);
  });

  it("returns false when the relation is absent", () => {
    expect(
      hasOrganizationsTable({
        rows: [{ organizations: null }],
      }),
    ).toBe(false);
  });

  it("supports array-shaped fallbacks", () => {
    expect(hasOrganizationsTable([{ organizations: "organizations" }])).toBe(true);
  });
});
