import { platformModules, readinessChecklist } from "@sales/shared";
import { getDashboardData } from "./api";

export default async function HomePage() {
  const dashboard = await getDashboardData();
  const profile = dashboard.onboarding.extractedProfile;

  return (
    <main>
      <section className="hero">
        <div className="card hero-copy">
          <span className="eyebrow">Autonomous Sales Infrastructure</span>
          <h1>Understand the business, scrape the right leads, personalize outreach, and convert.</h1>
          <p className="subcopy">
            {dashboard.workspace.organizationName} is running a full sales workflow: conversational
            onboarding, source planning, lead qualification, outreach, calling, meeting booking,
            and conversion tracking.
          </p>
          <div className="metrics">
            {dashboard.metrics.map((metric) => (
              <article className="metric" key={metric.label}>
                <strong>{metric.value}</strong>
                <span className="small">{metric.label}</span>
                <p className="small">{metric.detail}</p>
              </article>
            ))}
          </div>
        </div>
        <aside className="panel hero-side">
          <h2>{dashboard.workspace.workspaceName}</h2>
          <div className="section">
            {readinessChecklist.map((item) => (
              <div className="status" key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <p className="small">{item.detail}</p>
                </div>
                <span className={`badge ${item.status === "ready" ? "good" : "warn"}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <div className="pill-row">
            {[
              dashboard.workspace.region,
              dashboard.subscription.planKey,
              dashboard.subscription.status,
              dashboard.onboarding.status,
            ].map((pillar) => (
              <span className="pill" key={pillar}>
                {pillar}
              </span>
            ))}
          </div>
        </aside>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Business Understanding</h2>
          <p className="small">Conversational onboarding with structured outputs.</p>
        </div>
        <div className="module-grid">
          <article className="panel module">
            <span className="eyebrow">{dashboard.onboarding.currentStep}</span>
            <h3>Onboarding session</h3>
            <p>Status: {dashboard.onboarding.status}</p>
            <ul className="list">
              {dashboard.onboarding.transcript.slice(-3).map((message, index) => (
                <li key={`${message.role}-${index}`}>
                  {message.role}: {message.content}
                </li>
              ))}
            </ul>
          </article>
          <article className="panel module">
            <span className="eyebrow">structured profile</span>
            <h3>{profile?.businessName ?? "Profile pending"}</h3>
            <p>{profile?.summary ?? "Finalize onboarding to generate the business profile."}</p>
            <ul className="list">
              <li>Audience: {profile?.targetAudience ?? "n/a"}</li>
              <li>Regions: {profile?.regions.join(", ") ?? "n/a"}</li>
              <li>Channels: {profile?.channels.join(", ") ?? "n/a"}</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Lead Collection Engine</h2>
          <p className="small">Source planning, source runs, and quality filtering.</p>
        </div>
        <div className="module-grid">
          <article className="panel module">
            <span className="eyebrow">source plan</span>
            <h3>{dashboard.sourcePlan?.summary ?? "No plan yet"}</h3>
            <p>{dashboard.sourcePlan?.rationale ?? "Complete onboarding to produce a source plan."}</p>
            <ul className="list">
              {dashboard.sourcePlan?.sources.map((source) => <li key={source}>{source}</li>) ?? null}
            </ul>
          </article>
          {dashboard.sourceRuns.map((run) => (
            <article className="panel module" key={run.id}>
              <span className="eyebrow">{run.source}</span>
              <h3>{run.status}</h3>
              <p>{run.summary}</p>
              <ul className="list">
                <li>Candidates: {run.candidatesFound}</li>
                <li>Qualified: {run.qualifiedCount}</li>
                <li>Rejected: {run.rejectedCount}</li>
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Lead Dashboard</h2>
          <p className="small">Qualified leads and conversion status.</p>
        </div>
        <div className="module-grid">
          {dashboard.leads.map((lead) => (
            <article className="panel module" key={lead.id}>
              <span className="eyebrow">{lead.status}</span>
              <h3>{lead.fullName}</h3>
              <p>{(lead.company ?? "Unknown company") + " · " + lead.source}</p>
              <ul className="list">
                <li>Score: {lead.score}</li>
                <li>Last touchpoint: {lead.lastTouchpoint}</li>
                {lead.email ? <li>Email: {lead.email}</li> : null}
                {lead.phone ? <li>Phone: {lead.phone}</li> : null}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Outreach Operations</h2>
          <p className="small">Campaigns, personalized activity, and usage control.</p>
        </div>
        <div className="module-grid">
          {dashboard.campaigns.map((campaign) => (
            <article className="panel module" key={campaign.id}>
              <span className="eyebrow">{campaign.channel}</span>
              <h3>{campaign.name}</h3>
              <p>{campaign.nextActionAt}</p>
              <ul className="list">
                <li>Stage: {campaign.stage}</li>
                <li>Approved: {campaign.approved ? "yes" : "no"}</li>
                <li>Leads enrolled: {campaign.leadsEnrolled}</li>
              </ul>
            </article>
          ))}
          {dashboard.activities.map((activity) => (
            <article className="panel module" key={activity.id}>
              <span className="eyebrow">{activity.type}</span>
              <h3>{activity.subject}</h3>
              <p>{activity.preview}</p>
              <ul className="list">
                <li>Status: {activity.status}</li>
                <li>Lead: {activity.personalizedFor}</li>
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Calls and Meetings</h2>
          <p className="small">Voice workflows and appointment outcomes.</p>
        </div>
        <div className="module-grid">
          {dashboard.calls.map((call) => (
            <article className="panel module" key={call.id}>
              <span className="eyebrow">{call.provider}</span>
              <h3>{call.disposition}</h3>
              <p>{call.summary}</p>
              <ul className="list">
                <li>Status: {call.status}</li>
                <li>Review required: {call.reviewRequired ? "yes" : "no"}</li>
              </ul>
            </article>
          ))}
          {dashboard.meetings.map((meeting) => (
            <article className="panel module" key={meeting.id}>
              <span className="eyebrow">{meeting.status}</span>
              <h3>{meeting.owner}</h3>
              <p>{meeting.notes}</p>
              <ul className="list">
                <li>Scheduled: {meeting.scheduledFor}</li>
                <li>Lead: {meeting.leadId}</li>
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Action Center</h2>
          <p className="small">Operator actions that keep autonomy safe.</p>
        </div>
        <div className="module-grid">
          {dashboard.actionItems.map((item) => (
            <article className="panel module" key={item.id}>
              <span className="eyebrow">{item.urgency}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
          <article className="panel module">
            <span className="eyebrow">subscription</span>
            <h3>{dashboard.subscription.planKey}</h3>
            <p>{dashboard.subscription.status}</p>
            <ul className="list">
              <li>Seats: {dashboard.subscription.seats}</li>
              <li>
                Usage: {dashboard.subscription.monthlyUsage}/{dashboard.subscription.usageLimit}
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Product Modules</h2>
          <p className="small">Implementation roadmap for the complete product.</p>
        </div>
        <div className="module-grid">
          {platformModules.map((module) => (
            <article className="panel module" key={module.slug}>
              <span className="eyebrow">{module.phase}</span>
              <h3>{module.title}</h3>
              <p>{module.summary}</p>
              <ul className="list">
                {module.capabilities.map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <p className="footnote">
        This implementation now covers the planned flow at the application layer: onboarding,
        source strategy, lead qualification, outreach, AI calling, meetings, and conversion state.
        The next infrastructure step is replacing the in-memory store with Postgres-backed
        repositories and provider adapters.
      </p>
    </main>
  );
}
