import { describe, expect, it } from "vitest";
import {
  contactIntakeRecordSchema,
  createContactIntakeInputSchema,
  isContactIntakeSpamTrapTriggered,
  scoreContactIntake,
} from "../src/domain";
import {
  ContactIntakeBodyTooLargeError,
  CONTACT_INTAKE_MAX_BODY_BYTES,
  CONTACT_INTAKE_SENSITIVE_REDACTION,
  isContactIntakeBodyTooLarge,
  readContactIntakeBodyText,
  sanitizeContactIntakeInput,
} from "../src/contact-intake-safety";

describe("contact intake contract", () => {
  it("normalizes form arrays and scores high-intent managed-service requests", () => {
    const input = createContactIntakeInputSchema.parse({
      intent: "managed_services",
      name: "Priya Shah",
      email: "priya@example.com",
      companyName: "OrbitOps",
      website: "https://orbitops.example",
      role: "Founder",
      teamSize: "12",
      monthlyLeadGoal: "1200",
      budgetRange: "5000_plus",
      timeline: "this_week",
      goals: ["Book demos", "Launch outbound"],
      channels: ["email", "call", "telegram"],
      message:
        "We want help launching a reviewable outbound workflow with managed setup and provider readiness.",
    });

    expect(input.monthlyLeadGoal).toBe(1200);
    expect(input.companyWebsiteUrl).toBe("");
    expect(input.channels).toEqual(["email", "call", "telegram"]);
    expect(scoreContactIntake(input)).toMatchObject({
      priority: "high",
      qualificationScore: 100,
      routingRecommendation: "Route to founder/managed-services review within one business day.",
    });
  });

  it("routes feedback away from sales-qualified handling", () => {
    const input = createContactIntakeInputSchema.parse({
      intent: "product_feedback",
      name: "Nina Carter",
      email: "nina@example.com",
      companyName: "VectrCloud",
      message:
        "The dashboard workflow was useful, but the approval inbox copy needs more clarity for operators.",
    });

    expect(scoreContactIntake(input)).toMatchObject({
      priority: "low",
      routingRecommendation:
        "Route to product feedback review; do not treat as a sales-qualified lead.",
    });
  });

  it("treats solution-segment traffic as warmer acquisition intent", () => {
    const input = createContactIntakeInputSchema.parse({
      intent: "sales_assessment",
      name: "Anika Rao",
      email: "anika@example.com",
      companyName: "ModernOps",
      timeline: "this_month",
      message:
        "We arrived from the SMB solution page and want to review whether the sales workspace is a fit.",
      utm: {
        source: "solution_segment",
        medium: "seo",
        campaign: "smb_sales_teams_modernizing_ops",
        solutionSegment: "smb-sales-teams-modernizing-ops",
        segment: "SMB teams",
      },
    });

    expect(input.utm).toMatchObject({
      source: "solution_segment",
      solutionSegment: "smb-sales-teams-modernizing-ops",
      segment: "SMB teams",
    });
    expect(scoreContactIntake(input)).toMatchObject({
      priority: "medium",
      qualificationScore: 60,
      routingRecommendation: "Route to beta onboarding review with Sales Blueprint follow-up.",
    });
  });

  it("normalizes known attribution fields while preserving future-safe extras", () => {
    const input = createContactIntakeInputSchema.parse({
      intent: "sales_assessment",
      name: "Dev Patel",
      email: "dev@example.com",
      companyName: "Pipeline Labs",
      message:
        "We want to preserve clean attribution for the sales team before the first rollout review.",
      utm: {
        source: " solution_segment ",
        medium: " seo ",
        campaign: "x".repeat(240),
        solutionSegment: " founders-validating-outbound ",
        pricingPlan: " pro ",
        pricingIntent: " fit_active_team ",
        managedPackage: " operator-assist ",
        managedIntent: " pricing_setup_review ",
        segment: 42,
        creative: "hero_cta",
      },
    });

    expect(input.utm).toMatchObject({
      source: "solution_segment",
      medium: "seo",
      campaign: "x".repeat(180),
      solutionSegment: "founders-validating-outbound",
      pricingPlan: "pro",
      pricingIntent: "fit_active_team",
      managedPackage: "operator-assist",
      managedIntent: "pricing_setup_review",
      creative: "hero_cta",
    });
    expect(input.utm.segment).toBeUndefined();
  });

  it("keeps the honeypot field transient and out of stored intake records", () => {
    const input = createContactIntakeInputSchema.parse({
      name: "Spam Bot",
      email: "bot@example.com",
      companyName: "Autofill Labs",
      companyWebsiteUrl: "https://trap.example",
      message:
        "This request should look accepted to the browser while avoiding durable intake storage.",
    });
    const record = contactIntakeRecordSchema.parse({
      ...input,
      id: "intake_1",
      status: "new",
      priority: "low",
      qualificationScore: 20,
      routingRecommendation: "Route to nurture and request more business context before sales follow-up.",
      createdAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
    });

    expect(isContactIntakeSpamTrapTriggered(input)).toBe(true);
    expect(record).not.toHaveProperty("companyWebsiteUrl");
  });

  it("redacts secret-like values before public intake storage", () => {
    const input = createContactIntakeInputSchema.parse({
      name: "Nina Carter",
      email: "nina@example.com",
      companyName: "VectrCloud",
      message:
        "We accidentally pasted api_key=sk-testtokenvalue123456789012345 and Bearer ghp_123456789012345678901234567890123456 into this sales request.",
      utm: {
        campaign: "pricing",
        creative: "secret=sk_live_123456789012345678901234",
      },
    });
    const sanitized = sanitizeContactIntakeInput(input);

    expect(sanitized.input.message).toContain(CONTACT_INTAKE_SENSITIVE_REDACTION);
    expect(sanitized.input.message).not.toContain("sk-testtokenvalue");
    expect(sanitized.input.message).not.toContain("ghp_1234567890");
    expect(sanitized.input.utm.creative).toContain(
      CONTACT_INTAKE_SENSITIVE_REDACTION,
    );
    expect(sanitized.redactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "message", type: "labeled_secret" }),
        expect.objectContaining({ field: "message", type: "bearer_token" }),
        expect.objectContaining({ field: "utm.creative", type: "labeled_secret" }),
      ]),
    );
  });

  it("detects oversized public intake bodies before parsing", () => {
    expect(isContactIntakeBodyTooLarge(String(CONTACT_INTAKE_MAX_BODY_BYTES))).toBe(false);
    expect(isContactIntakeBodyTooLarge(String(CONTACT_INTAKE_MAX_BODY_BYTES + 1))).toBe(true);
    expect(isContactIntakeBodyTooLarge("not-a-number")).toBe(false);
    expect(isContactIntakeBodyTooLarge(null)).toBe(false);
  });

  it("enforces public intake body limits while streaming", async () => {
    const accepted = new Request("https://example.com/intake", {
      method: "POST",
      body: "a".repeat(CONTACT_INTAKE_MAX_BODY_BYTES),
    });
    const rejected = new Request("https://example.com/intake", {
      method: "POST",
      body: "a".repeat(CONTACT_INTAKE_MAX_BODY_BYTES + 1),
    });

    await expect(readContactIntakeBodyText(accepted)).resolves.toHaveLength(
      CONTACT_INTAKE_MAX_BODY_BYTES,
    );
    await expect(readContactIntakeBodyText(rejected)).rejects.toBeInstanceOf(
      ContactIntakeBodyTooLargeError,
    );
  });
});
