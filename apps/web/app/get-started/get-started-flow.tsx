"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import {
    ArrowLeft,
    ArrowRight,
    Bot,
    Check,
    CheckCircle2,
    CreditCard,
    FileCheck2,
    Loader2,
    ShieldCheck,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "@sales/shared";
import {
    buildBlueprintReviewContactUrl,
    buildDashboardUrl,
    buildGetStartedUrl,
    buildSalesBlueprintBuilderUrl,
    type AcquisitionQueryContext,
    type CheckoutState,
    type GetStartedStep,
    type InviteQueryContext,
} from "./flow-state";
import type { GetStartedAcquisitionContext } from "@/lib/acquisition-context";

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
    acquisitionContext: GetStartedAcquisitionContext | null;
    acquisitionQuery: AcquisitionQueryContext | null;
};

const onboardingPromiseRows = [
    {
        icon: FileCheck2,
        label: "Business context",
        detail: "Account setup keeps the buyer path, selected plan, and attached context available.",
    },
    {
        icon: ShieldCheck,
        label: "Approval gates",
        detail: "Public signup never starts live lead sourcing, outreach, calls, or Telegram mutation.",
    },
    {
        icon: CreditCard,
        label: "Billing boundary",
        detail: "Paid checkout requires a verified email and keeps provider work separate from subscription setup.",
    },
    {
        icon: Bot,
        label: "Command posture",
        detail: "Telegram and AI-worker workflows remain read-only or proposal-based until configured and approved.",
    },
] as const;

const activationChecklist = [
    "Create or sign into a workspace account",
    "Choose a plan based on lead volume and review capacity",
    "Verify billing before paid subscription checkout",
    "Configure providers and approvals inside the dashboard",
] as const;

const blueprintCheckpointRows = [
    {
        label: "ICP and goals",
        detail: "Confirm who the workspace should find, why they buy, and what lead and meeting targets matter.",
    },
    {
        label: "Source and outreach channels",
        detail: "Separate available channels from guarded or roadmap channels before plan capacity is chosen.",
    },
    {
        label: "Approval policy",
        detail: "Keep first outreach, calls, new channels, and Telegram actions reviewable before provider work starts.",
    },
] as const;

function formatProviderBudget(cents: number) {
    return cents === 0 ? "$0" : `$${(cents / 100).toLocaleString("en-US")}`;
}

