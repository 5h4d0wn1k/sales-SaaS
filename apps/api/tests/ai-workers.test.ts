import { describe, expect, it } from "vitest";
import {
  actionProposalListResponseSchema,
  actionProposalSchema,
  aiWorkerControlPlaneResponseSchema,
  aiWorkerExecutionReadinessResponseSchema,
  aiWorkerMarginReadinessResponseSchema,
  aiWorkerRunSchema,
} from "@sales/shared";
import { createApp } from "../src/app";

describe("AI worker control-plane routes", () => {
  it("returns the governed worker registry and ledger", async () => {
    const app = createApp();
    const response = await app.request("/v1/ai-workers");
    const body = aiWorkerControlPlaneResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.workers.map((worker) => worker.name)).toContain("Sales researcher");
    expect(body.summary.active).toBeGreaterThan(0);
    expect(body.runs.some((run) => run.status === "proposed" || run.status === "blocked")).toBe(true);
  });

  it("returns a read-only execution readiness report without enabling live tools", async () => {
    const app = createApp();
    const response = await app.request("/v1/ai-workers/execution-readiness");
    const body = aiWorkerExecutionReadinessResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      surface: "ai-worker-execution-readiness",
      posture: "needs_approval",
      liveExecution: {
        enabled: false,
        status: "blocked",
      },
    });
    expect(body.checks.find((check) => check.id === "approved-ledger")).toMatchObject({
      status: "missing",
    });
    expect(body.unavailableClaims).toContain("Live external AI-worker tool execution");
  });

  it("returns AI worker margin readiness without enabling live scale or hiding missing controls", async () => {
    const app = createApp();
    const response = await app.request("/v1/ai-workers/margin-readiness");
    const body = aiWorkerMarginReadinessResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      surface: "ai-worker-margin-readiness",
      liveScale: {
        enabled: false,
        status: "blocked",
      },
      revenueModel: {
        model: "subscription_with_usage_controls",
      },
      planBoundary: {
        aiTaskProposalLimit: 50,
        aiExecutionBudgetCents: 15000,
      },
    });
    expect(body.requiredCapabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "ai-task-metering", status: "met" }),
        expect.objectContaining({ id: "ai-execution-budget", status: "met" }),
        expect.objectContaining({ id: "provider-cost-curves", status: "met" }),
      ]),
    );
    expect(body.guardrails[0]).toContain("read-only");
  });

  it("creates worker task proposals without executing worker tools", async () => {
    const app = createApp();
    const controlPlaneResponse = await app.request("/v1/ai-workers");
    const controlPlane = aiWorkerControlPlaneResponseSchema.parse(
      await controlPlaneResponse.json(),
    );
    const worker = controlPlane.workers.find((entry) => entry.status === "active");

    expect(worker).toBeDefined();

    const response = await app.request("/v1/ai-workers/tasks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        workerId: worker!.id,
        title: "Prepare governed source batch",
        detail: "Create a bounded worker task proposal for operator review.",
        proposedAction:
          "Research target accounts, write source evidence, and wait for approval before any external action.",
        riskLevel: "medium",
        expectedCostCents: 1500,
        requiredRole: "member",
      }),
    });
    const run = aiWorkerRunSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(run).toMatchObject({
      workerId: worker!.id,
      status: "proposed",
      actualCostCents: 0,
    });
    expect(run.approvalProposalId).toBeTruthy();

    const proposalsResponse = await app.request("/v1/action-proposals?status=pending");
    const proposals = actionProposalListResponseSchema.parse(await proposalsResponse.json());
    expect(
      proposals.proposals.some(
        (proposal) =>
          proposal.id === run.approvalProposalId &&
          proposal.type === "ai_worker_action" &&
          proposal.status === "pending" &&
          proposal.requiredRole === worker!.ownerRole,
      ),
    ).toBe(true);

    const reviewResponse = await app.request(`/v1/action-proposals/${run.approvalProposalId}/review`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        decision: "approve",
        note: "Approved for governed worker execution readiness.",
      }),
    });
    const reviewed = actionProposalSchema.parse(await reviewResponse.json());

    expect(reviewResponse.status).toBe(200);
    expect(reviewed).toMatchObject({
      id: run.approvalProposalId,
      status: "approved",
      requiredRole: worker!.ownerRole,
    });

    const afterControlPlaneResponse = await app.request("/v1/ai-workers");
    const afterControlPlane = aiWorkerControlPlaneResponseSchema.parse(
      await afterControlPlaneResponse.json(),
    );
    const reviewedRun = afterControlPlane.runs.find((entry) => entry.id === run.id);

    expect(reviewedRun).toMatchObject({
      status: "approved",
      actualCostCents: 0,
      blockedReason: null,
    });
    expect(reviewedRun?.resultSummary).toContain("No tool ran automatically.");

    const readinessResponse = await app.request("/v1/ai-workers/execution-readiness");
    const readiness = aiWorkerExecutionReadinessResponseSchema.parse(
      await readinessResponse.json(),
    );

    expect(readiness).toMatchObject({
      posture: "dry_run_ready",
      liveExecution: {
        enabled: false,
      },
    });
    expect(readiness.dryRunCandidates.some((candidate) => candidate.runId === run.id)).toBe(true);

    const completionResponse = await app.request(`/v1/ai-workers/runs/${run.id}/result`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        resultSummary:
          "Dry-run produced a reviewable source batch and returned to the operator queue.",
        actualCostCents: 1200,
      }),
    });
    const completedRun = aiWorkerRunSchema.parse(await completionResponse.json());

    expect(completionResponse.status).toBe(200);
    expect(completedRun).toMatchObject({
      id: run.id,
      status: "completed",
      actualCostCents: 1200,
      blockedReason: null,
    });
    expect(completedRun.resultSummary).toContain("no external worker tool ran automatically");
    expect(completedRun.completedAt).toBeTruthy();

    const completedControlPlaneResponse = await app.request("/v1/ai-workers");
    const completedControlPlane = aiWorkerControlPlaneResponseSchema.parse(
      await completedControlPlaneResponse.json(),
    );
    const completedWorker = completedControlPlane.workers.find((entry) => entry.id === worker!.id);

    expect(completedWorker?.budgetUsedCents).toBe(worker!.budgetUsedCents + 1200);
  });

  it("rejects dry-run result ingestion until a worker task is approved", async () => {
    const app = createApp();
    const response = await app.request("/v1/ai-workers/runs/worker_run_1/result", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        resultSummary: "Attempt to complete a task before approval.",
        actualCostCents: 100,
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("Only approved AI worker runs");
  });

  it("blocks over-budget worker task proposals before approval creation", async () => {
    const app = createApp();
    const controlPlaneResponse = await app.request("/v1/ai-workers");
    const controlPlane = aiWorkerControlPlaneResponseSchema.parse(
      await controlPlaneResponse.json(),
    );
    const worker = controlPlane.workers.find((entry) => entry.status === "active");
    const proposalsBeforeResponse = await app.request("/v1/action-proposals?status=pending");
    const proposalsBefore = actionProposalListResponseSchema.parse(
      await proposalsBeforeResponse.json(),
    );

    expect(worker).toBeDefined();

    const remainingBudgetCents = worker!.monthlyBudgetCents - worker!.budgetUsedCents;
    const response = await app.request("/v1/ai-workers/tasks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        workerId: worker!.id,
        title: "Run expensive source expansion",
        detail: "Attempt to create an over-budget worker proposal.",
        proposedAction:
          "Buy a large enrichment batch and prepare it for outreach without budget headroom.",
        riskLevel: "high",
        expectedCostCents: remainingBudgetCents + 1,
        requiredRole: "admin",
      }),
    });
    const body = await response.json();
    const run = aiWorkerRunSchema.parse(body.run);

    expect(response.status).toBe(409);
    expect(body.error).toContain("remaining monthly budget");
    expect(run).toMatchObject({
      workerId: worker!.id,
      status: "blocked",
      approvalProposalId: null,
    });

    const proposalsAfterResponse = await app.request("/v1/action-proposals?status=pending");
    const proposalsAfter = actionProposalListResponseSchema.parse(
      await proposalsAfterResponse.json(),
    );
    expect(proposalsAfter.summary.pending).toBe(proposalsBefore.summary.pending);
    expect(proposalsAfter.proposals.some((proposal) => proposal.id === run.approvalProposalId)).toBe(false);
  });
});
