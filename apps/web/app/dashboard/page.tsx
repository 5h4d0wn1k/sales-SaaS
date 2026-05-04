import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { platformModules, readinessChecklist } from "@sales/shared";
import { auth } from "../../auth";
import { getDashboardData } from "./api";
import { isServerApiUnauthorizedError } from "@/lib/server-api-auth";

type DashboardPageProps = {
  searchParams?: Promise<{
    checkout?: string;
  }>;
};

type SectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

type CardProps = {
  eyebrow: string;
  title: string;
  summary: string;
  children?: ReactNode;
};

function DataCard({ eyebrow, title, summary, children }: CardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm shadow-slate-200/60">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {eyebrow}
      </span>
      <h3 className="mt-3 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{summary}</p>
      {children ? <div className="mt-4 space-y-3 text-sm text-slate-700">{children}</div> : null}
    </article>
  );
}

function EmptyStateCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-2 leading-6">{description}</p>
    </div>
  );
}

function KeyValueList({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="space-y-2">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="flex items-start justify-between gap-3">
          <dt className="text-slate-500">{item.label}</dt>
          <dd className="text-right font-medium text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneClassName =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneClassName}`}
    >
      {label}
    </span>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/get-started");
  }

  const params = await searchParams;
  const showCheckoutSuccess = params?.checkout === "success";

  let dashboard;

  try {
    dashboard = await getDashboardData();
  } catch (error) {
    if (isServerApiUnauthorizedError(error)) {
      redirect("/get-started");
    }

    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
            Dashboard unavailable
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            We could not load your live workspace data.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            This page only renders real account data. Please try again in a moment or return to
            billing and onboarding once the API is healthy.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
            >
              Retry dashboard
            </Link>
            <Link
              href="/billing"
              className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
            >
              Open billing
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const profile = dashboard.onboarding.extractedProfile;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_22%,#f8fafc_100%)] text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {showCheckoutSuccess ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
            Checkout completed successfully. Your workspace is ready for the next onboarding,
            campaign, and billing steps.
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
          <div className="rounded-[2rem] border border-orange-100 bg-white/90 p-8 shadow-xl shadow-orange-100/50">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
              Sales operations workspace
            </span>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Review the system, understand the motion, and keep every step visible.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              {dashboard.workspace.organizationName} is using one workspace for onboarding, source
              planning, lead qualification, outreach review, meeting tracking, and subscription
              visibility.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboard.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-3xl border border-slate-200 bg-slate-50/90 p-5"
                >
                  <p className="text-3xl font-semibold tracking-tight text-slate-950">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800">{metric.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{metric.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/billing"
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Manage billing
              </Link>
              <Link
                href="/get-started"
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Review onboarding flow
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-xl shadow-slate-300/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Workspace
                </p>
                <h2 className="mt-3 text-2xl font-semibold">{dashboard.workspace.workspaceName}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Keep billing, readiness, and rollout status visible in one place.
                </p>
              </div>
              <StatusPill
                label={dashboard.subscription.status.replace("_", " ")}
                tone={dashboard.subscription.status === "active" ? "good" : "warn"}
              />
            </div>

            <div className="mt-6 space-y-3">
              {readinessChecklist.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-100">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.detail}</p>
                    </div>
                    <StatusPill
                      label={item.status}
                      tone={item.status === "ready" ? "good" : "warn"}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                dashboard.workspace.region,
                dashboard.subscription.planKey,
                dashboard.subscription.status,
                dashboard.onboarding.status,
              ].map((value) => (
                <StatusPill key={value} label={value.replace("_", " ")} />
              ))}
            </div>
          </aside>
        </section>

        <div className="mt-10 space-y-10">
          <Section
            title="Business understanding"
            description="Conversational onboarding with structured outputs, so the rest of the workflow stays anchored to a real business profile."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <DataCard
                eyebrow={dashboard.onboarding.currentStep}
                title="Onboarding session"
                summary={`Status: ${dashboard.onboarding.status}`}
              >
                {dashboard.onboarding.transcript.length > 0 ? (
                  <ul className="space-y-2">
                    {dashboard.onboarding.transcript.slice(-3).map((message, index) => (
                      <li key={`${message.role}-${index}`} className="rounded-2xl bg-slate-50 px-3 py-3">
                        <span className="font-medium capitalize text-slate-900">{message.role}:</span>{" "}
                        {message.content}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No onboarding transcript is available yet.</p>
                )}
              </DataCard>

              <DataCard
                eyebrow="Structured profile"
                title={profile?.businessName ?? "Profile pending"}
                summary={profile?.summary ?? "Finalize onboarding to generate the business profile."}
              >
                <KeyValueList
                  items={[
                    { label: "Audience", value: profile?.targetAudience ?? "n/a" },
                    { label: "Regions", value: profile?.regions.join(", ") ?? "n/a" },
                    { label: "Channels", value: profile?.channels.join(", ") ?? "n/a" },
                  ]}
                />
              </DataCard>
            </div>
          </Section>

          <Section
            title="Lead collection engine"
            description="Source planning, source runs, and qualification visibility before leads enter outbound campaigns."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DataCard
                eyebrow="Source plan"
                title={dashboard.sourcePlan?.summary ?? "No source plan yet"}
                summary={
                  dashboard.sourcePlan?.rationale ??
                  "Complete onboarding to produce a source plan."
                }
              >
                {dashboard.sourcePlan?.sources?.length ? (
                  <ul className="flex flex-wrap gap-2">
                    {dashboard.sourcePlan.sources.map((source) => (
                      <li
                        key={source}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {source}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </DataCard>

              {dashboard.sourceRuns.length > 0 ? (
                dashboard.sourceRuns.map((run) => (
                  <DataCard key={run.id} eyebrow={run.source} title={run.status} summary={run.summary}>
                    <KeyValueList
                      items={[
                        { label: "Candidates", value: String(run.candidatesFound) },
                        { label: "Qualified", value: String(run.qualifiedCount) },
                        { label: "Rejected", value: String(run.rejectedCount) },
                      ]}
                    />
                  </DataCard>
                ))
              ) : (
                <EmptyStateCard
                  title="No source runs recorded"
                  description="Run lead discovery after onboarding to populate source activity and qualification output."
                />
              )}
            </div>
          </Section>

          <Section
            title="Lead dashboard"
            description="Qualified leads, status changes, and last-touch visibility across the current workspace."
          >
            {dashboard.leads.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {dashboard.leads.map((lead) => (
                  <DataCard
                    key={lead.id}
                    eyebrow={lead.status}
                    title={lead.fullName}
                    summary={`${lead.company ?? "Unknown company"} · ${lead.source}`}
                  >
                    <KeyValueList
                      items={[
                        { label: "Score", value: String(lead.score) },
                        { label: "Last touchpoint", value: lead.lastTouchpoint },
                        { label: "Email", value: lead.email ?? "n/a" },
                        { label: "Phone", value: lead.phone ?? "n/a" },
                      ]}
                    />
                  </DataCard>
                ))}
              </div>
            ) : (
              <EmptyStateCard
                title="No leads yet"
                description="Leads will appear here after source runs generate qualified records for the workspace."
              />
            )}
          </Section>

          <Section
            title="Outreach operations"
            description="Campaign state, approval status, and personalized activity records across your outbound motion."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.campaigns.length > 0 ? (
                dashboard.campaigns.map((campaign) => (
                  <DataCard
                    key={campaign.id}
                    eyebrow={campaign.channel}
                    title={campaign.name}
                    summary={campaign.nextActionAt}
                  >
                    <KeyValueList
                      items={[
                        { label: "Stage", value: campaign.stage },
                        { label: "Approved", value: campaign.approved ? "yes" : "no" },
                        { label: "Leads enrolled", value: String(campaign.leadsEnrolled) },
                      ]}
                    />
                  </DataCard>
                ))
              ) : (
                <EmptyStateCard
                  title="No campaigns yet"
                  description="Approved campaigns will appear here once outbound is configured for this workspace."
                />
              )}

              {dashboard.activities.length > 0 ? (
                dashboard.activities.map((activity) => (
                  <DataCard
                    key={activity.id}
                    eyebrow={activity.type}
                    title={activity.subject}
                    summary={activity.preview}
                  >
                    <KeyValueList
                      items={[
                        { label: "Status", value: activity.status },
                        { label: "Lead", value: activity.personalizedFor },
                      ]}
                    />
                  </DataCard>
                ))
              ) : null}
            </div>
          </Section>

          <Section
            title="Calls and meetings"
            description="Call records, review state, and meeting outcomes for operator-visible follow-through."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.calls.length > 0 ? (
                dashboard.calls.map((call) => (
                  <DataCard
                    key={call.id}
                    eyebrow={call.provider}
                    title={call.disposition}
                    summary={call.summary || "No call summary has been recorded yet."}
                  >
                    <KeyValueList
                      items={[
                        { label: "Status", value: call.status },
                        {
                          label: "Review required",
                          value: call.reviewRequired ? "yes" : "no",
                        },
                      ]}
                    />
                  </DataCard>
                ))
              ) : (
                <EmptyStateCard
                  title="No calls yet"
                  description="Voice activity appears here after call records are created or provider events land."
                />
              )}

              {dashboard.meetings.length > 0 ? (
                dashboard.meetings.map((meeting) => (
                  <DataCard
                    key={meeting.id}
                    eyebrow={meeting.status}
                    title={meeting.owner}
                    summary={meeting.notes}
                  >
                    <KeyValueList
                      items={[
                        { label: "Scheduled", value: meeting.scheduledFor },
                        { label: "Lead", value: meeting.leadId },
                      ]}
                    />
                  </DataCard>
                ))
              ) : null}
            </div>
          </Section>

          <Section
            title="Action center"
            description="Operator tasks, subscription visibility, and the items that still need a human decision."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.actionItems.length > 0 ? (
                dashboard.actionItems.map((item) => (
                  <DataCard key={item.id} eyebrow={item.urgency} title={item.title} summary={item.detail} />
                ))
              ) : (
                <EmptyStateCard
                  title="No action items right now"
                  description="Sensitive or blocked workflow steps will appear here when the system needs an operator."
                />
              )}

              <DataCard
                eyebrow="Subscription"
                title={dashboard.subscription.planKey}
                summary={dashboard.subscription.status}
              >
                <KeyValueList
                  items={[
                    { label: "Seats", value: String(dashboard.subscription.seats) },
                    {
                      label: "Usage",
                      value: `${dashboard.subscription.monthlyUsage}/${dashboard.subscription.usageLimit}`,
                    },
                  ]}
                />
              </DataCard>
            </div>
          </Section>

          <Section
            title="Platform modules"
            description="Implementation roadmap visibility for the broader product footprint that surrounds the current workspace experience."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {platformModules.map((module) => (
                <DataCard
                  key={module.slug}
                  eyebrow={module.phase}
                  title={module.title}
                  summary={module.summary}
                >
                  <ul className="space-y-2 text-sm text-slate-700">
                    {module.capabilities.map((capability) => (
                      <li key={capability} className="rounded-2xl bg-slate-50 px-3 py-2">
                        {capability}
                      </li>
                    ))}
                  </ul>
                </DataCard>
              ))}
            </div>
          </Section>
        </div>

        <p className="mt-10 text-sm leading-6 text-slate-500">
          This workspace runs on the tenant-scoped API and Postgres-backed foundation added in this
          project, but provider integrations may still operate in mock, partial, or
          environment-specific modes depending on configuration.
        </p>
      </div>
    </main>
  );
}
