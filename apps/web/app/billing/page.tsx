import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import {
  type BillingPortalData,
  getBillingPortalData,
  getWorkspaceMemberships,
} from "@/app/api";
import { cancelSubscriptionAction } from "./actions";
import {
  isServerApiUnauthorizedError,
  isServerApiWorkspaceSelectionRequiredError,
} from "@/lib/server-api-auth";
import { AuthenticatedAppNav } from "@/components/authenticated-app-nav";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { WorkspaceSelectionRequired } from "@/components/workspace-selection-required";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import {
  calculateBillingProviderCostPercent,
  formatBillingCents,
  formatBillingChannels,
  formatBillingMetricLabel,
  formatBillingPlanName,
  formatBillingSeats,
  formatBillingStatusLabel,
  formatBillingUsageLimit,
  formatBillingUsageValue,
} from "@/lib/billing-display";

export const metadata: Metadata = {
  title: "Billing Command Center",
  description:
    "Manage your Winrate subscription, payment history, workspace usage, and billing guardrails.",
  robots: {
    index: false,
    follow: false,
  },
};

type BillingPageProps = {
  searchParams?: Promise<{
    canceled?: string;
    workspace?: string;
    verifyEmail?: string;
  }>;
};

type PaymentRecord = BillingPortalData["paymentHistory"][number];

