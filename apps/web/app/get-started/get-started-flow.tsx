"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { Zap, ArrowRight, Check, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "@sales/shared";
import {
    buildDashboardUrl,
    buildGetStartedUrl,
    type CheckoutState,
    type GetStartedStep,
    type InviteQueryContext,
} from "./flow-state";

type Step = GetStartedStep;

type AuthSubStep = "method" | "email" | "password" | "name";

type ApiErrorResponse = {
    error?: string;
};

type CheckoutResponse = {
    error?: string;
    url?: string;
    subscriptionId?: string;
    keyId?: string;
    amount?: number;
    currency?: string;
    name?: string;
    description?: string;
};

type InviteContext = {
    token: string;
    email: string | null;
    workspaceName: string | null;
    organizationName: string | null;
    message: string | null;
    status: string | null;
};

type GetStartedFlowProps = {
    initialStep: Step;
    userEmail?: string | null;
    userEmailVerified: boolean;
    googleAuthEnabled: boolean;
    initialSelectedPlan: string;
    initialCheckoutState: CheckoutState;
    initialNotice: "reset-success" | "verify-email-sent" | null;
    inviteContext: InviteContext | null;
};

export default function GetStartedFlow({
    initialStep,
    userEmail,
    userEmailVerified,
    googleAuthEnabled,
    initialSelectedPlan,
    initialCheckoutState,
    initialNotice,
    inviteContext,
}: GetStartedFlowProps) {
    const router = useRouter();
    const [step, setStep] = useState<Step>(initialStep);
    const [authMode, setAuthMode] = useState<"login" | "register">("register");
    const [authSubStep, setAuthSubStep] = useState<AuthSubStep>("method");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currency, setCurrency] = useState<"usd" | "inr">("usd");
    const [selectedPlan, setSelectedPlan] = useState<string>(initialSelectedPlan);
    const [checkoutState, setCheckoutState] = useState<CheckoutState>(initialCheckoutState);
    const [email, setEmail] = useState(userEmail ?? inviteContext?.email ?? "");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    const currentPlan = PRICING_PLANS.find((p) => p.key === selectedPlan);
    const inviteQuery: InviteQueryContext | undefined = inviteContext
        ? {
            inviteToken: inviteContext.token,
            inviteEmail: inviteContext.email,
            inviteWorkspace: inviteContext.workspaceName,
            inviteOrganization: inviteContext.organizationName,
        }
        : undefined;
    const normalizedInviteEmail = inviteContext?.email?.trim().toLowerCase() ?? null;
    const normalizedSessionEmail = userEmail?.trim().toLowerCase() ?? null;
    const signedInInviteMatch = Boolean(
        normalizedInviteEmail && normalizedSessionEmail && normalizedInviteEmail === normalizedSessionEmail,
    );

    function buildUrlWithInvite(nextStep?: Step | null, nextCheckoutState: CheckoutState = checkoutState, nextPlan = selectedPlan) {
        return buildGetStartedUrl({
            planKey: nextPlan,
            step: nextStep,
            checkout: nextCheckoutState,
            invite: inviteQuery,
        });
    }

    function syncUrl(nextStep: Step, nextPlan = selectedPlan, nextCheckoutState: CheckoutState = checkoutState) {
        router.replace(buildUrlWithInvite(nextStep, nextCheckoutState, nextPlan));
    }

    function moveToStep(nextStep: Step, nextCheckoutState: CheckoutState = null) {
        setStep(nextStep);
        setCheckoutState(nextCheckoutState);
        syncUrl(nextStep, selectedPlan, nextCheckoutState);
    }

    function selectPlan(planKey: string) {
        setSelectedPlan(planKey);
        setCheckoutState(null);
        syncUrl(step, planKey, null);
    }

    async function handleRegister() {
        setLoading(true);
        setError(null);

        try {
            // First, create the user via API service register endpoint
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
            const res = await fetch(`${baseUrl}/v1/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name }),
                credentials: "include",
            });

            if (!res.ok) {
                const data = (await res.json()) as ApiErrorResponse;
                setError(data.error || "Failed to create account");
                return;
            }

            // Then automatically sign in the user via NextAuth
            const signInResult = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (signInResult?.error) {
                setError("Account created but sign in failed. Please try signing in manually.");
            } else {
                window.location.href = buildUrlWithInvite("plan_selection", null, selectedPlan);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "An unexpected error occurred.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogin() {
        setLoading(true);
        setError(null);

        try {
            const signInResult = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (signInResult?.error) {
                setError("Invalid email or password");
            } else {
                window.location.href = buildUrlWithInvite("plan_selection", null, selectedPlan);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "An unexpected error occurred.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    function handleGoogleLogin() {
        void signIn("google", {
            callbackUrl: buildUrlWithInvite("plan_selection", null, selectedPlan),
        });
    }

    function handleContinue() {
        if (authSubStep === "method") {
            if (authMode === "register") {
                setAuthSubStep("email");
            } else {
                setAuthSubStep("email");
            }
        } else if (authSubStep === "email") {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setError("Please enter a valid email address");
                return;
            }
            setError(null);
            if (authMode === "register") {
                setAuthSubStep("name");
            } else {
                setAuthSubStep("password");
            }
        } else if (authSubStep === "name") {
            if (!name.trim() || name.trim().length < 2) {
                setError("Please enter your full name");
                return;
            }
            setError(null);
            setAuthSubStep("password");
        } else if (authSubStep === "password") {
            if (password.length < 8) {
                setError("Password must be at least 8 characters");
                return;
            }
            setError(null);
            // Submit
            if (authMode === "register") {
                handleRegister();
            } else {
                handleLogin();
            }
        }
    }

    function goBack() {
        if (authSubStep === "email") {
            setAuthSubStep("method");
        } else if (authSubStep === "name") {
            setAuthSubStep("email");
        } else if (authSubStep === "password") {
            if (authMode === "register") {
                setAuthSubStep("name");
            } else {
                setAuthSubStep("email");
            }
        }
    }

    async function handleCheckout() {
        setLoading(true);
        setError(null);
        setCheckoutState(null);
        syncUrl("checkout", selectedPlan, null);

        try {
            const billingEmail = (userEmail ?? email).trim();
            if (!billingEmail) {
                setError("Please sign in with a valid email address before starting checkout.");
                setLoading(false);
                return;
            }

            if (!userEmailVerified) {
                setError("Verify your email before starting paid checkout. You can resend a verification link below.");
                setLoading(false);
                return;
            }

            const provider = currency === "usd" ? "stripe" : "razorpay";
            const res = await fetch(`/api/billing/checkout/${provider}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    planKey: selectedPlan,
                    successUrl: `${window.location.origin}${buildDashboardUrl("success")}`,
                    cancelUrl: `${window.location.origin}${buildUrlWithInvite("checkout", "canceled", selectedPlan)}`,
                }),
            });

            const data = (await res.json()) as CheckoutResponse;

            if (data.error) {
                setError(data.error);
                setLoading(false);
                return;
            }

            if (provider === "stripe" && data.url) {
                window.location.href = data.url;
            } else if (provider === "razorpay" && data.subscriptionId) {
                const options = {
                    key: data.keyId,
                    subscription_id: data.subscriptionId,
                    amount: data.amount,
                    currency: data.currency,
                    name: data.name,
                    description: data.description,
                    handler: () => {
                        window.location.href = buildDashboardUrl("success");
                    },
                    prefill: { email: billingEmail },
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

                    {initialNotice === "reset-success" ? (
                        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                            Password updated successfully. Sign in with your new password to continue.
                        </div>
                    ) : null}
                    {initialNotice === "verify-email-sent" ? (
                        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                            Verification email sent. Open the latest message in your inbox to unlock billing and live outbound actions.
                        </div>
                    ) : null}
                    {inviteContext ? (
                        <div className="mb-8 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-950">
                            <p className="font-semibold">
                                {inviteContext.workspaceName
                                    ? `Invitation to ${inviteContext.workspaceName}`
                                    : "Workspace invitation"}
                            </p>
                            <p className="mt-2 leading-6 text-sky-900">
                                {inviteContext.organizationName
                                    ? `${inviteContext.organizationName} invited `
                                    : "A teammate invited "}
                                {inviteContext.email ? (
                                    <span className="font-medium">{inviteContext.email}</span>
                                ) : (
                                    "this account"
                                )}
                                {" "}to join the active workspace.
                            </p>
                            {inviteContext.status === "error" && inviteContext.message ? (
                                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                                    {inviteContext.message}
                                </p>
                            ) : null}
                            {signedInInviteMatch ? (
                                <form action="/api/account/team/invitations/accept" method="post" className="mt-4">
                                    <input type="hidden" name="token" value={inviteContext.token} />
                                    <input type="hidden" name="returnTo" value={buildUrlWithInvite(step, checkoutState, selectedPlan)} />
                                    <button
                                        type="submit"
                                        className="rounded-full bg-sky-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
                                    >
                                        Accept workspace invite
                                    </button>
                                </form>
                            ) : (
                                <p className="mt-4 text-sm text-sky-900">
                                    Continue with
                                    {" "}
                                    <span className="font-medium">
                                        {inviteContext.email ?? "the invited email address"}
                                    </span>
                                    {" "}
                                    to accept this invite after you sign in or create the account.
                                </p>
                            )}
                        </div>
                    ) : null}

                    {/* Step 1: Conversational Auth */}
                    {step === "auth" && (
                        <div className="max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Progress indicator inside auth */}
                            <div className="flex items-center gap-2 mb-8">
                                {[1, 2, 3].map((num) => (
                                    <React.Fragment key={num}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                            authSubStep === "method" && num === 1 ||
                                            authSubStep === "email" && num === 2 ||
                                            (authSubStep === "name" || authSubStep === "password") && num === 3
                                                ? "bg-foreground text-background"
                                                : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
                                        }`}>
                                            {num}
                                        </div>
                                        {num < 3 && <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Step 1: Choose method */}
                            {authSubStep === "method" && (
                                <div className="space-y-6">
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-3">
                                            Let's get you started
                                        </h1>
                                        <p className="text-muted-foreground">
                                            Choose how you'd like to create your account
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {googleAuthEnabled && (
                                            <Button
                                                type="button"
                                                onClick={handleGoogleLogin}
                                                className="w-full py-6 rounded-xl font-medium bg-foreground text-background hover:bg-foreground/90 group justify-start"
                                            >
                                                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                                Create account with Google
                                                <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        )}

                                        <Button
                                            type="button"
                                            onClick={() => { setAuthMode("register"); setAuthSubStep("email"); }}
                                            variant="outline"
                                            className="w-full py-6 rounded-xl font-medium border-2 justify-start"
                                        >
                                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            Sign up with email
                                            <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                                        </Button>

                                        <Button
                                            type="button"
                                            onClick={() => { setAuthMode("login"); setAuthSubStep("email"); }}
                                            variant="ghost"
                                            className="w-full py-6 rounded-xl font-medium justify-start"
                                        >
                                            Already have an account? Sign in
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Email */}
                            {authSubStep === "email" && (
                                <div className="space-y-6">
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-3">
                                            {authMode === "register" ? "What's your work email?" : "Enter your email"}
                                        </h1>
                                        <p className="text-muted-foreground">
                                            {authMode === "register"
                                                ? "We'll use this to create your account and send updates."
                                                : "Use the email address tied to your existing account."}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label htmlFor="email" className="text-sm font-semibold">Email address</label>
                                            <input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@company.com"
                                                className="w-full px-4 py-4 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow text-lg"
                                                autoFocus
                                            />
                                        </div>

                                        {error && (
                                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
                                                {error}
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                onClick={goBack}
                                                variant="outline"
                                                className="flex-1 py-6 rounded-xl font-medium"
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={handleContinue}
                                                disabled={!email.trim()}
                                                className="flex-1 py-6 rounded-xl font-medium bg-foreground text-background hover:bg-foreground/90"
                                            >
                                                Continue
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Name (register only) */}
                            {authSubStep === "name" && authMode === "register" && (
                                <div className="space-y-6">
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-3">
                                            Nice to meet you
                                        </h1>
                                        <p className="text-muted-foreground">
                                            What should we call you?
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label htmlFor="name" className="text-sm font-semibold">Full name</label>
                                            <input
                                                id="name"
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="John Doe"
                                                className="w-full px-4 py-4 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow text-lg"
                                                autoFocus
                                            />
                                        </div>

                                        {error && (
                                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
                                                {error}
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                onClick={goBack}
                                                variant="outline"
                                                className="flex-1 py-6 rounded-xl font-medium"
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={handleContinue}
                                                disabled={!name.trim()}
                                                className="flex-1 py-6 rounded-xl font-medium bg-foreground text-background hover:bg-foreground/90"
                                            >
                                                Continue
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Password */}
                            {authSubStep === "password" && (
                                <div className="space-y-6">
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-3">
                                            {authMode === "register" ? "Create a password" : "Enter your password"}
                                        </h1>
                                        <p className="text-muted-foreground">
                                            {authMode === "register"
                                                ? "Choose a secure password for your account"
                                                : "Enter your password to continue"}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label htmlFor="password" className="text-sm font-semibold">Password</label>
                                            <input
                                                id="password"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                minLength={8}
                                                className="w-full px-4 py-4 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow text-lg"
                                                autoFocus
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                At least 8 characters
                                            </p>
                                        </div>

                                        {error && (
                                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
                                                {error}
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                onClick={goBack}
                                                variant="outline"
                                                className="flex-1 py-6 rounded-xl font-medium"
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => authMode === "register" ? handleRegister() : handleLogin()}
                                                disabled={!password || password.length < 8}
                                                className="flex-1 py-6 rounded-xl font-medium bg-foreground text-background hover:bg-foreground/90"
                                            >
                                                {authMode === "register" ? "Create account" : "Sign in"}
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                        {authMode === "login" ? (
                                            <div className="text-right">
                                                <Link
                                                    href="/forgot-password"
                                                    className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
                                                >
                                                    Forgot your password?
                                                </Link>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            )}

                            {/* Divider */}
                            {authSubStep === "method" && googleAuthEnabled && (
                                <>
                                    <div className="relative flex items-center py-4">
                                        <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
                                        <span className="mx-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Or</span>
                                        <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={handleGoogleLogin}
                                        disabled={loading}
                                        variant="outline"
                                        className="w-full py-6 rounded-xl font-medium border-zinc-200 dark:border-zinc-800"
                                    >
                                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        Continue with Google
                                    </Button>

                                    <div className="text-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAuthMode(authMode === "register" ? "login" : "register");
                                                setAuthSubStep("method");
                                                setError(null);
                                                setName("");
                                                setEmail("");
                                                setPassword("");
                                            }}
                                            className="text-sm font-medium underline-offset-4 hover:underline"
                                        >
                                            {authMode === "register"
                                                ? "Already have an account? Sign in"
                                                : "Don't have an account? Sign up"}
                                        </button>
                                    </div>
                                </>
                            )}

                            <p className="text-[11px] text-center text-muted-foreground mt-8 leading-relaxed">
                                By continuing, you agree to our{" "}
                                <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>{" "}and{" "}
                                <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
                            </p>
                        </div>
                    )}

                    {/* Step 2: Plan Selection */}
                    {step === "plan_selection" && (
                        <div className="max-w-2xl animate-in fade-in slide-in-from-right-8 duration-500">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-3">Choose your plan</h1>
                            <p className="text-muted-foreground mb-8">
                                Choose how you want to start. Free is self-serve, and paid plans continue through secure checkout.
                            </p>

                            {checkoutState === "canceled" && (
                                <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    Checkout was canceled. Your selected plan is still saved, so you can review it or retry when you&apos;re ready.
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {PRICING_PLANS.map((plan) => (
                                    <button
                                        key={plan.key}
                                        type="button"
                                        aria-pressed={selectedPlan === plan.key}
                                        className={`rounded-2xl border-2 p-6 text-left transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                                            selectedPlan === plan.key
                                                ? "border-purple-500 bg-purple-50/50 shadow-lg scale-105"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                        onClick={() => selectPlan(plan.key)}
                                    >
                                        <div className="mb-4">
                                            <h3 className="text-lg font-bold">{plan.name}</h3>
                                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                                        </div>
                                        <div className="mb-6">
                                            {plan.key === "free" ? (
                                                <>
                                                    <span className="text-4xl font-bold">Free</span>
                                                    <span className="text-muted-foreground"> to start</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-4xl font-bold">${plan.price.usd}</span>
                                                    <span className="text-muted-foreground">/month</span>
                                                </>
                                            )}
                                        </div>
                                        <ul className="space-y-2 mb-6">
                                            {plan.features.slice(0, 5).map((feature, idx) => (
                                                <li key={idx} className="flex items-center gap-2 text-sm">
                                                    <Check className="w-4 h-4 text-green-500" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {selectedPlan === plan.key && (
                                            <div className="w-full h-1 bg-purple-500 rounded-full" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-between items-center">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => moveToStep("auth")}
                                    className="gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (selectedPlan === "free") {
                                            window.location.href = buildDashboardUrl();
                                            return;
                                        }

                                        moveToStep("checkout");
                                    }}
                                    className="gap-2"
                                >
                                    {selectedPlan === "free" ? "Continue to Dashboard" : "Continue to Checkout"} <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Checkout */}
                    {step === "checkout" && (
                        <div className="max-w-2xl animate-in fade-in slide-in-from-right-8 duration-500">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-3">Checkout</h1>
                            <p className="text-muted-foreground mb-8">
                                You're about to subscribe to <strong>{currentPlan?.name}</strong> at <strong>${currentPlan?.price.usd}/month</strong>.
                            </p>

                            {checkoutState === "canceled" && (
                                <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    Your previous checkout session was canceled. Nothing was charged, and you can retry from here.
                                </div>
                            )}
                            {!userEmailVerified ? (
                                <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                                    <p className="font-semibold">
                                        Verify your email before starting paid checkout.
                                    </p>
                                    <p className="mt-2 leading-6 text-amber-900">
                                        This keeps billing-safe actions tied to a confirmed inbox. We sent a verification email when the account was created.
                                    </p>
                                    <form action="/api/auth/verify-email/request" method="post" className="mt-4">
                                        <input
                                            type="hidden"
                                            name="returnTo"
                                            value={buildUrlWithInvite("checkout", null, selectedPlan)}
                                        />
                                        {userEmail ? <input type="hidden" name="email" value={userEmail} /> : null}
                                        <button
                                            type="submit"
                                            className="rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
                                        >
                                            Resend verification email
                                        </button>
                                    </form>
                                </div>
                            ) : null}

                            <div className="rounded-2xl border p-6 mb-6 bg-white">
                                <h3 className="font-semibold mb-4">Order Summary</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span>Plan</span>
                                        <span>{currentPlan?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Billing Cycle</span>
                                        <span>Monthly</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Usage Limit</span>
                                        <span>{currentPlan?.usageLimit.toLocaleString()} leads/mo</span>
                                    </div>
                                    <div className="border-t pt-3 mt-3 flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>${currentPlan?.price.usd}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="text-sm font-semibold mb-2 block">Payment Region</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        type="button"
                                        variant={currency === "usd" ? "default" : "outline"}
                                        onClick={() => setCurrency("usd")}
                                        className="w-full"
                                    >
                                        Global (Stripe)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={currency === "inr" ? "default" : "outline"}
                                        onClick={() => setCurrency("inr")}
                                        className="w-full"
                                    >
                                        India (Razorpay)
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => moveToStep("plan_selection")}
                                    className="gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </Button>
                                <Button onClick={handleCheckout} disabled={loading} className="gap-2">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pay & Subscribe"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success (shown after checkout completes) */}
                    {step === "success" && (
                        <div className="max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tighter mb-3">Welcome aboard!</h1>
                            <p className="text-muted-foreground mb-8">
                                Your subscription is now active. Let's get you set up.
                            </p>
                            <Button onClick={() => window.location.href = buildDashboardUrl()}>
                                Go to Dashboard
                            </Button>
                        </div>
                    )}
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
                            Start with a real workflow, keep a human in the loop, and scale toward automation only after the fundamentals are working.
                        </blockquote>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                <span className="text-lg font-bold">AM</span>
                            </div>
                            <div>
                                <div className="font-semibold text-white">Pilot-ready rollout</div>
                                <div className="text-sm text-zinc-400">Built for operator-led teams</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
                        {["Structured onboarding and plan setup", "Email and voice workflow foundation", "Approval gates before first outbound actions", "Cancel anytime"].map((benefit, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                <span className="text-zinc-300 font-medium">{benefit}</span>
                            </li>
                        ))}
                    </div>

                    <div className="mt-10 flex items-center gap-6 text-zinc-500 text-xs uppercase tracking-wider font-medium">
                        <span>Built for</span>
                        <span className="text-zinc-400 font-bold text-sm">pilot teams</span>
                        <span>that want operator control first</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
