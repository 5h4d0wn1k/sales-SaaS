import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  Database,
  FileCheck,
  Gauge,
  KeyRound,
  LockKeyhole,
  MessagesSquare,
  Receipt,
  ShieldCheck,
  Users,
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
  title: "Trust center for AI-assisted sales operations",
  description:
    "Review salesxgrowth's trust posture for approval-gated sales automation, tenant-aware workspaces, provider readiness, suppression checks, billing controls, responsible disclosure contact metadata, and guarded AI workflows.",
  alternates: {
    canonical: "/trust",
  },
  openGraph: {
    title: "Trust center for AI-assisted sales operations",
    description:
      "See how salesxgrowth keeps beta sales automation reviewable with approvals, usage boundaries, provider readiness, suppression controls, and honest roadmap limits.",
    url: "/trust",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const trustPillars = [
  {
    icon: Users,
    title: "Tenant-aware workspaces",
    description:
      "Workspace identity, membership roles, owner/admin boundaries, and active workspace selection keep account state scoped before sensitive actions run.",
    proof: "Implemented",
  },
  {
    icon: ShieldCheck,
    title: "Approval-gated sales actions",
    description:
      "Draft campaigns, dispatch actions, guarded calls, AI worker tasks, and Telegram pause requests stay behind reviewable server-side gates.",
    proof: "Guarded",
  },
  {
    icon: Receipt,
    title: "Usage and billing boundaries",
    description:
      "Lead discovery, outreach dispatch quotas, voice call quotas, provider-cost budgets, included channels, and upgrade recommendations are modeled as plan controls.",
    proof: "Implemented",
  },
  {
    icon: LockKeyhole,
    title: "Provider readiness without browser secrets",
    description:
      "Provider setup shows deployment-side secret names, missing requirements, guardrails, and blockers rather than asking users to paste raw credentials into the UI.",
    proof: "Implemented",
  },
];

const controlRows = [
  {
    area: "Authentication",
    control: "Email verification and protected account lifecycle routes",
    buyerSignal: "High-risk actions can require a verified owner/admin identity.",
  },
  {
    area: "Outreach",
    control: "Approval, entitlement, suppression, and provider checks before dispatch",
    buyerSignal: "Operators can review risky work before live sends or calls happen.",
  },
  {
    area: "Lead sourcing",
    control: "Source-run evidence, dedupe posture, quality score, rejection reasons, and provider mode",
    buyerSignal: "Lead lists are reviewable instead of opaque AI output.",
  },
  {
    area: "Billing",
    control: "Plan usage, included channels, provider-cost budgets, and upgrade recommendations",
    buyerSignal: "The platform is shaped to protect customer spend and vendor margin.",
  },
  {
    area: "Integrations",
    control: "Configured-vs-mock provider posture and launch blockers",
    buyerSignal: "Teams can see when a workflow is ready for live provider execution.",
  },
  {
    area: "Command center",
    control: "Telegram status checks and approval-gated proposals, not direct mutation",
    buyerSignal: "Chat control is useful without bypassing accountable in-app approval.",
  },
];

const disclosureRows = [
  {
    label: "Contact",
    value: "hello@salesxgrowth.com",
    detail: "Use this address for security reports and include enough reproduction detail for review.",
  },
  {
    label: "Metadata",
    value: "/.well-known/security.txt",
    detail: "Machine-readable contact, canonical URL, expiry, policy link, and preferred language.",
  },
  {
    label: "Boundary",
    value: "Contact path",
    detail:
      "This is not a rewards program, compliance certification, or mature vulnerability-response SLA.",
  },
] as const;

const readinessItems = [
  {
    icon: CheckCircle2,
    label: "Available now",
    items: [
      "Business context and Sales Blueprint capture",
      "Source-run evidence and dashboard discovery actions",
      "Campaign draft, approval, and guarded dispatch foundations",
      "Manual meeting scheduling and outcome tracking",
      "Billing, plan, usage, and provider-cost budget visibility",
    ],
  },
  {
    icon: AlertTriangle,
    label: "Guarded beta",
    items: [
      "Voice dispatch foundations with verified owner/admin gates",
      "LinkedIn-style review-gated placeholder behavior",
      "Telegram command center for safe status, operator brief, deterministic aliases, sequence readiness, forecast visibility, and proposal creation",
      "AI worker registry, permissions, budget posture, and task proposals",
    ],
  },
  {
    icon: Gauge,
    label: "Roadmap only",
    items: [
      "Hands-off cross-channel sales execution",
      "Live scraping from every source",
      "Telegram commands that directly mutate outreach state",
      "Global compliance guarantees or unsupported browser automation",
    ],
  },
];

const trustFaqs = [
  {
    question: "How should security issues be reported?",
    answer:
      "Use the public security contact metadata at /.well-known/security.txt or email hello@salesxgrowth.com with a concise report, affected route, reproduction steps, expected impact, and safe contact details. The current public beta does not claim a rewards program or mature vulnerability-response SLA.",
  },
  {
    question: "Does salesxgrowth guarantee global outbound compliance?",
    answer:
      "No. salesxgrowth exposes guardrails, suppression checks, approval gates, and provider readiness, but legal compliance still depends on customer use case, jurisdiction, provider rules, and human review.",
  },
  {
    question: "Can the Telegram command center approve or mutate outreach today?",
    answer:
      "No. Telegram can support guarded status-style commands, deterministic natural-language aliases, read-only operator briefs, sequence readiness, revenue forecast visibility, and approval-gated proposals. Mutating outreach or approving high-impact actions remains an in-app owner/admin responsibility.",
  },
  {
    question: "Can configured providers go live without review?",
    answer:
      "No. Provider readiness is separate from action approval. Live-capable provider paths still pass through role, verification, suppression, entitlement, and workflow checks.",
  },
  {
    question: "Can AI workers execute without operator governance?",
    answer:
      "No. The current AI worker surface is a governed control-plane foundation with permissions, budget posture, execution ledger, and approval proposals.",
  },
];

const trustJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Trust center for AI-assisted sales operations",
      url: absoluteUrl("/trust"),
      description: metadata.description,
      isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: absoluteUrl("/"),
      },
      about: [
        "sales automation security",
        "approval-gated outreach",
        "sales compliance workflow",
        "AI sales governance",
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
          name: "Trust",
          item: absoluteUrl("/trust"),
        },
      ],
    },
    buildVisibleAnswerListJsonLd("Trust questions answered on this page", trustFaqs),
  ],
};

