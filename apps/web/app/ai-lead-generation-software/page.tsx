import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Database,
  FileSearch,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import {
  buildLeadGenerationContactUrl,
  buildLeadGenerationGetStartedUrl,
  buildLeadGenerationPricingUrl,
} from "@/lib/lead-generation-context";
import {
  absoluteUrl,
  buildVisibleAnswerListJsonLd,
  getDefaultOpenGraphImage,
  jsonLd,
  siteConfig,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI lead generation software with source evidence and approval gates",
  description:
    "Evaluate Winrate as AI lead generation software for Sales Blueprint context, source-channel planning, lead evidence, dedupe review, approval-gated outreach, meetings, and revenue handoff.",
  keywords: [
    "AI lead generation software",
    "lead generation platform",
    "B2B lead generation software",
    "AI prospecting software",
    "multi-channel lead generation",
    "lead source planning",
  ],
  alternates: {
    canonical: "/ai-lead-generation-software",
  },
  openGraph: {
    title: "AI lead generation software with source evidence and approval gates",
    description:
      "A governed lead-generation workspace for source planning, evidence review, outreach handoff, meetings, and audit-safe growth.",
    url: "/ai-lead-generation-software",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const sourceRows = [
  {
    source: "Website and offer signals",
    status: "Context-first",
    detail:
      "Use the buyer's site, offer, regions, proof points, and disqualifiers before generating source plans.",
  },
  {
    source: "Search and directory paths",
    status: "Evidence review",
    detail:
      "Inspect freshness, duplicate posture, rejection reasons, and provider mode before records enter outreach review.",
  },
  {
    source: "Email and call handoff",
    status: "Approval-gated",
    detail:
      "Campaign and voice work remain behind plan, role, email-verification, suppression, provider, and approval checks.",
  },
  {
    source: "LinkedIn-style and SMS paths",
    status: "Guarded roadmap",
    detail:
      "LinkedIn remains review-gated and SMS remains roadmap; the page does not claim auto-connect, auto-DM, or SMS dispatch.",
  },
] as const;

const workflowRows = [
  [
    "1",
    "Capture Sales Blueprint",
    "ICP, offer, regions, targets, constraints, source channels, outreach channels, and readiness gaps.",
  ],
  [
    "2",
    "Plan source channels",
    "Rank website, search, directory, referral, content, and target-account paths by fit and provider readiness.",
  ],
  [
    "3",
    "Review lead evidence",
    "Show quality score, evidence snippets, dedupe state, freshness, compliance checks, and rejection reasons.",
  ],
  [
    "4",
    "Prepare outreach handoff",
    "Turn reviewed records into approval-gated email, call, and LinkedIn-style sequence planning.",
  ],
  [
    "5",
    "Track meetings and value",
    "Schedule manual meetings, record outcomes, capture actual contract value, and export CRM/revenue handoffs.",
  ],
] as const;

const guardrails = [
  "No claim that every source can be scraped live",
  "No hidden enrichment purchase",
  "No send, call, social, SMS, or Telegram mutation before workspace gates",
  "No promised meeting, revenue, or conversion outcome",
] as const;

const buyerChecks = [
  {
    icon: FileSearch,
    title: "Evidence before volume",
    detail:
      "Operators should see why a lead was accepted, rejected, deduplicated, or blocked before the first outreach plan is approved.",
  },
  {
    icon: ShieldCheck,
    title: "Approval before execution",
    detail:
      "The safest lead-generation system separates planning, review, approval, provider dispatch, and audit evidence.",
  },
  {
    icon: CalendarCheck,
    title: "Conversion feedback",
    detail:
      "Meetings, outcomes, and actual contract value should feed back into source strategy instead of stopping at a lead list.",
  },
] as const;

const leadGenerationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Winrate AI lead generation software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/ai-lead-generation-software"),
      description: metadata.description,
      offers: {
        "@type": "Offer",
        url: absoluteUrl("/pricing"),
        availability: "https://schema.org/InStock",
      },
    },
    buildVisibleAnswerListJsonLd(
      "AI lead generation software buyer questions answered on this page",
      buyerChecks.map((check) => ({
        question: check.title,
        answer: check.detail,
      })),
    ),
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
          name: "AI Lead Generation Software",
          item: absoluteUrl("/ai-lead-generation-software"),
        },
      ],
    },
  ],
};

export default function AiLeadGenerationSoftwarePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(leadGenerationJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800">
                <Database className="size-4" />
                AI lead generation software
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-normal text-slate-950 md:text-6xl">
                Generate better pipeline by proving the source plan first.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Winrate turns business context into source-channel plans, reviewable lead evidence,
                approval-gated outreach handoff, meeting follow-through, and revenue feedback
                without pretending every source or channel should run unattended.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildLeadGenerationGetStartedUrl("workspace_start")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Start lead workspace
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={buildLeadGenerationContactUrl("rollout_review")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-50"
                >
                  Request source-plan review
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Source evidence board
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">What buyers inspect</h2>
              </div>
              <div className="divide-y">
                {sourceRows.map((row) => (
                  <div
                    key={row.source}
                    className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[8rem_8rem_1fr]"
                  >
                    <span className="font-semibold text-slate-950">{row.source}</span>
                    <span className="w-fit rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      {row.status}
                    </span>
                    <span className="leading-6 text-slate-600">{row.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-18">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-800">Operating workflow</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 md:text-3xl">
                  From business context to reviewed leads to meetings
                </h2>
              </div>
              <Link
                href="/resources/ai-lead-generation-channels-source-plan"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Read source-plan guide
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="hidden grid-cols-[4rem_13rem_minmax(0,1fr)] border-b bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:grid">
                <span>Step</span>
                <span>Workflow</span>
                <span>Review evidence</span>
              </div>
              <div className="divide-y">
                {workflowRows.map(([step, workflow, evidence]) => (
                  <div
                    key={workflow}
                    className="grid gap-3 px-4 py-4 text-sm sm:grid-cols-[4rem_13rem_minmax(0,1fr)] sm:items-center"
                  >
                    <span className="font-semibold text-emerald-800">{step}</span>
                    <span className="font-semibold text-slate-950">{workflow}</span>
                    <span className="leading-6 text-slate-600">{evidence}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-stone-50/70 py-14 md:py-18">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-3">
            {buyerChecks.map((check) => {
              const Icon = check.icon;

              return (
                <div key={check.title} className="rounded-lg border border-slate-200 bg-white p-5">
                  <Icon className="size-5 text-emerald-700" />
                  <h2 className="mt-4 text-xl font-bold text-slate-950">{check.title}</h2>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{check.detail}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="py-14 md:py-18">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-[0.82fr_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <Gauge className="size-5 text-blue-700" />
              <h2 className="mt-4 text-xl font-bold text-slate-950">Plan and provider fit</h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Lead generation needs plan limits, provider-cost budgets, channel entitlements,
                and launch blockers visible before the team scales source runs or outreach review.
              </p>
              <Link
                href={buildLeadGenerationPricingUrl("pricing_review")}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Compare lead-generation plans
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white md:p-8">
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white">
                <Sparkles className="size-4" />
                Claim-safe growth path
              </div>
              <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-normal">
                Build the lead engine, then expand automation where the evidence is strong.
              </h2>
              <ul className="mt-5 grid gap-3">
                {guardrails.map((guardrail) => (
                  <li key={guardrail} className="flex gap-3 text-sm leading-6 text-slate-300">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-400" />
                    <span>{guardrail}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildLeadGenerationGetStartedUrl("source_plan")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
                >
                  Start source plan
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={buildLeadGenerationContactUrl("blueprint_review")}
                  className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Scope blueprint review
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
