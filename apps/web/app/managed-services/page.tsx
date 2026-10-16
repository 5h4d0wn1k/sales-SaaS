import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Handshake,
  MailCheck,
  MessagesSquare,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import {
  buildManagedServiceContactUrl,
  managedServicePackages,
} from "@/lib/managed-services";
import {
  absoluteUrl,
  buildVisibleAnswerListJsonLd,
  getDefaultOpenGraphImage,
  jsonLd,
  siteConfig,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Managed sales implementation for AI-assisted revenue teams",
  description:
    "salesxgrowth managed services help teams shape ICP, source strategy, approval operations, rollout planning, and reporting around the AI-assisted sales workspace.",
  alternates: {
    canonical: "/managed-services",
  },
  openGraph: {
    title: "Managed sales implementation for AI-assisted revenue teams",
    description:
      "A claim-safe managed-service path for teams that want setup, review support, and operational guidance around the salesxgrowth sales workspace.",
    url: "/managed-services",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const engagementTracks = [
  {
    icon: Target,
    title: "ICP and blueprint setup",
    description:
      "Turn offer, audience, disqualifiers, regions, goals, channels, and guardrails into a workspace Sales Blueprint your team can operate.",
    outcome: "Clear sales context before sourcing or outreach",
  },
  {
    icon: ClipboardList,
    title: "Source strategy and evidence review",
    description:
      "Shape source plans, inspect accepted and rejected lead evidence, and decide when mock/configured providers are ready for heavier use.",
    outcome: "Higher-confidence lead review loops",
  },
  {
    icon: MailCheck,
    title: "Campaign approval operations",
    description:
      "Support draft campaign review, approval discipline, suppression posture, provider readiness, and first-touch execution decisions.",
    outcome: "Safer path from plan to outbound action",
  },
  {
    icon: BarChart3,
    title: "Reporting and optimization cadence",
    description:
      "Review meetings, activity state, usage, budget posture, and next-step gaps so the workflow improves without hiding manual judgment.",
    outcome: "Operational rhythm for paid retention",
  },
];

const managedBoundaries = [
  "Managed support does not bypass in-app approval gates.",
  "Software subscription, provider costs, and managed-service scope stay commercially separate.",
  "External provider availability depends on deployment-side configuration and provider rules.",
  "Legal, compliance, finance, and irreversible business decisions remain customer-owned.",
  "Unsupported scraping, hands-off autonomy, and browser automation are not sold as current capabilities.",
];

const rolloutSteps = [
  {
    icon: BriefcaseBusiness,
    label: "1. Fit call",
    detail:
      "Confirm business model, sales goal, current tooling, provider needs, team capacity, and risk posture.",
  },
  {
    icon: Users,
    label: "2. Workspace setup",
    detail:
      "Configure the Sales Blueprint, target segments, source channels, outreach channels, roles, and review ownership.",
  },
  {
    icon: ShieldCheck,
    label: "3. Guarded launch",
    detail:
      "Run source review and approval workflows before live provider actions, with usage and suppression posture visible.",
  },
  {
    icon: CalendarCheck,
    label: "4. Conversion review",
    detail:
      "Track meetings, dispositions, usage, plan fit, and operational gaps before scaling the workflow further.",
  },
];

const managedFaqs = [
  {
    question: "Is managed service included in every software plan?",
    answer:
      "No. The software subscription and managed-service scope are separate. Managed support is for teams that want help with setup, review cadence, rollout planning, or operating discipline.",
  },
  {
    question: "Can managed service make unsupported providers or channels live?",
    answer:
      "No. Managed support can help plan provider readiness, but live execution still depends on configured providers, platform rules, suppression posture, and in-app approval gates.",
  },
  {
    question: "Does managed service replace a sales team?",
    answer:
      "No. It supports strategy, setup, review, and optimization around the workspace. Accountable customer decisions and high-risk actions remain human-owned.",
  },
  {
    question: "Who should ask for managed support?",
    answer:
      "Teams that want a faster, safer rollout: founders shaping outbound for the first time, agencies managing client workflows, or SMB teams adopting AI-assisted sales operations.",
  },
];

const managedServicesJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "salesxgrowth managed sales implementation",
      serviceType: "Managed sales operations and AI-assisted sales workflow implementation",
      provider: {
        "@type": "Organization",
        name: siteConfig.name,
        url: absoluteUrl("/"),
      },
      areaServed: "Worldwide",
      url: absoluteUrl("/managed-services"),
      description: metadata.description,
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
          name: "Managed Services",
          item: absoluteUrl("/managed-services"),
        },
      ],
    },
    buildVisibleAnswerListJsonLd(
      "Managed services questions answered on this page",
      managedFaqs,
    ),
  ],
};

