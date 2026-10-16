import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Gauge,
  MailCheck,
  MessagesSquare,
  ShieldCheck,
  Target,
  Workflow,
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
import { solutionSegmentPages } from "@/lib/solution-segments";

export const metadata: Metadata = {
  title: "AI sales solutions for founders, agencies, SMB, local service, and SaaS teams",
  description:
    "Explore salesxgrowth solutions for business onboarding, lead planning, approval-gated outreach, meeting conversion, billing visibility, and governed AI sales operations.",
  alternates: {
    canonical: "/solutions",
  },
  openGraph: {
    title: "AI sales solutions for founders, agencies, SMB, local service, and SaaS teams",
    description:
      "A claim-safe guide to the salesxgrowth beta for teams building reviewable lead generation, outreach, and meeting conversion workflows.",
    url: "/solutions",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const solutionSegmentIcons: Record<string, typeof Target> = {
  "founders-validating-outbound": Target,
  "agencies-running-client-pipeline": Building2,
  "smb-sales-teams-modernizing-ops": Compass,
  "local-service-businesses-booking-jobs": CalendarCheck,
  "b2b-saas-teams-scaling-pipeline": Gauge,
  "professional-services-selling-retainers": ClipboardCheck,
};

const workflowSteps = [
  {
    icon: ClipboardCheck,
    label: "1. Capture context",
    description:
      "Document the business model, ICP, goals, source channels, outreach channels, and guardrails before any automation is trusted.",
    status: "Available",
  },
  {
    icon: Gauge,
    label: "2. Score the plan",
    description:
      "Review source-run evidence, quality score, dedupe posture, rejection reasons, and provider mode before outreach.",
    status: "Available",
  },
  {
    icon: MailCheck,
    label: "3. Approve outreach",
    description:
      "Create draft campaigns, require eligible owner/admin approval, and dispatch only after server-side entitlement and safety checks.",
    status: "Guarded",
  },
  {
    icon: CalendarCheck,
    label: "4. Convert meetings",
    description:
      "Schedule meetings from qualified leads, record outcomes, and feed won/lost signals back into the workspace.",
    status: "Available",
  },
];

const trustControls = [
  "Email verification before high-risk actions",
  "Owner/admin gates for approvals and dispatch",
  "Suppression checks before live outreach",
  "Usage limits, channel limits, and provider-cost budgets",
  "Audit-aware action proposals for risky work",
  "Provider readiness without browser-entered raw secrets",
];

const solutionFaqs = [
  {
    question: "Can salesxgrowth run sales work without operator review?",
    answer:
      "No. The current beta is AI-assisted and approval-gated. High-impact sales actions still require eligible human review.",
  },
  {
    question: "Can salesxgrowth generate leads from every source today?",
    answer:
      "No. salesxgrowth supports guarded source planning, evidence review, mock/configured adapters, and a roadmap for broader provider integrations.",
  },
  {
    question: "Who is the best fit for salesxgrowth now?",
    answer:
      "Founders, agencies, SMB operators, local service businesses, B2B SaaS teams, and professional-services firms that want structured lead planning, reviewable outreach, meeting visibility, and usage-aware billing.",
  },
  {
    question: "Does the Telegram command center directly control outreach?",
    answer:
      "Not today. Telegram is a guarded command-center foundation for safe status, deterministic aliases, operator brief, forecast, sequence-readiness checks, and approval-gated proposals, not direct mutation.",
  },
];

const solutionsJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "AI sales solutions for founders, agencies, SMB, local service, and SaaS teams",
      url: absoluteUrl("/solutions"),
      description: metadata.description,
      isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: absoluteUrl("/"),
      },
      about: [
        "AI sales software",
        "B2B lead generation platform",
        "approval-gated outreach",
        "sales workflow automation",
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
          name: "Solutions",
          item: absoluteUrl("/solutions"),
        },
      ],
    },
    buildVisibleAnswerListJsonLd("Solution questions answered on this page", solutionFaqs),
  ],
};

function StatusPill({ children }: { children: string }) {
  const tone =
    children === "Guarded"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {children}
    </span>
  );
}

