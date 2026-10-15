# Monetization and Entitlements

## Revenue model

Sales AaaS should monetize as a hybrid model:

- SaaS subscription by workspace
- AaaS managed-service overlay for customers who want strategy, approvals, setup, or execution support

This keeps software revenue durable while giving the company a practical delivery model during early product maturity.

## Billable unit

### Primary unit

- workspace subscription

### Secondary units

- seats
- lead volume or qualified-record volume
- provider-cost budget for configured channel dispatch
- plan-level AI dry-run execution budget
- future live external AI/tool execution budget
- future premium channel access

## Commercial packaging

### SaaS layer

- software access
- workspace, dashboard, billing, lead/campaign visibility
- approval-aware workflow system
- usage visibility
- public pricing plan-fit advisor that maps buyer rollout stage to the shared plan catalog without changing billing, provider work, lead sourcing, or outreach
- dashboard managed-support fit signal that uses plan pressure, approval load, conversion queue, operational health, and AI-worker posture to route high-touch workspaces into scoped service conversations without creating service obligations
- managed-service readiness endpoint and dashboard card at `/v1/growth/managed-service-readiness` that checks scope policy, SOW template, pricing policy, delivery owner, customer handoff, provider-cost boundary, support capacity, subscription state, approval load, conversion workload, and AI-worker pressure before sales treats high-touch support as launch-ready

### AaaS layer

- onboarding and ICP shaping
- sourcing strategy help
- approval and campaign operations
- managed reporting and optimization

The public `/managed-services` route is the current claim-safe revenue surface for this layer.
It must keep software subscription, provider spend, and managed-service scope commercially
separate, and it must not imply managed work can bypass approval gates, provider readiness, or
customer-owned compliance decisions.

The public `/pricing` route now uses catalog-driven plan-fit recommendations for validation,
founder-led launch, active campaign teams, and governed scale. Those recommendations should stay
derived from `PRICING_PLANS`, route buyers into attributed onboarding or managed-review contexts,
preserve recognized rollout-stage fit in `/get-started`, and avoid implying checkout, provider
procurement, sourcing, or outreach starts automatically.

## Entitlements the platform must standardize

### Current practical boundaries

- plan key
- seats
- usage limit
- outreach dispatch quota and `outreach_dispatches` metering for accepted campaign dispatches
- voice call quota and `voice_calls` metering for accepted voice dispatches
- provider-cost budget and `provider_cost_cents` metering for configured email/voice dispatch and configured source-provider evidence runs
- provider cost-curve visibility for configured email/voice dispatch, configured website/search/directory source-run estimates, AI-worker dry-run result categories, review-only LinkedIn, mock source activation posture, and channel quota maturity at `/v1/providers/cost-curves`
- outbound channel readiness for email/call dispatch posture, review-only social posture, and SMS roadmap blockers at `/v1/outreach/channel-readiness`
- included outbound channels by plan
- AI worker task proposal limits by plan, enforced before approval-gated worker proposals are created and metered through `usage_events`
- plan-level AI dry-run execution budget by plan, enforced before approved worker result capture is accepted and metered through `ai_worker_execution_cents`
- upgrade recommendations and in-app dashboard CTAs when source-run, multi-source discovery, campaign-dispatch, call-dispatch, or AI-worker entitlement blocks are caused by plan boundaries
- provider setup-review requests that route missing secrets, blockers, rollout goals, and business reasons into Approval Inbox proposals without storing secret values, changing billing, or running provider work
- read-only AI-worker budget readiness on the dashboard, using worker ledger, reviewer authority, and plan-growth posture before proposing another guarded task
- read-only AI-worker execution readiness, using approved-run state, role/email authority, budget, tool-scope checks, and manual fallback evidence before any future live executor is introduced
- read-only AI-worker margin readiness at `/v1/ai-workers/margin-readiness` and on the dashboard, separating subscription state, provider-cost budget headroom, worker budget posture, enforced task-proposal quota, plan-level AI dry-run budget, dry-run cost curves, and missing live external execution billing before any live scale claim
- approved AI-worker dry-run result capture that records actual internal cost against the worker budget ledger and `ai_worker_execution_cents` entitlement usage without creating live provider work
- billing access

### Required next boundaries

- live external model/tool execution billing beyond the current proposal quota, plan-level dry-run budget, and advisory margin-readiness report
- premium provider access
- automated credential vault writes, rotation execution, and activated per-workspace provider connections beyond activation-readiness reporting and setup-review proposals
- live source-provider activation beyond readiness-visible terms, rate-limit, consent, invoice-reconciliation, and source-quality governance gates; live CRM/calendar/accounting sync entitlements beyond conversion integration readiness; SMS maturity, SMS/social quota policies, and live SMS/social provider adapters beyond current email/call/source-run budget enforcement and channel-readiness visibility
- managed-service billing entitlement, signed service contract, invoice workflow, and delivery-capacity ownership beyond the current fit advisory plus readiness gate
- advanced governance controls

## Packaging direction

### Free / trial

- prove the workspace model
- validate onboarding and visibility
- no expensive autonomous behavior

### Paid self-serve

- recurring workspace subscription
- more seats and lead volume
- approval-aware email/lifecycle workflow

### Paid hybrid / managed

- higher-touch onboarding and optimization
- approval and review support
- premium operational support

### Enterprise later

- governance, approvals, integrations, reporting, and contract-backed support

## AI budget posture

The platform should eventually treat AI as a cost-controlled entitlement, not an unbounded promise.
The current dashboard advisory shows whether the selected worker has enough monthly budget and
approval authority for the next guarded task proposal, and approved dry-run result capture is now
bounded by plan-level `ai_worker_execution_cents` usage. It still does not execute external AI
tools.
The AI-worker margin-readiness report now shows whether subscription status, provider-cost budget,
worker budget, proposal metering, AI dry-run budget, dry-run cost curves, audit coverage, and admin controls are ready for
advisory scale, while still blocking live AI-worker scale claims until external execution billing and live execution cost curves exist.
Approved dry-run result capture records internal actual cost against both a worker ledger and the
plan-level dry-run entitlement; this still does not replace live external execution billing.

Documentation standard:

- AI is allowed to improve workflow quality and speed.
- AI is not allowed to silently destroy margin.
- Paid plans should eventually include explicit AI budget logic or guarded usage caps.

## Required metering posture

The platform should move toward trustworthy usage events for:

- lead generation and import volume
- campaign dispatch volume
- voice dispatch volume
- provider usage and estimated provider spend
- plan-level AI dry-run execution usage
- future live AI generation or enrichment usage
- premium managed-service activity where relevant

## Margin risks

- underpriced high-usage workspaces
- provider-heavy channels without entitlement boundaries
- human service intensity rising faster than subscription value
- live external AI spend expanding before external execution billing exists

## Documentation rules

1. Pricing copy must not promise advanced AI or premium channels unless entitlements can support them.
2. Managed-service promises must be distinguishable from software-only promises.
3. Channel expansion must be tied to cost-to-serve and control maturity, not only customer demand.
4. Managed-service copy must route high-touch buyers to scoped conversations before implying
   recurring service obligations, custom provider work, or guaranteed outcomes.
5. Plan-fit recommendations must stay tied to metered limits, included channels, provider-cost
   budgets, and seats rather than generic upgrade pressure.
