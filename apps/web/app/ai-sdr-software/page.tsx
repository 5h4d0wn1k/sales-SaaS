import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileSearch,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import {
  absoluteUrl,
  buildVisibleAnswerListJsonLd,
  getDefaultOpenGraphImage,
  jsonLd,
  siteConfig,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI SDR software for reviewable lead generation and outbound sales",
  description:
    "Evaluate salesxgrowth as AI SDR software for business context capture, lead evidence, approval-gated outreach, meetings, Telegram visibility, provider readiness, and audit-safe revenue operations.",
  keywords: [
    "AI SDR software",
    "AI sales agent",
    "AI outbound sales automation",
    "AI lead generation software",
    "sales automation platform",
  ],
  alternates: {
    canonical: "/ai-sdr-software",
  },
  openGraph: {
    title: "AI SDR software for reviewable lead generation and outbound sales",
    description:
      "A governed AI sales workspace for teams that want lead planning, outreach review, meeting follow-through, Telegram visibility, and audit evidence before scaling volume.",
    url: "/ai-sdr-software",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const contactUrl =
  "/contact?intent=managed_services&utm_source=ai_sdr_software&utm_medium=seo_landing&utm_campaign=ai_sdr_evaluation&aiSdrIntent=rollout_review";

const readinessRows = [
  {
    capability: "Business context",
    status: "Implemented",
    detail:
      "Sales Blueprint captures ICP, offer, source channels, outreach channels, targets, regions, compliance notes, and readiness gaps.",
  },
  {
    capability: "Lead sourcing",
    status: "Guarded beta",
    detail:
      "Source runs expose provider mode, quality score, evidence snippets, dedupe posture, rejection reasons, and next action before outreach.",
  },
  {
    capability: "Outreach execution",
    status: "Approval-gated",
    detail:
      "Draft campaigns, first-touch dispatch, voice work, and higher-risk provider actions remain behind role, email, plan, suppression, and provider checks.",
  },
  {
    capability: "Meeting conversion",
    status: "Implemented",
    detail:
      "Operators can schedule meetings, record outcomes, capture actual contract value, and export manual calendar, CRM, and revenue handoffs.",
  },
  {
    capability: "Telegram command center",
    status: "Beta",
    detail:
      "Safe commands return status, briefs, sequence readiness, forecasts, providers, and suppression checks; pause creates a review proposal.",
  },
  {
    capability: "AI worker control",
    status: "Guarded beta",
    detail:
      "Worker registry, scoped permissions, budget posture, execution ledger, and task proposals exist without autonomous external tool execution.",
  },
] as const;

const proofPoints = [
  "Context-first setup before any source or outreach recommendation",
  "Accepted and rejected lead evidence operators can inspect",
  "Approval Inbox before risky campaign, call, provider, Telegram, billing, or AI-worker actions",
  "Plan, provider-cost, included-channel, and usage boundaries before scaled work",
  "Sanitized audit visibility and manual evidence export for sensitive workflow review",
] as const;

const blockedClaims = [
  "No public promise of universal scraping or browser automation",
  "No Telegram command directly approves campaigns or changes billing",
  "No hidden live sends before provider, role, suppression, and approval checks",
  "No claim that revenue, meetings, or conversion outcomes are certain",
] as const;

const buyerChecklist = [
  ["ICP proof", "Can the AI SDR system explain the offer, audience, target, and disqualifiers?"],
  ["Evidence quality", "Can operators inspect why a lead was accepted, rejected, or deduplicated?"],
  ["Execution boundary", "Which actions are read-only, approval-gated, blocked, or live?"],
  ["Channel readiness", "Are email, voice, LinkedIn-style, Telegram, SMS, and roadmap channels labeled honestly?"],
  ["Commercial control", "Do plan limits, provider cost, upgrade fit, and managed rollout paths stay visible?"],
  ["Auditability", "Can owners review proposal, provider, Telegram, billing, and workflow evidence without raw payload leakage?"],
] as const;

const aiSdrJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "salesxgrowth AI SDR software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/ai-sdr-software"),
      description: metadata.description,
      offers: {
        "@type": "Offer",
        url: absoluteUrl("/pricing"),
        availability: "https://schema.org/InStock",
      },
    },
    buildVisibleAnswerListJsonLd(
      "AI SDR software buyer questions answered on this page",
      buyerChecklist.slice(0, 4).map(([question, answer]) => ({
        question,
        answer,
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
          name: "AI SDR Software",
          item: absoluteUrl("/ai-sdr-software"),
        },
      ],
    },
  ],
};

