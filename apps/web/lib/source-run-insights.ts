import type { DashboardCockpitTone } from "./dashboard-cockpit";
import type { SourceRun } from "@sales/shared";

export type SourceRunReviewPosture = "review_ready" | "needs_review" | "blocked";

export type SourceRunReviewInsight = {
  posture: SourceRunReviewPosture;
  tone: DashboardCockpitTone;
  label: string;
  acceptanceRate: number;
  acceptanceRateLabel: string;
  reviewedCandidates: number;
  topEvidenceLabel: string;
  topRejectionLabel: string;
  complianceSummary: string;
  decisionDetail: string;
};

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildSourceRunReviewInsight(run: SourceRun): SourceRunReviewInsight {
  const reviewedCandidates = Math.max(0, run.candidatesFound - run.dedupedCount);
  const acceptanceRate = pct(run.qualifiedCount, reviewedCandidates);
  const topEvidence = [...run.evidence].sort((left, right) => right.confidence - left.confidence)[0];
  const topRejection = [...run.rejectionReasons].sort((left, right) => right.count - left.count)[0];
  const hasEvidence = run.evidence.length > 0;
  const hasComplianceChecks = run.complianceChecks.length > 0;
  const rejectionPressure = run.rejectedCount > run.qualifiedCount;
  const blocked =
    reviewedCandidates === 0 ||
    run.qualityScore < 60 ||
    !hasEvidence ||
    !hasComplianceChecks;
  const needsReview =
    !blocked &&
    (run.qualityScore < 80 || rejectionPressure || acceptanceRate < 40);
  const posture: SourceRunReviewPosture = blocked
    ? "blocked"
    : needsReview
      ? "needs_review"
      : "review_ready";

  return {
    posture,
    tone: posture === "blocked" ? "blocked" : posture === "needs_review" ? "warn" : "good",
    label: titleCase(posture),
    acceptanceRate,
    acceptanceRateLabel: `${acceptanceRate}% accepted`,
    reviewedCandidates,
    topEvidenceLabel: topEvidence
      ? `${topEvidence.label}: ${topEvidence.value} (${topEvidence.confidence}%)`
      : "No evidence recorded",
    topRejectionLabel: topRejection
      ? `${topRejection.reason} (${topRejection.count})`
      : "No rejection group recorded",
    complianceSummary: hasComplianceChecks
      ? `${run.complianceChecks.length} check${run.complianceChecks.length === 1 ? "" : "s"} recorded`
      : "No compliance checks recorded",
    decisionDetail:
      posture === "review_ready"
        ? "Evidence quality, acceptance rate, and compliance checks are ready for outreach review."
        : posture === "needs_review"
          ? "Review evidence quality, rejection pressure, and accepted leads before campaign enrollment."
          : "Do not enroll this source batch until evidence, compliance checks, and quality posture are complete.",
  };
}
