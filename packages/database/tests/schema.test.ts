import { describe, expect, it } from "vitest";
import { organizations, subscriptions } from "../src/schema";

describe("database schema", () => {
  it("exposes critical SaaS tables", () => {
    expect(organizations[Symbol.for("drizzle:Name")]).toBe("organizations");
    expect(subscriptions[Symbol.for("drizzle:Name")]).toBe("subscriptions");
  });
});
