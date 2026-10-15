# Service Ownership and Runbook

## Service Identity

- Service or system name:
  - Sales AaaS Platform foundation
- Primary owner:
  - @5h4d0wn1k
- Communication channel:
  - GitHub issues and pull requests in `sales-SaaS`
- On-call rotation:
  - not formalized yet; owner responds directly

## Responsibilities

- Owns:
  - public marketing and pricing surface
  - onboarding and workspace bootstrap
  - auth/session integration
  - dashboard data contract
  - billing and subscription flows
  - provider webhook verification and application
- Does not yet own:
  - mature enterprise ops tooling
  - broad provider ecosystem support
  - full autonomous agent execution at production depth

## Critical Journeys Supported

- visitor to authenticated workspace
- trial to paid conversion
- dashboard load
- lead/campaign approval workflow
- provider webhook reconciliation

## Operational Expectations

- Release-sensitive changes are treated as production changes
- Billing, auth, tenancy, and webhook paths are high-risk
- Low-volume manual release observation is required until alerting matures

## Alerts and Dashboards

- Current state:
  - logs and test coverage exist
  - scheduled readiness monitor exists when production URL variables are configured
  - optional alert webhook exists when readiness webhook secrets are configured
  - production dashboards and paging are still incomplete
- Required future dashboards:
  - dashboard API liveness and readiness
  - auth callback failures
  - billing checkout failures
  - webhook verification failures

## Common Failure Modes

- invalid or missing auth/session context
- Stripe or Razorpay checkout failure
- webhook signature mismatch
- demo-storage and Postgres behavioral drift
- plan keys or shared contracts drifting across packages

## Immediate Response

- First 5 to 15 minute checks:
  - hit web/API `/health` for liveness and `/ready` for traffic readiness
  - check the latest `Production Readiness Monitor` workflow run
  - confirm latest migration state
  - confirm billing provider secrets
  - inspect recent auth, billing, and provider-event logs
  - reproduce with the narrowest affected route or page
- Safe mitigations:
  - pause rollout
  - revert recent app changes
  - disable provider-specific flows operationally
- Dangerous actions:
  - manual DB edits without audit trail
  - replaying unverified webhooks
  - hot-changing plan keys or schema assumptions

## Recovery and Rollback

- Fast rollback:
  - revert or redeploy the last known good application revision
- Data rollback constraints:
  - schema changes and billing reconciliation require explicit care
- Kill switches:
  - operationally disable broken public flows rather than leaving them half-working

## Maintenance

- Dependency and build review: weekly
- Billing and webhook smoke review: before public releases
- Migration review: every schema change
- Product-surface honesty review: before any public marketing or pricing claim changes