export default function AiSdrSoftwarePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(aiSdrJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800">
                <Bot className="size-4" />
                AI SDR software
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-normal text-slate-950 md:text-6xl">
                AI sales agents need a control plane before they need more volume.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                salesxgrowth helps teams move from business context to source evidence, reviewed
                outreach, meeting follow-through, Telegram visibility, and audit evidence without
                pretending every sales action should run unattended.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/get-started?utm_source=ai_sdr_software&utm_medium=seo_landing&utm_campaign=workspace_start&aiSdrIntent=workspace_start"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Build AI SDR workspace
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={contactUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-50"
                >
                  Request rollout review
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Buyer evaluation
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">What to inspect first</h2>
              </div>
              <div className="divide-y">
                {buyerChecklist.slice(0, 4).map(([label, detail]) => (
                  <div key={label} className="grid gap-2 px-5 py-4 sm:grid-cols-[8rem_1fr]">
                    <span className="text-sm font-semibold text-slate-950">{label}</span>
                    <span className="text-sm leading-6 text-slate-600">{detail}</span>
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
                <p className="text-sm font-semibold text-teal-800">Platform readiness</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 md:text-3xl">
                  Current AI SDR workflow truth
                </h2>
              </div>
              <Link
                href="/resources/ai-sdr-software-evaluation-checklist"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Read evaluation guide
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="grid grid-cols-[9rem_8rem_minmax(0,1fr)] border-b bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span>Capability</span>
                <span>Status</span>
                <span>What operators can inspect</span>
              </div>
              <div className="divide-y">
                {readinessRows.map((row) => (
                  <div
                    key={row.capability}
                    className="grid gap-3 px-4 py-4 text-sm sm:grid-cols-[9rem_8rem_minmax(0,1fr)] sm:items-center"
                  >
                    <span className="font-semibold text-slate-950">{row.capability}</span>
                    <span className="w-fit rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                      {row.status}
                    </span>
                    <span className="leading-6 text-slate-600">{row.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-stone-50/70 py-14 md:py-18">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <FileSearch className="size-5 text-blue-700" />
              <h2 className="mt-4 text-xl font-bold text-slate-950">Proof before pipeline</h2>
              <ul className="mt-4 space-y-3">
                {proofPoints.map((point) => (
                  <li key={point} className="flex gap-3 text-sm leading-6 text-slate-600">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <ShieldCheck className="size-5 text-amber-700" />
              <h2 className="mt-4 text-xl font-bold text-slate-950">Claims kept honest</h2>
              <ul className="mt-4 space-y-3">
                {blockedClaims.map((claim) => (
                  <li key={claim} className="flex gap-3 text-sm leading-6 text-slate-600">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <span>{claim}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <MessagesSquare className="size-5 text-teal-700" />
              <h2 className="mt-4 text-xl font-bold text-slate-950">Telegram without shortcuts</h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Telegram is useful for read-only status, operator briefs, sequence checks,
                forecasts, provider readiness, and suppression checks. Risk-reducing pause
                requests create proposals for in-app review instead of mutating outreach directly.
              </p>
              <Link
                href="/resources/telegram-sales-command-center"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Review Telegram guardrails
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-18">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white md:p-8">
              <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white">
                    <Sparkles className="size-4" />
                    Revenue path
                  </div>
                  <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-normal">
                    Start with a governed workspace, then expand automation only where evidence is
                    strong.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                    Use salesxgrowth to capture the Sales Blueprint, inspect lead quality, prepare
                    reviewed outreach, track meetings, and decide whether self-serve software or a
                    managed rollout makes sense for the next stage.
                  </p>
                </div>
                <div className="grid gap-3">
                  <Link
                    href="/pricing?utm_source=ai_sdr_software&utm_medium=seo_landing&utm_campaign=pricing_review"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
                  >
                    Compare plans
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href={contactUrl}
                    className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Scope managed rollout
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
