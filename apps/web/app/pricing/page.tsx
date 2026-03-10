import { HeroHeader } from "../../components/blocks/hero-section";
import { Zap, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "../../components/ui/button";

export default function PricingPage() {
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
                            Simple, transparent pricing
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                            No hidden fees. No surprise charges. Only pay for the tools you need to build your sales engine.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* Starter */}
                        <div className="rounded-2xl border bg-background p-8 flex flex-col">
                            <h3 className="text-lg font-bold">Starter</h3>
                            <p className="mt-2 text-sm text-muted-foreground">Perfect for solo founders and side projects.</p>
                            <div className="mt-6 mb-8">
                                <span className="text-4xl font-bold">$49</span>
                                <span className="text-muted-foreground">/mo</span>
                            </div>
                            <ul className="space-y-3 mb-8 flex-1">
                                {["1,000 AI leads per month", "Basic personalized outreach", "1 User seat", "Community support"].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm">
                                        <Check className="w-4 h-4 text-emerald-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button asChild className="w-full" variant="outline">
                                <Link href="/get-started">Start Free Trial</Link>
                            </Button>
                        </div>

                        {/* Growth */}
                        <div className="rounded-2xl border-2 border-purple-500 bg-background p-8 flex flex-col relative shadow-xl shadow-purple-500/10 scale-105 z-10">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                Most Popular
                            </div>
                            <h3 className="text-lg font-bold">Growth</h3>
                            <p className="mt-2 text-sm text-muted-foreground">For scaling startups that need serious pipeline.</p>
                            <div className="mt-6 mb-8">
                                <span className="text-4xl font-bold">$199</span>
                                <span className="text-muted-foreground">/mo</span>
                            </div>
                            <ul className="space-y-3 mb-8 flex-1">
                                {["10,000 AI leads per month", "Advanced personalization", "AI Voice Calls (100 mins)", "5 User seats", "Priority email support"].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm">
                                        <Check className="w-4 h-4 text-emerald-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button asChild className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:opacity-90 border-0">
                                <Link href="/get-started" className="text-white">Get Started</Link>
                            </Button>
                        </div>

                        {/* Enterprise */}
                        <div className="rounded-2xl border bg-background p-8 flex flex-col">
                            <h3 className="text-lg font-bold">Enterprise</h3>
                            <p className="mt-2 text-sm text-muted-foreground">Custom solutions for large sales teams.</p>
                            <div className="mt-6 mb-8">
                                <span className="text-4xl font-bold">Custom</span>
                            </div>
                            <ul className="space-y-3 mb-8 flex-1">
                                {["Unlimited AI leads", "Custom workflows & integrations", "Unlimited AI Voice Calls", "Unlimited User seats", "Dedicated account manager", "White-glove onboarding"].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm">
                                        <Check className="w-4 h-4 text-emerald-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button asChild className="w-full" variant="outline">
                                <Link href="/contact">Contact Sales</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-10 border-t">
                <div className="mx-auto max-w-5xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                            <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm font-bold tracking-tight">Winrate</span>
                    </div>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                        <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
                        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
                    </div>
                    <p className="text-xs text-muted-foreground">© 2026 Winrate. Built for builders.</p>
                </div>
            </footer>
        </>
    );
}
