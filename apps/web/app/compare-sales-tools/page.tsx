import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  ClipboardList,
  Database,
  FileSearch,
  Gauge,
  Handshake,
  Layers3,
  MailCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import {
  buildComparisonContactUrl,
  buildComparisonGetStartedUrl,
} from "@/lib/comparison-context";
import {
  absoluteUrl,
  buildVisibleAnswerListJsonLd,
  getDefaultOpenGraphImage,
  jsonLd,
  siteConfig,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Compare AI sales software, CRMs, outreach tools, lead lists, and agencies",
  description:
    "Compare salesxgrowth with CRM-only tools, outreach sequencers, lead-list vendors, sales agencies, and generic AI agents across lead planning, approval-gated outreach, meetings, Telegram visibility, billing controls, and audit evidence.",
  keywords: [
    "AI sales platform comparison",
    "compare sales automation tools",
    "AI sales software vs CRM",
    "AI sales agent vs outreach tool",
    "lead generation software comparison",
    "sales agency alternative",
    "outbound sales software comparison",
  ],
  alternates: {
    canonical: "/compare-sales-tools",
  },
  openGraph: {
    title: "Compare AI sales software, CRMs, outreach tools, lead lists, and agencies",
    description:
      "A claim-safe buyer guide for choosing a governed sales workspace instead of stitching together CRM, lead lists, outreach tools, agencies, and generic AI agents.",
    url: "/compare-sales-tools",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const comparisonContactUrl = buildComparisonContactUrl("rollout_review");
const comparisonGetStartedUrl = buildComparisonGetStartedUrl("workspace_start");

const comparisonRows = [
  {
    icon: Database,
    alternative: "CRM-only workflow",
    bestAt: "Accounts, contacts, opportunities, and manager reporting once the sales motion is already defined.",
    gap: "Usually does not create a Sales Blueprint, source evidence, approval gates, or provider-cost controls before outreach.",
    salesxgrowth:
      "Adds business-context capture, lead-source evidence, reviewed outreach, meeting handoff, billing visibility, and audit posture around the CRM workflow.",
    fit: "Use with CRM",
  },
  {
    icon: MailCheck,
    alternative: "Outreach sequencer",
    bestAt: "Email sequence execution, reply capture, and team activity cadence after lists and messaging are approved.",
    gap: "Can push volume faster than the team has inspected ICP fit, suppression posture, provider readiness, or brand risk.",
    salesxgrowth:
      "Keeps source review, draft campaign approval, suppression checks, channel entitlement, and provider acceptance visible before the first touch.",
    fit: "Govern before send",
  },
  {
    icon: FileSearch,
    alternative: "Lead-list or enrichment vendor",
    bestAt: "Finding records, adding firmographic fields, and supplying raw prospect data.",
    gap: "Often leaves quality scoring, rejection reasons, dedupe posture, consent review, and next action outside the buying workflow.",
    salesxgrowth:
      "Treats source runs as reviewable evidence with provider mode, dedupe count, quality score, rejection reasons, compliance checks, freshness, and next action.",
    fit: "Review before outreach",
  },
  {
    icon: BriefcaseBusiness,
    alternative: "Traditional sales agency",
    bestAt: "Human execution, strategy, and managed operational support for teams without internal bandwidth.",
    gap: "The customer may not see the operating system, evidence trail, approval policy, usage posture, or repeatable workflow.",
    salesxgrowth:
      "Combines software plus optional managed rollout so setup support, plan controls, approvals, and customer-owned decisions remain explicit.",
    fit: "Software plus support",
  },
  {
    icon: Bot,
    alternative: "Generic AI agent builder",
    bestAt: "Flexible prompts, custom automation experiments, and internal task assistants.",
    gap: "Broad agents can blur read-only, approval-gated, blocked, and live actions unless policy is modeled before execution.",
    salesxgrowth:
      "Models command previews, policy explanations, Approval Inbox proposals, AI-worker scopes, Telegram aliases, and blocked unsupported automation before mutation.",
    fit: "Control plane first",
  },
] as const;

const decisionRows = [
  ["Need pipeline next week", "Start with Sales Blueprint and source evidence, then choose self-serve or managed rollout."],
  ["Need more than email volume", "Use the workflow map for lead sourcing, outreach, calls, meetings, conversion, and revenue review."],
  ["Need Telegram control", "Use safe status, brief, sequence, forecast, provider, suppression, and pause-proposal commands."],
  ["Need fewer disconnected tools", "Keep plan limits, provider readiness, approvals, audit evidence, and handoff exports in one workspace."],
  ["Need stronger claims", "Do not buy on promises of certain revenue, broad scraping, or hands-off cross-channel execution."],
] as const;

const currentTruthRows = [
  ["Implemented", "Business onboarding, Sales Blueprint, pricing, billing visibility, meetings, manual CRM/revenue exports, provider readiness, and audit evidence."],
  ["Guarded beta", "Lead-source evidence, AI SDR workflow, voice dispatch foundation, Telegram command center, AI-worker control plane, and content demand planning."],
  ["Approval-gated", "Campaign creation, campaign approval, dispatch, calls, provider work, Telegram pause requests, and AI-worker task proposals."],
  ["Roadmap", "Writable CRM/calendar sync, deeper live provider integrations, SMS maturity, accounting sync, and broader autonomous execution."],
  ["Prohibited claim", "Unsupported scraping, browser automation, auto-connect, auto-DM, or certain meeting and revenue outcomes."],
] as const;

const faqs = [
  {
    question: "Is salesxgrowth a CRM replacement?",
    answer:
      "No. salesxgrowth is positioned as a governed sales workspace around business context, source evidence, approval-gated outreach, meetings, billing, and audit posture. CRM sync is a roadmap integration path, and manual CRM handoff exists today.",
  },
  {
    question: "Is salesxgrowth an outreach sequencer replacement?",
    answer:
      "salesxgrowth can create reviewed campaigns and dispatch approved work through configured or guarded providers, but its core difference is the control plane before send volume: source evidence, approvals, suppression checks, channel entitlements, provider readiness, and audit evidence.",
  },
  {
    question: "Is salesxgrowth a sales agency?",
    answer:
      "salesxgrowth is software first with optional managed rollout support. Managed support helps with setup, review cadence, and operating discipline, but it does not bypass product gates or customer-owned decisions.",
  },
  {
    question: "Can salesxgrowth run unattended sales across every channel?",
    answer:
      "No. Current public truth is approval-gated and guarded. Broader autonomous execution remains roadmap work and must stay behind provider, compliance, audit, cost, and owner-approval controls.",
  },
];

const comparisonJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Compare AI sales software, CRMs, outreach tools, lead lists, and agencies",
      url: absoluteUrl("/compare-sales-tools"),
      description: metadata.description,
      isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: absoluteUrl("/"),
      },
      about: [
        "AI sales platform comparison",
        "sales automation tool comparison",
        "CRM and outreach software comparison",
        "AI SDR software buying guide",
      ],
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
          name: "Compare Sales Tools",
          item: absoluteUrl("/compare-sales-tools"),
        },
      ],
    },
    buildVisibleAnswerListJsonLd(
      "Sales tool comparison questions answered on this page",
      faqs,
    ),
  ],
};

