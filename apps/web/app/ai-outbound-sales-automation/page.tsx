import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import {
  buildOutboundAutomationContactUrl,
  buildOutboundAutomationGetStartedUrl,
  buildOutboundAutomationPricingUrl,
} from "@/lib/outbound-automation-context";
import {
  absoluteUrl,
  buildVisibleAnswerListJsonLd,
  getDefaultOpenGraphImage,
  jsonLd,
  siteConfig,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI outbound sales automation with approval-gated outreach",
  description:
    "Evaluate Winrate for AI outbound sales automation with Sales Blueprint context, sequence planning, suppression checks, email and call handoff, approval gates, Telegram visibility, meetings, and audit evidence.",
  keywords: [
    "AI outbound sales automation",
    "outbound sales automation",
    "AI sales sequence software",
    "approval-gated outreach",
    "AI sales engagement software",
    "outbound sales workflow automation",
  ],
  alternates: {
    canonical: "/ai-outbound-sales-automation",
  },
  openGraph: {
    title: "AI outbound sales automation with approval-gated outreach",
    description:
      "A governed outbound workspace for sequence planning, approval gates, email and call handoff, Telegram visibility, meetings, and audit evidence.",
    url: "/ai-outbound-sales-automation",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const channelRows = [
  {
    channel: "Email sequence",
    status: "Approval-gated",
    detail:
      "Drafted outreach stays behind plan, role, verified-email, suppression, provider, and campaign approval checks.",
  },
  {
    channel: "Call handoff",
    status: "Reviewed",
    detail:
      "Voice work uses lead score, suppression posture, call eligibility, provider readiness, and outcome review before scale.",
  },
  {
    channel: "LinkedIn-style step",
    status: "Review-gated",
    detail:
      "Current posture is planning and review; the product does not claim auto-connect, browser automation, or auto-DM behavior.",
  },
  {
    channel: "Telegram command center",
    status: "Read-only plus proposals",
    detail:
      "Telegram can show briefs, sequence readiness, forecasts, providers, and suppression checks; risky requests create proposals.",
  },
] as const;

const workflowRows = [
  [
    "1",
    "Confirm Sales Blueprint",
    "Use ICP, offer, buyer roles, regions, targets, constraints, tone, and channel boundaries before copy is drafted.",
  ],
  [
    "2",
    "Review sequence plan",
    "Inspect channel order, candidate leads, sample operator copy, channel-fit blockers, and safe next actions.",
  ],
  [
    "3",
    "Check suppression and policy",
    "Confirm unsubscribes, blocked domains, plan channels, provider readiness, and role/email eligibility before approval.",
  ],
  [
    "4",
    "Create approval proposal",
    "Route risky campaign, call, Telegram, billing, provider, or AI-worker actions into Approval Inbox with rollback notes.",
  ],
  [
    "5",
    "Track meetings and outcomes",
    "Record activity, call review, manual meeting handoff, outcomes, actual value, and forecast feedback after approved work.",
  ],
] as const;

const buyerChecks = [
  {
    icon: ClipboardCheck,
    title: "Sequence plan before send",
    detail:
      "Operators need to see the proposed channel order, candidate leads, sample copy, blockers, and next action before provider work begins.",
  },
  {
    icon: ShieldCheck,
    title: "Approval path visible",
    detail:
      "High-risk outbound should show who can approve, what guardrails apply, expected effect, audit posture, and rollback plan.",
  },
  {
    icon: Bot,
    title: "Telegram without mutation shortcuts",
    detail:
      "Chat control is useful for status and proposal creation, but direct campaign approval or billing/provider mutation stays blocked.",
  },
] as const;

const guardrails = [
  "No hidden sends, calls, social actions, or SMS dispatch",
  "No direct Telegram approval of campaigns, calls, billing, or provider changes",
  "No provider work before role, email, plan, suppression, and approval gates",
  "No promised reply, meeting, revenue, or conversion outcome",
] as const;

const outboundJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Winrate AI outbound sales automation",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/ai-outbound-sales-automation"),
      description: metadata.description,
      offers: {
        "@type": "Offer",
        url: absoluteUrl("/pricing"),
        availability: "https://schema.org/InStock",
      },
    },
    buildVisibleAnswerListJsonLd(
      "AI outbound sales automation buyer questions answered on this page",
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
          name: "AI Outbound Sales Automation",
          item: absoluteUrl("/ai-outbound-sales-automation"),
        },
      ],
    },
  ],
};

export default function AiOutboundSalesAutomationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(outboundJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-800">
                <Mail className="size-4" />
                AI outbound sales automation
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-normal text-slate-950 md:text-6xl">
                Automate outbound only after the sequence is reviewable.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Winrate helps teams turn Sales Blueprint context and reviewed leads into sequence
                plans, approval proposals, email and call handoff, Telegram visibility, meeting
                follow-through, and audit evidence without hiding risky outreach behind a prompt.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildOutboundAutomationGetStartedUrl("workspace_start")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Start outbound workspace
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={buildOutboundAutomationContactUrl("rollout_review")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-50"
                >
                  Request sequence review
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Channel readiness
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  Outreach channels with boundaries visible
                </h2>
              </div>
              <div className="divide-y">
                {channelRows.map((row) => (
                  <div
                    key={row.channel}
                    className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[8rem_9rem_1fr]"
                  >
                    <span className="font-semibold text-slate-950">{row.channel}</span>
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

        <section className="py-14 md:py-18">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-800">Approval-first workflow</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 md:text-3xl">
                  From sequence planning to approved activity to meetings
                </h2>
              </div>
              <Link
                href="/resources/approval-gated-sales-automation"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Read approval guide
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
                    <span className="font-semibold text-blue-800">{step}</span>
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
                  <Icon className="size-5 text-blue-700" />
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
              <Gauge className="size-5 text-emerald-700" />
              <h2 className="mt-4 text-xl font-bold text-slate-950">Plan, channel, and provider fit</h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Outreach automation needs lead usage, included channels, provider-cost budget,
                suppression posture, and approval eligibility visible before volume increases.
              </p>
              <Link
                href={buildOutboundAutomationPricingUrl("pricing_review")}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Compare outbound plans
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white md:p-8">
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white">
                <Sparkles className="size-4" />
                Claim-safe outbound path
              </div>
              <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-normal">
                Move faster by making risky outreach slower to approve.
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
                  href={buildOutboundAutomationGetStartedUrl("sequence_review")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
                >
                  Start sequence review
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={buildOutboundAutomationContactUrl("approval_review")}
                  className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Scope approval workflow
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
