import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { HeroHeader } from "../../../components/blocks/hero-section";
import { MarketingFooter } from "../../../components/blocks/marketing-footer";
import {
  absoluteUrl,
  getDefaultOpenGraphImage,
  getDefaultTwitterCard,
  jsonLd,
  siteConfig,
} from "@/lib/seo";
import {
  buildResourceContactUrl,
  buildResourceGetStartedUrl,
  formatResourceArticleDate,
  getResourceArticle,
  getResourceArticleUpdatedAt,
  resourceArticleAuthorName,
  resourceArticles,
} from "@/lib/resources";

type ResourceArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return resourceArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: ResourceArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceArticle(slug);

  if (!article) {
    return {};
  }

  const updatedAt = getResourceArticleUpdatedAt(article);

  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: {
      canonical: `/resources/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `/resources/${article.slug}`,
      siteName: siteConfig.name,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: updatedAt,
      authors: [resourceArticleAuthorName],
      section: article.category,
      tags: article.keywords,
      images: [getDefaultOpenGraphImage()],
    },
    twitter: getDefaultTwitterCard(article.title, article.description),
  };
}

export default async function ResourceArticlePage({ params }: ResourceArticlePageProps) {
  const { slug } = await params;
  const article = getResourceArticle(slug);

  if (!article) {
    notFound();
  }

  const updatedAt = getResourceArticleUpdatedAt(article);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: updatedAt,
        mainEntityOfPage: absoluteUrl(`/resources/${article.slug}`),
        author: {
          "@type": "Organization",
          name: resourceArticleAuthorName,
          url: absoluteUrl("/"),
        },
        publisher: {
          "@type": "Organization",
          name: siteConfig.name,
          url: absoluteUrl("/"),
        },
        articleSection: article.category,
        keywords: article.keywords,
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
          {
            "@type": "ListItem",
            position: 3,
            name: article.title,
            item: absoluteUrl(`/resources/${article.slug}`),
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(articleJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <article>
          <header className="border-b bg-stone-50/70 py-14 md:py-20">
            <div className="mx-auto max-w-4xl px-6">
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Resources
              </Link>
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {article.category}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                  <Clock className="size-3.5" />
                  {article.readingTime}
                </span>
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Published {formatResourceArticleDate(article.publishedAt)} · Updated{" "}
                {formatResourceArticleDate(updatedAt)} · {resourceArticleAuthorName}
              </p>
              <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
                {article.title}
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
                {article.description}
              </p>
            </div>
          </header>

          <section className="py-12 md:py-16">
            <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
              <div className="min-w-0">
                <div className="rounded-lg border bg-background p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Key takeaways
                  </p>
                  <ul className="mt-4 space-y-3">
                    {article.summaryPoints.map((point) => (
                      <li key={point} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                        <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-10 space-y-10">
                  {article.sections.map((section) => (
                    <section key={section.heading}>
                      <h2 className="text-2xl font-bold tracking-tight">{section.heading}</h2>
                      <p className="mt-4 text-base leading-8 text-muted-foreground">
                        {section.body}
                      </p>
                      {section.bullets?.length ? (
                        <ul className="mt-5 grid gap-3 md:grid-cols-2">
                          {section.bullets.map((bullet) => (
                            <li
                              key={bullet}
                              className="rounded-lg border bg-stone-50/70 px-4 py-3 text-sm leading-6 text-muted-foreground"
                            >
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </section>
                  ))}
                </div>

                <section className="mt-12 rounded-lg border bg-stone-50/70 p-6">
                  <h2 className="text-xl font-bold tracking-tight">Operator checklist</h2>
                  <ul className="mt-5 space-y-3">
                    {article.checklist.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                        <ShieldCheck className="mt-1 size-4 shrink-0 text-blue-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <aside className="h-fit rounded-lg border bg-background p-5 lg:sticky lg:top-28">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Apply this in salesxgrowth
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Turn this guide into a Sales Blueprint, source plan, approval workflow, and
                  meeting follow-through inside a reviewable workspace.
                </p>
                <Link
                  href={buildResourceGetStartedUrl(article.slug, "article_sidebar")}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  Start free
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/trust"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Trust center
                </Link>
                <Link
                  href={buildResourceContactUrl(article.slug)}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100"
                >
                  Request rollout review
                </Link>
              </aside>
            </div>
          </section>
        </article>
      </main>
      <MarketingFooter />
    </>
  );
}
