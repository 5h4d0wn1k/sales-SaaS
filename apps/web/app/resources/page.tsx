import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, FileText, Search } from "lucide-react";
import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import { absoluteUrl, getDefaultOpenGraphImage, jsonLd, siteConfig } from "@/lib/seo";
import {
  formatResourceArticleDate,
  getResourceArticleUpdatedAt,
  resourceArticles,
} from "@/lib/resources";

export const metadata: Metadata = {
  title: "AI sales resources for safer lead generation and outbound operations",
  description:
    "Read claim-safe salesxgrowth guides on AI SDR software evaluation, approval-gated sales automation, Telegram sales command centers, Sales Blueprint planning, lead generation, and outbound workflow governance.",
  alternates: {
    canonical: "/resources",
  },
  openGraph: {
    title: "AI sales resources for safer lead generation and outbound operations",
    description:
      "Practical, review-oriented guides for teams evaluating AI SDR software, AI-assisted lead generation, Telegram command centers, outbound workflows, and revenue operations.",
    url: "/resources",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const resourcesJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      name: "AI sales resources",
      url: absoluteUrl("/resources"),
      description: metadata.description,
      isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: absoluteUrl("/"),
      },
    },
    {
      "@type": "ItemList",
      itemListElement: resourceArticles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/resources/${article.slug}`),
        name: article.title,
        dateModified: getResourceArticleUpdatedAt(article),
      })),
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
          name: "Resources",
          item: absoluteUrl("/resources"),
        },
      ],
    },
  ],
};

export default async function ResourcesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(resourcesJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_0.85fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                <BookOpen className="size-3.5" />
                AI sales resources
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                Practical guides for building pipeline without losing control.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Use these resources to shape safer lead generation, approval-gated outreach,
                AI SDR evaluation, Telegram command-center operations, Sales Blueprint planning,
                and AI-assisted revenue operations before scaling live provider actions.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/get-started"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  Build your workspace
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/trust"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Review trust posture
                </Link>
              </div>
            </div>

            <div className="rounded-lg border bg-background">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Resource system
                </p>
                <h2 className="mt-1 text-lg font-bold">Designed for reviewable growth</h2>
              </div>
              <div className="divide-y">
                {[
                  ["Claim-safe", "Every guide separates current beta truth from roadmap ambition."],
                  ["Operational", "Advice maps back to blueprint, evidence, approvals, and meetings."],
                  ["Search-ready", "Each article has canonical metadata and structured data."],
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
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Featured guides</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Start with governance, Telegram command-center boundaries, blueprint planning,
                  AI SDR evaluation, and the system design choices that make AI-assisted sales
                  easier to operate.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border bg-stone-50 px-3 py-1 text-xs font-semibold text-muted-foreground">
                <Search className="size-3.5" />
                {resourceArticles.length} guides
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {resourceArticles.map((article) => (
                <article key={article.slug} className="rounded-lg border bg-background p-6">
                  <div className="flex items-start justify-between gap-4">
                    <FileText className="mt-1 size-5 shrink-0 text-blue-600" />
                    <span className="rounded-full border bg-stone-50 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      {article.readingTime}
                    </span>
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Updated {formatResourceArticleDate(getResourceArticleUpdatedAt(article))}
                  </p>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-blue-700">
                    {article.category}
                  </p>
                  <h3 className="mt-3 text-xl font-bold tracking-tight">{article.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {article.description}
                  </p>
                  <ul className="mt-5 space-y-2">
                    {article.summaryPoints.slice(0, 2).map((point) => (
                      <li key={point} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                        <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/resources/${article.slug}`}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground"
                  >
                    Read guide
                    <ArrowRight className="size-4" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-stone-50/70 py-16">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Turn the guide into a workspace plan.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              salesxgrowth can capture your business context, turn it into a Sales Blueprint, and show
              where sourcing, outreach, meetings, and provider readiness need review.
            </p>
            <Link
              href="/get-started"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Start with your blueprint
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
