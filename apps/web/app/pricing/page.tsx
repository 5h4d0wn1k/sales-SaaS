import { HeroHeader } from "../../components/blocks/hero-section";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { PRICING_PLANS } from "@sales/shared";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import type { Metadata } from "next";
import {
    getDefaultOpenGraphImage,
    getDefaultTwitterCard,
    jsonLd,
    siteConfig,
} from "@/lib/seo";
import { buildPricingPageJsonLd } from "@/lib/pricing-seo";
import {
    buildPricingComparisonRows,
    buildPricingFitAdvisorRows,
    buildPricingGetStartedUrl,
    buildPricingManagedServiceContactUrl,
} from "@/lib/pricing-display";

export const metadata: Metadata = {
    title: "Pricing",
    description:
        "Compare salesxgrowth plans for AI-assisted lead planning, approval-gated outreach, dashboard visibility, and billing controls.",
    alternates: {
        canonical: "/pricing",
    },
    openGraph: {
        title: "salesxgrowth Pricing",
        description:
            "Current public pricing for AI-assisted lead planning, approval-gated outreach, usage limits, provider-cost budgets, seats, and managed rollout support.",
        url: "/pricing",
        siteName: siteConfig.name,
        type: "website",
        images: [getDefaultOpenGraphImage()],
    },
    twitter: getDefaultTwitterCard(
        "salesxgrowth Pricing",
        "Compare public beta plans, usage limits, provider-cost budgets, seats, and managed rollout support.",
    ),
};

function formatPlanPrice(usd: number) {
    if (usd === 0) {
        return "$0";
    }

    return `$${usd}`;
}

