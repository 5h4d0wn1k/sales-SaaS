import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  CreditCard,
  FileWarning,
  MailCheck,
  Network,
  PlugZap,
  Search,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import { absoluteUrl, getDefaultOpenGraphImage, jsonLd, siteConfig } from "@/lib/seo";
import {
  buildIntegrationContactUrl,
  getIntegrationRolloutPath,
  getIntegrationRolloutPathCounts,
  getIntegrationStatusCounts,
  getIntegrationsByCategory,
  integrationStatusMeta,
  publicIntegrations,
  type PublicIntegrationCategory,
  type PublicIntegrationStatus,
} from "@/lib/integrations";

export const metadata: Metadata = {
  title: "AI sales integrations and channel readiness",
  description:
    "Review Winrate integration readiness for lead sources, email, voice, billing, webhooks, Telegram, AI workers, CRM roadmap, and explicit outbound automation boundaries.",
  alternates: {
    canonical: "/integrations",
  },
  openGraph: {
    title: "AI sales integrations and channel readiness",
    description:
      "A claim-safe integration catalog for teams evaluating AI-assisted lead generation, outreach, meetings, billing, Telegram control, and provider readiness.",
    url: "/integrations",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
};

const categoryIcons: Record<PublicIntegrationCategory, typeof Network> = {
  lead_sources: Search,
  outreach: MailCheck,
  voice_meetings: CalendarCheck,
  billing_webhooks: CreditCard,
  command_center: Bot,
  roadmap_ops: Workflow,
  policy_boundaries: FileWarning,
};

const statusOrder: PublicIntegrationStatus[] = [
  "configured_when_ready",
  "guarded_beta",
  "roadmap",
  "prohibited",
];

const integrationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      name: "AI sales integrations and channel readiness",
      url: absoluteUrl("/integrations"),
      description: metadata.description,
      isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: absoluteUrl("/"),
      },
      about: [
        "AI sales integrations",
        "lead generation software",
        "approval-gated outreach",
        "Telegram sales bot",
        "sales automation provider readiness",
      ],
    },
    {
      "@type": "ItemList",
      itemListElement: publicIntegrations.map((integration, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/integrations#${integration.slug}`),
        name: integration.name,
        description: integration.summary,
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
          name: "Integrations",
          item: absoluteUrl("/integrations"),
        },
      ],
    },
  ],
};

