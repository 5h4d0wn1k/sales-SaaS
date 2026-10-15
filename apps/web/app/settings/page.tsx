import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AuthenticatedAppNav } from "@/components/authenticated-app-nav";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { WorkspaceSelectionRequired } from "@/components/workspace-selection-required";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import {
  getProviderSummary,
  getWorkspaceInvitations,
  getWorkspaceMemberships,
  getWorkspaceTeamMembers,
  type BillingPortalData,
  getBillingPortalData,
} from "@/app/api";
import {
  isServerApiUnauthorizedError,
  isServerApiWorkspaceSelectionRequiredError,
} from "@/lib/server-api-auth";
import type { ProviderHealth, ProviderSummary } from "@sales/shared";
import type { WorkspaceInvitation, WorkspaceTeamMember } from "@sales/shared";

export const metadata: Metadata = {
  title: "Settings - Sales SaaS",
  description:
    "Review workspace access, provider readiness, and account security state.",
};

type SettingsPageProps = {
  searchParams?: Promise<{
    workspace?: string;
    verifyEmail?: string;
    inviteStatus?: string;
    inviteEmail?: string;
    invitePreview?: string;
    inviteMessage?: string;
  }>;
};

function toneForMode(mode: ProviderHealth["mode"]) {
  if (mode === "configured") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (mode === "disabled") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function ProviderSection({
  title,
  description,
  providers,
}: {
  title: string;
  description: string;
  providers: ProviderHealth[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {providers.map((provider) => (
          <article
            key={`${provider.kind}-${provider.provider}`}
            className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-900">
                {provider.provider}
              </h3>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneForMode(provider.mode)}`}
              >
                {provider.mode}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {provider.detail}
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Channels: {provider.channels.join(", ")}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReadOnlySummaryCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5 space-y-4 text-sm text-slate-700">{children}</div>
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/get-started");
  }

  const params = await searchParams;

  let workspaceMemberships;
  let billingData: BillingPortalData | null = null;
  let providerSummary: ProviderSummary | null = null;
  let teamMembers: WorkspaceTeamMember[] = [];
  let invitations: WorkspaceInvitation[] = [];
  let providerSummaryError: string | null = null;

  try {
    workspaceMemberships = await getWorkspaceMemberships();
  } catch (error) {
    if (isServerApiUnauthorizedError(error)) {
      redirect("/get-started");
    }

    if (isServerApiWorkspaceSelectionRequiredError(error)) {
      const memberships = await getWorkspaceMemberships().catch(() => []);
      return (
        <WorkspaceSelectionRequired
          memberships={memberships}
          returnTo="/settings"
        />
      );
    }

    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
            Settings unavailable
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            We could not load your workspace settings.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Retry after the API is healthy. This page depends on the same
            authenticated workspace scope used by billing and dashboard
            surfaces.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/settings"
              className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
            >
              Retry settings
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const activeWorkspaceMembership =
    workspaceMemberships.find((membership) => membership.active) ??
    workspaceMemberships[0];
  const canManageTeam =
    activeWorkspaceMembership?.role === "owner" ||
    activeWorkspaceMembership?.role === "admin";

  const [
    providerSummaryResult,
    billingDataResult,
    teamMembersResult,
    invitationsResult,
  ] = await Promise.allSettled([
    getProviderSummary(),
    getBillingPortalData(),
    canManageTeam ? getWorkspaceTeamMembers() : Promise.resolve([]),
    canManageTeam ? getWorkspaceInvitations() : Promise.resolve([]),
  ]);

  for (const result of [
    providerSummaryResult,
    billingDataResult,
    teamMembersResult,
    invitationsResult,
  ]) {
    if (result.status === "fulfilled") {
      continue;
    }

    const { reason } = result;

    if (isServerApiUnauthorizedError(reason)) {
      redirect("/get-started");
    }

    if (isServerApiWorkspaceSelectionRequiredError(reason)) {
      return (
        <WorkspaceSelectionRequired
          memberships={workspaceMemberships}
          returnTo="/settings"
        />
      );
    }
  }

  if (providerSummaryResult.status === "fulfilled") {
    providerSummary = providerSummaryResult.value;
  } else {
    providerSummaryError =
      "Provider readiness is temporarily unavailable. Workspace and security controls remain available below.";
  }

  if (billingDataResult.status === "fulfilled") {
    billingData = billingDataResult.value;
  }

  if (teamMembersResult.status === "fulfilled") {
    teamMembers = teamMembersResult.value;
  }

  if (invitationsResult.status === "fulfilled") {
    invitations = invitationsResult.value;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_24%,#fffaf5_100%)] text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <AuthenticatedAppNav
          currentPath="/settings"
          userEmail={session.user.email}
          emailVerified={Boolean(session.user.emailVerified)}
        />
        {params?.workspace === "switched" ? (
          <div className="mb-6 rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900 shadow-sm">
            Workspace scope updated successfully. Settings now reflect the
            selected workspace.
          </div>
        ) : null}
        {params?.workspace === "denied" ? (
          <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 shadow-sm">
            That workspace is not assigned to your account. Choose one of your
            permitted workspaces instead.
          </div>
        ) : null}
        {params?.workspace === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            We could not switch the workspace just now. Please retry once the
            API is healthy.
          </div>
        ) : null}
        {params?.verifyEmail === "sent" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            Verification email sent. Open the latest message in your inbox to
            unlock billing and live outbound actions.
          </div>
        ) : null}
        {params?.verifyEmail === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            We could not send a verification email just now. Please retry in a
            moment.
          </div>
        ) : null}
        {params?.inviteStatus === "created" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            Invite created
            {params.inviteEmail ? ` for ${params.inviteEmail}` : ""}. The
            teammate can accept it after signing in with the invited email
            address.
          </div>
        ) : null}
        {params?.inviteStatus === "preview" ? (
          <div className="mb-6 rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900 shadow-sm">
            Invite created in preview mode
            {params.inviteEmail ? ` for ${params.inviteEmail}` : ""}.
            {params.invitePreview ? (
              <>
                {" "}
                <a
                  href={params.invitePreview}
                  className="font-semibold underline underline-offset-4 hover:text-sky-950"
                >
                  Open the preview invite link
                </a>
                .
              </>
            ) : null}
          </div>
        ) : null}
        {params?.inviteStatus === "revoked" ? (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 shadow-sm">
            Pending invite revoked successfully.
          </div>
        ) : null}
        {params?.inviteStatus === "accepted" ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            Workspace invite accepted successfully.
          </div>
        ) : null}
        {params?.inviteStatus === "error" ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            {params.inviteMessage ??
              "We could not complete that invite action just now."}
          </div>
        ) : null}
        {!session.user.emailVerified ? (
          <div className="mb-6">
            <EmailVerificationBanner
              email={session.user.email}
              returnTo="/settings"
              title="Verify your email before enabling paid billing changes or live outbound actions."
              body="Security and workspace access are visible here, but live commercial actions stay locked until the account email is verified."
            />
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/60">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Workspace administration
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Keep access, providers, and security visible before widening
              automation.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              This page is the operator baseline for the current production
              tranche: explicit workspace scope, account security, billing
              visibility, and provider readiness in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open dashboard
              </Link>
              <Link
                href="/billing"
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Open billing
              </Link>
              <Link
                href="/forgot-password"
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Reset password
              </Link>
            </div>

            <div className="mt-8">
              <WorkspaceSwitcher
                memberships={workspaceMemberships}
                returnTo="/settings"
              />
            </div>
          </div>

          <aside className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-xl shadow-slate-300/40">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Security and billing state
            </span>
            <div className="mt-5 space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
                <p className="text-sm font-semibold text-slate-100">
                  Account identity
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  {session.user.email}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {session.user.emailVerified
                    ? "Verified"
                    : "Verification required"}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
                <p className="text-sm font-semibold text-slate-100">
                  Plan posture
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  {billingData?.subscription
                    ? `${billingData.subscription.planKey} (${billingData.subscription.status})`
                    : "No active paid subscription visible."}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Billing remains workspace-scoped and email-gated for write
                  actions.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
                <p className="text-sm font-semibold text-slate-100">
                  Current trust standard
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>Approval-gated live outreach</li>
                  <li>Explicit workspace selection</li>
                  <li>Guardrails before broader automation</li>
                </ul>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <ReadOnlySummaryCard
            title="Account and workspace state"
            description="Current access and commercial facts that operators should be able to inspect without guessing."
          >
            <KeyValue
              label="Account email"
              value={session.user.email ?? "Unknown"}
            />
            <KeyValue
              label="Email status"
              value={
                session.user.emailVerified
                  ? "Verified"
                  : "Verification required"
              }
            />
            <KeyValue
              label="Accessible workspaces"
              value={String(workspaceMemberships.length)}
            />
            <KeyValue
              label="Current plan"
              value={
                billingData?.subscription
                  ? `${billingData.subscription.planKey} / ${billingData.subscription.status}`
                  : "Free or not yet provisioned"
              }
            />
          </ReadOnlySummaryCard>

          <ReadOnlySummaryCard
            title="Current admin boundaries"
            description="What the repo now supports versus what still needs deeper product work."
          >
            <KeyValue label="Workspace switching" value="Implemented" />
            <KeyValue
              label="Email verification and password reset"
              value="Implemented"
            />
            <KeyValue
              label="Team invites"
              value="Initial workspace invite management implemented"
            />
            <KeyValue
              label="Ownership transfer and last-owner protection"
              value="Next production tranche"
            />
            <KeyValue
              label="Entitlements and AI budget controls"
              value="Next commercial tranche"
            />
          </ReadOnlySummaryCard>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <ReadOnlySummaryCard
            title="Team access"
            description="Current members of the active workspace. This is the first production tranche of team administration."
          >
            {teamMembers.length > 0 ? (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {member.displayName ?? member.email}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {member.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
                          Workspace: {member.workspaceRole}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
                          Org: {member.organizationRole}
                        </span>
                        {member.activeWorkspace ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                            Active here
                          </span>
                        ) : null}
                        {member.currentUser ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                            You
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                No workspace members are visible yet.
              </p>
            )}
          </ReadOnlySummaryCard>

          <ReadOnlySummaryCard
            title="Invite teammate"
            description="Invite owners, admins, or members into the active workspace. Acceptance happens through the invited email address."
          >
            {canManageTeam ? (
              <>
                <form
                  action="/api/account/team/invitations/create"
                  method="post"
                  className="space-y-4"
                >
                  <input type="hidden" name="returnTo" value="/settings" />
                  <div className="space-y-2">
                    <label
                      htmlFor="invite-email"
                      className="text-sm font-medium text-slate-800"
                    >
                      Teammate email
                    </label>
                    <input
                      id="invite-email"
                      name="email"
                      type="email"
                      required
                      placeholder="teammate@company.com"
                      defaultValue={params?.inviteEmail ?? ""}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="invite-role"
                      className="text-sm font-medium text-slate-800"
                    >
                      Workspace role
                    </label>
                    <select
                      id="invite-role"
                      name="role"
                      defaultValue="member"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-slate-500"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Send invite
                  </button>
                </form>

                <div className="border-t border-slate-200 pt-4">
                  <p className="text-sm font-semibold text-slate-950">
                    Pending invites
                  </p>
                  {invitations.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                        >
                          <p className="font-medium text-slate-950">
                            {invitation.email}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {invitation.role} invite, expires{" "}
                            {new Date(
                              invitation.expiresAt,
                            ).toLocaleDateString()}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                            Invited by {invitation.invitedByName}
                          </p>
                          <form
                            action={`/api/account/team/invitations/${invitation.id}/revoke`}
                            method="post"
                            className="mt-3"
                          >
                            <input
                              type="hidden"
                              name="returnTo"
                              value="/settings"
                            />
                            <button
                              type="submit"
                              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                            >
                              Revoke
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">
                      No pending invites are active for this workspace.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Only workspace owners and admins can invite teammates or revoke
                pending invites.
              </p>
            )}
          </ReadOnlySummaryCard>
        </section>

        {providerSummaryError ? (
          <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            {providerSummaryError}
          </div>
        ) : null}

        {providerSummary ? (
          <div className="mt-8 space-y-6">
            <ProviderSection
              title="Lead source readiness"
              description="Discovery adapters that are available to plan and run source workflows."
              providers={providerSummary.sources}
            />
            <ProviderSection
              title="Outreach readiness"
              description="Configured or guarded delivery paths for campaign dispatch."
              providers={providerSummary.outreach}
            />
            <ProviderSection
              title="Voice readiness"
              description="Controlled calling foundations and their current runtime mode."
              providers={providerSummary.voice}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