export default async function PricingPage() {
  const publicPlans = PRICING_PLANS;
  const pricingJsonLd = jsonLd(buildPricingPageJsonLd(publicPlans));
  const comparisonRows = buildPricingComparisonRows(publicPlans);
  const fitAdvisorRows = buildPricingFitAdvisorRows(publicPlans);
    return (
        <>
            <HeroHeader />
            <main className="min-h-screen pt-28 pb-24">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="mx-auto mb-16 max-w-3xl text-center">
                        <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase text-teal-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                            Pricing
                        </span>
                        <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                            Straightforward pricing for the current public beta
                        </h1>
                        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                            These plans describe capabilities that are available in the product today. Start free, validate the workflow, then scale usage and seats when the fit is real.
                        </p>
                    </div>

                    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {publicPlans.map((plan) => {
                            const isPopular = Boolean(plan.popular);
                            const isTrialPlan = plan.key === "free";
                            const ctaLabel = isTrialPlan ? "Start Trial" : "Choose Plan";

                            return (
                                <div
                                    key={plan.key}
                                    className={[
                                        "relative flex flex-col rounded-lg bg-background p-6",
                                        isPopular
                                            ? "border-2 border-teal-600 shadow-sm"
                                            : "border",
                                    ].join(" ")}
                                >
                                    {isPopular && (
                                        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold uppercase text-teal-700">
                                            Most Popular
                                        </div>
                                    )}
                                    <h3 className="text-lg font-bold">{plan.name}</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                                    <div className="mt-6 mb-8">
                                        <span className="text-4xl font-bold">{formatPlanPrice(plan.price.usd)}</span>
                                        {isTrialPlan && <span className="text-muted-foreground">/7 days</span>}
                                        {!isTrialPlan && <span className="text-muted-foreground">/mo</span>}
                                    </div>
                                    <ul className="space-y-3 mb-8 flex-1">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm">
                                                <Check className="h-4 w-4 text-teal-600" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        asChild
                                        className={isPopular ? "w-full gap-2 rounded-md bg-teal-700 text-white hover:bg-teal-800" : "w-full gap-2 rounded-md"}
                                        variant={isPopular ? "default" : "outline"}
                                    >
                                        <Link href={buildPricingGetStartedUrl(plan.key)} className={isPopular ? "text-white" : undefined}>
                                            {ctaLabel}
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    </Button>
                                </div>
                            );
                        })}
                    </div>

                    <section className="mt-16">
                        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="text-sm font-semibold uppercase text-muted-foreground">
                                    Plan fit advisor
                                </p>
                                <h2 className="mt-2 text-2xl font-bold">
                                    Pick the plan by rollout stage, not by guesswork.
                                </h2>
                            </div>
                            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                                Each recommendation is grounded in the shared plan catalog. It does not start provider work, billing changes, lead sourcing, or outreach without the normal account and approval gates.
                            </p>
                        </div>

                        <div className="grid gap-3 md:hidden">
                            {fitAdvisorRows.map((row) => (
                                <article key={row.key} className="rounded-lg border bg-white p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                {row.scenario}
                                            </p>
                                            <h3 className="mt-2 text-base font-bold text-slate-950">
                                                {row.recommendedPlanName}
                                            </h3>
                                        </div>
                                        <span className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                                            {row.priceLabel}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-950">
                                        {row.summary}
                                    </p>
                                    <dl className="mt-4 grid gap-1.5 border-y py-3">
                                        {row.boundaries.map((boundary) => (
                                            <div
                                                key={boundary.label}
                                                className="grid grid-cols-[112px_1fr] gap-2 text-xs leading-5"
                                            >
                                                <dt className="font-semibold text-muted-foreground">
                                                    {boundary.label}
                                                </dt>
                                                <dd className="font-medium text-slate-800">
                                                    {boundary.value}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                        {row.guardrail}
                                    </p>
                                    <p className="mt-2 text-xs font-semibold text-muted-foreground">
                                        {row.commercialPath}
                                    </p>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <Link
                                            href={row.ctaHref}
                                            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                                        >
                                            {row.ctaLabel}
                                            <ArrowRight className="size-4" />
                                        </Link>
                                        {row.reviewHref ? (
                                            <Link
                                                href={row.reviewHref}
                                                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                                            >
                                                {row.reviewLabel ?? "Request rollout review"}
                                            </Link>
                                        ) : null}
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto rounded-lg border bg-white md:block">
                            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b bg-stone-50/70">
                                        <th scope="col" className="w-[240px] px-4 py-3 font-semibold text-slate-950">
                                            Rollout stage
                                        </th>
                                        <th scope="col" className="w-[170px] px-4 py-3 font-semibold text-slate-950">
                                            Plan
                                        </th>
                                        <th scope="col" className="w-[260px] px-4 py-3 font-semibold text-slate-950">
                                            Operating boundaries
                                        </th>
                                        <th scope="col" className="w-[300px] px-4 py-3 font-semibold text-slate-950">
                                            Guardrail
                                        </th>
                                        <th scope="col" className="w-[190px] px-4 py-3 font-semibold text-slate-950">
                                            Next step
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fitAdvisorRows.map((row) => (
                                        <tr key={row.key} className="border-b last:border-b-0">
                                            <th scope="row" className="px-4 py-4 align-top">
                                                <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    {row.scenario}
                                                </span>
                                                <span className="mt-2 block font-semibold text-slate-950">
                                                    {row.summary}
                                                </span>
                                            </th>
                                            <td className="px-4 py-4 align-top">
                                                <span className="block font-semibold text-slate-950">
                                                    {row.recommendedPlanName}
                                                </span>
                                                <span className="mt-2 inline-flex rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                                                    {row.priceLabel}
                                                </span>
                                                <span className="mt-3 block text-xs leading-5 text-muted-foreground">
                                                    {row.commercialPath}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 align-top">
                                                <dl className="grid gap-1.5">
                                                    {row.boundaries.map((boundary) => (
                                                        <div
                                                            key={boundary.label}
                                                            className="grid grid-cols-[112px_1fr] gap-2 text-xs leading-5"
                                                        >
                                                            <dt className="font-semibold text-muted-foreground">
                                                                {boundary.label}
                                                            </dt>
                                                            <dd className="font-medium text-slate-800">
                                                                {boundary.value}
                                                            </dd>
                                                        </div>
                                                    ))}
                                                </dl>
                                            </td>
                                            <td className="px-4 py-4 align-top text-sm leading-6 text-muted-foreground">
                                                {row.guardrail}
                                            </td>
                                            <td className="px-4 py-4 align-top">
                                                <div className="flex flex-col gap-2">
                                                    <Link
                                                        href={row.ctaHref}
                                                        className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                                                    >
                                                        {row.ctaLabel}
                                                        <ArrowRight className="size-4" />
                                                    </Link>
                                                    {row.reviewHref ? (
                                                        <Link
                                                            href={row.reviewHref}
                                                            className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                                                        >
                                                            {row.reviewLabel ?? "Request rollout review"}
                                                        </Link>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="mt-16">
                        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="text-sm font-semibold uppercase text-muted-foreground">
                                    Plan fit
                                </p>
                                <h2 className="mt-2 text-2xl font-bold">
                                    Compare the limits that change cost and rollout scope.
                                </h2>
                            </div>
                            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                                Plan boundaries are checked before provider work runs, so teams can scale lead volume, seats, channels, and provider spend deliberately.
                            </p>
                        </div>

                        <div className="overflow-x-auto rounded-lg border bg-white">
                            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b bg-stone-50/70">
                                        <th scope="col" className="w-[260px] px-4 py-3 font-semibold text-slate-950">
                                            Boundary
                                        </th>
                                        {publicPlans.map((plan) => (
                                            <th key={plan.key} scope="col" className="px-4 py-3 font-semibold text-slate-950">
                                                {plan.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparisonRows.map((row) => (
                                        <tr key={row.label} className="border-b last:border-b-0">
                                            <th scope="row" className="px-4 py-4 align-top">
                                                <span className="block font-semibold text-slate-950">{row.label}</span>
                                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                                    {row.detail}
                                                </span>
                                            </th>
                                            {publicPlans.map((plan) => (
                                                <td key={plan.key} className="px-4 py-4 align-top text-slate-700">
                                                    {row.values[plan.key]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="mt-16 border-y bg-stone-50/70 py-8">
                        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                            <div>
                                <p className="text-sm font-semibold uppercase text-muted-foreground">
                                    Need help launching the workflow?
                                </p>
                                <h2 className="mt-2 text-2xl font-bold">
                                    Add managed setup, review cadence, and rollout support.
                                </h2>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                                    Managed services are separate from the software subscription and help teams shape the Sales Blueprint, source strategy, approval operations, provider readiness, and reporting rhythm.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
                                <Button asChild className="w-full gap-2 md:w-auto">
                                    <Link href={buildPricingManagedServiceContactUrl("setup-sprint")}>
                                        Request setup review
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full md:w-auto">
                                    <Link href="/managed-services">View service scope</Link>
                                </Button>
                            </div>
                        </div>
                    </section>
                </div>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: pricingJsonLd }}
                />
            </main>

            {/* Footer */}
            <MarketingFooter />
        </>
    );
}