export default async function SolutionsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(solutionsJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                <Workflow className="size-3.5" />
                AI sales solutions
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                A reviewable sales operating system for teams that need pipeline with control.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                salesxgrowth helps founders, agencies, SMB operators, local service businesses, B2B SaaS
                teams, and professional-services firms capture business context, plan lead sources,
                approve outreach, track meetings, and control billing from one AI-assisted workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/get-started"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  Start free
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Compare plans
                </Link>
              </div>
            </div>

            <div className="rounded-lg border bg-background shadow-sm">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Revenue workflow
                  </p>
                  <h2 className="mt-1 text-lg font-bold">Operator console preview</h2>
                </div>
                <StatusPill>Guarded</StatusPill>
              </div>
              <div className="divide-y">
                {[
                  ["Context", "ICP, offer, goals, channels", "Ready"],
                  ["Sources", "Evidence and quality score", "Review"],
                  ["Campaigns", "Draft, approve, dispatch", "Gated"],
                  ["Meetings", "Schedule, complete, won/lost", "Live"],
                ].map(([label, detail, state]) => (
                  <div key={label} className="grid grid-cols-[6rem_1fr_auto] gap-3 px-5 py-4">
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="min-w-0 text-sm text-muted-foreground">{detail}</span>
                    <span className="rounded-full border bg-stone-50 px-2.5 py-1 text-xs font-semibold text-foreground">
                      {state}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 border-t bg-stone-50/70 p-5 sm:grid-cols-3">
                {[
                  ["Plan", "Usage aware"],
                  ["Provider", "Configured or mock"],
                  ["Audit", "Approval first"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20" id="use-cases">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Use cases
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Built for revenue teams that want speed, evidence, and human approval.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {solutionSegmentPages.map((segment) => {
                const SegmentIcon = solutionSegmentIcons[segment.slug] ?? Target;

                return (
                  <article key={segment.slug} className="rounded-lg border bg-background p-6">
                    <SegmentIcon className="size-6 text-blue-700" />
                    <h3 className="mt-5 text-lg font-bold">{segment.cardTitle}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {segment.intent}
                    </p>
                    <div className="mt-5 border-t pt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Current beta
                      </p>
                      <p className="mt-2 text-sm leading-6">{segment.current}</p>
                    </div>
                    <div className="mt-5 border-t pt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Growth path
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {segment.expansion}
                      </p>
                    </div>
                    <Link
                      href={`/solutions/${segment.slug}`}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-blue-700"
                    >
                      View segment workflow
                      <ArrowRight className="size-4" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y bg-stone-50/70 py-16 md:py-20" id="workflow">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Revenue workflow
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                  From business context to meetings, without pretending the system is magic.
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  The product direction is ambitious: richer integrations, stronger AI assistance,
                  and governed command surfaces. The current promise stays grounded in what the beta
                  can safely support.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {workflowSteps.map((step) => (
                  <article key={step.label} className="rounded-lg border bg-background p-5">
                    <div className="flex items-start justify-between gap-3">
                      <step.icon className="size-5 text-emerald-700" />
                      <StatusPill>{step.status}</StatusPill>
                    </div>
                    <h3 className="mt-4 text-base font-bold">{step.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20" id="trust">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                <ShieldCheck className="size-3.5" />
                Trust posture
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
                Advanced sales automation should start with guardrails, not unchecked sends.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                salesxgrowth is being built for serious outbound operations: tenant-aware workspaces,
                approval-aware actions, billing boundaries, provider readiness, suppression checks,
                and a future command center that stays governed.
              </p>
              <Link
                href="/contact"
                className="mt-7 inline-flex items-center gap-2 rounded-lg border bg-background px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
              >
                Discuss rollout
                <MessagesSquare className="size-4" />
              </Link>
            </div>
            <div className="rounded-lg border bg-background">
              {trustControls.map((control) => (
                <div key={control} className="flex items-start gap-3 border-b px-5 py-4 last:border-b-0">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                  <p className="text-sm leading-6">{control}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-stone-50/70 py-16 md:py-20" id="faq">
          <div className="mx-auto max-w-4xl px-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Buyer questions
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Clear answers before you commit your sales workflow.
            </h2>
            <div className="mt-8 divide-y rounded-lg border bg-background">
              {solutionFaqs.map((faq) => (
                <details key={faq.question} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none text-base font-semibold">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
