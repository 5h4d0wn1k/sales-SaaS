# SLO / SLI Definition

## Scope

These SLOs protect the launch-critical user journeys for the current Sales AaaS posture.

## Journey SLOs

### Signup, onboarding, and workspace activation

- User promise:
  - a qualified visitor can reach a usable workspace without broken redirects or ambiguous scope
- Indicators:
  - get-started availability
  - auth callback success
  - workspace-selection success
- Objective:
  - 99.5% success over 30 days

### Dashboard trust

- User promise:
  - an authenticated user can load dashboard data for the correct workspace and understand the next action
- Indicators:
  - `GET /v1/dashboard` success
  - workspace-scoped data correctness
  - p95 dashboard API latency under 500ms
- Objective:
  - 99.9% success over 30 days

### Billing and subscription correctness

- User promise:
  - plan selection, payment state, and cancellation posture are accurate and visible
- Indicators:
  - checkout creation success
  - webhook verification success
  - billing page load success
- Objective:
  - 99.9% availability
  - 99.95% verified-event correctness over 30 days

### Approval-aware outbound control

- User promise:
  - risky actions do not dispatch without the intended approval and audit path
- Indicators:
  - policy-evaluation success
  - zero unauthorized dispatches
  - audit-event success for sensitive actions
- Objective:
  - 99.5% policy evaluation success
  - 100% block rate for approval-required actions until approval

### Lifecycle recovery

- User promise:
  - the user can verify email or reset password without support in normal cases
- Indicators:
  - verification request success
  - password-reset request success
  - confirm-flow success
- Objective:
  - 99.5% success over 30 days

## Error budget policy

- Healthy:
  - normal feature work continues
- Elevated burn:
  - pause nonessential channel expansion
  - prioritize auth, billing, tenant, and dashboard stabilization
- Exhausted:
  - ship only fixes, rollback-safe changes, or reliability work for the affected journey

## Instrumentation expectations

- route health and latency
- auth and lifecycle errors
- billing checkout and webhook results
- approval denials and dispatch results
- workspace-selection failures

## Assumptions

- current launch scope is approval-aware, not fully autonomous
- provider configuration is explicit
- demo-mode behavior is never confused with production truth
