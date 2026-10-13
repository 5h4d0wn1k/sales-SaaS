import { absoluteUrl, buildVisibleAnswerListJsonLd, siteConfig } from "./seo";

export function buildContactPageJsonLd() {
  const organization = {
    "@type": "Organization",
    name: siteConfig.name,
    url: absoluteUrl("/"),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ContactPage",
        name: "Contact Winrate",
        url: absoluteUrl("/contact"),
        description:
          "Contact Winrate for beta onboarding, managed sales implementation, provider-readiness review, billing questions, or AI-assisted sales workflow planning.",
        isPartOf: {
          "@type": "WebSite",
          name: siteConfig.name,
          url: absoluteUrl("/"),
        },
        about: {
          "@type": "SoftwareApplication",
          name: siteConfig.name,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: absoluteUrl("/"),
          description: siteConfig.description,
        },
      },
      {
        ...organization,
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "sales",
            email: "hello@winrate.ai",
            availableLanguage: ["English"],
            areaServed: "Worldwide",
          },
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "hello@winrate.ai",
            availableLanguage: ["English"],
            areaServed: "Worldwide",
          },
        ],
      },
      {
        "@type": "Service",
        name: "Winrate AI sales onboarding and managed rollout intake",
        url: absoluteUrl("/contact"),
        serviceType: "AI-assisted sales operations onboarding",
        provider: organization,
        areaServed: "Worldwide",
        audience: [
          { "@type": "BusinessAudience", audienceType: "Founders" },
          { "@type": "BusinessAudience", audienceType: "Agencies" },
          { "@type": "BusinessAudience", audienceType: "SMB sales teams" },
          { "@type": "BusinessAudience", audienceType: "Local service businesses" },
          { "@type": "BusinessAudience", audienceType: "B2B SaaS teams" },
          { "@type": "BusinessAudience", audienceType: "Professional services firms" },
        ],
        description:
          "Reviewed intake for business context, lead goals, source planning, approval-gated outreach, meetings, provider readiness, Telegram command-center rollout, and managed implementation support.",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Contact",
            item: absoluteUrl("/contact"),
          },
        ],
      },
      buildVisibleAnswerListJsonLd("Contact intake questions answered on this page", [
        {
          question: "Does submitting the contact form start lead sourcing or outreach?",
          answer:
            "No. The contact form creates a reviewed intake request only. Live sourcing, outreach, provider work, Telegram actions, and billing-sensitive steps still require the normal workspace setup, provider readiness, role, and approval gates.",
        },
        {
          question: "Can Winrate help with Telegram command-center setup?",
          answer:
            "Yes. Teams can request Telegram command-center rollout review, including deployment-side secret readiness, verified chat binding, allowlisted read-only commands, approval-gated pause proposals, replay protection, rate limits, and audit visibility.",
        },
        {
          question: "What context should a business include?",
          answer:
            "Include company context, offer, target audience, monthly lead goal, timeline, budget posture, preferred channels, rollout blockers, and whether you need software onboarding, managed implementation, provider-readiness review, or billing support.",
        },
      ]),
    ],
  };
}