function StatusBadge({ status }: { status: PublicIntegrationStatus }) {
  const meta = integrationStatusMeta[status];

  return (
    <span
      className={`inline-flex w-fit items-center rounded-sm border px-2 py-1 text-xs font-semibold ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function StatusCount({
  status,
  count,
}: {
  status: PublicIntegrationStatus;
  count: number;
}) {
  const meta = integrationStatusMeta[status];

  return (
    <div className="border-b px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-2xl font-bold tracking-tight">{count}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {meta.shortLabel}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{meta.description}</p>
    </div>
  );
}

export default async function IntegrationsPage() {
  const groupedIntegrations = getIntegrationsByCategory();
  const statusCounts = getIntegrationStatusCounts();
  const rolloutPathCounts = getIntegrationRolloutPathCounts();
  const channelCount = new Set(publicIntegrations.flatMap((integration) => integration.channels))
    .size;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(integrationJsonLd) }}
      />
      <HeroHeader />
      <main className="min-h-screen pt-28">
        <section className="border-b bg-stone-50/70 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_0.85fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                <PlugZap className="size-3.5" />
                Integration readiness
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                AI sales channels with the setup status and guardrails visible.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Review what Winrate can configure, what is guarded in beta, what is still roadmap,
                and what the product should not automate. The catalog covers lead sources, email,
                voice, billing, webhooks, Telegram control, AI workers, and future CRM operations.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/get-started"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  Build your Sales Blueprint
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/trust"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Review trust controls
                </Link>
              </div>
            </div>

            <div className="rounded-lg border bg-background">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Catalog posture
                </p>
                <h2 className="mt-1 text-lg font-bold">Truth before automation scale</h2>
              </div>
              <div className="divide-y">
                {[
                  ["Provider groups", groupedIntegrations.length.toString()],
                  ["Channel labels", channelCount.toString()],
                  [
                    "Rollout paths",
                    Object.entries(rolloutPathCounts)
                      .map(([label, count]) => `${count} ${label.toLowerCase()}`)
                      .join(", "),
                  ],
                  ["Public stance", "Configurable, guarded, roadmap, or explicitly unsupported"],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[8rem_1fr] gap-3 px-5 py-4">
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-sm leading-6 text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b bg-background py-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Revenue-safe rollout paths</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Each status maps to a commercial next step, so evaluation can move toward revenue
                  without turning roadmap or prohibited behavior into a sales promise.
                </p>
              </div>
              <span className="w-fit rounded-sm border bg-stone-50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                Claim-safe buyer routing
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border bg-background md:grid md:grid-cols-4">
              {statusOrder.map((status) => {
                const statusMeta = integrationStatusMeta[status];
                const rolloutPath = getIntegrationRolloutPath({ status });

                return (
                  <div key={status} className="border-b px-5 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                    <span
                      className={`inline-flex rounded-sm border px-2 py-1 text-xs font-semibold ${statusMeta.className}`}
                    >
                      {statusMeta.shortLabel}
                    </span>
                    <h3 className="mt-3 text-base font-bold tracking-tight">
                      {rolloutPath.label}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {rolloutPath.description}
                    </p>
                    <p className="mt-3 border-t pt-3 text-xs leading-5 text-muted-foreground">
                      {rolloutPath.claimBoundary}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b py-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="overflow-hidden rounded-lg border bg-background sm:grid sm:grid-cols-4">
              {statusOrder.map((status) => (
                <StatusCount key={status} status={status} count={statusCounts[status]} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Channel and provider matrix
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Each row separates current behavior from setup needs and future expansion so
                  sales, product, and implementation teams do not overpromise.
                </p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-sm border bg-stone-50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                Human approval remains the default gate for risky actions
              </div>
            </div>

            <div className="space-y-8">
              {groupedIntegrations.map((category) => {
                const Icon = categoryIcons[category.id];

                return (
                  <section key={category.id} aria-labelledby={`${category.id}-heading`}>
                    <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-blue-600" />
                          <h3
                            id={`${category.id}-heading`}
                            className="text-xl font-bold tracking-tight"
                          >
                            {category.label}
                          </h3>
                        </div>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                      <span className="w-fit rounded-sm border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                        {category.integrations.length} entries
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-lg border bg-background">
                      <div className="hidden grid-cols-[1.15fr_0.7fr_1.1fr_1fr] border-b bg-stone-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
                        <span>Integration</span>
                        <span>Status</span>
                        <span>Current mode</span>
                        <span>Setup and guardrails</span>
                      </div>
                      <div className="divide-y">
                        {category.integrations.map((integration) => {
                          const guideHref = "guideHref" in integration ? integration.guideHref : null;
                          const rolloutPath = getIntegrationRolloutPath(integration);

                          return (
                            <article
                              id={integration.slug}
                              key={integration.slug}
                              className="grid gap-5 px-5 py-5 lg:grid-cols-[1.15fr_0.7fr_1.1fr_1fr]"
                            >
                            <div>
                              <h4 className="font-semibold tracking-tight">{integration.name}</h4>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {integration.summary}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {integration.channels.map((channel) => (
                                  <span
                                    key={channel}
                                    className="rounded-sm border bg-stone-50 px-2 py-1 text-xs font-medium text-muted-foreground"
                                  >
                                    {channel}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {rolloutPath.ctaLabel && rolloutPath.contactIntent ? (
                                  <Link
                                    href={buildIntegrationContactUrl(
                                      integration.slug,
                                      rolloutPath.contactIntent,
                                    )}
                                    className="inline-flex items-center gap-1.5 rounded-sm border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                                  >
                                    {rolloutPath.ctaLabel}
                                    <ArrowRight className="size-3.5" />
                                  </Link>
                                ) : null}
                                {guideHref ? (
                                  <Link
                                    href={guideHref}
                                    className="inline-flex items-center gap-1.5 rounded-sm border bg-stone-50 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  >
                                    Read guide
                                  </Link>
                                ) : null}
                              </div>
                            </div>

                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:hidden">
                                Status
                              </p>
                              <StatusBadge status={integration.status} />
                              <div className="mt-4 rounded-sm border bg-stone-50 px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Commercial path
                                </p>
                                <p className="mt-2 text-sm font-semibold text-foreground">
                                  {rolloutPath.label}
                                </p>
                                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                  {rolloutPath.claimBoundary}
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:hidden">
                                Current mode
                              </p>
                              <p className="text-sm leading-6 text-muted-foreground">
                                {integration.currentMode}
                              </p>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Required setup
                                </p>
                                <ul className="mt-2 space-y-1.5">
                                  {integration.requiredSetup.slice(0, 3).map((item) => (
                                    <li
                                      key={item}
                                      className="text-sm leading-6 text-muted-foreground"
                                    >
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Guardrails
                                </p>
                                <ul className="mt-2 space-y-1.5">
                                  {integration.guardrails.slice(0, 3).map((item) => (
                                    <li
                                      key={item}
                                      className="text-sm leading-6 text-muted-foreground"
                                    >
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t bg-stone-50/70 py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Integration expansion starts with the Sales Blueprint.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                The safest path to advanced automation is to capture the business context first,
                then add channels only where setup, compliance, budget, and review controls are
                strong enough for real customer workflows.
              </p>
            </div>
            <div className="rounded-lg border bg-background">
              <div className="grid gap-0 divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
                {[
                  ["1", "Capture ICP, offer, regions, goals, and disqualifiers."],
                  ["2", "Review provider readiness, source evidence, and blockers."],
                  ["3", "Approve live outreach only after suppression and entitlement checks."],
                ].map(([step, copy]) => (
                  <div key={step} className="px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                      Step {step}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
