# AI Operating System Roadmap

This roadmap captures the broader ambition: Sales AaaS should grow from a revenue execution workspace into an AI-assisted company operating system. It must still earn autonomy through controls, evidence, and trust.

## North Star

Help businesses of many sizes reduce manual operating work by turning goals, constraints, customer context, and company data into high-impact actions that people can review, approve, and delegate.

The platform should eventually coordinate sales, marketing, customer operations, finance visibility, HR workflows, and executive assistance. The launch product remains sales-first because revenue workflow is the sharpest wedge and already has the strongest repo foundation.

## Control Plane Principles

- Human direction sets goals, budgets, risk limits, legal boundaries, and escalation rules.
- AI workers propose, prepare, and execute only inside explicit permissions.
- Sensitive actions require approval, audit events, rollback paths, and clear ownership.
- Channel integrations must respect provider terms, consent, rate limits, and suppression rules.
- Every automation should expose what it did, why it did it, what it cost, and what result it produced.

## Capability Horizons

### Horizon 1: Revenue Workspace

Current product direction:

- business context capture
- lead planning and lead records
- approval-gated outreach
- meetings, calls, dashboard, billing, and workspace/team administration
- provider readiness visibility

Next hardening:

- plan-aware entitlements and AI budget controls
- provider setup UI
- source deduplication, lead quality scoring, and suppression lists
- initial dashboard operational-health metrics for dispatch review gates, provider/webhook issues, approval queues, and API failures from recent sanitized evidence
- initial Settings incident-response readiness plan for production probe variables, optional alert routing, triage evidence, and owner-operated escalation gaps
- initial dashboard managed-support fit advisory for Setup Sprint, Operator Assist, and Managed RevOps based on plan pressure, approvals, conversion work, operational health, and AI-worker posture
- external alerting, SIEM streaming, retention controls, and incident runbooks beyond the dashboard sample

### Horizon 2: AI Command Center

Goal: let an operator control the workspace through natural language without bypassing guardrails.

Candidate features:

- in-app AI command bar for workspace questions and safe actions
- Telegram bot control for status checks, approvals, alerts, and simple commands
- approval inbox across campaigns, calls, lead-source runs, billing-sensitive changes, and provider setup
- daily operator brief: wins, blockers, spend, risky actions, and recommended next moves
- policy engine that explains why an action is allowed, blocked, or requires approval

Required before launch:

- server-side bot token and webhook secret configuration for the current shared bot foundation
- workspace chat binding without storing raw chat IDs
- signed or secret-header webhook verification
- command authorization and allowlists mapped to workspace risk
- replay protection and audit logging
- clear allowlist of supported commands
- emergency disable switch
- per-chat command rate limits, with Postgres-backed claim storage for production installs and memory-only behavior limited to demo/local mode
- future per-workspace bot token storage and rotation if customers need dedicated bots

### Horizon 3: AI Workforce

Goal: give each workspace specialized AI workers with scoped responsibilities instead of one opaque agent.

Candidate workers:

- Sales researcher: proposes lead sources and enrichment priorities
- Outreach strategist: drafts sequences and personalization rules
- Meeting coordinator: prepares scheduling handoff and follow-up tasks
- CRM operator: keeps lead state, notes, and next actions clean
- Marketing operator: drafts SEO, social, and campaign content for review
- Executive assistant: summarizes decisions, tasks, and risks
- Finance watcher: summarizes spend, subscription state, and budget exceptions without making legal or financial decisions
- HR assistant: drafts internal process/checklist work without making employment decisions

Required before launch:

- worker permissions and workspace-scoped memory
- action ledger and cost ledger
- read-only budget-readiness review before task proposals, with plan-level task-proposal quota enforcement now in place
- execution-readiness dry-run harness before live tool runners, with live external execution still disabled
- margin-readiness report before AI-worker scale, with provider-cost budget headroom, worker budget posture, task-proposal metering, AI dry-run budget metering, dry-run cost curves, and missing live external execution billing/cost curves visible before any live economics claim
- approved dry-run result ingestion and budget-ledger updates before automatic result ingestion exists
- approval queues per risk level
- test harness for tool-use regressions, now started with deterministic execution-readiness checks
- offline/manual fallback for every critical workflow

### Horizon 4: Company Operating System

Goal: connect revenue, operations, customer success, finance visibility, HR workflow, and executive planning into one governed system.

Candidate modules:

- CRM and customer success
- marketing and social scheduling
- HR workflow checklists and team onboarding
- finance visibility and budget alerts
- internal knowledge base and SOP automation
- project and task orchestration
- integration marketplace for email, calendar, CRM, telephony, chat, ads, analytics, support, and accounting tools

Non-negotiables:

