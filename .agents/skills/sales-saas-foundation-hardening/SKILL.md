# Sales SaaS Foundation Hardening

Use this skill when changing auth, billing, onboarding, tenancy, shared contracts, provider webhooks, or approval-gated workflow logic in this repository.

## Workflow

1. Inspect both runtime boundaries before editing:
- `apps/web`
- `apps/api`
- `packages/shared`
- `packages/database`

2. Treat these as high-risk invariants:
- organization and workspace creation stays tenant-safe
- billing plan keys and webhook event handling stay compatible
- public pricing copy, shared plan definitions, and checkout behavior stay aligned or are explicitly called out
- shared schemas remain the source of truth for cross-boundary data
- approval-gated actions do not bypass policy or audit logging

3. Verification expectations:
- `npm run typecheck`
- `npm run test`
- `npm run build`
- rerun the narrowest relevant unit or E2E flow when touching billing, auth, or onboarding

4. Review checklist:
- backward compatibility
- provider secret safety
- webhook idempotency
- demo-storage vs Postgres behavior drift
- customer-visible failure states
