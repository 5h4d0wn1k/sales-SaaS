import { afterEach, describe, expect, it, vi } from "vitest";

function createDbMock(limitResults: unknown[][]) {
  let selectCallCount = 0;
  const limitMock = vi.fn(async () => {
    const result = limitResults[selectCallCount++];
    if (!result) {
      throw new Error(`Unexpected provider target lookup #${selectCallCount}`);
    }

    return result;
  });

  const whereMock = vi.fn(() => ({
    limit: limitMock,
  }));
  const secondJoinMock = vi.fn(() => ({
    where: whereMock,
  }));
  const firstJoinMock = vi.fn(() => ({
    innerJoin: secondJoinMock,
  }));
  const fromMock = vi.fn(() => ({
    innerJoin: firstJoinMock,
  }));
  const selectMock = vi.fn(() => ({
    from: fromMock,
  }));

  return {
    db: {
      select: selectMock,
    },
  };
}

async function loadProviderTargetHelpers(limitResults: unknown[][]) {
  vi.resetModules();

  const actualDatabase = await vi.importActual<typeof import("@sales/database")>("@sales/database");
  const dbMock = createDbMock(limitResults);

  vi.doMock("@sales/database", () => ({
    ...actualDatabase,
    db: dbMock.db,
  }));

  return import("../src/provider-event-targets");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@sales/database");
  vi.restoreAllMocks();
});

describe("provider webhook target resolution", () => {
  it("returns the unique resend activity target when exactly one row matches", async () => {
    const { findUniqueResendWebhookTarget } = await loadProviderTargetHelpers([
      [{ id: "act-1", organizationId: "org-1" }],
    ]);

    await expect(findUniqueResendWebhookTarget("email-1")).resolves.toEqual({
      kind: "activity",
      id: "act-1",
      organizationId: "org-1",
    });
  });

  it("fails closed when resend webhook targets are ambiguous", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { findUniqueResendWebhookTarget } = await loadProviderTargetHelpers([
      [
        { id: "act-1", organizationId: "org-1" },
        { id: "act-2", organizationId: "org-2" },
      ],
    ]);

    await expect(findUniqueResendWebhookTarget("email-duplicate")).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      "Provider webhook target is ambiguous for resend:email-duplicate; refusing to update multiple activity records.",
    );
  });

  it("returns the unique twilio call target when exactly one row matches", async () => {
    const { findUniqueTwilioWebhookTarget } = await loadProviderTargetHelpers([
      [{ id: "call-1", organizationId: "org-1" }],
    ]);

    await expect(findUniqueTwilioWebhookTarget("CA123")).resolves.toEqual({
      kind: "call",
      id: "call-1",
      organizationId: "org-1",
    });
  });

  it("fails closed when twilio webhook targets are ambiguous", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { findUniqueTwilioWebhookTarget } = await loadProviderTargetHelpers([
      [
        { id: "call-1", organizationId: "org-1" },
        { id: "call-2", organizationId: "org-2" },
      ],
    ]);

    await expect(findUniqueTwilioWebhookTarget("CA999")).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      "Provider webhook target is ambiguous for twilio:CA999; refusing to update multiple call records.",
    );
  });
});
