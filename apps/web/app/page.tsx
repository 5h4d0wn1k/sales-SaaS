import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { HeroSection } from "../components/blocks/hero-section";
import { MarketingFooter } from "../components/blocks/marketing-footer";
import { absoluteUrl, getDefaultOpenGraphImage, jsonLd, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI-assisted sales workspace for lead generation, outreach, and conversion",
  description:
    "Winrate helps teams capture business context, plan leads, review outreach, track meetings, and manage billing in one approval-gated revenue workspace.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AI-assisted sales workspace for lead generation, outreach, and conversion",
    description:
      "Capture business context, plan leads, review outreach, track meetings, and manage billing in one governed revenue workspace.",
    url: "/",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const landingJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: siteConfig.name,
      url: absoluteUrl("/"),
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "hello@winrate.ai",
      },
    },
    {
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/"),
      description: siteConfig.description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    },
  ],
};

const workflowSteps = [
  {
    label: "01",
    title: "Capture the business context",
    description:
      "Turn offer, audience, goals, regions, constraints, channels, and sales targets into a structured workspace profile.",
  },
  {
    label: "02",
    title: "Plan the pipeline motion",
    description:
      "Create lead-source plans, outreach drafts, meeting handoff rules, and readiness gaps before provider work starts.",
  },
  {
    label: "03",
    title: "Review, approve, and operate",
    description:
      "Keep risky actions gated, track meetings and revenue assumptions, and preserve audit context as the system matures.",
  },
] as const;

const audienceLinks = [
  {
    title: "Founders",
    href: "/solutions/founders-validating-outbound",
    description: "Validate outbound with ICP clarity, source planning, and approval-gated outreach.",
  },
  {
    title: "Agencies",
    href: "/solutions/agencies-running-client-pipeline",
    description: "Keep client pipeline work structured, reviewable, and easier to explain.",
  },
  {
    title: "SMB teams",
    href: "/solutions/smb-sales-teams-modernizing-ops",
    description: "Modernize lead planning, meetings, and team visibility without losing control.",
  },
  {
    title: "Local services",
    href: "/solutions/local-service-businesses-booking-jobs",
    description: "Organize job-focused lead channels, call review, and booking follow-through.",
  },
  {
    title: "B2B SaaS",
    href: "/solutions/b2b-saas-teams-scaling-pipeline",
    description: "Scale pipeline experiments with governed sourcing, outreach, and conversion review.",
  },
  {
    title: "Professional services",
    href: "/solutions/professional-services-selling-retainers",
    description: "Turn consultative sales context into repeatable lead and meeting workflows.",
  },
] as const;

const capabilityRows = [
  {
    icon: Search,
    title: "Guided business onboarding",
    description:
      "Capture the business profile, ideal customer, constraints, regions, and lead goals in a shared workspace.",
    status: "Implemented",
  },
  {
    icon: Mail,
    title: "Approval-gated outreach",
    description:
      "Draft campaign and activity plans while keeping first risky actions behind explicit review gates.",
    status: "Guarded beta",
  },
  {
    icon: Phone,
    title: "Call review foundations",
    description:
      "Track call tasks, dispositions, provider posture, and blockers without claiming autonomous voice execution.",
    status: "Guarded beta",
  },
  {
    icon: Calendar,
    title: "Meeting conversion workspace",
    description:
      "Keep owners, notes, outcomes, manual calendar handoffs, and closed-value capture visible.",
    status: "Implemented",
  },
  {
    icon: BarChart3,
    title: "Revenue and plan visibility",
    description:
      "Model revenue assumptions, usage posture, billing context, and upgrade readiness in the dashboard.",
    status: "Implemented",
  },
  {
    icon: ShieldCheck,
    title: "Audit-aware operations",
    description:
      "Use tenant-scoped workspaces, approval records, suppression posture, and sanitized audit evidence.",
    status: "Implemented",
  },
] as const;

const operatingPrinciples = [
  "No live scraping or outreach starts from a public page.",
  "Provider and Telegram actions remain gated by configuration, roles, and approvals.",
  "ROI and forecast outputs are scenarios, not promises of booked meetings or closed revenue.",
] as const;

export default async function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(landingJsonLd) }}
      />
      <HeroSection />

      <section className="border-y bg-slate-50 py-16 md:py-20" id="how-it-works">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                Workflow
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">
                A sales operating system that starts with context, not blind automation.
              </h2>
            </div>
            <Link
              href="/sales-blueprint"
              className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-900"
            >
              Open Sales Blueprint
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {workflowSteps.map((step) => (
              <article key={step.label} className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="text-sm font-semibold text-teal-700">{step.label}</div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20" id="audience">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              Solutions
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">
              Built for different sales motions without pretending one playbook fits everyone.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Each segment page keeps fit signals, workflow boundaries, commercial path, and
              attribution visible before a buyer moves into contact or account setup.
            </p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {audienceLinks.map((audience) => (
              <Link
                key={audience.href}
                href={audience.href}
                className="group rounded-lg border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-teal-300 hover:bg-teal-50/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-950">{audience.title}</h3>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-teal-800" />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{audience.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-slate-50 py-16 md:py-20" id="features">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                Current beta
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">
                The product already covers the serious parts of governed sales operations.
              </h2>
            </div>
            <Link
              href="/trust"
              className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-900"
            >
              Review trust posture
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {capabilityRows.map((capability, index) => (
              <div
                key={capability.title}
                className={`grid gap-4 p-5 md:grid-cols-[2rem_1fr_8rem] md:items-center ${
                  index === 0 ? "" : "border-t border-slate-200"
                }`}
              >
                <capability.icon className="h-5 w-5 text-teal-700" />
                <div>
                  <h3 className="font-semibold text-slate-950">{capability.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {capability.description}
                  </p>
                </div>
                <div className="w-fit rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 md:ml-auto">
                  {capability.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[0.85fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              Revenue path
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">
              Start self-serve, then add rollout support when the motion is ready.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Winrate keeps software subscription, provider readiness, and managed support separate
              so teams can grow without confusing product gates with service promises.
            </p>
          </div>

          <div className="grid gap-3">
            <Link
              href="/pricing"
              className="rounded-lg border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-teal-300 hover:bg-teal-50/60"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-950">Compare public beta plans</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Review Free, Starter, Professional, and Elite pricing against usage posture.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-teal-800" />
              </div>
            </Link>
            <Link
              href="/managed-services"
              className="rounded-lg border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-teal-300 hover:bg-teal-50/60"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-950">Scope managed rollout support</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Add setup, operator assist, or growth council support without bypassing gates.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-teal-800" />
              </div>
            </Link>
            <Link
              href="/roi-calculator"
              className="rounded-lg border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-teal-300 hover:bg-teal-50/60"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-950">Model a claim-safe ROI scenario</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Estimate pipeline impact with visible assumptions and no guaranteed outcomes.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-teal-800" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y bg-slate-950 py-16 text-white md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-[1fr_0.8fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-300">
              Guardrails
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
              Strong sales automation should make the human operator more capable, not invisible.
            </h2>
          </div>
          <div className="space-y-3">
            {operatingPrinciples.map((principle) => (
              <div
                key={principle}
                className="flex gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200"
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                <span>{principle}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700">
            <Users className="h-5 w-5 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">
            Build the workspace first. Scale the automation only after the gates are clear.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Start free, attach your business context, and use rollout review when you want help
            configuring the operating model for real pipeline work.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact?intent=managed_services&utm_source=homepage&utm_medium=final_cta&utm_campaign=rollout_review"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:border-teal-300 hover:bg-teal-50"
            >
              Request rollout review
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
