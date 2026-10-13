import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("suppression controls", () => {
  it("creates, lists, and checks workspace suppressions", async () => {
    const app = createApp();
    const createResponse = await app.request("/v1/suppressions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        channel: "email",
        contactValue: "Blocked@Example.com",
        reason: "unsubscribe",
        source: "operator-test",
      }),
    });
    const created = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(created).toMatchObject({
      channel: "email",
      normalizedContactValue: "blocked@example.com",
      reason: "unsubscribe",
    });

    const listResponse = await app.request("/v1/suppressions");
    const list = await listResponse.json();
    expect(list.suppressions).toContainEqual(expect.objectContaining({
      normalizedContactValue: "blocked@example.com",
    }));

    const checkResponse = await app.request("/v1/suppressions/check", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        channel: "email",
        email: "blocked@example.com",
      }),
    });
    const check = await checkResponse.json();

    expect(checkResponse.status).toBe(200);
    expect(check).toMatchObject({
      suppressed: true,
      matchedSuppression: {
        normalizedContactValue: "blocked@example.com",
      },
    });
  });

  it("blocks suppressed email campaign dispatch before provider delivery", async () => {
    const app = createApp();
    await app.request("/v1/suppressions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        channel: "email",
        contactValue: "aarav@orbitops.ai",
        reason: "manual",
        source: "operator-test",
      }),
    });

    const response = await app.request("/v1/campaigns/camp_1/dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      provider: "suppression-policy",
      deliveryStatus: "review_required",
      activity: {
        status: "review_required",
      },
    });
    expect(result.detail).toContain("Dispatch blocked");
  });

  it("blocks suppressed voice dispatch before the call provider is invoked", async () => {
    const app = createApp();
    await app.request("/v1/suppressions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        channel: "phone",
        contactValue: "+91 98765 43210",
        reason: "do_not_contact",
        source: "operator-test",
      }),
    });

    const response = await app.request("/v1/calls/dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId: "lead_1",
      }),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      provider: "suppression-policy",
      call: {
        reviewRequired: true,
        disposition: "suppressed",
      },
    });
    expect(result.detail).toContain("Dispatch blocked");
  });
});
