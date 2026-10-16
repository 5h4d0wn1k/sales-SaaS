import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  MessageSquare,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import {
  buildTelegramCommandCenterContactUrl,
  buildTelegramCommandCenterGetStartedUrl,
  buildTelegramCommandCenterPricingUrl,
} from "@/lib/telegram-command-center-context";
import {
  absoluteUrl,
  buildVisibleAnswerListJsonLd,
  getDefaultOpenGraphImage,
  jsonLd,
  siteConfig,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Telegram sales command center for AI-assisted sales teams",
  description:
    "Evaluate salesxgrowth's Telegram sales command center for safe operator briefs, sequence readiness, revenue forecast checks, suppression and provider visibility, policy previews, approval-gated pause proposals, and audit evidence.",
  keywords: [
    "Telegram sales command center",
    "Telegram sales bot",
    "AI sales bot",
    "sales automation command center",
    "Telegram CRM bot",
    "AI sales operations bot",
  ],
  alternates: {
    canonical: "/telegram-sales-command-center",
  },
  openGraph: {
    title: "Telegram sales command center for AI-assisted sales teams",
    description:
      "A guarded Telegram control surface for briefs, sequence readiness, forecast checks, provider posture, policy previews, proposals, and audit evidence.",
    url: "/telegram-sales-command-center",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const commandRows = [
  {
    command: "/brief",
    status: "Read-only",
    detail:
      "Summarizes approvals, providers, pipeline, meetings, Telegram posture, and next actions without changing workspace state.",
  },
  {
    command: "/sequence",
    status: "Read-only",
    detail:
      "Shows sequence readiness, channel blockers, candidate posture, and safe next steps before campaign work starts.",
  },
  {
    command: "/forecast",
    status: "Read-only",
    detail:
      "Surfaces guarded revenue forecast context from current pipeline, meetings, and Sales Blueprint assumptions.",
  },
  {
    command: "/pause",
    status: "Proposal",
    detail:
      "Creates an approval-gated outreach pause proposal instead of mutating campaigns directly from Telegram.",
  },
] as const;

const workflowRows = [
  [
    "1",
    "Bind workspace chat",
    "An eligible admin connects the workspace chat after bot token and webhook-secret deployment readiness are in place.",
  ],
  [
    "2",
    "Verify command posture",
    "Telegram commands use the same deterministic intent catalog, command throttling, and audit posture as in-app previews.",
  ],
  [
    "3",
    "Ask for operating context",
    "Operators can check briefs, approvals, providers, suppressions, sequence readiness, and forecast posture from Telegram.",
  ],
  [
    "4",
    "Create proposal when risky",
    "High-impact requests become Approval Inbox proposals with expected effect, guardrails, and rollback notes.",
  ],
  [
    "5",
    "Approve in the workspace",
    "Campaign, call, billing, provider, and AI-worker mutations remain inside normal role, email, provider, and audit gates.",
  ],
] as const;

const buyerChecks = [
  {
    icon: MessageSquare,
    title: "Useful commands first",
    detail:
      "A command center should help operators understand status, blockers, meetings, forecasts, and approvals before it changes anything.",
  },
  {
    icon: ClipboardCheck,
    title: "Proposal bridge for risky work",
    detail:
      "Telegram can turn eligible pause requests into proposals, but campaign approvals and execution still happen in the workspace.",
  },
  {
    icon: ShieldCheck,
    title: "Security posture visible",
    detail:
      "Webhook secrets, hashed chat binding, replay protection, command throttling, emergency disable, and audit evidence stay visible.",
  },
] as const;

const guardrails = [
  "No campaign, call, billing, provider, or AI-worker mutation directly from Telegram",
  "No open-ended Telegram prompt execution or unsupported scraping commands",
  "No direct Telegram approval of campaigns, outreach pauses, billing, or provider changes",
  "No promised meeting, revenue, or conversion outcome from command visibility",
] as const;

const telegramJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "salesxgrowth Telegram sales command center",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/telegram-sales-command-center"),
      description: metadata.description,
      offers: {
        "@type": "Offer",
        url: absoluteUrl("/pricing"),
        availability: "https://schema.org/InStock",
      },
    },
    buildVisibleAnswerListJsonLd(
      "Telegram sales command center buyer questions answered on this page",
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
          name: "Telegram Sales Command Center",
          item: absoluteUrl("/telegram-sales-command-center"),
        },
      ],
    },
  ],
};

export default function TelegramSalesCommandCenterPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(telegramJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-800">
                <Bot className="size-4" />
                Telegram sales command center
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-normal text-slate-950 md:text-6xl">
                Control sales from Telegram without bypassing approval.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                salesxgrowth gives operators a Telegram path for status, briefs, sequence readiness,
                forecast checks, provider posture, suppression checks, and approval proposals while
                keeping risky sales actions inside the workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildTelegramCommandCenterGetStartedUrl("workspace_start")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Start command workspace
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={buildTelegramCommandCenterContactUrl("rollout_review")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-50"
                >
                  Request Telegram rollout
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Command posture
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  Commands that explain before they act
                </h2>
              </div>
              <div className="divide-y">
                {commandRows.map((row) => (
                  <div
                    key={row.command}
                    className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[6rem_8rem_1fr]"
                  >
                    <span className="font-semibold text-slate-950">{row.command}</span>
                    <span className="w-fit rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
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
                <p className="text-sm font-semibold text-sky-800">Telegram operating workflow</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 md:text-3xl">
                  From chat binding to policy preview to proposal review
                </h2>
              </div>
              <Link
                href="/resources/telegram-sales-command-center"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Read Telegram guide
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
                    <span className="font-semibold text-sky-800">{step}</span>
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
                  <Icon className="size-5 text-sky-700" />
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
              <h2 className="mt-4 text-xl font-bold text-slate-950">
                Plan, role, and provider fit
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Telegram control works best after workspace roles, provider readiness, suppression
                posture, approval policies, and command audit expectations are visible.
              </p>
              <Link
                href={buildTelegramCommandCenterPricingUrl("pricing_review")}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Compare command-center plans
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white md:p-8">
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white">
                <Workflow className="size-4" />
                Claim-safe Telegram path
              </div>
              <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-normal">
                Make chat control useful without making it dangerous.
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
                  href={buildTelegramCommandCenterGetStartedUrl("policy_review")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
                >
                  Start policy review
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={buildTelegramCommandCenterContactUrl("bot_setup")}
                  className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Scope bot setup
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
