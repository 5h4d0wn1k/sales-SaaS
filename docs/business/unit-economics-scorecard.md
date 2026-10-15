# Unit Economics Scorecard

## Business context

- Product posture:
  - hybrid SaaS + AaaS revenue execution platform
- Launch customer:
  - founder-led service businesses
  - agencies
- Commercial posture:
  - free-tier-first infrastructure
  - paid recurring workspace subscriptions
  - managed-service attach where workflow maturity or customer need requires it

## Revenue structure

### Recurring revenue

- workspace subscriptions
- plan-based seat and usage boundaries
- plan-based outreach dispatch and voice call quotas
- included-channel boundaries by plan
- entitlement blocks that recommend the next viable paid plan
- public plan-fit advisor recommendations that route high-intent pricing visitors into attributed onboarding or managed-review flows
- dashboard managed-support fit recommendations that route plan pressure, approval load, conversion work, operational blockers, and AI-worker review pressure into scoped managed-service conversations

### Expansion revenue

- managed-service retainers
- premium support
- future premium provider access
- future AI budget or advanced workflow tiers

## Cost to serve

### Core platform cost

- application hosting
- database and storage
- payment processing

### Workflow cost

- email / provider usage
- telephony where enabled
- future AI inference or enrichment

### Human service cost

- onboarding and strategy support
- approval handling
- operator review and exception handling
- support and incident response

## Margin risks by channel

### Email / lifecycle

- comparatively lower direct provider cost
- still sensitive to support burden and deliverability issues

### Voice

- higher operational and trust burden
- higher risk of expensive failures or support load

### SMS

- registration, consent, and provider compliance overhead
- not a good default expansion path without strong economics

### Content / SEO

- beta opportunity planning can support lower-cost inbound demand when it stays tied to the Sales Blueprint, review blockers, source evidence, and claim guardrails
- publishing, distribution automation, and scaled content operations should remain gated until support burden, quality review time, and conversion value are measured

## Leading metrics

- activation rate from signup to configured workspace
- first-value time from onboarding to lead/campaign review
- trial-to-paid conversion
- paid workspace retention
- managed-service attach rate
- managed-support fit rate by package recommendation
- gross margin by plan
- provider cost per paid workspace, tracked through `provider_cost_cents`
- support tickets per 100 active workspaces
- hours of human service per managed account

## Upgrade triggers

### Infrastructure

- request volume starts stressing free-tier envelopes
- DB query volume or storage growth becomes material

### Commercial

- provider cost per active workspace erodes plan margin
- AI-assisted workflow cost becomes significant without budget controls

### Service intensity

- onboarding and approval load per customer becomes too manual for subscription pricing

### Compliance

- channel expansion requires per-market operational review before monetization claims are widened

## Improvement priorities

1. Meter expensive workflow surfaces before expanding them.
2. Keep channel promises behind actual cost controls.
3. Distinguish software revenue from managed-service revenue cleanly.
4. Use roadmap and pricing together so margin risk does not hide behind aspirational copy.
