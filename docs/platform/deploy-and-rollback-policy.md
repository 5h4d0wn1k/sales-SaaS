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
- release metadata available through web/API `/health` and `/ready` for revision confirmation
- required validation passes
- rollout notes include customer-visible risk and rollback posture

## Required checks

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run repo:audit`

For auth, billing, tenant, lifecycle, or schema changes:

- rerun targeted tests
- manually smoke `/get-started`, `/dashboard`, `/billing`, web `/health`, web `/ready`, API `/health`, and API `/ready`

For public activation, SEO/navigation, pricing, contact intake, or get-started changes:

- `npm run test:e2e`
- post-deploy `npm run smoke:cloudflare` must verify web/API readiness plus public `sitemap.xml`, `robots.txt`, social preview image content types, and responsible-disclosure metadata

## Rollout order

1. apply migration only when compatibility posture is understood
2. deploy API
3. deploy web
4. verify health, readiness, public SEO/trust assets, and critical journeys
5. monitor logs, billing, and provider events
6. record the live release version and any commit/deployment IDs reported by `/ready`

## Abort conditions

- web `/health`, web `/ready`, API `/health`, or API `/ready` fails
- production smoke checks cannot fetch sitemap, robots, social preview images, or responsible-disclosure metadata
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
