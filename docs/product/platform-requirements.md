# Platform Requirements Brief

## Product summary

Sales AaaS is a workspace-based SaaS + AaaS platform for turning business context into lead generation, outreach, and conversion workflow with AI assistance and approval-aware control.

## Customer problem

Businesses do not just need more leads. They need a system that can:

- understand what they sell and to whom
- decide which leads matter
- run outreach without chaos
- hand off to meetings and conversion
- keep the whole motion visible and auditable

The current alternative is usually tool sprawl plus hidden manual work.

## Launch customer

- founder-led service businesses
- growth and outbound agencies
- smaller teams that need structure before they need enterprise-weight infrastructure

## Business outcome

The product should improve:

- activation from signup to working workspace
- speed to first reviewed outbound workflow
- paid conversion
- retention through operational usefulness

## Platform requirements

### Tenant model

- workspace-based multi-tenant system
- explicit organization and workspace identity
- safe workspace selection and role-aware access

### Business-context model

- store business profile, offer, audience, goals, channels, regions, constraints, and voice
- make this context available to planning and workflow layers
- persist a workspace-level Sales Blueprint that includes ICP summary, buyer roles, pain points, disqualifiers, qualification rules, source channels, outreach channels, lead and meeting targets, average contract value, compliance notes, automation mode, readiness score, and readiness gaps
- require owner/admin governance for blueprint changes because downstream lead planning and outreach behavior depend on this context

### Revenue workflow model

- lead source and source run records
- source-run evidence, dedupe count, quality score, rejection reasons, compliance checks, freshness, and next action
- read-only source acquisition readiness that summarizes planned source lanes, source-run evidence, lead quality posture, provider mode/readiness, compliance handoff, source-provider terms/rate-limit/consent/invoice/source-quality governance gates, and production expansion blockers before source acquisition can scale
- blueprint-informed content and SEO opportunity planning with review blockers, source-signal requirements, lead-capture offers, and claim guardrails before any generated demand asset can be published
- commercial public SEO pages must keep structured data aligned with actual eligibility and visible content; buyer-question sections can stay visible for humans, but SaaS sales pages must not emit `FAQPage` rich-result markup unless the business category, page purpose, and current search guidance are re-reviewed
- campaign and outreach activity records
- read-only outreach sequence planning that uses Sales Blueprint context, qualified lead evidence, plan-included channels, and approval gates to draft channel order and sample operator copy before campaign creation, without creating provider work
- owner/admin draft campaign creation with channel entitlement checks before campaign state is added
- verified owner/admin campaign approval before dashboard dispatch controls become available
- call and meeting records
- verified owner/admin meeting scheduling, outcome updates, and optional actual contract value capture that keep lead conversion state aligned
- read-only conversion integration readiness that exposes CRM sync, calendar sync, accounting sync, invoice matching, payment reconciliation, field-mapping, value-capture, and policy blockers before external conversion integrations can scale
- manual calendar handoff for scheduled or pending meetings through Google, Outlook, Office 365, and ICS export links without storing calendar-provider credentials
- manual CRM handoff export for operator-reviewed import, including lead stage, contact fields, latest activity, latest call, latest meeting, actual value, and next action without mutating external CRM state
- deterministic conversion follow-through brief that summarizes meeting candidates, open meeting outcomes, call review blockers, closed-won state, lead focus, guardrails, and safe next actions without mutating workspace state
- deterministic conversion work queue that prioritizes call review blockers, overdue meeting outcomes, upcoming meeting prep, handoff candidates, missing contact data, and missing closed-value capture without mutating workspace state
- deterministic revenue forecast that uses Sales Blueprint targets, average contract value, actual completed-meeting value when recorded, lead stages, meeting state, and guarded next actions to show target coverage without claiming guaranteed outcomes
- manual revenue reconciliation export that packages completed-meeting value, missing-value flags, won-lead-without-meeting flags, subscription context, and next actions for operator-reviewed accounting handoff without mutating accounting, payment, CRM, or billing provider state
- conversion-visible dashboard state

### Trust model

- approval-gated risky actions
- durable action proposals for high-impact AI, Telegram, campaign, call, provider, billing, and source-run requests
- audit-friendly sensitive operations
- sanitized recent audit visibility for authenticated operators, covering API request evidence, proposal review linkage, provider/Telegram events, and sensitive workflow summaries without exposing raw request or webhook payloads
- manual tamper-evident audit export with a SHA-256 hash chain over sanitized chronological audit events for operator evidence review
- web response security headers for browser hardening across public and authenticated routes
- explicit distinction between configured providers and mock or guarded flows
- deployment-side provider readiness visibility, activation readiness for secret inventory, vault policy, rotation cadence, per-workspace activation policy, rollback controls, webhook verification, and setup-review proposals without raw browser-entered secrets, provider configuration mutation, billing change, or provider work
- claim-safe channel posture
- audit compliance readiness visibility for manual export availability, retention-limited operator evidence/export, declared retention days, SIEM stream presence, immutable archive presence, and legal-discovery ownership; destructive retention deletion jobs, SIEM streaming, immutable archive storage, and legal discovery workflows are required before making compliance-grade audit claims

### Commercial model

