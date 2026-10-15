import type { PlanUpgradeRecommendation } from "@sales/shared";

export type UpgradeRecommendationCta = Pick<
  PlanUpgradeRecommendation,
  "planKey" | "planName" | "description" | "checkoutPath"
>;

type UpgradeSearchParams = {
  upgradePlan?: string;
  upgradeName?: string;
  upgradeDescription?: string;
  upgradeCheckout?: string;
};

const MAX_PARAM_LENGTH = 240;

function safeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PARAM_LENGTH) {
    return null;
  }

  return trimmed;
}

function safeCheckoutPath(value: unknown) {
  const path = safeText(value);
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  const url = new URL(path, "http://localhost");
  if (url.pathname !== "/get-started" && url.pathname !== "/pricing" && url.pathname !== "/billing") {
    return null;
  }

  return `${url.pathname}${url.search}`;
}

export function normalizeUpgradeRecommendation(value: unknown): UpgradeRecommendationCta | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<PlanUpgradeRecommendation>;
  const planKey = safeText(candidate.planKey);
  const planName = safeText(candidate.planName);
  const description = safeText(candidate.description);
  const checkoutPath = safeCheckoutPath(candidate.checkoutPath);

  if (!planKey || !planName || !description || !checkoutPath) {
    return null;
  }

  return {
    planKey,
    planName,
    description,
    checkoutPath,
  };
}

export function appendUpgradeSearchParams(pathname: string, upgrade: UpgradeRecommendationCta) {
  const url = new URL(pathname, "http://localhost");
  url.searchParams.set("upgradePlan", upgrade.planKey);
  url.searchParams.set("upgradeName", upgrade.planName);
  url.searchParams.set("upgradeDescription", upgrade.description);
  url.searchParams.set("upgradeCheckout", upgrade.checkoutPath);
  return `${url.pathname}${url.search}`;
}

export function readUpgradeSearchParams(
  searchParams: UpgradeSearchParams | null | undefined,
): UpgradeRecommendationCta | null {
  if (!searchParams) {
    return null;
  }

  return normalizeUpgradeRecommendation({
    planKey: searchParams.upgradePlan,
    planName: searchParams.upgradeName,
    description: searchParams.upgradeDescription,
    checkoutPath: searchParams.upgradeCheckout,
  });
}
