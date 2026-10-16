import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  Target,
} from "lucide-react";
import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import {
  buildMeetingConversionContactUrl,
  buildMeetingConversionGetStartedUrl,
  buildMeetingConversionPricingUrl,
} from "@/lib/meeting-conversion-context";
import {
  absoluteUrl,
  buildVisibleAnswerListJsonLd,
  getDefaultOpenGraphImage,
  jsonLd,
  siteConfig,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI sales meeting scheduler with manual calendar handoff",
  description:
    "Evaluate salesxgrowth for AI-assisted sales meeting scheduling and conversion follow-through with conversion work queues, manual Google, Outlook, Office 365, and ICS calendar handoff, meeting outcome capture, revenue forecast, CRM exports, and Telegram visibility.",
  keywords: [
    "AI sales meeting scheduler",
    "sales meeting scheduler software",
    "AI meeting scheduling software",
    "lead to meeting conversion software",
    "sales conversion workflow",
    "sales meeting automation",
  ],
  alternates: {
    canonical: "/ai-sales-meeting-scheduler",
  },
  openGraph: {
    title: "AI sales meeting scheduler with manual calendar handoff",
    description:
      "A governed lead-to-meeting workflow for conversion queues, manual calendar handoff, outcome capture, CRM exports, revenue review, and Telegram visibility.",
    url: "/ai-sales-meeting-scheduler",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const handoffRows = [
  {
    stage: "Ready lead",
    status: "Eligible",
    detail:
      "Lead status, contact data, call posture, and source evidence are visible before a meeting action is proposed.",
  },
  {
    stage: "Calendar handoff",
    status: "Manual",
    detail:
      "Operators can use Google, Outlook, Office 365, or ICS handoff links without storing calendar-provider credentials.",
  },
  {
    stage: "Outcome capture",
    status: "Tracked",
    detail:
      "Meeting outcomes and optional actual contract value update conversion state and forecast context after review.",
  },
  {
    stage: "Revenue export",
    status: "Reviewed",
    detail:
      "CRM and revenue reconciliation exports package conversion evidence for operator-reviewed import or accounting handoff.",
  },
] as const;

const workflowRows = [
  [
    "1",
    "Review conversion queue",
    "Prioritize call blockers, overdue outcomes, upcoming prep, handoff candidates, missing contact data, and missing closed value.",
  ],
  [
    "2",
    "Schedule manual meeting",
    "Create a meeting from an eligible lead after activity, contact, owner, and guardrail context is visible.",
  ],
  [
    "3",
    "Hand off calendar",
    "Use operator-triggered Google, Outlook, Office 365, or ICS links instead of a hidden writable calendar sync.",
  ],
  [
    "4",
    "Capture outcome and value",
    "Record completed or canceled outcomes, notes, and actual contract value where applicable.",
  ],
  [
    "5",
    "Reconcile conversion evidence",
    "Export reviewed CRM and revenue handoff data, then use forecast guidance before increasing sourcing or outreach volume.",
  ],
] as const;

const buyerChecks = [
  {
    icon: ClipboardCheck,
    title: "Work queue before scheduling",
    detail:
      "Sales owners should see why a lead is ready, blocked, overdue, or missing conversion data before a meeting is created.",
  },
  {
    icon: CalendarCheck,
    title: "Calendar handoff stays manual",
    detail:
      "Calendar links are useful, but the current beta should not be mistaken for live calendar sync or automated reminder delivery.",
  },
  {
    icon: Bot,
    title: "Telegram visibility without shortcuts",
    detail:
      "Telegram can surface meeting posture, forecasts, sequence readiness, and proposals while risky mutations stay inside workspace gates.",
  },
] as const;

const guardrails = [
  "No hidden calendar-provider sync or stored calendar credentials",
  "No automated reminders or external CRM/accounting mutation",
  "No direct Telegram approval of scheduling, billing, provider, or campaign changes",
  "No promised meeting, revenue, or conversion outcome",
] as const;

const meetingJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "salesxgrowth AI sales meeting scheduler",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/ai-sales-meeting-scheduler"),
      description: metadata.description,
      offers: {
        "@type": "Offer",
        url: absoluteUrl("/pricing"),
        availability: "https://schema.org/InStock",
      },
    },
    buildVisibleAnswerListJsonLd(
      "AI sales meeting scheduler buyer questions answered on this page",
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
          name: "AI Sales Meeting Scheduler",
          item: absoluteUrl("/ai-sales-meeting-scheduler"),
        },
      ],
    },
  ],
};

export default function AiSalesMeetingSchedulerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(meetingJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800">
                <CalendarCheck className="size-4" />
                AI sales meeting scheduler
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-normal text-slate-950 md:text-6xl">
                Turn reviewed pipeline into meetings without hiding the handoff.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                salesxgrowth helps operators move from contacted leads to scheduled meetings, manual
                calendar handoff, outcome capture, forecast review, CRM export, and revenue
                reconciliation while keeping risky conversion work visible and reviewable.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildMeetingConversionGetStartedUrl("workspace_start")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Start meeting workflow
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={buildMeetingConversionContactUrl("conversion_review")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-50"
                >
                  Request conversion review
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Meeting handoff board
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  Conversion steps with ownership visible
                </h2>
              </div>
              <div className="divide-y">
                {handoffRows.map((row) => (
                  <div
                    key={row.stage}
                    className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[8rem_8rem_1fr]"
                  >
                    <span className="font-semibold text-slate-950">{row.stage}</span>
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
                <p className="text-sm font-semibold text-emerald-800">
                  Lead-to-meeting workflow
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 md:text-3xl">
                  From handoff candidate to calendar link to closed-value review
                </h2>
              </div>
              <Link
                href="/resources/ai-sales-crm-vs-outbound-workspace"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Read conversion workspace guide
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
              <h2 className="mt-4 text-xl font-bold text-slate-950">
                Plan, calendar, and conversion fit
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Meeting workflow maturity depends on lead volume, included channels, call posture,
                owner availability, outcome hygiene, and the forecast gap your team is trying to
                close.
              </p>
              <Link
                href={buildMeetingConversionPricingUrl("pricing_review")}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
              >
                Compare conversion-ready plans
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white md:p-8">
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white">
                <Target className="size-4" />
                Claim-safe meeting path
              </div>
              <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-normal">
                Make every meeting step inspectable before revenue depends on it.
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
                  href={buildMeetingConversionGetStartedUrl("calendar_handoff")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
                >
                  Start calendar handoff review
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={buildMeetingConversionContactUrl("rollout_review")}
                  className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Scope conversion workflow
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
