# Year-One Engineering Roadmap

## Year-one goal

Turn the repo from a promising foundation into a trustworthy, operable, revenue-generating hybrid SaaS + AaaS platform for service businesses and agencies.

## Phase 1: Foundation and trust

- harden tenant, auth, billing, and workspace correctness
- complete documentation truth alignment across product, roadmap, and marketing
- keep approval-gated automation as the default posture
- validate guided onboarding -> workspace -> billing -> dashboard flow
- establish release discipline, ownership, and rollback docs

## Phase 2: Account lifecycle and managed operations

- finish account-lifecycle maturity
- add team invites and better role administration
- strengthen workspace-aware billing and settings operations
- formalize the service-led operating model in tooling and docs
- improve activation and operator workflows for agencies and founder-led teams

## Phase 3: Email/lifecycle maturity and entitlements

- deepen email/lifecycle execution quality
- add trustworthy entitlements and usage visibility
- add plan-aware enforcement for seats, volume, and premium workflow access
- introduce the first practical AI budget controls

## Phase 4: Controlled channel expansion

- expand only the channels that can be supported with guardrails and economics
- use outbound channel readiness to keep email/call live gates, SMS roadmap blockers, and LinkedIn-like review-only posture visible until policy, provider, quota, and cost posture are strong enough
- graduate the beta content / SEO opportunity engine only after review quality, conversion value, and publishing governance are measured

## Phase 5: Enterprise governance and deeper automation

- add richer approvals, auditability, settings, and reporting
- improve provider management and integrations
- expand automation only where trust, entitlement, and compliance posture are proven
- harden the AI command center, beta Telegram read-only control surface, and AI workforce permission model as governed layers rather than ad hoc automations

## Beyond year one: AI operating system expansion

- introduce permissioned AI workers for revenue operations, customer operations, marketing support, executive assistance, HR workflow support, and finance visibility
- add a command center that can summarize workspace state, recommend high-impact actions, and route approvals
- expand Telegram and other chat surfaces beyond read-only commands only after command authorization, replay protection, audit logging, and emergency disable controls are mature
- expand toward CRM, HRM, ERP, social, support, ads, analytics, calendar, and accounting integrations through a governed integration marketplace
- keep legal, finance, employment, and compliance decisions human-owned and auditable

## Explicit upgrade triggers

### Request volume

- When public or customer traffic approaches free-tier limits often enough to threaten reliability, move from free-tier-first posture to paid infrastructure for the affected surface.

### DB usage and storage

- When query volume, storage growth, or migration complexity starts constraining tenant-safe behavior, prioritize database upgrades and operational tooling.

### AI budget exhaustion

- When AI-assisted workflow becomes a meaningful cost center, require budget caps and entitlement enforcement before scaling those features.

### Service intensity

- When manual onboarding, review, or approval work per customer stops scaling, productize that workflow or raise pricing.

### Channel-compliance expansion

- When a new channel or geography needs bespoke consent, sender, or audit logic, gate rollout until that matrix exists.

## Re-architecture triggers

- auth, billing, or dashboard latency becomes a persistent customer problem
- provider event complexity requires stronger job isolation
- tenant or audit boundaries need stricter service separation
- enterprise governance demand materially changes data or control architecture
