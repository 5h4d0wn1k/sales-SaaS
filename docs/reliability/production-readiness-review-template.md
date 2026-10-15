# Production Readiness Review

## Change Summary

Current release baseline for public beta:
- marketing and pricing surface
- get-started onboarding
- auth/session bootstrap
- dashboard load
- billing checkout and billing portal
- lead, campaign, and approval-gated workflow foundations

## Customer Impact

- Affected workflows:
  - visitor activation
  - tenant/workspace creation
  - paid conversion
  - dashboard trust
  - billing self-service
- Worst credible failure:
  - users cannot sign in, subscribe, or trust dashboard/billing state

## Verification

- Required checks for release-sensitive work:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run repo:audit`
- Recommended manual QA before public release:
  - landing page and pricing render cleanly
  - get-started flow advances correctly
  - billing page loads and reflects current plan
  - dashboard loads for an authenticated user
  - web `/health` and API `/health` respond successfully for liveness
  - web `/ready` and API `/ready` respond successfully for traffic readiness
- Recommended targeted reruns:
  - billing unit tests for payment changes
  - E2E smoke for get-started, pricing, and dashboard when servers are running

## Operational Readiness

- Dashboards in place: partial, not yet production-grade
- Alerts in place: baseline scheduled readiness monitor and optional failure webhook when production URL/secrets are configured; richer paging still missing
- Runbook linked: yes
- Ownership clear: yes, single-owner model
- On-call aware: not yet formalized

## Rollout Safety

- Feature flags:
  - not yet a mature system for product-surface gating
- Rollout:
  - manual, low-volume, closely observed
- Backward compatibility:
  - required for shared contracts, billing plan keys, and schema changes
- Rollback path:
  - revert application code quickly
  - avoid nonreversible schema changes without an explicit migration plan

## Security and Compliance

- Secrets:
  - `AUTH_SECRET`
  - Google OAuth secrets
  - Stripe/Razorpay keys
  - Twilio/Resend secrets
- Access control:
  - protected API routes must require authenticated user context
- Auditability:
  - billing and sensitive workflow mutations should continue to emit audit events

## Cost and Capacity

- Expected load:
  - low-volume public beta
- Main cost drivers:
  - payment providers
  - email/voice providers
  - database
  - future AI inference and provider traffic
- Capacity risks:
  - no formal background job or queue isolation yet

## Open Risks

- No repo-wide lint gate yet
- Production observability and alerting are not complete
- Scheduled readiness monitoring does not replace pager-backed incident response
- Provider integrations beyond the current baseline are not fully mature
- Demo-storage and Postgres behavior can diverge if not verified regularly
