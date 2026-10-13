import { describe, expect, it } from "vitest";
import {
  aiWorkerControlPlaneResponseSchema,
  completeAiWorkerRunInputSchema,
  createAiWorkerTaskInputSchema,
} from "../src/domain";

describe("AI worker contracts", () => {
  it("parses a guarded worker control-plane response", () => {
    const now = new Date().toISOString();
    const parsed = aiWorkerControlPlaneResponseSchema.parse({
      workers: [
        {
          id: "worker_1",
          name: "Sales researcher",
          role: "Lead discovery",
          status: "active",
          riskLevel: "medium",
          ownerRole: "admin",
          description: "Prepares lead evidence before outreach.",
          permissions: ["Read source plan"],
          allowedTools: ["website-source"],
          blockedTools: ["email-send"],
          monthlyBudgetCents: 50000,
          budgetUsedCents: 1200,
          lastActionAt: now,
          guardrails: ["No outreach dispatch."],
          createdAt: now,
          updatedAt: now,
        },
      ],
      runs: [
        {
          id: "run_1",
          workerId: "worker_1",
          workerName: "Sales researcher",
          status: "proposed",
          title: "Research target accounts",
          detail: "Prepare a reviewable source batch.",
          riskLevel: "medium",
          proposedAction: "Collect public evidence and wait for review.",
          expectedCostCents: 1500,
          actualCostCents: 0,
          approvalProposalId: "appr_1",
          resultSummary: null,
          blockedReason: null,
          createdAt: now,
          completedAt: null,
          updatedAt: now,
        },
      ],
      summary: {
        active: 1,
        paused: 0,
        disabled: 0,
        pendingApproval: 1,
        blocked: 0,
        budgetUsedCents: 1200,
        budgetLimitCents: 50000,
      },
    });

    expect(parsed.workers[0]?.blockedTools).toContain("email-send");
    expect(parsed.summary.pendingApproval).toBe(1);
  });

  it("coerces worker task proposal cost from form values", () => {
    const parsed = createAiWorkerTaskInputSchema.parse({
      workerId: "worker_1",
      title: "Prepare source batch",
      detail: "Create a governed source batch for review.",
      proposedAction: "Research target accounts and create an approval-gated ledger entry.",
      riskLevel: "high",
      expectedCostCents: "2500",
      requiredRole: "admin",
    });

    expect(parsed.expectedCostCents).toBe(2500);
    expect(parsed.riskLevel).toBe("high");
  });

  it("coerces dry-run result cost from form values", () => {
    const parsed = completeAiWorkerRunInputSchema.parse({
      resultSummary: "Dry-run returned a reviewable source batch without external tools.",
      actualCostCents: "1200",
    });

    expect(parsed.actualCostCents).toBe(1200);
  });
});
