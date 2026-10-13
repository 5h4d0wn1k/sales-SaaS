import {
  managedServicePackages,
  type ManagedServiceBudgetRange,
  type ManagedServicePackage,
  type ManagedServicePackageKey,
} from "@sales/shared";

export { managedServicePackages };
export type {
  ManagedServiceBudgetRange,
  ManagedServicePackage,
  ManagedServicePackageKey,
};

export type ManagedServicesContactSearchParams = Record<string, string | string[] | undefined> & {
  utm_source?: string | string[];
  utm_campaign?: string | string[];
  managedPackage?: string | string[];
  managedIntent?: string | string[];
};

export type ManagedServiceContactContext = {
  package: ManagedServicePackage;
  key: ManagedServicePackageKey;
  tier: string;
  intent: string;
  budgetRange: ManagedServiceBudgetRange;
  goals: string[];
};

export const managedServicesUtmSource = "managed_services";

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function getManagedServicePackage(packageKey: string | undefined) {
  return (
    managedServicePackages.find((managedPackage) => managedPackage.key === packageKey) ?? null
  );
}

export function buildManagedServiceContactUrl(
  packageKey: ManagedServicePackageKey,
  intent = "fit_call",
) {
  const params = new URLSearchParams({
    intent: "managed_services",
    utm_source: managedServicesUtmSource,
    utm_medium: "service_page",
    utm_campaign: packageKey,
    managedPackage: packageKey,
    managedIntent: intent,
  });

  return `/contact?${params.toString()}`;
}

export function parseManagedServiceContactContext(
  params: ManagedServicesContactSearchParams | undefined,
): ManagedServiceContactContext | null {
  const source = firstParam(params?.utm_source)?.trim();
  const explicitPackage = firstParam(params?.managedPackage)?.trim();

  if (source !== managedServicesUtmSource && !explicitPackage) {
    return null;
  }

  const requestedPackage =
    explicitPackage || firstParam(params?.utm_campaign)?.trim();
  const managedPackage = getManagedServicePackage(requestedPackage);

  if (!managedPackage) {
    return null;
  }

  return {
    package: managedPackage,
    key: managedPackage.key,
    tier: managedPackage.tier,
    intent: firstParam(params?.managedIntent)?.trim() || "fit_call",
    budgetRange: managedPackage.defaultBudgetRange,
    goals: [...managedPackage.recommendedGoals],
  };
}

export function formatManagedServiceContactMessage(context: ManagedServiceContactContext) {
  const managedPackage = context.package;

  return [
    `Managed services fit-call context attached for review: ${managedPackage.tier}.`,
    `Best fit: ${managedPackage.bestFor}.`,
    `Requested support: ${managedPackage.includes}.`,
    `Target outcome: ${managedPackage.outcome}.`,
    "Commercial boundary: software subscription, provider costs, and managed-service scope should stay separate.",
    "Guardrails: managed support does not bypass approval gates, suppression checks, provider readiness, or customer-owned decisions.",
    "Please review company fit, sales goal, team capacity, budget posture, provider needs, and the safest rollout path before any live provider work starts.",
  ].join("\n");
}
