"use client";

import { useState } from "react";
import { Zap, ArrowRight, Check, Loader2, CheckCircle2, Shield, CreditCard, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { loginWithGoogle, loginWithCredentials, registerWithCredentials } from "@/actions/auth";
import { PRICING_PLANS } from "@sales/shared";

type Step = "auth" | "plan_selection" | "checkout";

export default function GetStartedFlow({ initialStep, userEmail }: { initialStep: Step; userEmail?: string | null }) {
    const [step, setStep] = useState<Step>(initialStep);
    const [authMode, setAuthMode] = useState<"login" | "register">("register");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currency, setCurrency] = useState<"usd" | "inr">("usd");
    const [selectedPlan, setSelectedPlan] = useState<string>("pro");

    const currentPlan = PRICING_PLANS.find((p) => p.key === selectedPlan);

    async function handleEmailAuth(formData: FormData) {
        setLoading(true);
        setError(null);

        try {
            if (authMode === "register") {
                const res = await registerWithCredentials(formData);
                if (res?.error) setError(res.error);
                else setStep("plan_selection");
            } else {
                const res = await loginWithCredentials(formData);
                if (res?.error) setError(res.error);
                else setStep("plan_selection");
            }
        } catch {
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }

    async function handleCheckout() {
        setLoading(true);
        setError(null);

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const provider = currency === "usd" ? "stripe" : "razorpay";

            const res = await fetch(`${baseUrl}/v1/billing/checkout/${provider}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planKey: selectedPlan,
                    userEmail: userEmail || "customer@example.com",
                    successUrl: `${window.location.origin}/dashboard?checkout=success`,
                    cancelUrl: `${window.location.origin}/get-started`,
                }),
            });

            const data = await res.json();

            if (data.error) {
                setError(data.error);
                setLoading(false);
                return;
            }

            if (currency === "usd" && data.url) {
                window.location.href = data.url;
            } else if (currency === "inr" && data.subscriptionId) {
                const options = {
                    key: data.keyId,
                    subscription_id: data.subscriptionId,
                    name: data.name,
                    description: data.description,
                    handler: () => {
                        window.location.href = "/dashboard?checkout=success";
                    },
                    prefill: { email: userEmail || "" },
                    theme: { color: "#a855f7" },
                };
                // @ts-expect-error Razorpay is loaded via external script
                const rzp = new window.Razorpay(options);
                rzp.open();
                setLoading(false);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to initiate checkout";
            setError(msg);
            setLoading(false);
        }
    }

    const steps = [
        { key: "auth", label: "Account" },
        { key: "plan_selection", label: "Plan" },
        { key: "checkout", label: "Checkout" },
    ];
    const stepIdx = steps.findIndex((s) => s.key === step);

    return (
        <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            {/* Left Column */}
            <div className="flex flex-col justify-between px-6 py-10 md:px-12 md:py-16 overflow-y-auto">
                <div>
                    <Link href="/" className="flex items-center gap-2 mb-10 inline-flex">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">Winrate</span>
                    </Link>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2 mb-10 max-w-sm">
                        {steps.map((s, i) => (
                            <div key={s.key} className="flex items-center gap-2 flex-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${i <= stepIdx ? "bg-foreground text-background" : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"}`}>
                                    {i < stepIdx ? <Check className="w-4 h-4" /> : i + 1}
                                </div>
                                <span className={`text-xs font-medium hidden sm:block ${i <= stepIdx ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                                {i < steps.length - 1 && <div className={`h-px flex-1 ${i < stepIdx ? "bg-foreground" : "bg-zinc-200 dark:bg-zinc-800"}`} />}
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Auth */}
                    {step === "auth" && (
                        <div className="max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-3">
                                {authMode === "register" ? "Start building your sales engine" : "Welcome back"}
                            </h1>
                            <p className="text-muted-foreground mb-8">
                                {authMode === "register"
                                    ? "No credit card required. Connect your email and we'll start finding leads for you in minutes."
                                    : "Enter your details to access your dashboard."}
                            </p>

                            <form action={handleEmailAuth} className="space-y-5">
                                {error && (
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">{error}</div>
                                )}

                                {authMode === "register" && (
                                    <div className="space-y-1.5">
                                        <label htmlFor="name" className="text-sm font-semibold">Full name</label>
                                        <input id="name" name="name" type="text" placeholder="John Doe" className="w-full px-4 py-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow" required />
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <label htmlFor="email" className="text-sm font-semibold">Work email</label>
                                    <input id="email" name="email" type="email" placeholder="you@company.com" className="w-full px-4 py-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow" required />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="password" className="text-sm font-semibold">Password</label>
                                    <input id="password" name="password" type="password" placeholder="••••••••" minLength={8} className="w-full px-4 py-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow" required />
                                </div>

                                <Button type="submit" disabled={loading} className="w-full bg-foreground text-background hover:bg-foreground/90 py-6 rounded-xl text-base font-semibold group">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>{authMode === "register" ? "Create account" : "Sign in"}<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </Button>

                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
                                    <span className="mx-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Or</span>
                                    <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
                                </div>

                                <Button formAction={loginWithGoogle} disabled={loading} type="submit" variant="outline" className="w-full py-6 rounded-xl font-medium border-zinc-200 dark:border-zinc-800">
                                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                    Continue with Google
                                </Button>

                                <div className="text-center pt-1">
                                    <button type="button" onClick={() => { setAuthMode((m) => (m === "register" ? "login" : "register")); setError(null); }} className="text-sm font-medium underline-offset-4 hover:underline">
                                        {authMode === "register" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                                    </button>
                                </div>

                                <p className="text-[11px] text-center text-muted-foreground mt-6 leading-relaxed">
                                    By continuing, you agree to our{" "}
                                    <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>{" "}and{" "}
                                    <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
                                </p>
                            </form>
                        </div>
                    )}

                    {/* Step 2: Plan Selection */}
                    {step === "plan_selection" && (
                        <div className="max-w-2xl animate-in fade-in slide-in-from-right-8 duration-500">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-3">Choose your plan</h1>
                            <p className="text-muted-foreground mb-8">
                                Select a billing tier for <span className="font-medium text-foreground">{userEmail || "your account"}</span>. Upgrade or cancel anytime.
                            </p>

                            <div className="flex items-center mb-8 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-max">
                                <button onClick={() => setCurrency("usd")} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${currency === "usd" ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                    🌐 Global (USD)
                                </button>
                                <button onClick={() => setCurrency("inr")} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${currency === "inr" ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                    🇮🇳 India (INR)
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {PRICING_PLANS.map((plan) => (
                                    <div
                                        key={plan.key}
                                        onClick={() => setSelectedPlan(plan.key)}
                                        className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedPlan === plan.key
                                                ? "border-purple-500 bg-purple-500/5 shadow-purple-500/10 shadow-lg"
                                                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                            }`}
                                    >
                                        {plan.popular && (
                                            <div className="absolute -top-3 right-6">
                                                <span className="bg-gradient-to-r from-orange-400 to-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold">{plan.name}</h3>
                                                <p className="text-sm text-muted-foreground">{plan.description}</p>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors shrink-0 mt-0.5 ${selectedPlan === plan.key ? "bg-purple-500 border-purple-500" : "border-zinc-300 dark:border-zinc-700"}`}>
                                                {selectedPlan === plan.key && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </div>
                                        <div className="mb-5 flex items-baseline gap-1">
                                            <span className="text-3xl font-extrabold tracking-tight">
                                                {currency === "usd" ? "$" : "₹"}
                                                {currency === "usd" ? plan.price.usd : plan.price.inr.toLocaleString()}
                                            </span>
                                            {plan.price.usd > 0 && <span className="text-muted-foreground text-sm font-medium">/mo</span>}
                                            {plan.price.usd === 0 && <span className="text-muted-foreground text-sm font-medium ml-1">14 days</span>}
                                        </div>
                                        <ul className="space-y-2.5">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-start text-sm">
                                                    <Check className="w-4 h-4 text-purple-500 mr-2 shrink-0 mt-0.5" />
                                                    <span className="text-zinc-600 dark:text-zinc-400">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            {error && (
                                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">{error}</div>
                            )}

                            <div className="mt-8 flex items-center gap-3">
                                <Button variant="outline" onClick={() => setStep("auth")} className="py-6 rounded-xl font-semibold">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                </Button>
                                <Button onClick={() => setStep("checkout")} className="flex-1 py-6 rounded-xl font-semibold bg-foreground text-background hover:bg-foreground/90 group">
                                    Review &amp; Checkout <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Checkout Confirmation */}
                    {step === "checkout" && currentPlan && (
                        <div className="max-w-md animate-in fade-in slide-in-from-right-8 duration-500">
                            <h1 className="text-3xl font-bold tracking-tighter mb-3">Confirm your subscription</h1>
                            <p className="text-muted-foreground mb-8">Review your selection and proceed to payment.</p>

                            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-6">
                                <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Selected Plan</div>
                                            <div className="text-xl font-bold">{currentPlan.name}</div>
                                            <div className="text-sm text-muted-foreground mt-0.5">{currentPlan.description}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-extrabold">
                                                {currency === "usd" ? "$" : "₹"}
                                                {currency === "usd" ? currentPlan.price.usd : currentPlan.price.inr.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{currentPlan.price.usd > 0 ? "per month" : "free trial"}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Account</span>
                                        <span className="font-medium">{userEmail || "—"}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Usage limit</span>
                                        <span className="font-medium">{currentPlan.usageLimit.toLocaleString()} leads/mo</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Team seats</span>
                                        <span className="font-medium">{currentPlan.seats >= 999 ? "Unlimited" : currentPlan.seats}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Payment via</span>
                                        <span className="font-medium flex items-center gap-1.5">
                                            <CreditCard className="w-3.5 h-3.5" />
                                            {currency === "usd" ? "Stripe (Global)" : "Razorpay (India)"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
                                <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> SOC 2 Compliant</div>
                                <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> GDPR Ready</div>
                                <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> 256-bit SSL</div>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">{error}</div>
                            )}

                            <div className="flex items-center gap-3">
                                <Button variant="outline" onClick={() => { setStep("plan_selection"); setError(null); }} className="py-6 rounded-xl font-semibold">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                </Button>
                                <Button onClick={handleCheckout} disabled={loading} className="flex-1 py-6 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white group">
                                    {loading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing…</>
                                    ) : (
                                        <>{currentPlan.price.usd === 0 ? "Start Free Trial" : "Subscribe Now"}<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </Button>
                            </div>

                            <p className="text-[11px] text-center text-muted-foreground mt-6 leading-relaxed">
                                Cancel anytime from your dashboard. By subscribing you agree to our{" "}
                                <Link href="/terms" className="underline hover:text-foreground">Terms</Link> and{" "}
                                <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-16 sm:mt-8 text-sm text-muted-foreground">
                    © 2026 Winrate. All rights reserved.
                </div>
            </div>

            {/* Right Column: Social Proof */}
            <div className="hidden lg:flex relative bg-zinc-950 p-12 text-zinc-50 flex-col justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500 blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600 blur-[120px]" />
                </div>

                <div className="relative z-10 max-w-lg mx-auto">
                    <div className="mb-12">
                        <span className="text-5xl text-orange-400 font-serif leading-none block mb-4">&ldquo;</span>
                        <blockquote className="text-2xl font-medium leading-snug mb-6">
                            The AI infrastructure found us 40 qualified leads in the first week. We closed 3 of them. It literally paid for itself 10x over before the trial even ended.
                        </blockquote>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                <span className="text-lg font-bold">AM</span>
                            </div>
                            <div>
                                <div className="font-semibold text-white">Aarav Malhotra</div>
                                <div className="text-sm text-zinc-400">Founder, OrbitOps</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
                        {["1,000 free AI credits to start", "Smart connection to your CRM", "Access to human review panel", "Cancel anytime"].map((benefit, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                <span className="text-zinc-300 font-medium">{benefit}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 flex items-center gap-6 text-zinc-500 text-xs uppercase tracking-wider font-medium">
                        <span>Trusted by</span>
                        <span className="text-zinc-400 font-bold text-sm">830+</span>
                        <span>sales teams worldwide</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