function ProofPill({ value }: { value: string }) {
  const tone =
    value === "Guarded"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {value}
    </span>
  );
}

export default async function TrustPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(trustJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                <ShieldCheck className="size-3.5" />
                Trust center
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                Sales automation buyers need proof of control before speed.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                salesxgrowth is built around reviewable workflows: tenant-aware workspaces, role-aware
                approvals, source evidence, suppression checks, billing limits, provider readiness,
                and guarded AI command surfaces.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/solutions"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  See solutions
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Ask about rollout
                  <MessagesSquare className="size-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-lg border bg-background shadow-sm">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current posture
                </p>
                <h2 className="mt-1 text-lg font-bold">What happens before risky work runs</h2>
              </div>
              <div className="divide-y">
                {[
                  ["Identity", "Owner/admin and email verification checks"],
                  ["Policy", "Approval, suppression, entitlement, and channel boundaries"],
                  ["Provider", "Configured readiness and launch blocker visibility"],
                  ["Audit", "Action proposal and execution evidence where supported"],
                ].map(([label, detail]) => (
                  <div key={label} className="grid grid-cols-[7rem_1fr] gap-3 px-5 py-4">
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-sm leading-6 text-muted-foreground">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Buyer assurances
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                The product promise is bounded by controls that exist in the platform.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {trustPillars.map((pillar) => (
                <article key={pillar.title} className="rounded-lg border bg-background p-6">
                  <div className="flex items-start justify-between gap-4">
                    <pillar.icon className="size-6 text-emerald-700" />
                    <ProofPill value={pillar.proof} />
                  </div>
                  <h3 className="mt-5 text-base font-bold">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {pillar.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-stone-50/70 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                  <FileCheck className="size-3.5" />
                  Control map
                </span>
                <h2 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
                  A practical view of what protects each workflow.
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  This is intentionally concrete. Customers should be able to tell which controls
                  protect account state, lead quality, live outreach, integrations, and cost.
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border bg-background">
                <div className="grid grid-cols-[7rem_1fr] gap-3 border-b bg-stone-100/70 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid-cols-[8rem_1fr_1fr]">
                  <span>Area</span>
                  <span>Control</span>
                  <span className="hidden md:block">Buyer signal</span>
                </div>
                {controlRows.map((row) => (
                  <div
                    key={row.area}
                    className="grid grid-cols-[7rem_1fr] gap-3 border-b px-5 py-4 last:border-b-0 md:grid-cols-[8rem_1fr_1fr]"
                  >
                    <span className="text-sm font-semibold">{row.area}</span>
                    <span className="text-sm leading-6 text-muted-foreground">{row.control}</span>
                    <span className="hidden text-sm leading-6 text-muted-foreground md:block">
                      {row.buyerSignal}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
                <LockKeyhole className="size-3.5" />
                Responsible disclosure
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
                A clear contact path for security reports.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Security researchers and customers should not have to guess where to send a
                report. salesxgrowth publishes non-secret contact metadata while keeping stronger
                vulnerability-program claims out of the public beta.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/.well-known/security.txt"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  View security.txt
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="mailto:hello@salesxgrowth.com"
                  className="inline-flex items-center justify-center rounded-lg border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Email security contact
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="grid grid-cols-[7rem_1fr] gap-3 border-b bg-stone-100/70 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid-cols-[8rem_10rem_1fr]">
                <span>Field</span>
                <span>Value</span>
                <span className="hidden md:block">Use</span>
              </div>
              {disclosureRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[7rem_1fr] gap-3 border-b px-5 py-4 last:border-b-0 md:grid-cols-[8rem_10rem_1fr]"
                >
                  <span className="text-sm font-semibold">{row.label}</span>
                  <span className="text-sm font-semibold text-foreground">{row.value}</span>
                  <span className="text-sm leading-6 text-muted-foreground">{row.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Readiness states
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Clear labels for available, guarded, and roadmap capabilities.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {readinessItems.map((group) => (
                <article key={group.label} className="rounded-lg border bg-background p-6">
                  <group.icon className="size-6 text-foreground" />
                  <h3 className="mt-5 text-lg font-bold">{group.label}</h3>
                  <ul className="mt-5 space-y-3">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-stone-50/70 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
                <Bell className="size-3.5" />
                Command governance
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
                Telegram and AI workers are being shaped as governed operators.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                The long-term vision includes fast command surfaces and specialized AI workers.
                The current trust boundary keeps mutating effects behind approval, budget posture,
                audit evidence, and explicit human accountability.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: MessagesSquare,
                  title: "Telegram",
                  copy: "Safe status, provider, suppression, and approval-summary style commands with proposal creation for guarded work.",
                },
                {
                  icon: Bot,
                  title: "AI workers",
                  copy: "Registry, permissions, allowed and blocked tools, budget posture, execution ledger, and approval proposals.",
                },
                {
                  icon: Database,
                  title: "Evidence",
                  copy: "Lead source runs expose quality score, dedupe posture, evidence snippets, and rejection reasons.",
                },
                {
                  icon: KeyRound,
                  title: "Secrets",
                  copy: "Provider setup references deployment-side requirements and missing secret names, not raw browser-entered credentials.",
                },
              ].map((item) => (
                <article key={item.title} className="rounded-lg border bg-background p-5">
                  <item.icon className="size-5 text-blue-700" />
                  <h3 className="mt-4 text-base font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-4xl px-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Trust FAQ
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Honest answers for teams evaluating sales automation risk.
            </h2>
            <div className="mt-8 divide-y rounded-lg border bg-background">
              {trustFaqs.map((faq) => (
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