function StatusPill({ label }: { label: string }) {
  const tone =
    label === "Roadmap" || label === "Prohibited claim"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : label === "Implemented"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <span className={`w-fit rounded-md border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

export default function CompareSalesToolsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(comparisonJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800">
                <Layers3 className="size-4" />
                AI sales platform comparison
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-normal text-slate-950 md:text-6xl">
                Compare sales tools before you stitch together another fragile stack.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                CRMs, outreach tools, lead lists, agencies, and AI agents each solve part of the
                sales workflow. salesxgrowth is built as the governed workspace between business
                context, lead evidence, approval-gated outreach, meetings, Telegram visibility,
                plan controls, and audit evidence.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={comparisonGetStartedUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Start comparison workspace
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={comparisonContactUrl}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-50"
                >
                  Request stack review
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b bg-slate-50 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Buyer shortcut
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  When salesxgrowth is the better fit
                </h2>
              </div>
              <div className="divide-y">
                {decisionRows.map(([need, answer]) => (
                  <div key={need} className="grid gap-2 px-5 py-4 sm:grid-cols-[10rem_1fr]">
                    <span className="text-sm font-semibold text-slate-950">{need}</span>
                    <span className="text-sm leading-6 text-slate-600">{answer}</span>
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
                <p className="text-sm font-semibold text-teal-800">Comparison matrix</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 md:text-3xl">
                  What each sales tool is good at, and where salesxgrowth fits.
                </h2>
              </div>
              <Link
                href="/resources/ai-sales-crm-vs-outbound-workspace"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Read CRM comparison guide
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="grid grid-cols-[9rem_1fr] gap-3 border-b bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 md:grid-cols-[12rem_1fr_1fr_1fr_8rem]">
                <span>Alternative</span>
                <span>Best at</span>
                <span className="hidden md:block">Common gap</span>
                <span className="hidden md:block">salesxgrowth difference</span>
                <span className="hidden md:block">Fit</span>
              </div>
              <div className="divide-y">
                {comparisonRows.map((row) => {
                  const Icon = row.icon;

                  return (
                    <div
                      key={row.alternative}
                      className="grid gap-3 px-4 py-5 text-sm md:grid-cols-[12rem_1fr_1fr_1fr_8rem]"
                    >
                      <div className="flex items-start gap-2 font-semibold text-slate-950">
                        <Icon className="mt-0.5 size-4 shrink-0 text-teal-700" />
                        <span>{row.alternative}</span>
                      </div>
                      <p className="leading-6 text-slate-600">{row.bestAt}</p>
                      <p className="leading-6 text-slate-600">{row.gap}</p>
                      <p className="leading-6 text-slate-600">{row.salesxgrowth}</p>
                      <StatusPill label={row.fit} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-stone-50/70 py-14 md:py-18">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-800">
                <ShieldCheck className="size-4" />
                Claim-safe buying
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-normal text-slate-950">
                Buy the operating system the team can actually trust.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                The right comparison is not only feature count. It is whether the workflow captures
                enough context, exposes enough evidence, and blocks enough risky actions before
                your team scales volume.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="grid grid-cols-[8rem_1fr] gap-3 border-b bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span>Status</span>
                <span>Current truth</span>
              </div>
              {currentTruthRows.map(([status, truth]) => (
                <div
                  key={status}
                  className="grid grid-cols-[8rem_1fr] gap-3 border-b px-5 py-4 last:border-b-0"
                >
                  <StatusPill label={status} />
                  <p className="text-sm leading-6 text-slate-600">{truth}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-18">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <ClipboardList className="size-5 text-blue-700" />
              <h2 className="mt-4 text-xl font-bold text-slate-950">Blueprint before tools</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Capture offer, ICP, source channels, outreach channels, targets, constraints, and
                automation posture before choosing execution volume.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <Gauge className="size-5 text-emerald-700" />
              <h2 className="mt-4 text-xl font-bold text-slate-950">Controls before spend</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Keep plan limits, provider-cost budget, channel access, upgrade fit, and managed
                rollout needs visible before scaled provider work.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <Handshake className="size-5 text-amber-700" />
              <h2 className="mt-4 text-xl font-bold text-slate-950">Support without shortcuts</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Add managed support for setup and review cadence while keeping customer decisions,
                provider readiness, approvals, and suppression checks intact.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-16 md:pb-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white md:p-8">
              <div className="grid gap-8 lg:grid-cols-[1fr_0.7fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white">
                    <Sparkles className="size-4" />
                    Revenue path
                  </div>
                  <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-normal">
                    Turn the comparison into a reviewed workspace plan.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                    Bring your current CRM, outreach, lead-source, agency, and AI-agent context
                    into salesxgrowth. The next step is a reviewed setup path, not hidden live
                    automation.
                  </p>
                </div>
                <div className="grid gap-3">
                  <Link
                    href={comparisonGetStartedUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
                  >
                    Start workspace
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href={comparisonContactUrl}
                    className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Scope stack review
                  </Link>
                  <Link
                    href="/pricing?utm_source=sales_tool_comparison&utm_medium=seo_comparison&utm_campaign=pricing_review&comparisonIntent=pricing_review"
                    className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Compare plans
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
