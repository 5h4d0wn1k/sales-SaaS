import { describe, expect, it } from "vitest";
import { GET } from "../app/health/route";
import webPackage from "../package.json";

type HealthPayload = {
  status: string;
  service: string;
  version: string;
  release: {
    version: string;
    commitSha: string | null;
    deploymentId: string | null;
  };
  timestamp: string;
};

describe("web health route", () => {
  it("returns a no-store public health payload without auth", async () => {
    const response = await GET();
    const body = (await response.json()) as HealthPayload;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({
      status: "ok",
      service: "sales-web",
      version: webPackage.version,
      release: {
        version: webPackage.version,
        commitSha: null,
        deploymentId: null,
      },
    });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});
