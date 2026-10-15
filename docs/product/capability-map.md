# Capability Map

This map separates the long-term company promise from current platform truth.

## Stage 1: Lead generation

### Current truth

- guided business onboarding and business profile capture
- workspace Sales Blueprint for ICP, goals, source channels, outreach channels, targets, readiness gaps, and guardrails
- public AI Sales Blueprint Builder for claim-safe readiness scoring and contact handoff before workspace setup
- public multi-channel lead source planning guide for claim-safe channel strategy, evidence review, dedupe posture, suppression checks, provider readiness, and approval boundaries
- source plan and source run data models with provider mode, dedupe count, quality score, evidence snippets, rejection reasons, compliance checks, freshness, and next action
- dashboard actions to start a guarded single-source run or multi-source discovery from the current source plan, returning evidence for operator review before outreach
- source acquisition readiness at `/v1/leads/source-acquisition-readiness` and on the dashboard, summarizing planned source lanes, run evidence, quality posture, mock/configured provider state, compliance handoff, source-provider terms/rate-limit/consent/invoice/source-quality governance gates, and production expansion blockers before scale
- configured source-provider runs require source-provider governance gates before provider work, check provider-cost budget before source work, and meter estimated source-run cost into `usage_events` after accepted evidence is created
- provider cost-curve report includes standardized website, search, and directory source-run unit-cost estimates alongside configured email/voice estimates
- lead record storage and qualification state
- mock source adapters for website, search, and directory discovery

### Near-term expansion

- stronger source-provider integrations
- provider-specific deduplication, enrichment evidence, live source-provider adapters, invoice workflow depth, and quality scoring hardening beyond current guarded/mock adapters, source-run cost estimates, and runtime source-provider governance gates
- richer source-level usage reporting by source lane and accepted/rejected candidate quality

### Long-term vision

- automated multi-source discovery and enrichment based on workspace goals, conversion outcomes, and budget posture
- lead generation strategies that adapt to conversion outcomes and budget posture

## Stage 2: Lead outreach

### Current truth

- campaign records and activity records
- approval-aware dispatch flow
- deterministic outreach sequence plan and `/v1/outreach/sequence-plan` endpoint for read-only, Sales Blueprint-informed channel order, lead candidates, sample operator copy, plan-channel review, and safe next actions before any campaign or provider work is created
- outbound channel readiness at `/v1/outreach/channel-readiness` and on the dashboard, separating email/call live-dispatch controls, review-only LinkedIn/social posture, and SMS roadmap blockers before operators scale channels
- dashboard action to create draft campaigns through channel entitlement checks before any live send is possible
- dashboard action for owner/admin verified-email approval of draft campaigns before dispatch controls appear
- dashboard action to dispatch the first approved campaign touch through the existing server-side safety gates
- action proposals for risky campaign, Telegram, provider, call, lead-source, billing, and AI-worker requests
- configured or mock email dispatch path
- review-gated LinkedIn-style outreach placeholder
- provider health visibility
- plan-specific outreach dispatch quota checks and `usage_events` metering before campaign dispatch creates provider work
- initial plan included-channel enforcement for email, call, and review-gated LinkedIn campaign/call workflows

### Near-term expansion

- stronger email/lifecycle execution
- live SMS/social channel-specific quotas, provider adapters, policy enforcement, and richer lifecycle usage reporting beyond the current email/voice quota and channel-readiness boundary
- richer approval policies and audit reporting

### Long-term vision

- channel orchestration across email, SMS, voice, and additional networks
- adaptive sequencing using workspace goals, response patterns, and budget

## Stage 3: Lead conversion

### Current truth

- meeting records
- call records and dispositions
- dashboard action to dispatch guarded calls for qualified/contacted leads with phone numbers through the existing server-side safety gates
- plan-specific voice call quota checks and `usage_events` metering before voice dispatch creates provider work
- dashboard action to schedule manual conversion meetings from eligible leads
- manual calendar handoff for scheduled or pending meetings with Google, Outlook, Office 365, and ICS export links generated from the tenant-scoped dashboard state
- dashboard action to record meeting outcomes and optional actual contract value, moving completed meetings to won leads and canceled meetings to lost leads
- manual CRM handoff export with lead stage, contact, latest activity, latest call, latest meeting, actual value, and next-action fields for operator-reviewed import
- deterministic conversion brief for meeting candidates, open meeting outcomes, call review blockers, closed-won state, lead focus, and guarded next actions without autonomous scheduling or outreach
- deterministic conversion work queue for call review blockers, overdue meeting outcomes, upcoming meeting prep, handoff candidates, missing contact data, and missing closed-value capture without mutating workspace state
- deterministic revenue forecast for stage-weighted pipeline value, actual completed-meeting value when recorded, Sales Blueprint target coverage, revenue gap, and guarded next actions without guaranteed revenue claims
- manual revenue reconciliation export with completed-meeting value, missing-value flags, won-lead-without-meeting flags, subscription context, and CSV download for operator-reviewed accounting handoff without mutating accounting, payment, CRM, or billing provider state
- read-only conversion integration readiness at `/v1/conversion/integration-readiness` and on the dashboard, summarizing CRM sync, calendar sync, accounting sync, invoice matching, payment reconciliation, field-mapping, value-capture, and policy blockers before any external conversion integration can scale
- dashboard visibility into leads, campaigns, meetings, and subscription state

