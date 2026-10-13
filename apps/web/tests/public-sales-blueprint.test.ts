import { describe, expect, it } from "vitest";
import {
  blueprintContactUtm,
  buildBlueprintContactUrl,
  buildBlueprintGetStartedUrl,
  defaultPublicSalesBlueprintInput,
  evaluatePublicSalesBlueprint,
  formatBlueprintContactMessage,
  parseBlueprintContactContext,
} from "../lib/public-sales-blueprint";

describe("public sales blueprint", () => {
  it("scores the default founder blueprint as rollout ready with guarded automation", () => {
    const result = evaluatePublicSalesBlueprint(defaultPublicSalesBlueprintInput);

    expect(result.readinessScore).toBeGreaterThanOrEqual(82);
    expect(result.readinessLevel).toBe("rollout_ready");
    expect(result.recommendedAutomationMode).toBe("approval_gated");
    expect(result.monthlyPipelineValue).toBe(160000);
    expect(result.commercialFit).toMatchObject({
      planKey: "starter",
      planName: "Starter",
      priceLabel: "$49/mo",
      estimatedReviewedDispatches: 80,
      estimatedVoiceCalls: 0,
      providerBudgetPressure: "medium",
      managedPackageKey: "operator-assist",
      managedPackageTier: "Operator Assist",
    });
    expect(result.commercialFit.guardrail).toContain("do not start checkout");
    expect(result.commercialFit.guardrail).toContain("Telegram-controlled mutation");
    expect(result.readinessGaps).toEqual([]);
  });

  it("penalizes roadmap channels and incomplete operating context", () => {
    const result = evaluatePublicSalesBlueprint({
      ...defaultPublicSalesBlueprintInput,
      targetAudience: "SMBs",
      sourceChannels: ["crm"],
      outreachChannels: ["sms"],
      regions: [],
      constraints: [],
      averageContractValue: 0,
      meetingTarget: 500,
    });

    expect(result.readinessLevel).toBe("needs_context");
    expect(result.recommendedAutomationMode).toBe("assistive");
    expect(result.commercialFit.providerBudgetPressure).toBe("high");
    expect(result.commercialFit.nextSteps[0]).toContain("CRM/SMS roadmap channels");
    expect(result.readinessGaps).toEqual(
      expect.arrayContaining([
        "Roadmap channels need provider and policy review before launch.",
        "Add target regions so source and compliance posture can be checked.",
      ]),
    );
  });

  it("builds and parses contact handoff context without changing the API contract", () => {
    const result = evaluatePublicSalesBlueprint(defaultPublicSalesBlueprintInput);
    const contactUrl = buildBlueprintContactUrl(defaultPublicSalesBlueprintInput, result);
    const getStartedUrl = buildBlueprintGetStartedUrl(defaultPublicSalesBlueprintInput, result);
    const url = new URL(contactUrl, "https://winrate.ai");
    const getStarted = new URL(getStartedUrl, "https://winrate.ai");
    const context = parseBlueprintContactContext({
      utm_source: url.searchParams.get("utm_source") ?? undefined,
      monthlyLeadGoal: url.searchParams.get("monthlyLeadGoal") ?? undefined,
      blueprintSegment: url.searchParams.get("blueprintSegment") ?? undefined,
      blueprintIndustry: url.searchParams.get("blueprintIndustry") ?? undefined,
      blueprintAudience: url.searchParams.get("blueprintAudience") ?? undefined,
      blueprintMeetings: url.searchParams.get("blueprintMeetings") ?? undefined,
      blueprintAcv: url.searchParams.get("blueprintAcv") ?? undefined,
      blueprintReadiness: url.searchParams.get("blueprintReadiness") ?? undefined,
      blueprintLevel: url.searchParams.get("blueprintLevel") ?? undefined,
      blueprintSources: url.searchParams.get("blueprintSources") ?? undefined,
      blueprintOutreach: url.searchParams.get("blueprintOutreach") ?? undefined,
      blueprintRegions: url.searchParams.get("blueprintRegions") ?? undefined,
      blueprintConstraints: url.searchParams.get("blueprintConstraints") ?? undefined,
      blueprintPlan: url.searchParams.get("blueprintPlan") ?? undefined,
      managedPackage: url.searchParams.get("managedPackage") ?? undefined,
      managedIntent: url.searchParams.get("managedIntent") ?? undefined,
    });

    expect(url.pathname).toBe("/contact");
    expect(getStarted.pathname).toBe("/get-started");
    expect(getStarted.searchParams.get("utm_source")).toBe(blueprintContactUtm.source);
    expect(getStarted.searchParams.get("plan")).toBe("starter");
    expect(getStarted.searchParams.get("monthlyLeadGoal")).toBe("250");
    expect(url.searchParams.get("utm_source")).toBe(blueprintContactUtm.source);
    expect(url.searchParams.get("intent")).toBe("managed_services");
    expect(url.searchParams.get("blueprintPlan")).toBe("starter");
    expect(url.searchParams.get("managedPackage")).toBe("operator-assist");
    expect(url.searchParams.get("managedIntent")).toBe("blueprint_commercial_fit");
    expect(url.searchParams.get("monthlyLeadGoal")).toBe("250");
    expect(context).toMatchObject({
      segment: "founder",
      monthlyLeadTarget: 250,
      meetingTarget: 20,
      readinessLevel: "rollout_ready",
      recommendedPlanKey: "starter",
      recommendedPlanName: "Starter",
      managedPackageKey: "operator-assist",
      managedPackageTier: "Operator Assist",
      managedIntent: "blueprint_commercial_fit",
    });
    expect(formatBlueprintContactMessage(context!)).toContain(
      "Sales Blueprint readiness context attached",
    );
    expect(formatBlueprintContactMessage(context!)).toContain(
      "Recommended SaaS plan: Starter",
    );
    expect(formatBlueprintContactMessage(context!)).toContain(
      "Managed rollout fit: Operator Assist",
    );
    expect(formatBlueprintContactMessage(context!)).toContain(
      "Commercial boundary: plan and managed-service recommendations are guidance only",
    );
  });

  it("recommends a higher plan when call posture and lead volume require it", () => {
    const result = evaluatePublicSalesBlueprint({
      ...defaultPublicSalesBlueprintInput,
      monthlyLeadTarget: 2500,
      meetingTarget: 80,
      outreachChannels: ["email", "call"],
      sourceChannels: ["website", "search", "directory", "content"],
      averageContractValue: 6000,
    });

    expect(result.commercialFit).toMatchObject({
      planKey: "pro",
      planName: "Professional",
      estimatedReviewedDispatches: 500,
      estimatedVoiceCalls: 250,
      providerBudgetPressure: "high",
      managedPackageKey: "managed-revops",
      managedPackageTier: "Managed RevOps",
    });
    expect(result.commercialFit.planReason).toContain("call posture");
  });

  it("ignores blueprint-looking context without the blueprint attribution source", () => {
    expect(
      parseBlueprintContactContext({
        monthlyLeadGoal: "250",
        blueprintReadiness: "90",
      }),
    ).toBeNull();
  });
});