- legal, finance, employment, and compliance decisions stay human-owned
- every external action must be attributable and reversible where possible
- enterprise customers require SSO, SCIM, retention-controlled audit workflows, data retention controls, and admin policy controls before broad rollout

## Near-Term Implementation Checklist

1. Finish revenue workspace trust:
   - entitlements
   - workspace Sales Blueprint added for ICP, goals, channels, targets, compliance notes, readiness gaps, and automation guardrails
   - provider readiness console and deployment setup plan added for deployment-side secrets, webhook verification, Telegram activation, missing requirements, guardrails, and launch blockers
   - provider setup-review requests added so owner/admin operators can route missing secrets, readiness blockers, rollout goals, and business reasons into the Approval Inbox without browser-entered secret values or provider work
   - provider activation readiness added at `/v1/providers/activation-readiness` and Settings, covering secret inventory, credential-vault readiness, rotation cadence, workspace activation policy, rollback controls, webhook verification, and provider activation state without exposing raw secret values
   - automated provider credential entry, vault writes, rotation execution, and activated per-workspace provider connection flows still pending
   - suppression/unsubscribe controls added for workspace-scoped email and voice dispatch guards
   - dashboard operational-health panel added for dispatch blockers, provider/webhook issues, approval queues, and API failures from recent sanitized evidence
   - Settings incident-response readiness plan added for production probes, alert webhook routing, triage evidence, and owner-operated escalation gaps
   - source-run evidence, dedupe count, quality score, rejection reasons, compliance checks, freshness, and next-action visibility added
   - source acquisition readiness added at `/v1/leads/source-acquisition-readiness` and the dashboard, summarizing lane quality, evidence/compliance posture, provider mode, and explicit source-provider terms, rate-limit, consent, invoice-reconciliation, source-quality, and production source-expansion blockers before scale
   - lead usage entitlement checks added for manual lead creation, source runs, and multi-source discovery, with `usage_events` metering
   - plan-specific outreach and voice dispatch entitlement checks added before provider work is created, with accepted dispatches metered in `usage_events`
   - read-only outreach sequence planning added at `/v1/outreach/sequence-plan` and dashboard Outreach Operations, drafting Sales Blueprint-informed channel order, candidate focus, sample operator copy, channel review, and guarded next actions without creating provider work
   - initial provider-cost budget checks added for configured email and voice dispatch, with `provider_cost_cents` metering and billing visibility
   - provider cost-curve report added at `/v1/providers/cost-curves` and Settings, standardizing configured email/voice/source-run unit-cost estimates, AI-worker dry-run result costs, provider-cost budget posture, review-only social boundaries, and channel quota maturity
   - outbound channel readiness added at `/v1/outreach/channel-readiness` and dashboard Outreach Operations, separating email/call live-dispatch gates, review-only social posture, and SMS roadmap blockers before channel scale
   - initial plan included-channel checks added for campaign creation, campaign run/dispatch, call creation, and voice dispatch, with dedicated outreach and voice quota upgrade recommendations
   - upgrade recommendations added to plan-boundary entitlement blocks for usage, dispatch quota, voice quota, provider-cost budget, and outbound channels
   - proactive plan growth readiness added at `/v1/growth/plan-readiness` and the dashboard action center, combining lead usage, outreach dispatch quota, voice call quota, provider-cost budget, included-channel fit, and Sales Blueprint targets into read-only upgrade guidance before hard blocks
   - dashboard managed-support fit advisory added to route high-touch workspaces into scoped Setup Sprint, Operator Assist, or Managed RevOps conversations without mutating billing or creating provider work
   - AI-worker task-proposal quota added to pricing, entitlement checks, usage metering, and margin readiness so approval-gated worker proposals are plan-bound before live scale
   - AI-worker margin readiness added at `/v1/ai-workers/margin-readiness` and the dashboard control plane, separating subscription status, provider-cost budget, worker budget, task-proposal metering, AI dry-run budget, dry-run cost curves, audit, and admin-control readiness before live scale
   - conversion integration readiness added at `/v1/conversion/integration-readiness` and the dashboard, exposing CRM sync, calendar sync, accounting sync, invoice matching, payment reconciliation, field-mapping, value-capture, and policy blockers before external conversion integrations can scale
   - blueprint-to-real-source integrations, live source-provider activation, provider-specific production lead quality scoring, and deeper invoice/quality workflows still pending beyond current source-acquisition readiness reporting, source-run cost estimates, and runtime source-provider governance gates
   - live external AI execution billing, SMS maturity, live source-provider activation, live CRM/calendar/accounting sync enforcement, social/SMS per-channel quotas, and automatic expansion analytics still pending beyond the current plan-level AI dry-run execution budget and outbound-channel readiness visibility
   - audit compliance readiness added for manual export, retention-limited operator evidence/export, retention-days declaration, SIEM stream presence, immutable archive presence, and legal-discovery ownership without exposing destination values
   - stronger observability beyond dashboard recent-evidence sampling and readiness-monitor setup guidance
   - production-grade rate limiting

