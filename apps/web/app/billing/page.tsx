import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getBillingPortalData, getWorkspaceMemberships } from "@/app/api";
import { cancelSubscriptionAction } from "./actions";
import {
  isServerApiUnauthorizedError,
  isServerApiWorkspaceSelectionRequiredError,
} from "@/lib/server-api-auth";
import { AuthenticatedAppNav } from "@/components/authenticated-app-nav";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { WorkspaceSelectionRequired } from "@/components/workspace-selection-required";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

export const metadata: Metadata = {
  title: "Billing & Subscription - Sales SaaS",
  description: "Manage your subscription and billing details",
};

type BillingPageProps = {
  searchParams?: Promise<{
    canceled?: string;
    workspace?: string;
    verifyEmail?: string;
  }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user) {
    redirect("/get-started");
  }

  try {
    const portalData = await getBillingPortalData();
    const workspaceMemberships = await getWorkspaceMemberships();
    const scheduledCancellationDate = portalData.subscription?.cancellationRequestedAt
      ? new Date(portalData.subscription.cancellationRequestedAt).toLocaleDateString()
      : null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <AuthenticatedAppNav
            currentPath="/billing"
            userEmail={session.user.email}
            emailVerified={Boolean(session.user.emailVerified)}
          />
          {params?.canceled === "1" ? (
            <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Your subscription is set to stay active until the end of the current billing period.
            </div>
          ) : null}
          {params?.workspace === "switched" ? (
            <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              Workspace scope updated successfully. Billing data now reflects the selected
              workspace.
            </div>
          ) : null}
          {params?.workspace === "denied" ? (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              That workspace is not assigned to your account. Choose one of your permitted
              workspaces instead.
            </div>
          ) : null}
          {params?.workspace === "error" ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              We could not switch the workspace just now. Please retry once the API is healthy.
            </div>
          ) : null}
          {params?.verifyEmail === "sent" ? (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Verification email sent. Open the latest message in your inbox to unlock billing
              management and live outbound actions.
            </div>
          ) : null}
          {params?.verifyEmail === "error" ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              We could not send a verification email just now. Please retry in a moment.
            </div>
          ) : null}
          {!session.user.emailVerified ? (
            <div className="mb-6">
              <EmailVerificationBanner
                email={session.user.email}
                returnTo="/billing"
                title="Verify your email before starting paid checkout or changing subscription state."
                body="Billing reads are still visible, but checkout and cancellation stay locked until the email on this account is verified."
              />
            </div>
          ) : null}

          {/* Header */}
          <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
              <p className="mt-2 text-gray-600">
                Manage your subscription, view payment history, and track usage
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900"
                >
                  Open dashboard
                </Link>
                <Link
                  href="/settings"
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900"
                >
                  Workspace settings
                </Link>
              </div>
            </div>
            <WorkspaceSwitcher memberships={workspaceMemberships} returnTo="/billing" compact />
          </div>

          {/* Subscription Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {portalData.subscription?.planKey
                      ? portalData.subscription.planKey.charAt(0).toUpperCase() + portalData.subscription.planKey.slice(1)
                      : "No Plan"}
                  </span>
                  {portalData.subscription?.status && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      portalData.subscription.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : portalData.subscription.status === 'trialing'
                        ? 'bg-blue-100 text-blue-800'
                        : portalData.subscription.status === 'past_due'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {portalData.subscription.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
                {portalData.organization && (
                  <p className="text-gray-600 text-sm mt-1">
                    {portalData.organization.name}
                  </p>
                )}
                {portalData.subscription?.cancelAtPeriodEnd ? (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    This subscription is scheduled to cancel at the end of the current billing period.
                    {scheduledCancellationDate ? ` Cancellation was requested on ${scheduledCancellationDate}.` : ""}
                  </p>
                ) : null}
              </div>
              {portalData.subscription && (
                <div className="flex gap-2">
                  {session.user.emailVerified ? (
                    <a
                      href={`/get-started?plan=${portalData.subscription.planKey}`}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      Change Plan
                    </a>
                  ) : (
                    <span className="px-4 py-2 rounded-lg bg-gray-200 text-sm font-medium text-gray-500">
                      Change Plan
                    </span>
                  )}
                  {portalData.subscription.status !== 'canceled' &&
                  !portalData.subscription.cancelAtPeriodEnd &&
                  session.user.emailVerified ? (
                    <form action={cancelSubscriptionAction}>
                      <button
                        type="submit"
                        className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                      >
                        Cancel At Period End
                      </button>
                    </form>
                  ) : null}
                </div>
              )}
            </div>

            {portalData.subscription && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-gray-500 text-sm">Seats</p>
                  <p className="font-semibold text-gray-900">{portalData.subscription.seats}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Usage Limit</p>
                  <p className="font-semibold text-gray-900">{portalData.subscription.usageLimit?.toLocaleString() || "Unlimited"} leads/mo</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Usage This Period</p>
                  <p className="font-semibold text-gray-900">
                    {(portalData.usage?.leads_created || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {portalData.subscription?.status !== "canceled" && !portalData.subscription?.cancelAtPeriodEnd && (
              <p className="mt-4 text-sm text-gray-500">
                Canceling keeps your plan active until the end of the current billing period.
              </p>
            )}
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Payment History</h2>
            </div>
            {portalData.paymentHistory && portalData.paymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Provider</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portalData.paymentHistory.map((payment: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 px-4 text-gray-900">
                          {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {(payment.amount / 100).toLocaleString()} {payment.currency}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            payment.status === 'succeeded' 
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-900 capitalize">{payment.provider}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 py-8 text-center">No payment history available</p>
            )}
          </div>

          {/* Usage Breakdown */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Usage (Last 30 Days)</h2>
            </div>
            {Object.keys(portalData.usage).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(portalData.usage).map(([metric, quantity]) => (
                  <div key={metric} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-500 text-sm capitalize">{metric.replace(/_/g, ' ')}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Number(quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 py-8 text-center">No usage recorded yet</p>
            )}
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-lg px-6">
          <h1 className="text-2xl font-bold mb-4">Error loading billing data</h1>
          <p className="text-gray-600">{error.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="/billing"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry billing
            </a>
            <a
              href="/dashboard"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
