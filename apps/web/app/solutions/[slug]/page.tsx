import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { HeroHeader } from "../../../components/blocks/hero-section";
import { MarketingFooter } from "../../../components/blocks/marketing-footer";
import {
  absoluteUrl,
  buildVisibleAnswerListJsonLd,
  getDefaultOpenGraphImage,
  jsonLd,
  siteConfig,
} from "@/lib/seo";
import { getSolutionSegmentPage, solutionSegmentPages } from "@/lib/solution-segments";

type SolutionSegmentPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const statusTone = {
  Ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Review: "border-blue-200 bg-blue-50 text-blue-700",
  Guarded: "border-amber-200 bg-amber-50 text-amber-800",
  Expansion: "border-slate-200 bg-slate-50 text-slate-700",
} as const;

export function generateStaticParams() {
  return solutionSegmentPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: SolutionSegmentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getSolutionSegmentPage(slug);

  if (!page) {
    return {};
  }

  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    alternates: {
      canonical: `/solutions/${page.slug}`,
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `/solutions/${page.slug}`,
      siteName: siteConfig.name,
      type: "website",
      images: [getDefaultOpenGraphImage()],
    },
  };
}

export default async function SolutionSegmentPage({ params }: SolutionSegmentPageProps) {
  const { slug } = await params;
  const page = getSolutionSegmentPage(slug);

  if (!page) {
    notFound();
  }

  const segmentJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: page.title,
        url: absoluteUrl(`/solutions/${page.slug}`),
        description: page.description,
        isPartOf: {
          "@type": "WebSite",
          name: siteConfig.name,
          url: absoluteUrl("/"),
        },
        about: page.keywords,
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
          {
            "@type": "ListItem",
            position: 3,
            name: page.segmentLabel,
            item: absoluteUrl(`/solutions/${page.slug}`),
          },
        ],
      },
      buildVisibleAnswerListJsonLd(
        `${page.segmentLabel} questions answered on this page`,
        page.faq,
      ),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(segmentJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
            <div className="min-w-0">
              <Link
                href="/solutions"
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Solutions
              </Link>
              <div className="mt-7 flex flex-wrap gap-2">
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                  {page.segmentLabel}
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Approval-gated beta
                </span>
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
                {page.title}
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
                {page.description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={page.startHref}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  Start workspace
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={page.contactHref}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Request rollout review
                </Link>
              </div>
            </div>

            <aside className="rounded-lg border bg-background">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Segment operating model
                </p>
                <h2 className="mt-1 text-lg font-bold">Current fit and boundary</h2>
              </div>
              <div className="divide-y">
                {[
                  ["Intent", page.intent],
                  ["Current beta", page.current],
                  ["Growth path", page.expansion],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-2 px-5 py-4 sm:grid-cols-[7.25rem_1fr]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </p>
                    <p className="text-sm leading-6 text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Buyer fit
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Best when the sales motion needs structure before more automation.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                These pages are designed for search intent and buying clarity. They explain where
                salesxgrowth is useful today and where the roadmap still requires configuration,
                approval, and provider maturity.
              </p>
            </div>

            <div className="rounded-lg border bg-background">
              {page.fitSignals.map((signal) => (
                <div key={signal} className="flex items-start gap-3 border-b px-5 py-4 last:border-b-0">
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-700" />
                  <p className="text-sm leading-6">{signal}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-stone-50/70 py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Workflow
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                  From buyer context to conversion evidence.
                </h2>
              </div>
              <Link
                href="/sales-blueprint"
                className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
              >
                Build a Sales Blueprint
                <ClipboardCheck className="size-4" />
              </Link>
            </div>

            <div className="mt-8 overflow-hidden rounded-lg border bg-background">
              {page.workflow.map((step, index) => (
                <div
                  key={step.label}
                  className="grid gap-3 border-b px-5 py-4 last:border-b-0 md:grid-cols-[4.5rem_8rem_1fr_auto] md:items-center"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {index + 1}
                  </p>
                  <h3 className="text-sm font-bold">{step.label}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                  <span
                    className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[step.status]}`}
                  >
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border bg-background">
              <div className="border-b px-5 py-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 size-5 text-emerald-700" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Guardrails
                    </p>
                    <h2 className="mt-1 text-lg font-bold">What this page does not claim</h2>
                  </div>
                </div>
              </div>
              <div className="divide-y">
                {page.guardrails.map((guardrail) => (
                  <p key={guardrail} className="px-5 py-4 text-sm leading-6 text-muted-foreground">
                    {guardrail}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-background">
              <div className="border-b px-5 py-4">
                <div className="flex items-start gap-3">
                  <WalletCards className="mt-1 size-5 text-blue-700" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Commercial path
                    </p>
                    <h2 className="mt-1 text-lg font-bold">How the segment can grow with salesxgrowth</h2>
                  </div>
                </div>
              </div>
              <div className="divide-y">
                {page.commercialPath.map((path) => (
                  <div key={path.label} className="px-5 py-4">
                    <h3 className="text-sm font-bold">{path.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{path.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-stone-50/70 py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Buyer questions
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Clear enough to buy, cautious enough to operate.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                salesxgrowth can become more automated over time, but today the best value is a
                reviewable operating layer for source planning, outreach approval, conversion
                follow-through, and revenue visibility.
              </p>
              <Link
                href="/trust"
                className="mt-7 inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
              >
                Review trust posture
                <Gauge className="size-4" />
              </Link>
            </div>
            <div className="divide-y rounded-lg border bg-background">
              {page.faq.map((item) => (
                <details key={item.question} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none text-base font-semibold">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
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
