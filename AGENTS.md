# Sales AaaS Repo Expectations

This repository is the foundation for a public-facing multi-tenant sales SaaS and AI-assisted sales operations platform. Treat it like production software even when a workflow is still in beta.

## Repo Map

- `apps/web`
  Next.js product surface for marketing, get-started onboarding, billing, dashboard, legal pages, and authenticated user flows.
- `apps/api`
  Hono API for onboarding, leads, campaigns, billing, provider webhooks, and dashboard data.
- `packages/database`
  Drizzle schema, migrations, and database client. Changes here affect tenancy, billing, auditability, and compatibility.
- `packages/shared`
  Shared contracts, pricing definitions, policy logic, and platform module definitions. Web and API must stay aligned with these schemas.
- `tests`
  Cross-repo unit and E2E coverage. Use these before broadening into manual smoke checks.
- `.codex`
  Repo-local Codex hooks, rules, and audit scripts. Keep these aligned with actual workflows.

## Current Product Scope

- Public beta focus:
  - landing and pricing
  - get-started onboarding
  - auth and session establishment
  - dashboard visibility
  - billing checkout and billing portal
  - lead, campaign, and approval-gated automation foundations
- Not yet fully mature:
  - provider integrations beyond mock/configured adapters
  - fully autonomous agent execution
  - production-grade observability and on-call operations
  - team invites, password reset, and email verification completeness

## Runbook

- Install: `npm install`
- Start local Postgres: `npm run db:up`
- Apply schema: `npm run db:migrate`
- Run web: `npm run dev:web`
- Run API: `npm run dev:api`
- Tests: `npm run test`
- Unit tests only: `npm run test:unit`
- E2E tests: `npm run test:e2e`
- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Repo audit: `npm run repo:audit`
- Repo report: `npm run repo:report`
- Core verification: `npm run verify:core`

## Engineering Rules

- Preserve shared contract integrity between `packages/shared`, `apps/api`, and `apps/web`.
- Treat auth, billing, tenancy, audit events, and provider webhooks as high-risk surfaces.
- Keep the public pricing page, `packages/shared` plan catalog, get-started plan selection, and API billing routes aligned. If they intentionally differ, document the reason in the change summary.
- Prefer small diffs over sweeping “cleanup” passes.
- Ask before:
  - adding production dependencies
  - changing public API or contract shapes
  - changing plan keys, billing behavior, or migration semantics
  - weakening auth, audit, rate-limit, or approval logic
- Be explicit about whether a change targets demo-storage behavior, Postgres-backed behavior, or both.
- Avoid letting placeholder provider keys or dummy payment defaults leak into production behavior.
- If a product claim is not implemented, hide it, gate it, or downgrade the copy. Do not leave “AI slop” claims on public pages.

## Definition of Done

- Behavior-changing work updates or adds the most relevant tests.
- The narrowest meaningful checks were run first, then broader checks when risk required it.
- Cross-boundary changes run at least:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- Billing, auth, tenancy, or schema changes also call out:
  - backward compatibility
  - migration risk
  - provider/webhook failure modes
  - rollback path
- Final summaries must state:
  - what changed
  - what was verified
  - what remains risky or unverified

## Review Focus

- Tenant isolation and organization/workspace correctness
- Billing correctness and webhook idempotency
- Audit-event coverage for sensitive mutations
- Approval gates before autonomous outreach or calling
- Security-sensitive inputs, secrets, and provider callbacks
- Public-page honesty, usability, and failure states
- Cost-to-serve, plan entitlements, and monetization hooks