export default async function ManagedServicesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(managedServicesJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                <Handshake className="size-3.5" />
                Managed sales implementation
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                Add expert operating support around the salesxgrowth workspace.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Some teams need more than software access. salesxgrowth managed services help shape ICP,
                lead-source strategy, approval operations, rollout planning, and reporting cadence
                while the product remains honest about what is automated today.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildManagedServiceContactUrl("operator-assist")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  Request a fit call
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Compare software plans
                </Link>
              </div>
            </div>

            <div className="rounded-lg border bg-background shadow-sm">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Commercial model
                </p>
                <h2 className="mt-1 text-lg font-bold">Software plus managed execution support</h2>
              </div>
              <div className="grid gap-0 divide-y">
                {[
                  ["SaaS", "Workspace, dashboard, billing, usage, approvals, and product workflows"],
                  ["AaaS", "Setup, strategy, review cadence, reporting, and rollout support"],
                  ["Boundary", "High-risk actions still require customer-owned approval"],
                ].map(([label, detail]) => (
                  <div key={label} className="grid grid-cols-[5rem_1fr] gap-3 px-5 py-4">
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-sm leading-6 text-muted-foreground">{detail}</span>
                  </div>
                ))}
              </div>
              <div className="border-t bg-stone-50/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Best fit
                </p>
                <p className="mt-2 text-sm leading-6">
                  Teams with a real offer, clear sales goal, and enough accountability to review
                  AI-assisted work before scaling it.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Engagement tracks
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Practical support for getting from workspace to repeatable motion.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {engagementTracks.map((track) => (
                <article key={track.title} className="rounded-lg border bg-background p-6">
                  <track.icon className="size-6 text-blue-700" />
                  <h3 className="mt-5 text-base font-bold">{track.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {track.description}
                  </p>
                  <div className="mt-5 border-t pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Outcome
                    </p>
                    <p className="mt-2 text-sm leading-6">{track.outcome}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-stone-50/70 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                <Gauge className="size-3.5" />
                Rollout path
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
                Start small, prove the workflow, then scale only what holds up.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                The managed path is designed to reduce launch chaos, not to sell fantasy autonomy.
                Each stage keeps provider readiness, approval posture, and usage economics visible.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {rolloutSteps.map((step) => (
                <article key={step.label} className="rounded-lg border bg-background p-5">
                  <step.icon className="size-5 text-emerald-700" />
                  <h3 className="mt-4 text-base font-bold">{step.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Commercial packaging
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                  Managed scope should protect margin and customer trust.
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Managed work is intentionally packaged around accountable support: setup,
                  review, rollout discipline, and optimization. It does not silently expand
                  provider spend, AI usage, or human-service obligations.
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border bg-background">
                <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-b bg-stone-100/70 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid-cols-[8rem_1fr_1fr_9.5rem]">
                  <span>Package</span>
                  <span>Best for</span>
                  <span className="hidden md:block">Includes</span>
                  <span className="hidden md:block">Next step</span>
                </div>
                {managedServicePackages.map((row) => (
                  <div
                    key={row.key}
                    id={row.key}
                    className="grid grid-cols-[7.5rem_1fr] gap-3 border-b px-5 py-4 last:border-b-0 md:grid-cols-[8rem_1fr_1fr_9.5rem] md:items-start"
                  >
                    <span className="text-sm font-semibold">{row.tier}</span>
                    <span className="text-sm leading-6 text-muted-foreground">{row.bestFor}</span>
                    <span className="hidden text-sm leading-6 text-muted-foreground md:block">
                      {row.includes}
                    </span>
                    <Link
                      href={buildManagedServiceContactUrl(row.key, "package_scope")}
                      className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted md:col-span-1"
                    >
                      Scope package
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-stone-50/70 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
                  <ShieldCheck className="size-3.5" />
                  Scope boundaries
                </span>
                <h2 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
                  The managed offer is useful because it stays bounded.
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Clear boundaries keep the offer sellable without creating unsupported product
                  claims, runaway service work, or hidden compliance risk.
                </p>
              </div>
              <div className="rounded-lg border bg-background">
                {managedBoundaries.map((boundary) => (
                  <div key={boundary} className="flex gap-3 border-b px-5 py-4 last:border-b-0">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                    <p className="text-sm leading-6">{boundary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-4xl px-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Managed services FAQ
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Honest answers before you buy implementation help.
            </h2>
            <div className="mt-8 divide-y rounded-lg border bg-background">
              {managedFaqs.map((faq) => (
                <details key={faq.question} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none text-base font-semibold">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 rounded-lg border bg-stone-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Ready to scope a rollout?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Share your team size, target market, current workflow, and preferred plan.
                </p>
              </div>
              <Link
                href={buildManagedServiceContactUrl("managed-revops", "rollout_scope")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Scope managed support
                <MessagesSquare className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
