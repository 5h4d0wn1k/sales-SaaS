import { afterEach, describe, expect, it, vi } from "vitest";

async function loadContactSeo() {
  vi.resetModules();
  return import("../lib/contact-seo");
}

type JsonLdNode = {
  "@type": string;
  name?: string;
  url?: string;
  contactPoint?: Array<{
    "@type": string;
    contactType: string;
    email: string;
  }>;
  serviceType?: string;
  audience?: Array<{
    "@type": string;
    audienceType: string;
  }>;
  itemListElement?: Array<{
    "@type": string;
    position: number;
    item: {
      "@type": string;
      name: string;
      description: string;
    };
  }>;
};

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("contact structured data", () => {
  it("builds a claim-safe contact graph for sales intake conversion", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.salesxgrowth.com");
    const { buildContactPageJsonLd } = await loadContactSeo();
    const jsonLd = buildContactPageJsonLd();
    const graph = jsonLd["@graph"] as JsonLdNode[];
    const contactPage = graph.find((node) => node["@type"] === "ContactPage");
    const organization = graph.find(
      (node) => node["@type"] === "Organization",
    );
    const service = graph.find((node) => node["@type"] === "Service");
    const answerList = graph.find(
      (node) =>
        node["@type"] === "ItemList" &&
        node.name === "Contact intake questions answered on this page",
    );

    expect(contactPage).toMatchObject({
      name: "Contact salesxgrowth",
      url: "https://app.salesxgrowth.com/contact",
    });
    expect(organization?.contactPoint).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contactType: "sales",
          email: "hello@salesxgrowth.com",
        }),
        expect.objectContaining({
          contactType: "customer support",
          email: "hello@salesxgrowth.com",
        }),
      ]),
    );
    expect(service).toMatchObject({
      name: "salesxgrowth AI sales onboarding and managed rollout intake",
      serviceType: "AI-assisted sales operations onboarding",
      url: "https://app.salesxgrowth.com/contact",
    });
    expect(service?.audience?.map((item) => item.audienceType)).toEqual(
      expect.arrayContaining([
        "Founders",
        "Agencies",
        "SMB sales teams",
        "Local service businesses",
        "B2B SaaS teams",
        "Professional services firms",
      ]),
    );
    expect(graph.map((node) => node["@type"])).not.toContain("FAQPage");
    expect(answerList?.itemListElement?.map((entry) => entry.item.name)).toEqual(
      expect.arrayContaining([
        "Does submitting the contact form start lead sourcing or outreach?",
        "Can salesxgrowth help with Telegram command-center setup?",
      ]),
    );
  });

  it("keeps contact structured data away from unsupported automation claims", async () => {
    const { buildContactPageJsonLd } = await loadContactSeo();
    const copy = JSON.stringify(buildContactPageJsonLd()).toLowerCase();

    expect(copy).not.toContain("guaranteed meetings");
    expect(copy).not.toContain("guaranteed revenue");
    expect(copy).not.toContain("fully autonomous");
    expect(copy).not.toContain("universal live scraping");
    expect(copy).not.toContain("control everything from telegram");
  });
});
