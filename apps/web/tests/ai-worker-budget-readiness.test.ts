import { describe, expect, it } from "vitest";
import type {
  AiWorker,
  AiWorkerControlPlaneResponse,
  DashboardResponse,
  PlanGrowthReadinessResponse,
} from "@sales/shared";
import { buildAiWorkerBudgetReadiness } from "../lib/ai-worker-budget-readiness";

const activeSubscription = {
  planKey: "pro",
  status: "active",
  monthlyUsage: 120,
  usageLimit: 1000,
} satisfies Pick<
  DashboardResponse["subscription"],
  "planKey" | "status" | "monthlyUsage" | "usageLimit"
>;

const activeWorker = {
  name: "Sales researcher",
  status: "active",
  monthlyBudgetCents: 50000,
  budgetUsedCents: 12000,
  riskLevel: "medium",
} satisfies Pick<
  AiWorker,
  "name" | "status" | "monthlyBudgetCents" | "budgetUsedCents" | "riskLevel"
>;

const healthySummary = {
  active: 1,
  paused: 0,
  disabled: 0,
  pendingApproval: 0,
  blocked: 0,
  budgetUsedCents: 12000,
  budgetLimitCents: 50000,
} satisfies AiWorkerControlPlaneResponse["summary"];

const healthyPlan = {
  posture: "healthy",
  summary: "Usage, provider budget, channel access, and blueprint readiness are aligned.",
  recommendedPlan: null,
} satisfies Pick<PlanGrowthReadinessResponse, "posture" | "summary" | "recommendedPlan">;

const upgradePlan = {
  posture: "upgrade_recommended",
  summary: "Move to Scale before scaling usage and provider work.",
  recommendedPlan: {
    planKey: "scale",
    planName: "Scale",
    description: "For governed teams scaling outbound.",
    price: {
      usd: 299,
      inr: 24999,
    },
    usageLimit: 25000,
    outreachDispatchLimit: 5000,
    voiceCallLimit: 1000,
    providerCostBudgetCents: 20000,
    aiWorkerTaskProposalLimit: 250,
    aiWorkerExecutionBudgetCents: 75000,
    includedChannels: ["email", "call", "linkedin"],
    checkoutPath: "/get-started?plan=scale",
  },
} satisfies Pick<PlanGrowthReadinessResponse, "posture" | "summary" | "recommendedPlan">;

describe("AI worker budget readiness", () => {
  it("marks a funded active worker as ready for an approval-gated task proposal", () => {
    const readiness = buildAiWorkerBudgetReadiness({
      subscription: activeSubscription,
      aiWorkerSummary: healthySummary,
      selectedWorker: activeWorker,
      pendingProposalCount: 0,
      highRiskProposalCount: 0,
      canReviewProposals: true,
      planGrowthReadiness: healthyPlan,
      minimumTaskBudgetCents: 1500,
    });

    expect(readiness).toMatchObject({
      posture: "ready",
      tone: "good",
      canProposeNextTask: true,
      remainingBudgetCents: 38000,
    });
    expect(readiness.metrics).toContainEqual({
      label: "Task floor",
      value: "$15",
    });
    expect(readiness.guardrails[0]).toContain("read-only");
  });

  it("fails closed when billing, reviewer authority, blocked runs, and worker budget are unsafe", () => {
    const readiness = buildAiWorkerBudgetReadiness({
      subscription: {
        ...activeSubscription,
        status: "past_due",
      },
      aiWorkerSummary: {
        ...healthySummary,
        pendingApproval: 1,
        blocked: 1,
        budgetUsedCents: 49800,
      },
      selectedWorker: {
        ...activeWorker,
        budgetUsedCents: 49200,
      },
      pendingProposalCount: 2,
      highRiskProposalCount: 1,
      canReviewProposals: false,
      planGrowthReadiness: {
        ...healthyPlan,
        posture: "blocked",
        summary: "Resolve billing status before creating more billable sales work.",
      },
      minimumTaskBudgetCents: 1500,
    });

    expect(readiness).toMatchObject({
      posture: "blocked",
      tone: "blocked",
      canProposeNextTask: false,
    });
    expect(readiness.signals.find((signal) => signal.id === "selected-worker")).toMatchObject({
      tone: "blocked",
    });
    expect(readiness.signals.find((signal) => signal.id === "approval-authority")).toMatchObject({
      tone: "blocked",
      value: "missing",
    });
    expect(readiness.signals.find((signal) => signal.id === "plan-fit")).toMatchObject({
      tone: "blocked",
    });
  });

  it("keeps task proposals possible while warning on plan-fit pressure", () => {
    const readiness = buildAiWorkerBudgetReadiness({
      subscription: activeSubscription,
      aiWorkerSummary: healthySummary,
      selectedWorker: activeWorker,
      pendingProposalCount: 0,
      highRiskProposalCount: 0,
      canReviewProposals: true,
      planGrowthReadiness: upgradePlan,
      minimumTaskBudgetCents: 1500,
    });

    expect(readiness).toMatchObject({
      posture: "plan_review",
      tone: "warn",
      canProposeNextTask: true,
    });
    expect(readiness.summary).toContain("Scale");
    expect(readiness.signals.find((signal) => signal.id === "plan-fit")).toMatchObject({
      tone: "warn",
      value: "upgrade recommended",
    });
  });
});
