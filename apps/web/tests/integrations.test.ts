import { describe, expect, it } from "vitest";
import {
  buildIntegrationContactUrl,
  formatIntegrationContactMessage,
  getIntegrationRolloutPath,
  getIntegrationRolloutPathCounts,
  getIntegrationStatusCounts,
  getIntegrationsByCategory,
  parseIntegrationContactContext,
  publicIntegrationCategories,
  publicIntegrations,
} from "../lib/integrations";

describe("public integration catalog", () => {
  it("keeps integration categories populated and status-counted", () => {
    expect(publicIntegrations.length).toBeGreaterThanOrEqual(15);

    const grouped = getIntegrationsByCategory();
    expect(grouped).toHaveLength(publicIntegrationCategories.length);
    expect(grouped.every((category) => category.integrations.length > 0)).toBe(true);

    const counts = getIntegrationStatusCounts();
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(
      publicIntegrations.length,
    );
    expect(counts.configured_when_ready).toBeGreaterThanOrEqual(4);
    expect(counts.guarded_beta).toBeGreaterThanOrEqual(5);
    expect(counts.roadmap).toBeGreaterThanOrEqual(3);
    expect(counts.prohibited).toBeGreaterThanOrEqual(1);

    const rolloutPathCounts = getIntegrationRolloutPathCounts();
    expect(rolloutPathCounts["Configure for rollout"]).toBe(counts.configured_when_ready);
    expect(rolloutPathCounts["Pilot with review gates"]).toBe(counts.guarded_beta);
    expect(rolloutPathCounts["Validate roadmap fit"]).toBe(counts.roadmap);
    expect(rolloutPathCounts["No rollout path"]).toBe(counts.prohibited);
  });

  it("maps integration maturity to buyer-safe commercial paths", () => {
    expect(getIntegrationRolloutPath({ status: "configured_when_ready" })).toMatchObject({
      label: "Configure for rollout",
      ctaLabel: "Request rollout review",
      contactIntent: "rollout_review",
    });
    expect(getIntegrationRolloutPath({ status: "guarded_beta" })).toMatchObject({
      label: "Pilot with review gates",
      ctaLabel: "Request beta rollout",
      contactIntent: "beta_rollout",
    });
    expect(getIntegrationRolloutPath({ status: "roadmap" })).toMatchObject({
      label: "Validate roadmap fit",
      ctaLabel: "Discuss roadmap fit",
      contactIntent: "roadmap_fit",
    });
    expect(getIntegrationRolloutPath({ status: "prohibited" })).toMatchObject({
      label: "No rollout path",
      ctaLabel: null,
      contactIntent: null,
      claimBoundary: expect.stringContaining("intentionally unsupported"),
    });
  });

  it("maps high-value customer requests to claim-safe current behavior", () => {
    expect(
      publicIntegrations.find((integration) => integration.slug === "resend-email"),
    ).toMatchObject({
      status: "configured_when_ready",
      channels: expect.arrayContaining(["email", "outreach"]),
      requiredSetup: expect.arrayContaining(["RESEND_API_KEY", "RESEND_FROM_EMAIL"]),
    });
    expect(
      publicIntegrations.find((integration) => integration.slug === "twilio-voice"),
    ).toMatchObject({
      status: "configured_when_ready",
      requiredSetup: expect.arrayContaining([
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_FROM_NUMBER",
        "TWILIO_TWIML_URL",
      ]),
    });
    expect(
      publicIntegrations.find((integration) => integration.slug === "telegram-command-center"),
    ).toMatchObject({
      status: "guarded_beta",
      guideHref: "/resources/telegram-sales-command-center",
      guardrails: expect.arrayContaining([
        "Secret-header webhook verification",
        "Hashed chat binding",
        "Replay protection",
      ]),
    });
    expect(
      publicIntegrations.find((integration) => integration.slug === "account-lifecycle-email"),
    ).toMatchObject({
      status: "configured_when_ready",
      requiredSetup: expect.arrayContaining([
        "RESEND_API_KEY",
        "RESEND_FROM_EMAIL",
        "FRONTEND_URL",
      ]),
      guardrails: expect.arrayContaining([
        "Invite acceptance constrained to the invited email address",
        "No browser-entered raw email-provider secrets",
      ]),
    });
  });

  it("does not promote unsupported autonomy or platform-policy claims as active integrations", () => {
    const activeCopy = publicIntegrations
      .filter(
        (integration) =>
          integration.status === "configured_when_ready" || integration.status === "guarded_beta",
      )
      .map((integration) =>
        [
          integration.name,
          integration.summary,
          integration.currentMode,
          integration.roadmap,
          ...integration.guardrails,
        ]
          .join(" ")
          .toLowerCase(),
      );

    for (const copy of activeCopy) {
      expect(copy).not.toContain("fully autonomous");
      expect(copy).not.toContain("guaranteed meetings");
      expect(copy).not.toContain("universal live lead scraping");
    }

    const linkedinReview = publicIntegrations.find(
      (integration) => integration.slug === "linkedin-review",
    );
    expect(linkedinReview).toMatchObject({
      status: "guarded_beta",
      guardrails: expect.arrayContaining(["No automated social-platform sending"]),
    });
    expect(linkedinReview?.summary.toLowerCase()).toContain("does not auto-connect");

    expect(
      publicIntegrations.find((integration) => integration.slug === "linkedin-browser-automation"),
    ).toMatchObject({
      status: "prohibited",
      currentMode: expect.stringContaining("review-only"),
    });
  });

  it("builds claim-safe integration-to-contact context for rollout review", () => {
    expect(buildIntegrationContactUrl("telegram-command-center")).toBe(
      "/contact?intent=managed_services&utm_source=integration_catalog&utm_medium=public_catalog&utm_campaign=telegram-command-center&integration=telegram-command-center&integrationIntent=rollout_review",
    );
    expect(buildIntegrationContactUrl("telegram-command-center", "beta_rollout")).toBe(
      "/contact?intent=managed_services&utm_source=integration_catalog&utm_medium=public_catalog&utm_campaign=telegram-command-center&integration=telegram-command-center&integrationIntent=beta_rollout",
    );

    const context = parseIntegrationContactContext({
      utm_source: "integration_catalog",
      utm_campaign: "telegram-command-center",
      integration: "telegram-command-center",
      integrationIntent: "beta_rollout",
    });

    expect(context).toMatchObject({
      slug: "telegram-command-center",
      name: "Telegram command center",
      statusLabel: "Guarded beta",
      commercialPathLabel: "Pilot with review gates",
      requestedIntent: "beta_rollout",
      claimBoundary: expect.stringContaining("Guarded beta flows"),
      channels: expect.arrayContaining(["telegram"]),
    });
    expect(formatIntegrationContactMessage(context!)).toContain(
      "Integration rollout context attached for review: Telegram command center.",
    );
    expect(formatIntegrationContactMessage(context!)).toContain(
      "Commercial path: Pilot with review gates.",
    );
    expect(formatIntegrationContactMessage(context!)).toContain(
      "Requested intent: beta_rollout.",
    );
    expect(formatIntegrationContactMessage(context!)).toContain(
      "Please review fit, setup blockers, provider readiness, budget posture, and the safest rollout path before any live provider work starts.",
    );
  });

  it("falls back to the integration status path when contact intent is missing or mismatched", () => {
    const roadmapContext = parseIntegrationContactContext({
      utm_source: "integration_catalog",
      integration: "crm-calendar-sync",
      integrationIntent: "beta_rollout",
    });
    const prohibitedContext = parseIntegrationContactContext({
      utm_source: "integration_catalog",
      integration: "linkedin-browser-automation",
      integrationIntent: "rollout_review",
    });

    expect(roadmapContext).toMatchObject({
      commercialPathLabel: "Validate roadmap fit",
      requestedIntent: "roadmap_fit",
      claimBoundary: expect.stringContaining("not live product behavior"),
    });
    expect(formatIntegrationContactMessage(roadmapContext!)).toContain(
      "Requested intent: roadmap_fit.",
    );
    expect(prohibitedContext).toMatchObject({
      commercialPathLabel: "No rollout path",
      requestedIntent: null,
      claimBoundary: expect.stringContaining("intentionally unsupported"),
    });
    expect(formatIntegrationContactMessage(prohibitedContext!)).toContain(
      "Requested intent: No rollout path.",
    );
  });
});
