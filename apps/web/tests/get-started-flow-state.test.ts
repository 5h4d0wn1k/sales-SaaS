import { describe, expect, it } from "vitest";
import {
  buildBlueprintReviewContactUrl,
  buildDashboardUrl,
  buildGetStartedUrl,
  buildSalesBlueprintBuilderUrl,
  normalizePlanKey,
  normalizeRequestedStep,
  readAcquisitionQueryContext,
  resolveInitialGetStartedStep,
} from "../app/get-started/flow-state";

describe("get-started flow state helpers", () => {
  it("normalizes unknown plans back to free", () => {
    expect(normalizePlanKey("starter")).toBe("starter");
    expect(normalizePlanKey("nope")).toBe("free");
    expect(normalizePlanKey(undefined)).toBe("free");
  });

  it("restores checkout when a signed-in user returns from cancellation", () => {
    const step = resolveInitialGetStartedStep({
      hasSession: true,
      planKey: "pro",
      requestedStep: normalizeRequestedStep("plan_selection"),
      checkoutState: "canceled",
    });

    expect(step).toBe("checkout");
  });

  it("keeps unauthenticated users on auth even with deep-link params", () => {
    const step = resolveInitialGetStartedStep({
      hasSession: false,
      planKey: "pro",
      requestedStep: normalizeRequestedStep("checkout"),
      checkoutState: "canceled",
    });

    expect(step).toBe("auth");
  });

  it("builds stable return URLs for get-started and dashboard", () => {
    expect(
      buildGetStartedUrl({
        planKey: "starter",
        step: "checkout",
        checkout: "canceled",
      }),
    ).toBe("/get-started?plan=starter&step=checkout&checkout=canceled");

    expect(buildDashboardUrl("success")).toBe("/dashboard?checkout=success");
    expect(buildDashboardUrl()).toBe("/dashboard");
  });

  it("preserves acquisition context into dashboard handoff URLs", () => {
    const acquisition = readAcquisitionQueryContext({
      utm_source: "pricing",
      utm_medium: "pricing_page",
      utm_campaign: "plan_selection",
      pricingIntent: "fit_active_team",
      monthlyLeadGoal: "5000",
      unsafeReturn: "https://evil.example.com",
    });

    expect(
      buildDashboardUrl({
        checkout: "success",
        planKey: "pro",
        acquisition,
      }),
    ).toBe(
      "/dashboard?checkout=success&plan=pro&utm_source=pricing&utm_medium=pricing_page&utm_campaign=plan_selection&monthlyLeadGoal=5000&pricingIntent=fit_active_team",
    );
  });

  it("preserves invite context through get-started redirects", () => {
    expect(
      buildGetStartedUrl({
        planKey: "free",
        step: "plan_selection",
        invite: {
          inviteToken: "invite-token",
          inviteEmail: "teammate@example.com",
          inviteWorkspace: "Outbound Lab",
          inviteOrganization: "Northstar Labs",
        },
      }),
    ).toBe(
      "/get-started?plan=free&step=plan_selection&invite=invite-token&inviteEmail=teammate%40example.com&inviteWorkspace=Outbound+Lab&inviteOrganization=Northstar+Labs",
    );
  });

  it("preserves only whitelisted acquisition context through get-started redirects", () => {
    const acquisition = readAcquisitionQueryContext({
      utm_source: "sales_blueprint_tool",
      utm_medium: "owned_tool",
      utm_campaign: "blueprint_readiness",
      solutionSegment: "founders-validating-outbound",
      segment: "founder",
      monthlyLeadGoal: "250",
      blueprintReadiness: "90",
      pricingIntent: "plan_card",
      resource: "telegram-sales-command-center",
      resourceIntent: "article_sidebar",
      platformIntent: "full_workflow_review",
      aiSdrIntent: "workspace_start",
      leadGenIntent: "source_plan",
      outboundIntent: "sequence_review",
      meetingIntent: "calendar_handoff",
      telegramIntent: "policy_review",
      comparisonIntent: "workspace_start",
      unsafeReturn: "https://evil.example.com",
    });

    expect(acquisition).toEqual({
      utm_source: "sales_blueprint_tool",
      utm_medium: "owned_tool",
      utm_campaign: "blueprint_readiness",
      solutionSegment: "founders-validating-outbound",
      segment: "founder",
      monthlyLeadGoal: "250",
      blueprintReadiness: "90",
      pricingIntent: "plan_card",
      resource: "telegram-sales-command-center",
      resourceIntent: "article_sidebar",
      platformIntent: "full_workflow_review",
      aiSdrIntent: "workspace_start",
      leadGenIntent: "source_plan",
      outboundIntent: "sequence_review",
      meetingIntent: "calendar_handoff",
      telegramIntent: "policy_review",
      comparisonIntent: "workspace_start",
    });
    expect(
      buildGetStartedUrl({
        planKey: "free",
        step: "plan_selection",
        acquisition,
      }),
    ).toBe(
      "/get-started?plan=free&step=plan_selection&utm_source=sales_blueprint_tool&utm_medium=owned_tool&utm_campaign=blueprint_readiness&solutionSegment=founders-validating-outbound&segment=founder&monthlyLeadGoal=250&blueprintReadiness=90&pricingIntent=plan_card&resource=telegram-sales-command-center&resourceIntent=article_sidebar&platformIntent=full_workflow_review&aiSdrIntent=workspace_start&leadGenIntent=source_plan&outboundIntent=sequence_review&meetingIntent=calendar_handoff&telegramIntent=policy_review&comparisonIntent=workspace_start",
    );
  });

  it("builds claim-safe Sales Blueprint checkpoint links from get-started", () => {
    const acquisition = readAcquisitionQueryContext({
      utm_source: "pricing",
      utm_medium: "pricing_page",
      utm_campaign: "plan_selection",
      pricingIntent: "fit_active_team",
    });

    expect(buildSalesBlueprintBuilderUrl(acquisition)).toBe(
      "/sales-blueprint?utm_source=get_started&utm_medium=activation_flow&utm_campaign=blueprint_checkpoint&sourceContext=pricing",
    );
    expect(buildBlueprintReviewContactUrl(acquisition)).toBe(
      "/contact?intent=managed_services&utm_source=get_started&utm_medium=activation_flow&utm_campaign=blueprint_checkpoint&managedIntent=blueprint_checkpoint_review&sourceContext=pricing",
    );
  });
});
