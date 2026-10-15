# Service Ownership and Runbook

## Service identity

- System:
  - Sales AaaS platform
- Primary owner:
  - @5h4d0wn1k
- Ownership model:
  - founder-operated until a wider team exists

## Scope of ownership

- public marketing and pricing surface
- onboarding and workspace bootstrap
- auth and lifecycle flows
- dashboard data contract
- billing and subscriptions
- provider dispatch posture and webhook handling
- documentation truth alignment

## Critical journeys supported

- visitor -> workspace activation
- workspace selection and dashboard load
- trial / paid billing flow
- approval-aware outbound dispatch
- lifecycle recovery

## High-risk surfaces

- auth and session handling
- tenant and workspace correctness
- billing and webhook reconciliation
- provider callbacks
- public claims about automation, channels, or compliance

## Common failure modes

- invalid auth or scope state
- checkout or subscription drift
- webhook verification mismatch
- provider configuration mismatch
- docs and public copy outrunning actual product truth

## First response checklist

1. check web/API `/health` for liveness and `/ready` for traffic readiness
2. check the latest `Production Readiness Monitor` workflow run
3. confirm latest deploy and migration context
4. inspect auth, billing, and provider logs
5. reproduce with the narrowest route or page
6. decide whether to pause rollout, rollback, or narrow scope

## Safe mitigations

- pause or revert a rollout
- disable unsafe channel entry points
- reduce a flow to approval-only mode
- remove or downgrade claims faster than widening them

## Dangerous actions

- manual DB edits without audit trail
- replaying unverified provider callbacks
- widening public claims during an incident
- enabling a risky channel because demand is loud

## Maintenance cadence

- dependency and build review: weekly
- billing and lifecycle smoke review: before sensitive releases
- production readiness monitor and alert-webhook review: daily while owner-operated
- truth-matrix review: before marketing or pricing changes
- roadmap and entitlement review: monthly while the product is still shaping
