import { HeroHeader } from "../../components/blocks/hero-section";
import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { PRICING_PLANS } from "@sales/shared";
import { MarketingFooter } from "../../components/blocks/marketing-footer";

function formatPlanPrice(usd: number) {
    if (usd === 0) {
        return "Free";
    }

    return `$${usd}`;
}

export default async function PricingPage() {
  const publicPlans = PRICING_PLANS;
    return (
        <>
            <HeroHeader />
            <main className="pt-32 pb-24 min-h-screen">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="text-center mb-16">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                            Pricing
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">
                            Straightforward pricing for the current public beta
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                            These plans describe capabilities that are available in the product today. Start free, validate the workflow, then scale usage and seats when the fit is real.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 max-w-6xl mx-auto">
                        {publicPlans.map((plan) => {
                            const isPopular = Boolean(plan.popular);
                            const isFreePlan = plan.key === "free";
                            const ctaLabel = isFreePlan ? "Start Free" : "Choose Plan";

                            return (
                                <div
                                    key={plan.key}
                                    className={[
                                        "rounded-2xl bg-background p-8 flex flex-col relative",
                                        isPopular
                                            ? "border-2 border-purple-500 shadow-xl shadow-purple-500/10 xl:scale-105 xl:z-10"
                                            : "border",
                                    ].join(" ")}
                                >
                                    {isPopular && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                            Most Popular
                                        </div>
                                    )}
                                    <h3 className="text-lg font-bold">{plan.name}</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                                    <div className="mt-6 mb-8">
                                        <span className="text-4xl font-bold">{formatPlanPrice(plan.price.usd)}</span>
                                        {!isFreePlan && <span className="text-muted-foreground">/mo</span>}
                                    </div>
                                    <ul className="space-y-3 mb-8 flex-1">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm">
                                                <Check className="w-4 h-4 text-emerald-500" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        asChild
                                        className={isPopular ? "w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:opacity-90 border-0" : "w-full"}
                                        variant={isPopular ? "default" : "outline"}
                                    >
                                        <Link href={`/get-started?plan=${plan.key}`} className={isPopular ? "text-white" : undefined}>
                                            {ctaLabel}
                                        </Link>
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <MarketingFooter />
        </>
    );
}