### Near-term expansion

- calendar-provider sync, writable calendar integration, external reminder workflow, and enforcement beyond current readiness reporting
- live CRM sync, richer forecast-to-actual reporting across CRM, calendar, accounting, payment, and billing integrations beyond current readiness gates and manual exports
- workspace-aware operator tooling for follow-up and qualification

### Long-term vision

- AI-assisted conversion support
- controlled automation deeper into scheduling, qualification, and conversion follow-through
- measurable optimization from conversion outcome back into sourcing and outreach strategy

## Cross-cutting platform capabilities

### Current truth

- multi-tenant workspace model
- billing and payment visibility
- workspace switching
- account lifecycle foundations
- deployment-side account lifecycle email readiness for verification, password reset, and workspace invite delivery
- route-specific abuse throttles for public registration, email verification, and password reset flows, with server-side web lifecycle proxies preserving bounded client identity headers for API enforcement
- server-side same-origin mutation guard on Next.js API `POST` proxy routes before form parsing or server API authorization header creation
- approval-first trust posture
- public segment solution pages for founders, agencies, SMB teams, local service businesses, B2B SaaS teams, and professional-services firms with claim-safe SEO metadata, sitemap coverage, and routed contact or workspace-start CTAs
- public AI sales automation platform commercial page for claim-safe buyer acquisition around the full governed workflow: Sales Blueprint context, source evidence, approval-gated outreach, meeting conversion, revenue visibility, Telegram command posture, provider readiness, billing controls, audit evidence, and context handoff into contact or workspace-start flows
- public AI SDR software commercial page for claim-safe buyer acquisition around Sales Blueprint context, source evidence, approval gates, provider readiness, Telegram boundaries, plan controls, audit evidence, managed rollout paths, and context handoff into contact or workspace-start flows
- public AI lead generation software commercial page for claim-safe buyer acquisition around source-channel planning, lead evidence, dedupe/rejection review, approval-gated outreach handoff, meeting conversion, plan/provider posture, and context handoff into contact or workspace-start flows
- public AI outbound sales automation commercial page for claim-safe buyer acquisition around sequence planning, channel-fit review, suppression checks, approval proposals, provider readiness, email/call handoff, Telegram observability, meeting conversion, and context handoff into contact or workspace-start flows
- public AI sales meeting scheduler commercial page for claim-safe buyer acquisition around conversion queues, manual calendar handoff, meeting outcome capture, actual value capture, CRM/revenue export readiness, forecast review, Telegram observability, and context handoff into contact or workspace-start flows
- public Telegram sales command center commercial page for claim-safe buyer acquisition around safe status commands, operator briefs, sequence readiness, revenue forecast checks, provider/suppression visibility, policy previews, approval-gated pause proposals, audit evidence, and context handoff into contact or workspace-start flows
- public sales-tool comparison page for high-intent buyers comparing CRMs, outreach sequencers, lead-list vendors, agencies, and generic AI agents against a governed workspace, with sitemap coverage, navigation, and context handoff into contact or workspace-start flows
- commercial public pages use claim-safe JSON-LD that avoids `FAQPage` rich-result markup while preserving visible buyer-question content as neutral `ItemList` metadata, plus WebPage, SoftwareApplication, BreadcrumbList, sitemap, Open Graph, and Twitter metadata
- public sitemap freshness is controlled by `SITE_CONTENT_UPDATED_AT` / `NEXT_PUBLIC_SITE_CONTENT_UPDATED_AT` so release/content updates can produce stable crawler `lastmod` evidence instead of request-time noise
- branded social preview image routes, default Open Graph/Twitter metadata, and page-specific Twitter cards for pricing, contact, Sales Blueprint, and ROI calculator acquisition links
- public responsible-disclosure contact metadata at `/.well-known/security.txt` and a Trust-page contact panel with canonical URL, expiry, trust-policy link, and no bug-bounty or safe-harbor overclaim
- public AI Sales Blueprint Builder for claim-safe lead-planning readiness, source/outreach channel posture, approval gates, commercial-fit guidance, and intake context handoff
- public ROI calculator for claim-safe revenue scenario modeling and contact/pricing conversion with intake context handoff
- public AI SDR evaluation guide for claim-safe buyer education around ICP context, source evidence, approval gates, Telegram boundaries, provider readiness, auditability, and plan limits before scaling outreach
- get-started to dashboard to Settings activation handoff that preserves whitelisted acquisition and Sales Blueprint context, prefills blank workspace blueprint review fields, and keeps missing offer or voice details operator-owned before starting checkout, sourcing, outreach, provider work, AI-worker execution, or Telegram-controlled mutation
- initial Approval Inbox with tenant-scoped action proposals, risk levels, guardrails, expected effects, rollback plans, reviewer metadata, and audit linkage
- workspace-scoped Sales Blueprint persistence and Settings/Dashboard visibility
- dashboard operator cockpit for blueprint readiness, approvals, source evidence, outreach gates, AI-worker posture, and content demand review state, including visible content keywords, source signals, lead-capture offers, priority, review posture, and claim guardrails before any publishing workflow
- provider readiness console, provider activation readiness report, deployment setup plan, and owner/admin provider setup-review requests that turn readiness blockers into Approval Inbox proposals without accepting raw browser-entered secrets, mutating provider configuration, or running provider work
- deterministic command-center operator brief for approvals, provider blockers, pipeline, meetings, Telegram posture, and governed next actions
- deterministic command-center policy explanations for read-only, allowed, approval-gated, and blocked intents across in-app and Telegram command surfaces
- deterministic command-center previews for in-app and Telegram command text, including blocked unsupported automation and Telegram mutation attempts before any state changes are possible
- command-center approval proposal bridge for eligible source evidence, campaign dispatch readiness, outreach pause, and billing review commands, keeping execution inside the Approval Inbox
- beta Telegram command-center binding for slash commands and deterministic natural-language aliases covering safe status, read-only operator briefs, outreach sequence readiness, revenue forecast visibility, approvals, provider, suppression checks, Postgres-backed per-chat command throttling, and approval-gated pause proposal creation
- Telegram command readiness at `/v1/command-center/telegram-readiness` and in Settings, summarizing deployment secrets, chat binding, webhook verification, command allowlist, proposal bridge, direct-mutation boundaries, rate-limit durability, and command audit evidence before customer chat control is treated as launch-ready
- Telegram notification readiness at `/v1/command-center/telegram-notification-readiness` and in Settings, summarizing notification enablement, deployment-side target-chat secret binding, verified Telegram activity, notification policy, quiet hours, escalation owner, delivery rate cap, delivery audit, and allowed notification types before outbound customer-chat alerts are treated as production-ready
- owner/admin Telegram notification test delivery at `/v1/command-center/telegram-notifications/test`, which can send or preview a summary-only operator brief to the deployment-owned target chat after policy, type enablement, workspace binding match, customer-safe payload review, and delivery-ledger-backed rate-cap checks pass, without approving, dispatching, billing, configuring providers, exposing sensitive payloads, or running AI-worker tools
- scheduler-secret Telegram notification dispatch at `/v1/command-center/telegram-notifications/scheduled-dispatch`, plus disabled-by-default `.github/workflows/telegram-notification-dispatch.yml`, which can run summary-only delivery after target-chat resolution, quiet-hours enforcement, notification policy, customer-safe payload review, type enablement, and delivery-ledger rate-cap checks pass
- beta AI worker control plane with workspace-scoped worker registry, permissions, allowed/blocked tools, budget posture, read-only budget-readiness advisory, execution-readiness dry-run harness, margin-readiness report for subscription/provider-cost/worker-budget/proposal-quota/dry-run-budget/dry-run-cost-curve posture, approved dry-run result ingestion, over-budget task blocking, execution ledger, and approval-gated worker task proposals
- usage entitlement checks for manual lead creation, single source runs, multi-source lead discovery, outreach dispatch, and voice dispatch with dedicated dispatch/call quotas and `usage_events` metering
- AI worker task proposal entitlement checks with dedicated plan limits and `usage_events` metering before approval-gated worker proposals are created
- AI worker dry-run execution entitlement checks with dedicated plan budgets and `ai_worker_execution_cents` metering before approved result capture is accepted
- initial provider-cost budget checks and `provider_cost_cents` metering for configured email and voice dispatch
- provider cost-curve report and `/v1/providers/cost-curves` endpoint for standardized email/voice/source-run unit-cost estimates, AI-worker dry-run result cost curves, provider-cost budget posture, and channel quota maturity without changing billing behavior
- plan included-channel checks before campaign creation, campaign run/dispatch, call creation, and voice dispatch, plus dedicated outreach and voice quota checks before provider work
- upgrade recommendations in entitlement block responses when a higher plan unlocks the requested work
- dashboard upgrade CTA when a lead source run, multi-source discovery, campaign dispatch, call dispatch, or AI worker task proposal is blocked by a plan-boundary recommendation
- proactive plan growth readiness panel and `/v1/growth/plan-readiness` endpoint for read-only lead-usage, dispatch-quota, voice-quota, provider-budget, included-channel, blueprint-readiness, and upgrade-fit review before operators hit a hard entitlement block
- dashboard managed-support fit advisory that routes plan pressure, approval load, conversion follow-up, operational blockers, and AI-worker review pressure into Setup Sprint, Operator Assist, or Managed RevOps contact context without mutating billing or creating service obligations
- managed-service readiness at `/v1/growth/managed-service-readiness` and in the dashboard action center, checking commercial scope, SOW template, pricing policy, delivery owner, customer handoff, provider-cost boundary, support capacity, subscription state, approval workload, conversion workload, and AI-worker pressure before managed support is treated as sellable/deliverable
- public contact intake and API notification handoff preserve source path, referrer, acquisition, pricing-plan, managed-package, and integration context for operator review without creating checkout, provider work, outreach, billing changes, service obligations, AI-worker execution, or Telegram-controlled mutation
- dashboard conversion integration readiness panel for CRM/calendar/accounting/invoice/payment launch blockers, keeping live sync out of product claims until deployment-owned controls and evidence are configured
- dashboard outbound channel readiness panel for email/call live-dispatch posture, review-only social posture, and SMS roadmap blockers without creating provider work
- recent audit evidence panel with sanitized API, proposal, provider, Telegram, billing, and workflow event summaries for operator review without exposing raw request or provider payload bodies
- manual tamper-evident audit export with SHA-256 hash chain over retention-limited sanitized chronological audit events and JSON download for operator evidence review
- audit compliance readiness report for manual export availability, retention-limited operator evidence/export, declared retention days, deployment-owned SIEM stream presence, immutable archive presence, and legal-discovery ownership without exposing destination URLs, bucket names, or owner identities
- dashboard operational-health panel for dispatch review blockers, provider/webhook issues, approval queue posture, and API failures from recent sanitized evidence, with explicit limits around alerting, SIEM, retention, and automatic retries
- Settings incident-response readiness plan for production probe variables, optional alert webhook routing, first-response triage evidence, and owner-operated escalation gaps, with explicit limits around pager-backed operations and external observability

