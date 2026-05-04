import { PRICING_PLANS } from "@sales/shared";

export type GetStartedStep = "auth" | "plan_selection" | "checkout" | "success";
export type CheckoutState = "canceled" | null;
export type InviteQueryContext = {
  inviteToken?: string | null;
  inviteEmail?: string | null;
  inviteWorkspace?: string | null;
  inviteOrganization?: string | null;
};

const validPlanKeys = new Set(PRICING_PLANS.map((plan) => plan.key));

export function normalizePlanKey(planKey?: string | null) {
  if (planKey && validPlanKeys.has(planKey)) {
    return planKey;
  }

  return "free";
}

export function normalizeRequestedStep(step?: string | null): GetStartedStep | null {
  switch (step) {
    case "auth":
    case "plan_selection":
    case "checkout":
    case "success":
      return step;
    default:
      return null;
  }
}

export function resolveInitialGetStartedStep({
  hasSession,
  planKey,
  requestedStep,
  checkoutState,
}: {
  hasSession: boolean;
  planKey: string;
  requestedStep?: GetStartedStep | null;
  checkoutState?: CheckoutState;
}) {
  if (!hasSession) {
    return "auth" satisfies GetStartedStep;
  }

  if (checkoutState === "canceled" && planKey !== "free") {
    return "checkout" satisfies GetStartedStep;
  }

  if (requestedStep === "checkout" && planKey !== "free") {
    return "checkout" satisfies GetStartedStep;
  }

  if (requestedStep === "success") {
    return "success" satisfies GetStartedStep;
  }

  return "plan_selection" satisfies GetStartedStep;
}

export function buildGetStartedUrl({
  planKey,
  step,
  checkout,
  invite,
}: {
  planKey?: string;
  step?: GetStartedStep | null;
  checkout?: CheckoutState;
  invite?: InviteQueryContext;
}) {
  const params = new URLSearchParams();
  params.set("plan", normalizePlanKey(planKey));

  if (step && step !== "auth") {
    params.set("step", step);
  }

  if (checkout) {
    params.set("checkout", checkout);
  }

  if (invite?.inviteToken) {
    params.set("invite", invite.inviteToken);
  }
  if (invite?.inviteEmail) {
    params.set("inviteEmail", invite.inviteEmail);
  }
  if (invite?.inviteWorkspace) {
    params.set("inviteWorkspace", invite.inviteWorkspace);
  }
  if (invite?.inviteOrganization) {
    params.set("inviteOrganization", invite.inviteOrganization);
  }

  return `/get-started?${params.toString()}`;
}

export function buildDashboardUrl(checkout?: "success") {
  if (!checkout) {
    return "/dashboard";
  }

  const params = new URLSearchParams();
  params.set("checkout", checkout);
  return `/dashboard?${params.toString()}`;
}
