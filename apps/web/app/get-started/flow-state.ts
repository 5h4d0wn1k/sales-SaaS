import { PRICING_PLANS } from "@sales/shared";

export type GetStartedStep = "auth" | "plan_selection" | "checkout" | "success";
export type CheckoutState = "canceled" | null;
export type InviteQueryContext = {
  inviteToken?: string | null;
  inviteEmail?: string | null;
  inviteWorkspace?: string | null;
  inviteOrganization?: string | null;
};
export type AcquisitionQueryContext = Record<string, string | null | undefined>;

const validPlanKeys = new Set(PRICING_PLANS.map((plan) => plan.key));
const acquisitionParamKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "solutionSegment",
  "segment",
  "monthlyLeadGoal",
  "budgetRange",
  "roiQualifiedRate",
  "roiMeetingRate",
  "roiCloseRate",
  "roiAcv",
  "roiBudget",
  "roiHoursSaved",
  "roiAnnualNet",
  "blueprintSegment",
  "blueprintIndustry",
  "blueprintAudience",
  "blueprintMeetings",
  "blueprintAcv",
  "blueprintReadiness",
  "blueprintLevel",
  "blueprintSources",
  "blueprintOutreach",
  "blueprintRegions",
  "blueprintConstraints",
  "pricingIntent",
  "resource",
  "resourceIntent",
  "platformIntent",
  "aiSdrIntent",
  "leadGenIntent",
  "outboundIntent",
  "meetingIntent",
  "telegramIntent",
  "comparisonIntent",
] as const;

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

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function readAcquisitionQueryContext(
  params?: Record<string, string | string[] | undefined> | null,
): AcquisitionQueryContext | undefined {
  if (!params) {
    return undefined;
  }

  const acquisition: AcquisitionQueryContext = {};

  for (const key of acquisitionParamKeys) {
    const value = firstParam(params[key])?.trim();

    if (value) {
      acquisition[key] = value.slice(0, 500);
    }
  }

  return Object.keys(acquisition).length ? acquisition : undefined;
}

export function buildGetStartedUrl({
  planKey,
  step,
  checkout,
  invite,
  acquisition,
}: {
  planKey?: string;
  step?: GetStartedStep | null;
  checkout?: CheckoutState;
  invite?: InviteQueryContext;
  acquisition?: AcquisitionQueryContext | null;
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

  if (acquisition) {
    for (const key of acquisitionParamKeys) {
      const value = acquisition[key]?.trim();

      if (value) {
        params.set(key, value.slice(0, 500));
      }
    }
  }

  return `/get-started?${params.toString()}`;
}

export function buildDashboardUrl(
  checkoutOrOptions?:
    | "success"
    | {
        checkout?: "success";
        planKey?: string;
        acquisition?: AcquisitionQueryContext | null;
      },
) {
  const options =
    typeof checkoutOrOptions === "string"
      ? { checkout: checkoutOrOptions }
      : checkoutOrOptions;
  const params = new URLSearchParams();

  if (options?.checkout) {
    params.set("checkout", options.checkout);
  }

  if (options?.planKey) {
    params.set("plan", normalizePlanKey(options.planKey));
  }

  if (options?.acquisition) {
    for (const key of acquisitionParamKeys) {
      const value = options.acquisition[key]?.trim();

      if (value) {
        params.set(key, value.slice(0, 500));
      }
    }
  }

  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

function acquisitionSourceLabel(acquisition?: AcquisitionQueryContext | null) {
  const source = acquisition?.utm_source?.trim();

  if (!source) {
    return undefined;
  }

  return source.slice(0, 120);
}

export function buildSalesBlueprintBuilderUrl(acquisition?: AcquisitionQueryContext | null) {
  const params = new URLSearchParams();
  params.set("utm_source", "get_started");
  params.set("utm_medium", "activation_flow");
  params.set("utm_campaign", "blueprint_checkpoint");

  const priorSource = acquisitionSourceLabel(acquisition);
  if (priorSource) {
    params.set("sourceContext", priorSource);
  }

  return `/sales-blueprint?${params.toString()}`;
}

export function buildBlueprintReviewContactUrl(acquisition?: AcquisitionQueryContext | null) {
  const params = new URLSearchParams();
  params.set("intent", "managed_services");
  params.set("utm_source", "get_started");
  params.set("utm_medium", "activation_flow");
  params.set("utm_campaign", "blueprint_checkpoint");
  params.set("managedIntent", "blueprint_checkpoint_review");

  const priorSource = acquisitionSourceLabel(acquisition);
  if (priorSource) {
    params.set("sourceContext", priorSource);
  }

  return `/contact?${params.toString()}`;
}