function statusBadgeClass(status: string | null | undefined) {
  const normalizedStatus = status?.toLowerCase() ?? "";

  if (["active", "paid", "succeeded"].includes(normalizedStatus)) {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }

  if (["trialing", "pending", "processing"].includes(normalizedStatus)) {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (["past_due", "failed", "unpaid"].includes(normalizedStatus)) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (["canceled", "cancelled", "refunded"].includes(normalizedStatus)) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function formatBillingDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPaymentAmount(payment: PaymentRecord) {
  return formatBillingCents(payment.amount, payment.currency || "USD");
}

function Alert({
  tone,
  children,
}: {
  tone: "amber" | "emerald" | "rose" | "sky";
  children: ReactNode;
}) {
  const toneClasses = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
  };

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${toneClasses[tone]}`}>
      {children}
    </div>
  );
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user) {
    redirect("/get-started");
  }

  try {
    const portalData = await getBillingPortalData();
    const workspaceMemberships = await getWorkspaceMemberships();
    const subscription = portalData.subscription;
    const usage = portalData.usage ?? {};
    const paymentHistory = portalData.paymentHistory ?? [];
    const usageEntries = Object.entries(usage).sort(([left], [right]) =>
      formatBillingMetricLabel(left).localeCompare(formatBillingMetricLabel(right)),
    );
    const providerCostUsedCents = usage.provider_cost_cents ?? 0;
    const providerCostBudgetCents = subscription?.providerCostBudgetCents ?? 0;
    const providerCostPercent = calculateBillingProviderCostPercent(
      providerCostUsedCents,
      providerCostBudgetCents,
    );
    const scheduledCancellationDate = subscription?.cancellationRequestedAt
      ? formatBillingDate(subscription.cancellationRequestedAt)
      : null;
    const planName = formatBillingPlanName(subscription?.planKey);
    const boundaryMetrics = subscription
      ? [
          {
            detail: "Workspace access boundary",
            label: "Seats",
            value: formatBillingSeats(subscription.seats),
          },
          {
            detail: formatBillingUsageLimit(subscription.usageLimit),
            label: "Lead usage",
            value: `${(usage.leads_created ?? 0).toLocaleString("en-US")} leads`,
          },
          {
            detail: "Monthly plan cap",
            label: "Usage limit",
            value: formatBillingUsageLimit(subscription.usageLimit),
          },
          {
            detail: "Approved plan channels",
            label: "Included channels",
            value: formatBillingChannels(subscription.includedChannels),
          },
          {
            detail:
              providerCostBudgetCents > 0
                ? `${providerCostPercent}% of provider budget used`
                : "No provider budget configured",
            label: "Provider budget",
            progress: providerCostPercent,
            value: `${formatBillingCents(providerCostUsedCents)} / ${formatBillingCents(
              providerCostBudgetCents,
            )}`,
          },
        ]
      : [];

    return (
      <div className="min-h-screen bg-[#f9f9ff] text-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <AuthenticatedAppNav
            currentPath="/billing"
            userEmail={session.user.email}
            emailVerified={Boolean(session.user.emailVerified)}
          />

          <div className="mb-5 space-y-3">
            {params?.canceled === "1" ? (
              <Alert tone="amber">
                Your subscription is set to stay active until the end of the current billing
                period.
              </Alert>
            ) : null}
            {params?.workspace === "switched" ? (
              <Alert tone="sky">
                Workspace scope updated successfully. Billing data now reflects the selected
                workspace.
              </Alert>
            ) : null}
            {params?.workspace === "denied" ? (
              <Alert tone="rose">
                That workspace is not assigned to your account. Choose one of your permitted
                workspaces instead.
              </Alert>
            ) : null}
            {params?.workspace === "error" ? (
              <Alert tone="amber">
                We could not switch the workspace just now. Please retry once the API is healthy.
              </Alert>
            ) : null}
            {params?.verifyEmail === "sent" ? (
              <Alert tone="emerald">
                Verification email sent. Open the latest message in your inbox to unlock billing
                management and live outbound actions.
              </Alert>
            ) : null}
            {params?.verifyEmail === "error" ? (
              <Alert tone="amber">
                We could not send a verification email just now. Please retry in a moment.
              </Alert>
            ) : null}
            {!session.user.emailVerified ? (
              <EmailVerificationBanner
                email={session.user.email}
                returnTo="/billing"
                title="Verify your email before starting paid checkout or changing subscription state."
                body="Billing reads are still visible, but checkout and cancellation stay locked until the email on this account is verified."
              />
            ) : null}
          </div>

          <section className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase text-teal-700">Revenue operations</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950 md:text-3xl">
                Billing command center
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review plan state, workspace scope, payment history, usage boundaries, and
                provider spend before any paid sales operation advances.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/dashboard"
                  className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
                >
                  Open dashboard
                </Link>
                <Link
                  href="/settings"
                  className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
                >
                  Workspace settings
                </Link>
              </div>
            </div>
            <WorkspaceSwitcher memberships={workspaceMemberships} returnTo="/billing" compact />
          </section>

          <section className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Current plan</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-semibold text-slate-950">{planName}</h2>
                    {subscription?.status ? (
                      <span
                        className={`rounded-md border px-2 py-1 text-xs font-semibold capitalize ${statusBadgeClass(
                          subscription.status,
                        )}`}
                      >
                        {formatBillingStatusLabel(subscription.status)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {portalData.organization.name} / {portalData.organization.slug}
                  </p>
                </div>

                {subscription ? (
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {session.user.emailVerified ? (
                      <Link
                        href={`/get-started?plan=${encodeURIComponent(subscription.planKey)}`}
                        className="inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                      >
                        Change plan
                      </Link>
                    ) : (
                      <span className="inline-flex h-10 items-center rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-500">
                        Change plan
                      </span>
                    )}
                    {subscription.status !== "canceled" &&
                    !subscription.cancelAtPeriodEnd &&
                    session.user.emailVerified ? (
                      <form action={cancelSubscriptionAction}>
                        <button
                          type="submit"
                          className="inline-flex h-10 items-center rounded-md border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                        >
                          Cancel at period end
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Link
                      href="/pricing"
                      className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                    >
                      View pricing
                    </Link>
                    <Link
                      href="/get-started"
                      className="inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      Start onboarding
                    </Link>
                  </div>
                )}
              </div>

              {subscription?.cancelAtPeriodEnd ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This subscription is scheduled to cancel at the end of the current billing period.
                  {scheduledCancellationDate
                    ? ` Cancellation was requested on ${scheduledCancellationDate}.`
                    : ""}
                </div>
              ) : null}

              {subscription ? (
                <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">
                  Canceling keeps the plan active until the end of the current billing period.
                  Provider work, outreach, calls, and AI-worker execution remain governed by their
                  own approval and quota checks.
                </p>
              ) : (
                <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">
                  No subscription is attached to this workspace yet. Select a plan only after the
                  workspace owner confirms account scope, email verification, and rollout intent.
                </p>
              )}
            </div>

            <aside className="rounded-lg border border-teal-200 bg-teal-50 p-5 text-teal-950">
              <p className="text-sm font-semibold">Billing safety</p>
              <p className="mt-2 text-sm leading-6">
                Billing writes require a verified email and owner or admin API authorization.
                Telegram, AI workers, provider readiness checks, and dashboard views cannot directly
                change plan or payment state.
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 border-t border-teal-200 pt-3">
                  <dt className="text-teal-800">Email gate</dt>
                  <dd className="font-semibold">
                    {session.user.emailVerified ? "Verified" : "Locked"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-teal-200 pt-3">
                  <dt className="text-teal-800">Workspace scope</dt>
                  <dd className="font-semibold">{portalData.organization.name}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-teal-200 pt-3">
                  <dt className="text-teal-800">Plan mutation</dt>
                  <dd className="font-semibold">API gated</dd>
                </div>
              </dl>
            </aside>
          </section>

          {subscription ? (
            <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {boundaryMetrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">{metric.label}</p>
                  <p className="mt-2 break-words text-xl font-semibold text-slate-950">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{metric.detail}</p>
                  {"progress" in metric ? (
                    <div className="mt-3 h-2 overflow-hidden rounded-md bg-slate-100">
                      <div
                        className="h-full rounded-md bg-teal-600"
                        style={{ width: `${metric.progress}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.9fr)]">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Payment history</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Workspace-scoped ledger for recent subscription events.
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase text-slate-500">
                  {paymentHistory.length} records
                </span>
              </div>

              {paymentHistory.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[640px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-3 font-semibold">Date</th>
                        <th className="px-3 py-3 font-semibold">Amount</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-3 py-3 font-semibold">Provider</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentHistory.map((payment, idx) => (
                        <tr key={`${payment.createdAt ?? "payment"}-${idx}`}>
                          <td className="px-3 py-3 text-slate-700">
                            {formatBillingDate(payment.createdAt)}
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-950">
                            {formatPaymentAmount(payment)}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-md border px-2 py-1 text-xs font-semibold capitalize ${statusBadgeClass(
                                payment.status,
                              )}`}
                            >
                              {formatBillingStatusLabel(payment.status)}
                            </span>
                          </td>
                          <td className="px-3 py-3 capitalize text-slate-700">
                            {payment.provider || "Unknown"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">
                  No payment history is available for this workspace yet.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-semibold text-slate-950">Usage breakdown</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Last 30 days of billable or quota-relevant activity.
                </p>
              </div>

              {usageEntries.length > 0 ? (
                <dl className="mt-2 divide-y divide-slate-100">
                  {usageEntries.map(([metric, quantity]) => (
                    <div
                      key={metric}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-sm"
                    >
                      <dt className="min-w-0 text-slate-600">
                        {formatBillingMetricLabel(metric)}
                      </dt>
                      <dd className="font-semibold text-slate-950">
                        {formatBillingUsageValue(metric, Number(quantity))}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">
                  No usage has been recorded for this workspace yet.
                </p>
              )}
            </div>
          </section>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
            Billing actions are account-scoped and audit-sensitive. This page does not start lead
            sourcing, provider work, outreach, calls, AI-worker execution, Telegram-controlled
            mutation, or payment-provider mutation on its own.
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error("Billing page error:", error);
    if (isServerApiUnauthorizedError(error)) {
      redirect("/get-started");
    }
    if (isServerApiWorkspaceSelectionRequiredError(error)) {
      const memberships = await getWorkspaceMemberships().catch(() => []);
      return <WorkspaceSelectionRequired memberships={memberships} returnTo="/billing" />;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9f9ff] px-4 text-slate-950">
        <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-2xl font-semibold">Error loading billing data</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="/billing"
              className="inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Retry billing
            </a>
            <a
              href="/dashboard"
              className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
