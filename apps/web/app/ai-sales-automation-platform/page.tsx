import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  Layers3,
  Search,
  ShieldCheck,
  Target,
} from "lucide-react";
import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import {
  buildSalesAutomationPlatformContactUrl,
  buildSalesAutomationPlatformGetStartedUrl,
  buildSalesAutomationPlatformPricingUrl,
} from "@/lib/sales-automation-platform-context";
import {
  absoluteUrl,
  buildVisibleAnswerListJsonLd,
  getDefaultOpenGraphImage,
  jsonLd,
  siteConfig,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI sales automation platform for governed lead generation and outreach",
  description:
    "Evaluate Winrate as an AI sales automation platform for Sales Blueprint context, lead source evidence, approval-gated outreach, meeting conversion, revenue visibility, Telegram command control, provider readiness, and audit evidence.",
  keywords: [
    "AI sales automation platform",
    "AI sales platform",
    "sales automation SaaS",
    "AI lead generation and outreach platform",
    "AI sales operating system",
    "AI revenue execution platform",
  ],
  alternates: {
    canonical: "/ai-sales-automation-platform",
  },
  openGraph: {
    title: "AI sales automation platform for governed lead generation and outreach",
    description:
      "A governed sales workspace for business context, lead evidence, approved outreach, meeting conversion, Telegram command visibility, billing controls, and audit evidence.",
    url: "/ai-sales-automation-platform",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const systemRows = [
  {
    layer: "Business context",
    status: "Implemented",
    detail:
      "Sales Blueprint captures ICP, targets, source channels, outreach channels, constraints, guardrails, and readiness signals.",
  },
  {
    layer: "Lead generation",
    status: "Guarded",
    detail:
      "Source planning and source-run evidence expose accepted leads, rejected leads, quality score, freshness, and next action before outreach.",
  },
  {
    layer: "Outreach",
    status: "Approval-gated",
    detail:
      "Sequence planning, campaign drafts, provider readiness, suppression posture, and dispatch controls stay behind review gates.",
  },
  {
    layer: "Meetings",
    status: "Manual handoff",
    detail:
      "Operators can schedule meetings, use manual calendar handoff, record outcomes, capture value, and export CRM/revenue evidence.",
  },
  {
    layer: "Command center",
    status: "Read-only + proposals",
    detail:
      "Telegram and in-app command previews show briefs, forecasts, policies, and proposal paths without direct high-impact mutation.",
  },
] as const;

const workflowRows = [
  [
    "1",
    "Capture the Sales Blueprint",
    "Define offer, ICP, buyer roles, channels, targets, regions, compliance notes, and automation boundaries before sourcing begins.",
  ],
  [
    "2",
    "Review source evidence",
    "Inspect source runs, lead fit, dedupe posture, rejection reasons, freshness, provider mode, and source next actions.",
  ],
  [
    "3",
    "Plan approved outreach",
    "Review sequence order, candidate leads, sample copy, channel fit, suppression posture, provider readiness, and proposal gates.",
  ],
  [
    "4",
    "Convert through meetings",
    "Use call posture, meeting handoff, outcome capture, actual value, CRM export, revenue reconciliation, and forecast review.",
  ],
  [
    "5",
    "Operate with command visibility",
    "Use Telegram and in-app previews for safe status, policy explanations, sequence readiness, forecast posture, and proposals.",
  ],
] as const;

const buyerChecks = [
  {
    icon: Search,
    title: "Lead quality before volume",
    detail:
      "A real sales platform needs source evidence, rejection reasons, dedupe posture, and freshness before increasing lead volume.",
  },
  {
    icon: ClipboardCheck,
    title: "Approvals before outreach",
    detail:
      "Email, call, provider, campaign, Telegram, billing, and AI-worker actions need visible policy outcomes before risky work starts.",
  },
  {
    icon: Bot,
    title: "AI control without black-box autonomy",
    detail:
      "AI and Telegram are useful when they explain status, propose safe next actions, and leave sensitive mutations to eligible operators.",
  },
] as const;

const guardrails = [
  "No broad live source expansion, enrichment spend, or sourcing-channel expansion from a public page",
  "No hidden email sends, calls, social actions, SMS, or provider work",
  "No direct Telegram mutation of campaigns, calls, billing, providers, or AI-worker execution",
  "No promised lead, meeting, revenue, or conversion outcome",
] as const;

const platformJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Winrate AI sales automation platform",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/ai-sales-automation-platform"),
      description: metadata.description,
      offers: {
        "@type": "Offer",
        url: absoluteUrl("/pricing"),
        availability: "https://schema.org/InStock",
      },
    },
    buildVisibleAnswerListJsonLd(
      "AI sales automation platform buyer questions answered on this page",
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
          name: "AI Sales Automation Platform",
          item: absoluteUrl("/ai-sales-automation-platform"),
        },
      ],
    },
  ],
};

export default function AiSalesAutomationPlatformPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(platformJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800">
                <Layers3 className="size-4" />
                AI sales automation platform
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-normal text-slate-950 md:text-6xl">
                Run the full sales workflow without turning AI into a black box.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Winrate connects business context, source evidence, approval-gated outreach,
                meeting conversion, revenue visibility, Telegram command posture, provider
                readiness, billing controls, and audit evidence in one governed sales workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildSalesAutomationPlatformGetStartedUrl("workspace_start")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Start sales workspace
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={buildSalesAutomationPlatformContactUrl("rollout_review")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-50"
                >
                  Request platform rollout
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Operating system map
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  One workflow with the guardrails visible
                </h2>
              </div>
              <div className="divide-y">
                {systemRows.map((row) => (
                  <div
                    key={row.layer}
                    className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[8.5rem_9.5rem_1fr]"
                  >
                    <span className="font-semibold text-slate-950">{row.layer}</span>
                    <span className="w-fit rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
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
                <p className="text-sm font-semibold text-teal-800">End-to-end revenue workflow</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 md:text-3xl">
                  From business context to reviewed leads to approved work to revenue evidence
                </h2>
              </div>
              <Link
                href="/compare-sales-tools"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Compare platform options
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
                    <span className="font-semibold text-teal-800">{step}</span>
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
                  <Icon className="size-5 text-teal-700" />
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
              <h2 className="mt-4 text-xl font-bold text-slate-950">
                Plan, provider, and managed rollout fit
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                The right rollout depends on lead volume, included channels, provider-cost budget,
                Telegram setup, source quality, approval posture, and whether the team needs
                managed implementation support.
              </p>
              <Link
                href={buildSalesAutomationPlatformPricingUrl("pricing_review")}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Compare platform plans
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white md:p-8">
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white">
                <ShieldCheck className="size-4" />
                Claim-safe platform path
              </div>
              <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-normal">
                Grow into autonomy only after the evidence and controls exist.
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
                  href={buildSalesAutomationPlatformGetStartedUrl("full_workflow_review")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
                >
                  Start full workflow review
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={buildSalesAutomationPlatformContactUrl("telegram_review")}
                  className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Scope Telegram control
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
