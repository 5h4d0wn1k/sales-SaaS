import { beforeAll, afterAll } from "vitest";

// Keep production env guards strict while giving local/CI tests deterministic defaults.
process.env.NODE_ENV ||= "test";
process.env.AUTH_SECRET ||= "sales-aaas-test-auth-secret";
process.env.ALLOW_TEST_AUTH_BYPASS ||= "true";

// Test database configuration (only for tests that actually need DB)
// Integration tests can set DATABASE_URL before running
let dbInitialized = false;

beforeAll(async () => {
  // Only try to connect if DATABASE_URL is set
  if (process.env.DATABASE_URL && !dbInitialized) {
    // Lazy-load Drizzle only if DB test is needed
    try {
      const { db } = await import("@sales/database");
      // Could push schema here if needed: await db.push();
      dbInitialized = true;
      console.log("Database connection established for tests");
    } catch (error) {
      console.warn("Database not available for tests:", error);
    }
  }
});

// Global test utilities
export const testUtils = {
  generateId: () => crypto.randomUUID(),
  randomEmail: () => `test-${Date.now()}@example.com`,
  randomString: (length = 10) => Math.random().toString(36).slice(2, length + 2),
  async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