function BlueprintCheckpointPanel({
    acquisitionContext,
    builderHref,
    reviewHref,
    className = "",
}: {
    acquisitionContext: GetStartedAcquisitionContext | null;
    builderHref: string;
    reviewHref: string;
    className?: string;
}) {
    return (
        <section className={`rounded-lg border border-slate-200 bg-white p-5 ${className}`}>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                        Sales Blueprint checkpoint
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-normal text-slate-950">
                        Confirm the sales motion before choosing capacity.
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Plan limits are easier to choose when the ICP, lead target, source channels, outreach posture, and approval gates are visible first.
                    </p>
                    <div className="mt-4 grid gap-2">
                        {blueprintCheckpointRows.map((row) => (
                            <div
                                key={row.label}
                                className="grid gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 sm:grid-cols-[9rem_1fr]"
                            >
                                <p className="text-xs font-semibold text-slate-950">{row.label}</p>
                                <p className="text-xs leading-5 text-slate-600">{row.detail}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-md border border-slate-200 bg-[#f9f9ff] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Context status
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                        {acquisitionContext
                            ? `${acquisitionContext.label} attached`
                            : "No blueprint attached yet"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                        {acquisitionContext
                            ? acquisitionContext.reassurance
                            : "Use the public builder or request a rollout review when the sales motion needs operator help before launch."}
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                        <Link
                            href={builderHref}
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Open builder
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href={reviewHref}
                            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 transition hover:border-teal-300 hover:bg-teal-50"
                        >
                            Request review
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default function GetStartedFlow({
    initialStep,
    userEmail,
    userEmailVerified,
    googleAuthEnabled,
    initialSelectedPlan,
    initialCheckoutState,
    initialNotice,
    inviteContext,
    acquisitionContext,
    acquisitionQuery,
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
    const currentStepLabel =
        step === "auth"
            ? "Account"
            : step === "plan_selection"
                ? "Plan fit"
                : step === "checkout"
                    ? "Checkout"
                    : "Launch";
    const blueprintBuilderHref = buildSalesBlueprintBuilderUrl(acquisitionQuery);
    const blueprintReviewHref = buildBlueprintReviewContactUrl(acquisitionQuery);
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
            acquisition: acquisitionQuery,
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

    function buildDashboardHandoffUrl(checkout?: "success") {
        return buildDashboardUrl({
            checkout,
            planKey: selectedPlan,
            acquisition: acquisitionQuery,
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
                    successUrl: `${window.location.origin}${buildDashboardHandoffUrl("success")}`,
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
                        window.location.href = buildDashboardHandoffUrl("success");
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
        <main className="grid min-h-screen grid-cols-1 bg-[#f9f9ff] text-slate-950 lg:grid-cols-[minmax(0,1fr)_28rem]">
            {step === "checkout" && currency === "inr" ? (
                <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            ) : null}

            {/* Left Column */}
            <div className="flex flex-col justify-between overflow-y-auto px-6 py-8 md:px-12 md:py-12 xl:px-16">
                <div>
                    <Link href="/" className="mb-8 inline-flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-700">
                            <Zap className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-xl font-semibold tracking-normal text-slate-950">Winrate</span>
                    </Link>

                    {/* Step Indicator */}
                    <div className="mb-8 flex max-w-lg items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
                        {steps.map((s, i) => (
                            <div key={s.key} className="flex flex-1 items-center gap-2">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold transition-colors ${i <= stepIdx ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"}`}>
                                    {i < stepIdx ? <Check className="w-4 h-4" /> : i + 1}
                                </div>
                                <span className={`hidden text-xs font-semibold sm:block ${i <= stepIdx ? "text-slate-950" : "text-slate-500"}`}>{s.label}</span>
                                {i < steps.length - 1 && <div className={`h-px flex-1 ${i < stepIdx ? "bg-slate-950" : "bg-slate-200"}`} />}
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
                    {acquisitionContext ? (
                        <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        {acquisitionContext.label}
                                    </p>
                                    <h2 className="mt-1 text-base font-semibold text-slate-950">
                                        {acquisitionContext.title}
                                    </h2>
                                    <p className="mt-2 max-w-2xl leading-6 text-slate-600">
                                        {acquisitionContext.detail}
                                    </p>
                                </div>
                                <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                                    Preserved
                                </span>
                            </div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-4">
                                {acquisitionContext.metrics.map((metric) => (
                                    <div key={metric.label} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                            {metric.label}
                                        </p>
                                        <p className="mt-1 font-semibold text-slate-950">{metric.value}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-3 text-xs leading-5 text-slate-600">
                                {acquisitionContext.reassurance}
                            </p>
                        </div>
                    ) : null}
                    {step === "auth" ? (
                        <BlueprintCheckpointPanel
                            acquisitionContext={acquisitionContext}
                            builderHref={blueprintBuilderHref}
                            reviewHref={blueprintReviewHref}
                            className="mb-8 max-w-2xl"
                        />
                    ) : null}

                    {/* Step 1: Conversational Auth */}
                    {step === "auth" && (
                        <div className="max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Progress indicator inside auth */}
                            <div className="mb-8 flex items-center gap-2">
                                {[1, 2, 3].map((num) => (
                                    <React.Fragment key={num}>
                                        <div className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold transition-all ${
                                            authSubStep === "method" && num === 1 ||
                                            authSubStep === "email" && num === 2 ||
                                            (authSubStep === "name" || authSubStep === "password") && num === 3
                                                ? "bg-slate-950 text-white"
                                                : "bg-slate-100 text-slate-500"
                                        }`}>
                                            {num}
                                        </div>
                                        {num < 3 && <div className="h-px flex-1 bg-slate-200" />}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Step 1: Choose method */}
                            {authSubStep === "method" && (
                                <div className="space-y-6">
                                    <div>
                                        <h1 className="mb-3 text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">
                                            Let's get you started
                                        </h1>
                                        <p className="text-sm leading-6 text-slate-600">
                                            Create the account first, then choose the workspace plan and billing path.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {googleAuthEnabled && (
                                            <Button
                                                type="button"
                                                onClick={handleGoogleLogin}
                                                className="group w-full justify-start rounded-md bg-slate-950 py-6 font-semibold text-white hover:bg-slate-800"
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
                                            className="w-full justify-start rounded-md border-slate-300 bg-white py-6 font-semibold text-slate-950 hover:border-teal-300 hover:bg-teal-50"
                                        >
                                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            Sign up with email
                                            <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                                        </Button>

                                        <Button
                                            type="button"
                                            onClick={() => { setAuthMode("login"); setAuthSubStep("email"); }}
                                            variant="ghost"
                                            className="w-full justify-start rounded-md py-6 font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950"
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
                                        <h1 className="mb-3 text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">
                                            {authMode === "register" ? "What's your work email?" : "Enter your email"}
                                        </h1>
                                        <p className="text-sm leading-6 text-slate-600">
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
                                                className="w-full rounded-md border border-slate-300 bg-white px-4 py-4 text-lg transition-shadow focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                                autoFocus
                                            />
                                        </div>

                                        {error && (
                                            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                                                {error}
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                onClick={goBack}
                                                variant="outline"
                                                className="flex-1 rounded-md py-6 font-semibold"
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={handleContinue}
                                                disabled={!email.trim()}
                                                className="flex-1 rounded-md bg-slate-950 py-6 font-semibold text-white hover:bg-slate-800"
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
                                        <h1 className="mb-3 text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">
                                            Nice to meet you
                                        </h1>
                                        <p className="text-sm leading-6 text-slate-600">
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
                                                className="w-full rounded-md border border-slate-300 bg-white px-4 py-4 text-lg transition-shadow focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                                autoFocus
                                            />
                                        </div>

                                        {error && (
                                            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                                                {error}
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                onClick={goBack}
                                                variant="outline"
                                                className="flex-1 rounded-md py-6 font-semibold"
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={handleContinue}
                                                disabled={!name.trim()}
                                                className="flex-1 rounded-md bg-slate-950 py-6 font-semibold text-white hover:bg-slate-800"
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
                                        <h1 className="mb-3 text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">
                                            {authMode === "register" ? "Create a password" : "Enter your password"}
                                        </h1>
                                        <p className="text-sm leading-6 text-slate-600">
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
                                                className="w-full rounded-md border border-slate-300 bg-white px-4 py-4 text-lg transition-shadow focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                                autoFocus
                                            />
                                            <p className="text-xs text-slate-500">
                                                At least 8 characters
                                            </p>
                                        </div>

                                        {error && (
                                            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                                                {error}
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                onClick={goBack}
                                                variant="outline"
                                                className="flex-1 rounded-md py-6 font-semibold"
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => authMode === "register" ? handleRegister() : handleLogin()}
                                                disabled={!password || password.length < 8}
                                                className="flex-1 rounded-md bg-slate-950 py-6 font-semibold text-white hover:bg-slate-800"
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
                            <h1 className="mb-3 text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">Choose your plan</h1>
                            <p className="mb-8 text-sm leading-6 text-slate-600">
                                Pick the workspace capacity for this rollout. Paid plans still require verified billing and do not start provider work automatically.
                            </p>

                            {checkoutState === "canceled" && (
                                <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    Checkout was canceled. Your selected plan is still saved, so you can review it or retry when you&apos;re ready.
                                </div>
                            )}

                            <BlueprintCheckpointPanel
                                acquisitionContext={acquisitionContext}
                                builderHref={blueprintBuilderHref}
                                reviewHref={blueprintReviewHref}
                                className="mb-6"
                            />

                            <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {PRICING_PLANS.map((plan) => (
                                    <button
                                        key={plan.key}
                                        type="button"
                                        aria-pressed={selectedPlan === plan.key}
                                        className={`rounded-lg border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                                            selectedPlan === plan.key
                                                ? "border-teal-500 bg-teal-50/70"
                                                : "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/40"
                                        }`}
                                        onClick={() => selectPlan(plan.key)}
                                    >
                                        <div className="mb-4 flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-semibold text-slate-950">{plan.name}</h3>
                                                    {plan.popular ? (
                                                        <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-800">
                                                            Popular
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="mt-1 text-sm leading-5 text-slate-600">{plan.description}</p>
                                            </div>
                                            {selectedPlan === plan.key ? (
                                                <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-700" />
                                            ) : null}
                                        </div>
                                        <div className="mb-5">
                                            {plan.key === "free" ? (
                                                <>
                                                    <span className="text-3xl font-semibold text-slate-950">Free</span>
                                                    <span className="text-slate-500"> to start</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-3xl font-semibold text-slate-950">${plan.price.usd}</span>
                                                    <span className="text-slate-500">/month</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Leads</p>
                                                <p className="mt-1 font-semibold text-slate-950">{plan.usageLimit.toLocaleString()}/mo</p>
                                            </div>
                                            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Dispatches</p>
                                                <p className="mt-1 font-semibold text-slate-950">{plan.outreachDispatchLimit.toLocaleString()}/mo</p>
                                            </div>
                                            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Voice</p>
                                                <p className="mt-1 font-semibold text-slate-950">{plan.voiceCallLimit.toLocaleString()}/mo</p>
                                            </div>
                                            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Provider</p>
                                                <p className="mt-1 font-semibold text-slate-950">{formatProviderBudget(plan.providerCostBudgetCents)}</p>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-xs leading-5 text-slate-600">
                                            {plan.seats >= 999 ? "Unlimited seats" : `${plan.seats} seat${plan.seats === 1 ? "" : "s"}`} and {plan.includedChannels.join(", ")} channel posture included.
                                        </p>
                                        {selectedPlan === plan.key && (
                                            <div className="mt-4 h-1 w-full rounded-full bg-teal-600" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center justify-between">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => moveToStep("auth")}
                                    className="gap-2 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (selectedPlan === "free") {
                                            window.location.href = buildDashboardHandoffUrl();
                                            return;
                                        }

                                        moveToStep("checkout");
                                    }}
                                    className="gap-2 bg-slate-950 text-white hover:bg-slate-800"
                                >
                                    {selectedPlan === "free" ? "Continue to Dashboard" : "Continue to Checkout"} <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Checkout */}
                    {step === "checkout" && (
                        <div className="max-w-2xl animate-in fade-in slide-in-from-right-8 duration-500">
                            <h1 className="mb-3 text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">Checkout</h1>
                            <p className="mb-8 text-sm leading-6 text-slate-600">
                                You're about to subscribe to <strong>{currentPlan?.name}</strong> at <strong>${currentPlan?.price.usd}/month</strong>.
                            </p>

                            {checkoutState === "canceled" && (
                                <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    Your previous checkout session was canceled. Nothing was charged, and you can retry from here.
                                </div>
                            )}
                            {!userEmailVerified ? (
                                <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950">
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
                                            className="rounded-md bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
                                        >
                                            Resend verification email
                                        </button>
                                    </form>
                                </div>
                            ) : null}

                            <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
                                <h3 className="mb-4 font-semibold text-slate-950">Order summary</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <span className="text-slate-600">Plan</span>
                                        <span className="font-medium text-slate-950">{currentPlan?.name}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span className="text-slate-600">Billing cycle</span>
                                        <span className="font-medium text-slate-950">Monthly</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span className="text-slate-600">Usage limit</span>
                                        <span className="font-medium text-slate-950">{currentPlan?.usageLimit.toLocaleString()} leads/mo</span>
                                    </div>
                                    <div className="mt-3 flex justify-between gap-4 border-t border-slate-200 pt-3 text-lg font-semibold">
                                        <span>Total</span>
                                        <span>${currentPlan?.price.usd}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="mb-2 block text-sm font-semibold text-slate-950">Payment region</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        type="button"
                                        variant={currency === "usd" ? "default" : "outline"}
                                        onClick={() => setCurrency("usd")}
                                        className={`w-full ${currency === "usd" ? "bg-slate-950 text-white hover:bg-slate-800" : "border-slate-300 bg-white text-slate-950 hover:border-teal-300 hover:bg-teal-50"}`}
                                    >
                                        Global (Stripe)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={currency === "inr" ? "default" : "outline"}
                                        onClick={() => setCurrency("inr")}
                                        className={`w-full ${currency === "inr" ? "bg-slate-950 text-white hover:bg-slate-800" : "border-slate-300 bg-white text-slate-950 hover:border-teal-300 hover:bg-teal-50"}`}
                                    >
                                        India (Razorpay)
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => moveToStep("plan_selection")}
                                    className="gap-2 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </Button>
                                <Button onClick={handleCheckout} disabled={loading} className="gap-2 bg-slate-950 text-white hover:bg-slate-800">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pay & Subscribe"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success (shown after checkout completes) */}
                    {step === "success" && (
                        <div className="max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-50">
                                <Check className="h-8 w-8 text-emerald-700" />
                            </div>
                            <h1 className="mb-3 text-3xl font-semibold tracking-normal text-slate-950">Welcome aboard!</h1>
                            <p className="mb-8 text-sm leading-6 text-slate-600">
                                Your subscription is now active. Let's get you set up.
                            </p>
                            <Button onClick={() => window.location.href = buildDashboardHandoffUrl()} className="bg-slate-950 text-white hover:bg-slate-800">
                                Go to Dashboard
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Activation Brief */}
            <div className="hidden border-l border-slate-200 bg-white p-8 lg:flex lg:flex-col lg:justify-between xl:p-10">
                <div>
                    <div className="rounded-lg border border-slate-200 bg-[#f9f9ff] p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                            Activation brief
                        </p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">
                            Start the workspace, then scale only what is review-ready.
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            This flow is designed for governed sales operations: context first, plan fit second, provider and automation gates after the workspace exists.
                        </p>
                    </div>

                    <div className="mt-5 rounded-lg border border-slate-200 bg-white">
                        <div className="grid grid-cols-[7rem_1fr] border-b border-slate-200 text-xs">
                            <div className="bg-slate-50 px-4 py-3 font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Step
                            </div>
                            <div className="px-4 py-3 font-semibold text-slate-950">{currentStepLabel}</div>
                        </div>
                        <div className="grid grid-cols-[7rem_1fr] border-b border-slate-200 text-xs">
                            <div className="bg-slate-50 px-4 py-3 font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Plan
                            </div>
                            <div className="px-4 py-3 font-semibold text-slate-950">{currentPlan?.name ?? "Free"}</div>
                        </div>
                        <div className="grid grid-cols-[7rem_1fr] text-xs">
                            <div className="bg-slate-50 px-4 py-3 font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Context
                            </div>
                            <div className="px-4 py-3 font-semibold text-slate-950">
                                {acquisitionContext ? acquisitionContext.label : "Direct signup"}
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 rounded-lg border border-slate-200 bg-white">
                        {onboardingPromiseRows.map((row, index) => {
                            const Icon = row.icon;

                            return (
                                <div
                                    key={row.label}
                                    className={`grid grid-cols-[2rem_1fr] gap-3 p-4 ${
                                        index === 0 ? "" : "border-t border-slate-200"
                                    }`}
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                                        <Icon className="h-4 w-4 text-teal-700" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-950">{row.label}</h3>
                                        <p className="mt-1 text-xs leading-5 text-slate-600">{row.detail}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-8 rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">
                        Launch checklist
                    </p>
                    <div className="mt-4 space-y-3">
                        {activationChecklist.map((item) => (
                            <div key={item} className="flex items-start gap-3 text-sm leading-5 text-slate-200">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
