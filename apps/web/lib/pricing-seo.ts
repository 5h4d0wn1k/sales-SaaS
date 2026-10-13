import type { PricingPlan } from "@sales/shared";
import { PRICING_PLANS } from "@sales/shared";
import { absoluteUrl, siteConfig } from "./seo";

function providerBudgetUsd(plan: PricingPlan) {
  return `$${(plan.providerCostBudgetCents / 100).toFixed(0)}`;
}

export function buildPricingPageJsonLd(plans: readonly PricingPlan[] = PRICING_PLANS) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Winrate Pricing",
        url: absoluteUrl("/pricing"),
        description:
          "Compare current public beta plans for AI-assisted lead planning, approval-gated outreach, dashboard visibility, billing controls, and managed rollout support.",
        isPartOf: {
          "@type": "WebSite",
          name: siteConfig.name,
          url: absoluteUrl("/"),
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "Winrate",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: siteConfig.description,
        offers: {
          "@type": "OfferCatalog",
          name: "Winrate public beta plans",
          itemListElement: plans.map((plan) => ({
            "@type": "Offer",
            name: `${plan.name} plan`,
            url: absoluteUrl(`/get-started?plan=${plan.key}`),
            price: String(plan.price.usd),
            priceCurrency: "USD",
            category: "Software subscription",
            itemOffered: {
              "@type": "Service",
              name: `Winrate ${plan.name}`,
              description: plan.description,
              additionalProperty: [
                {
                  "@type": "PropertyValue",
                  name: "Monthly lead limit",
                  value: plan.usageLimit,
                },
                {
                  "@type": "PropertyValue",
                  name: "Provider-cost budget",
                  value: providerBudgetUsd(plan),
                },
                {
                  "@type": "PropertyValue",
                  name: "Seats",
                  value: plan.seats >= 999 ? "Unlimited" : plan.seats,
                },
                {
                  "@type": "PropertyValue",
                  name: "Included channels",
                  value: plan.includedChannels.join(", "),
                },
              ],
            },
          })),
        },
      },
    ],
  };
}