### Required maturity path

- team invites and role administration
- destructive audit retention deletion jobs, SIEM event streaming, immutable archive writes, and legal discovery workflows beyond retention-limited operator evidence, the readiness report, and manual hash-chain export
- richer plan-fit forecasting across live source-provider invoice reconciliation, live SMS/social channel quotas beyond readiness visibility, live CRM/accounting revenue data, and managed-service expansion triggers beyond the current readiness gate
- broader plan entitlements across live AI worker execution, live source-provider activation, SMS maturity, and social channel quotas; the current AI-worker budget-readiness dashboard, execution-readiness harness, margin-readiness report, task-proposal quota, dry-run budget, dry-run result capture, and outbound channel readiness do not execute external tools, live SMS, or social-network mutations
- automated credential vault writes, rotation execution, and true per-workspace provider connection activation beyond activation-readiness reporting and setup-review proposals
- blueprint-to-real-source integrations, provider-specific enrichment evidence, provider-specific source quality scoring, and deeper live source-provider activation beyond current guarded/mock adapters, runtime source-provider governance gates, and source-acquisition readiness reporting
- richer observability and rollout discipline
- richer command-center execution and broader natural-language interaction over the deterministic alias, brief, policy-explanation, preview, proposal-bridge, and notification-readiness foundation

### Long-term vision

- Telegram and in-app command surfaces for alerts, approvals, and safe workspace commands that can eventually mutate state after owner approval and stronger edge-native controls
- specialized AI workers for sales research, outreach planning, CRM hygiene, meeting follow-up, marketing support, and executive assistance
- broader company operating-system modules for customer operations, HR workflow support, finance visibility, knowledge management, and project orchestration

## Non-goals for current public claims

- full autonomy across every channel
- AI company management or AI workforce external tool execution as a shipped capability
- Telegram bot control that directly mutates outreach or approves actions as a shipped capability
- global compliance guarantees
- unsupported scraping or browser automation
- pretending roadmap surfaces are already GA