- subscription workspace as primary billable unit
- managed-service overlay for higher-touch execution
- seats, lead usage, included outbound channels, outreach dispatch quota, voice call quota, provider-cost budget, AI worker task-proposal quota, and plan-level AI dry-run execution budget as entitlement boundaries
- enforce channel access before campaign creation, campaign run/dispatch, call creation, and voice dispatch; enforce usage limits before manual lead creation, dashboard-triggered source runs, dashboard-triggered multi-source discovery, dashboard-triggered campaign dispatch, dashboard-triggered call dispatch, and configured provider-cost work including configured source-provider evidence runs; configured source-provider evidence runs also require source-provider governance gates before provider work; campaign dispatch and voice dispatch use dedicated plan quotas instead of the generic lead limit, and accepted work records usage events for billing visibility
- return upgrade recommendations when a higher plan unlocks a blocked usage, dispatch quota, voice quota, provider-cost, or outbound-channel action; surface those recommendations in app flows that can start billable work
- provide read-only plan growth readiness before hard blocks by combining monthly lead usage, provider-cost budget posture, included-channel fit, and Sales Blueprint targets into dashboard upgrade guidance without mutating checkout, billing provider, usage, or provider configuration state
- provide read-only managed-service readiness before high-touch support is treated as sellable or deliverable, using scope policy, SOW template, pricing policy, delivery owner, customer handoff, provider-cost boundary, support capacity, subscription state, approval load, conversion workload, and AI-worker pressure without creating a service contract, invoice, billing change, provider work, or guaranteed outcome
- provide read-only provider cost-curve visibility for configured email/voice dispatch estimates, configured source-run estimates, AI-worker dry-run result categories, provider-cost budget posture, review-only/social boundaries, mock source-provider activation posture, and channel quota maturity without changing billing behavior
- provide read-only outbound channel readiness before channel scale, separating email/call dispatch controls from review-only social posture and SMS roadmap blockers without creating provider work, live SMS, social-network mutations, or new quota enforcement

### AI operating-system model

- support a command center where operators can ask questions, inspect safe workspace state, and later approve or trigger guarded actions
- provide a deterministic operator brief that summarizes approvals, provider blockers, pipeline, meetings, Telegram posture, and governed next actions without making workspace mutations
- provide deterministic policy explanations that classify command intents as read-only, allowed, approval-gated, or blocked before any future AI or Telegram command can mutate workspace state
- provide deterministic command previews that map command text to policy outcomes before execution, with unsupported scraping, browser automation, auto-connect, auto-DM, and Telegram mutation attempts blocked
- allow eligible approval-gated command previews to become pending Approval Inbox proposals while keeping actual sourcing, campaign, billing, provider, and AI-worker effects behind review and downstream policy gates
- support a beta Telegram control surface for slash commands and deterministic natural-language aliases covering status, read-only operator briefs, outreach sequence readiness, revenue forecast visibility, approval summaries, provider readiness, suppression checks, and approval-gated pause proposals, with all aliases routed through the same allowlist, replay protection, Postgres-backed per-chat command throttling, audit trail, and owner-approved mutation boundaries
- provide read-only Telegram command readiness before customer chat control is treated as launch-ready, covering deployment secrets, chat binding, webhook verification, allowlisted commands, proposal bridge, direct-mutation boundaries, rate-limit durability, and command audit evidence without mutating workspace state
- provide Telegram notification readiness before outbound customer-chat alerts are treated as production-ready, covering notification enablement, deployment-side target-chat secret binding, policy, quiet hours, escalation owner, delivery rate cap, delivery audit, and allowed summary-only notification types
- allow verified owners/admins to send a summary-only Telegram notification test after policy, notification type, target chat, workspace binding, payload-review, and delivery-ledger-backed rate-cap controls pass; test delivery must not approve, reject, dispatch, bill, configure providers, expose sensitive lead or payment payloads, or run AI-worker tools
- allow a deployment-owned scheduler to trigger summary-only Telegram notification dispatch at `/v1/command-center/telegram-notifications/scheduled-dispatch` only after a scheduler secret, target-chat workspace binding, quiet-hours window, notification policy, customer-safe payload review, enabled notification type, and delivery-ledger-backed rate-cap controls pass; scheduled dispatch must remain read-only and must skip transport during quiet hours
- model AI workers as permissioned actors with scoped tools, budgets, over-budget task blocking, task ledgers, plan-level proposal quota, plan-level dry-run execution budget, approval proposals, approved dry-run result ingestion, audit trails, read-only execution-readiness dry-run checks, margin-readiness checks for provider-cost and missing live external execution billing controls, and human escalation paths; the current implementation is a beta registry/control plane, not live autonomous execution
- keep legal, finance, employment, and irreversible business decisions human-owned unless explicitly reviewed and approved by accountable people

## Deliberate non-goals for current truth

- equal day-one maturity across every channel
- full autonomy without visible approval logic
- broad public claims that outrun provider, compliance, or repo reality
- public claims that AI workforce execution, HR, ERP, finance automation, or Telegram-controlled outreach mutation are already generally available

## Metrics

- signup-to-workspace activation rate
- onboarding completion rate
- time to first lead plan
- time to first approved dispatch
- trial-to-paid conversion
- paid workspace retention
- support burden by workflow
