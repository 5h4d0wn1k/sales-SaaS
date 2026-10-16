import { afterEach, describe, expect, it, vi } from "vitest";
import { PRICING_PLANS } from "@sales/shared";

async function loadPricingSeo() {
  vi.resetModules();
  return import("../lib/pricing-seo");
}

type PricingOffer = {
  name: string;
  url: string;
  price: string;
  priceCurrency: string;
  itemOffered: {
    additionalProperty: Array<{
      name: string;
      value: string | number;
    }>;
  };
};

type PricingSoftwareApplicationNode = {
  "@type": "SoftwareApplication";
  offers: {
    itemListElement: PricingOffer[];
  };
};

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("pricing structured data", () => {
  it("builds plan offers from the shared billing catalog", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.salesxgrowth.com");
    const { buildPricingPageJsonLd } = await loadPricingSeo();
    const jsonLd = buildPricingPageJsonLd();
    const appNode = jsonLd["@graph"].find(
      (node) => node["@type"] === "SoftwareApplication",
    ) as PricingSoftwareApplicationNode | undefined;
    const offers = appNode?.offers.itemListElement ?? [];

    expect(offers).toHaveLength(PRICING_PLANS.length);
    expect(offers.map((offer) => offer.name)).toEqual(
      PRICING_PLANS.map((plan) => `${plan.name} plan`),
    );

    for (const plan of PRICING_PLANS) {
      const offer = offers.find((entry) => entry.name === `${plan.name} plan`);

      expect(offer).toMatchObject({
        url: `https://app.salesxgrowth.com/get-started?plan=${plan.key}`,
        price: String(plan.price.usd),
        priceCurrency: "USD",
      });
      expect(offer?.itemOffered.additionalProperty).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Monthly lead limit",
            value: plan.usageLimit,
          }),
          expect.objectContaining({
            name: "Included channels",
            value: plan.includedChannels.join(", "),
          }),
        ]),
      );
    }
  });

  it("keeps pricing structured data claim-safe", async () => {
    const { buildPricingPageJsonLd } = await loadPricingSeo();
    const copy = JSON.stringify(buildPricingPageJsonLd()).toLowerCase();

    expect(copy).not.toContain("guaranteed meetings");
    expect(copy).not.toContain("fully autonomous");
    expect(copy).not.toContain("universal live lead scraping");
  });
});
