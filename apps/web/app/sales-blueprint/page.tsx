import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Search, ShieldCheck } from "lucide-react";
import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import {
  absoluteUrl,
  buildVisibleAnswerListJsonLd,
  getDefaultOpenGraphImage,
  getDefaultTwitterCard,
  jsonLd,
  siteConfig,
} from "@/lib/seo";
import { BlueprintPlanner } from "./blueprint-planner";

export const metadata: Metadata = {
  title: "AI Sales Blueprint Builder",
  description:
    "Build a claim-safe sales blueprint for ICP, source channels, outreach channels, approval gates, lead targets, meeting targets, and rollout readiness.",
  alternates: {
    canonical: "/sales-blueprint",
  },
  openGraph: {
    title: "AI Sales Blueprint Builder",
    description:
      "A public planning tool for turning business context into a reviewable sales blueprint before lead generation or outreach.",
    url: "/sales-blueprint",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
  twitter: getDefaultTwitterCard(
    "AI Sales Blueprint Builder",
    "Turn business context into a reviewable sales blueprint before lead generation or outreach.",
  ),
};

const blueprintFaqs = [
  {
    question: "Does the Sales Blueprint Builder scrape leads?",
    answer:
      "No. It scores readiness for source planning, outreach review, and rollout. Live sourcing still depends on configured providers, evidence review, usage limits, and approval gates.",
  },
  {
    question: "Why does the blueprint include approval gates?",
    answer:
      "Lead generation and outreach can create compliance, brand, cost, and deliverability risk. Winrate keeps high-impact actions reviewable before they run.",
  },
  {
    question: "Can this become a workspace Sales Blueprint?",
    answer:
      "Yes. The builder can hand context into contact intake or a new workspace, where the authenticated Sales Blueprint stores ICP, channels, targets, guardrails, and readiness gaps.",
  },
];

export default function SalesBlueprintPage() {
  const blueprintJsonLd = jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "AI Sales Blueprint Builder",
        url: absoluteUrl("/sales-blueprint"),
        description: metadata.description,
        isPartOf: {
          "@type": "WebSite",
          name: siteConfig.name,
          url: absoluteUrl("/"),
        },
        about: [
          "sales blueprint",
          "AI sales planning",
          "lead generation strategy",
          "approval-gated outreach",
        ],
      },
      {
        "@type": "SoftwareApplication",
        name: "Winrate AI Sales Blueprint Builder",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      buildVisibleAnswerListJsonLd(
        "Sales Blueprint questions answered on this page",
        blueprintFaqs,
      ),
    ],
  });

  return (
    <>
      <HeroHeader />
      <main className="min-h-screen bg-[#faf9f7] px-6 pb-16 pt-28 text-slate-950">
        <div className="mx-auto max-w-6xl">
          <BlueprintPlanner />

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: ClipboardCheck,
                title: "What this builds",
                detail:
                  "A structured readiness view of ICP clarity, lead targets, source channels, outreach channels, approval gates, and rollout gaps.",
              },
              {
                icon: Search,
                title: "What happens next",
                detail:
                  "The blueprint can seed a contact review or workspace setup where source-run evidence, dedupe, and lead quality are reviewed before outreach.",
              },
              {
                icon: ShieldCheck,
                title: "What stays guarded",
                detail:
                  "It keeps source planning, meeting assumptions, outreach, and compliance posture visible without promising outcomes across every channel and region.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                    <Icon className="h-4 w-4 text-slate-700" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-950">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                </article>
              );
            })}
          </section>

          <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Workspace handoff
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  Save the real version inside an authenticated workspace.
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  The public builder is a planning surface. The workspace Sales Blueprint is where
                  owners can persist ICP details, targets, compliance notes, approval policy, and
                  readiness gaps for downstream lead and outreach workflows.
                </p>
              </div>
              <Link
                href="/get-started"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
              >
                Start workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: blueprintJsonLd }}
        />
      </main>
      <MarketingFooter />
    </>
  );
}
