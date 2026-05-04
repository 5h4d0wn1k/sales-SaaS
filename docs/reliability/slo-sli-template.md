# SLO / SLI Definition

## Scope

These SLOs protect the first public SaaS/AaaS workflows that must not embarrass the product in front of paying users.

## Journey SLOs

### Get-started and auth bootstrap
- User promise:
  - a qualified visitor can start onboarding and reach an authenticated workspace without broken redirects
- Indicators:
  - availability of `/get-started` and auth callback completion
  - p95 page latency under 2.5s, excluding third-party OAuth redirect time
- Objective:
  - 99.5% success over 30 days

### Dashboard load
- User promise:
  - an authenticated user can load `/dashboard` and see accurate workspace, plan, onboarding, and action-item state
- Indicators:
  - `GET /v1/dashboard` availability
  - p95 API latency under 500ms
  - shared-schema parse success rate
- Objective:
  - 99.9% success over 30 days

### Billing checkout and reconciliation
- User promise:
  - selecting a plan results in correct subscription state after verified provider events
- Indicators:
  - checkout session creation success
  - webhook verification success
  - verified event application within 5 minutes
- Objective:
  - 99.9% checkout availability
  - 99.95% verified-event correctness over 30 days

### Approval-gated outbound execution
- User promise:
  - risky or first outbound actions require the intended approval path before execution
- Indicators:
  - policy evaluation success
  - zero unauthorized dispatches
  - audit-event write success for sensitive actions
- Objective:
  - 99.5% policy-evaluation success
  - 100% of approval-required actions blocked until approval

## Error Budget Policy

- Healthy budget:
  - normal feature work can continue
- Burn rate elevated:
  - pause nonessential product surface expansion
  - prioritize auth, billing, dashboard, and webhook stabilization
- Budget exhausted:
  - only bug fixes, reliability work, or rollback-safe changes ship until the affected journey recovers

## Instrumentation Expectations

- Minimum dashboards:
  - API health and route latency
  - auth callback failures
  - billing checkout initiation and webhook verification
  - dashboard load failures
- Minimum logs:
  - subscription changes
  - provider event verification results
  - approval denials
  - audit-event write failures

## Dependencies and Assumptions

- Postgres is available and migrations are current
- Stripe and Razorpay are reachable and correctly configured
- Auth secrets and provider keys are present and valid
- Demo-storage mode is never mistaken for production state
