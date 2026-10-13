import { describe, expect, it } from "vitest";
import type { AiWorkerControlPlaneResponse } from "../src/domain";
import { buildAiWorkerExecutionReadiness } from "../src/ai-worker-execution-readiness";

const now = "2026-06-05T12:00:00.000Z";

const baseControlPlane = {
  workers: [
    {
      id: "worker_researcher",
      name: "Sales researcher",
      role: "Lead discovery",
      status: "active",
      riskLevel: "medium",
      ownerRole: "admin",
      description: "Prepares lead evidence before outreach.",
      permissions: ["Read source plan", "Create approval proposals"],
      allowedTools: ["website-source", "directory-source"],
      blockedTools: ["email-send", "crm-write"],
      monthlyBudgetCents: 50000,
      budgetUsedCents: 12000,
      lastActionAt: now,
      guardrails: ["Return to operator review when evidence is incomplete."],
      createdAt: now,
      updatedAt: now,
    },
  ],
  runs: [
    {
      id: "run_proposed",
      workerId: "worker_researcher",
      workerName: "Sales researcher",
      status: "proposed",
      title: "Prepare source evidence",
      detail: "Create a reviewable source batch.",
      riskLevel: "medium",
      proposedAction: "Collect public evidence and wait for review.",
      expectedCostCents: 1500,
      actualCostCents: 0,
      approvalProposalId: "proposal_1",
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
    budgetUsedCents: 12000,
    budgetLimitCents: 50000,
  },
} satisfies AiWorkerControlPlaneResponse;

describe("AI worker execution readiness", () => {
  it("keeps proposed worker tasks in approval before dry-run execution is available", () => {
    const readiness = buildAiWorkerExecutionReadiness({
      controlPlane: baseControlPlane,
      actorRole: "admin",
      emailVerified: true,
      generatedAt: now,
    });

    expect(readiness).toMatchObject({
      surface: "ai-worker-execution-readiness",
      posture: "needs_approval",
      tone: "warn",
      liveExecution: {
        enabled: false,
        status: "blocked",
      },
    });
    expect(readiness.dryRunCandidates).toHaveLength(0);
    expect(readiness.unavailableClaims).toContain("Live external AI-worker tool execution");
  });

  it("lists approved active worker runs as dry-run candidates without enabling live tools", () => {
    const readiness = buildAiWorkerExecutionReadiness({
      controlPlane: {
        ...baseControlPlane,
        runs: [
          {
            ...baseControlPlane.runs[0],
            id: "run_approved",
            status: "approved",
          },
        ],
        summary: {
          ...baseControlPlane.summary,
          pendingApproval: 0,
        },
      },
      actorRole: "owner",
      emailVerified: true,
      generatedAt: now,
    });

    expect(readiness).toMatchObject({
      posture: "dry_run_ready",
      tone: "good",
      liveExecution: {
        enabled: false,
      },
    });
    expect(readiness.dryRunCandidates).toEqual([
      expect.objectContaining({
        runId: "run_approved",
        workerName: "Sales researcher",
        allowedTools: ["website-source", "directory-source"],
        fallback: "Return to operator review when evidence is incomplete.",
      }),
    ]);
  });

  it("blocks dry-run candidates when plan AI execution budget is exhausted", () => {
    const readiness = buildAiWorkerExecutionReadiness({
      controlPlane: {
        ...baseControlPlane,
        runs: [
          {
            ...baseControlPlane.runs[0],
            id: "run_approved",
            status: "approved",
          },
        ],
        summary: {
          ...baseControlPlane.summary,
          pendingApproval: 0,
        },
      },
      actorRole: "owner",
      emailVerified: true,
      aiExecutionBudgetUsage: {
        currentUsage: 15000,
        usageLimit: 15000,
        remainingQuantity: 0,
      },
      generatedAt: now,
    });

    expect(readiness).toMatchObject({
      posture: "blocked",
      tone: "blocked",
    });
    expect(readiness.dryRunCandidates).toHaveLength(0);
    expect(readiness.checks.find((check) => check.id === "plan-execution-budget"))
      .toMatchObject({
        status: "blocked",
      });
  });

  it("blocks readiness when active workers expose unsafe mutation tools as allowed", () => {
    const readiness = buildAiWorkerExecutionReadiness({
      controlPlane: {
        ...baseControlPlane,
        workers: [
          {
            ...baseControlPlane.workers[0],
            allowedTools: ["website-source", "email-send"],
            blockedTools: ["crm-write"],
          },
        ],
      },
      actorRole: "admin",
      emailVerified: true,
      generatedAt: now,
    });

    expect(readiness).toMatchObject({
      posture: "blocked",
      tone: "blocked",
    });
    expect(readiness.toolScopeViolations).toEqual([
      expect.objectContaining({
        workerName: "Sales researcher",
        tool: "email-send",
      }),
    ]);
    expect(readiness.checks.find((check) => check.id === "tool-scope")).toMatchObject({
      status: "blocked",
    });
  });
});
