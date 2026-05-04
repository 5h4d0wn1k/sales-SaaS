# Deploy and Rollback Policy

## Scope

This policy covers rollout discipline for the launch-critical Sales AaaS surfaces:

- `apps/web`
- `apps/api`
- `packages/shared`
- `packages/database`
- workflow and provider-sensitive runtime behavior

## Preconditions

- clear understanding of what changed and why
- claim-sensitive docs updated when product truth changes
- required validation passes
- rollout notes include customer-visible risk and rollback posture

## Required checks

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run repo:audit`

For auth, billing, tenant, lifecycle, or schema changes:

- rerun targeted tests
- manually smoke `/get-started`, `/dashboard`, `/billing`, and `/health`

## Rollout order

1. apply migration only when compatibility posture is understood
2. deploy API
3. deploy web
4. verify health and critical journeys
5. monitor logs, billing, and provider events

## Abort conditions

- `/health` fails
- auth or workspace scope breaks
- billing checkout creation fails
- dashboard truth is wrong or unavailable
- provider/webhook verification errors spike
- approval-sensitive workflow becomes unsafe

## Rollback strategy

### Fast rollback

- redeploy the last known good web and API revision

### Schema rollback posture

- prefer forward-only schemas with behavior rollback
- only roll schema back when an explicit safe rollback exists

### Operational mitigation

- disable unsafe public entry points
- pause a channel or provider path
- narrow scope rather than leaving a broken feature half-enabled

## Evidence capture

After each production-sensitive rollout, record:

- what changed
- what was verified
- customer-critical journeys checked
- whether rollback was considered or executed
