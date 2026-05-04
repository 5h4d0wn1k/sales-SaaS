import { HeroHeader } from "../../components/blocks/hero-section";
import { Mail, MessageSquare, LifeBuoy } from "lucide-react";
import { Button } from "../../components/ui/button";
import { MarketingFooter } from "../../components/blocks/marketing-footer";

export default async function ContactPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 pb-24 min-h-screen">
                <div className="mx-auto max-w-5xl px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                    <div className="mb-16 md:mb-0">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                            Contact Us
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">
                            Talk to the team behind your workspace
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-xl mx-auto md:mx-0 mb-10">
                            During the beta, the fastest way to reach us is email. Share your goals, blockers, billing questions, or rollout plans and we&apos;ll route it from there.
                        </p>

                        <div className="space-y-8">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                    <Mail className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground mb-1">Email us</h3>
                                    <p className="text-sm text-muted-foreground">Product, billing, onboarding, and rollout questions all start here.</p>
                                    <a href="mailto:hello@winrate.ai" className="text-sm font-medium text-foreground hover:underline mt-1 inline-block">hello@winrate.ai</a>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                                    <LifeBuoy className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground mb-1">Implementation help</h3>
                                    <p className="text-sm text-muted-foreground">Include your team size, target market, and plan so we can answer with real context.</p>
                                    <p className="text-sm font-medium text-foreground mt-1">Average response target: 1 business day during beta</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0">
                                    <MessageSquare className="w-5 h-5 text-slate-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground mb-1">Beta feedback</h3>
                                    <p className="text-sm text-muted-foreground">Tell us what broke, what felt unclear, or what would make the workflow more useful for your team.</p>
                                    <p className="text-sm font-medium text-foreground mt-1">Feedback is reviewed directly by the product team.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-background border rounded-2xl p-8 shadow-sm">
                        <h3 className="text-xl font-bold mb-4">Send a useful first message</h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                            The contact workflow is intentionally simple for now: we open your email client with the right topic so nothing disappears into a fake form.
                        </p>
                        <div className="mt-6 space-y-4 rounded-2xl border bg-stone-50/60 p-5">
                            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">What to include</h4>
                            <ul className="space-y-2 text-sm text-foreground">
                                <li>Your company name and website</li>
                                <li>Your current plan or intended plan</li>
                                <li>The workflow you are trying to run</li>
                                <li>Any blockers, billing issues, or rollout timeline</li>
                            </ul>
                        </div>
                        <div className="mt-6 grid gap-3">
                            <Button asChild className="w-full bg-foreground text-background hover:bg-foreground/90 py-6 rounded-xl">
                                <a href="mailto:hello@winrate.ai?subject=Winrate%20workspace%20question">
                                    Ask about setup or rollout
                                </a>
                            </Button>
                            <Button asChild variant="outline" className="w-full py-6 rounded-xl">
                                <a href="mailto:hello@winrate.ai?subject=Winrate%20billing%20question">
                                    Ask about billing or plan fit
                                </a>
                            </Button>
                            <Button asChild variant="outline" className="w-full py-6 rounded-xl">
                                <a href="mailto:hello@winrate.ai?subject=Winrate%20beta%20feedback">
                                    Send product feedback
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <MarketingFooter />
        </>
    );
}