2. Add command-center foundation:
   - command capability schema and authorization matrix added in `packages/shared/src/command-center.ts`
   - authenticated capability route added at `/v1/command-center/capabilities`
   - deterministic operator brief added at `/v1/command-center/brief` and dashboard command-center UI, summarizing approvals, provider blockers, pipeline, meetings, Telegram posture, and governed next actions without mutating state
   - deterministic command policy explanations added at `/v1/command-center/policies` and dashboard command-center UI, covering read-only, approval-gated, and blocked command intents before execution
   - deterministic command preview added at `/v1/command-center/preview` and dashboard command-center UI, mapping sample in-app and Telegram commands to safe, approval-gated, or blocked outcomes without mutating state
   - command-to-approval proposal bridge added at `/v1/command-center/proposals` and dashboard command-center UI for eligible source evidence, campaign dispatch readiness, outreach pause, and billing review requests
   - initial Approval Inbox/action proposal model added with shared contracts, `action_proposals`, tenant-scoped API routes, dashboard review UI, reviewer metadata, and audit linkage
   - Telegram integration design generated in Stitch as `projects/12915029485702030876/screens/3c5dec5d2a4548aa98bca099e9aff312`
   - Telegram chat binding, secret-header webhook verification, replay protection, Postgres-backed per-chat command throttling, emergency disable, safe read-only commands including `/brief`, `/sequence`, and `/forecast`, deterministic natural-language aliases for the same allowlisted commands, and command-specific audit events added
   - Telegram command readiness added at `/v1/command-center/telegram-readiness` and Settings, making deployment secrets, chat binding, webhook verification, command allowlist, proposal bridge, mutation boundaries, rate-limit durability, and command audit evidence visible before customer chat control is treated as launch-ready
   - Telegram notification readiness added at `/v1/command-center/telegram-notification-readiness` and Settings, making notification enablement, deployment-side target-chat secret binding, verified activity, policy, quiet hours, escalation owner, delivery rate cap, delivery audit, and allowed notification types visible before outbound chat alerts are treated as production-ready
   - Telegram notification test delivery added at `/v1/command-center/telegram-notifications/test`, letting verified owners/admins send or preview a summary-only operator brief after policy, target-chat, workspace-binding, customer-safe payload review, and delivery-ledger-backed rate-cap checks pass, without approving, dispatching, billing, configuring providers, exposing sensitive payloads, or running AI-worker tools
   - Telegram scheduled notification dispatch added at `/v1/command-center/telegram-notifications/scheduled-dispatch` with deployment-owned scheduler-secret verification, target-chat workspace resolution, quiet-hours skip behavior, payload-review gating before live transport, delivery-ledger rate-cap claims, audit events, and a disabled-by-default GitHub scheduled workflow for production rollout
   - Telegram `/pause` now creates a pending action proposal and does not mutate outreach state until in-app review
   - future Telegram command execution needs production scheduler enablement per environment, external incident routing, broader AI-assisted command parsing beyond deterministic aliases, edge-native throttling for non-Postgres deployments, and deeper approved execution controls

3. Add AI workforce foundation:
   - worker registry added for Sales researcher, Outreach strategist, Meeting coordinator, and CRM operator
   - initial tool permission model added with permissions, allowed tools, blocked tools, and owner roles
   - worker task proposals now bind to the Approval Inbox through `ai_worker_action`
   - initial execution ledger added for proposed, approved, rejected, blocked, and completed worker runs
   - initial cost and budget controls added with expected cost, actual cost, monthly budget, budget used, remaining-budget display, and over-budget task blocking
   - AI-worker margin readiness added for read-only production-economics posture, while live worker tool execution, provider-specific task runners, automatic execution-result ingestion, and plan-level entitlement enforcement still remain pending

4. Add enterprise readiness:
   - SSO and SCIM plan
   - workspace policy management
   - destructive audit retention deletion jobs, SIEM/legal discovery export workflows, and immutable archive writes beyond retention-limited operator evidence, readiness visibility, and the manual hash-chain export
   - data retention controls
   - incident and customer notification runbooks beyond the current Telegram notification-readiness gate

## Public-Claims Boundary

Do not publicly claim the AI operating system, Telegram-controlled outreach mutation, AI workforce, HR, ERP, finance automation, or full autonomous company management as implemented until the corresponding code, tests, controls, and documentation exist.
