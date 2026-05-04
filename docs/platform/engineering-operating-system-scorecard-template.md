# Engineering Operating System Scorecard

## Product Clarity

- PRFAQ or product brief exists: Green
- Critical user journeys documented: Green
- Primary business metrics defined: Yellow
  - present in docs, but not yet wired to a live operational dashboard

## Architecture Discipline

- ADRs used for meaningful decisions: Green
- Domain boundaries are clear: Yellow
  - web, API, shared contracts, and database packages are clear; demo-storage vs Postgres split still needs discipline
- Migration strategy exists for high-risk changes: Yellow

## Delivery Quality

- CI exists: Green
- Review rules are clear: Yellow
- Small-batch delivery is encouraged: Green
- Rollback path exists: Yellow

## Reliability

- SLOs or equivalent promises exist: Green
- Dashboards and alerts exist: Red
- Production readiness review exists: Green
- Postmortem process exists: Green

## Ownership

- Named owners exist: Green
- Runbook exists: Green
- On-call or escalation path is clear: Yellow

## Security and Compliance

- Access model documented: Yellow
- Secret handling documented: Yellow
- Auditability expectations defined: Green

## Business Readiness

- Pricing or packaging assumptions documented: Green
- Entitlements or plan boundaries defined: Green
- Unit economics tracked or estimated: Yellow

## Priority Gaps

1. Production observability and alerting for auth, dashboard, billing, and webhook flows
2. Broader route-level integration tests for billing, auth, and tenant boundaries
3. A stricter release path for schema changes and public-beta production rollout
