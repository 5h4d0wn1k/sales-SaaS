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
- production Cloudflare deploys include non-empty `release.rollback_action`
  metadata before the deploy workflow reaches environment-gated verification
- PR evidence and release notes identify affected Cloudflare services, rollback
  targets, rollback owner, schema or data compatibility constraints or
  explicit no-impact note, and post-rollback smoke command before production
  promotion

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

## Production release metadata

Production runs of `.github/workflows/deploy-cloudflare.yml` must include
`release.rollback_action`. The workflow records this value as release evidence
and fails production deploys before verification or deployment when it is empty.
Staging deploys may omit this value.

Release metadata and PR evidence for production-sensitive changes must also
include:

- release or PR identifier
- affected Cloudflare services: `web`, `api`, `workflows`, or explicit `none`
  for metadata-only changes
- last known-good Cloudflare Worker version IDs or dashboard rollback targets
  for every affected service
- rollback owner responsible for approving or executing rollback and confirming
  post-rollback evidence
- schema or data compatibility constraints between the rollback targets, active
  database schema, migrations, queues, and bound Cloudflare resources; for
  metadata-only changes, state that no schema or data compatibility constraint
  applies
- post-rollback smoke command: `npm run smoke:cloudflare`

`release.rollback_action` must name the exact command path that restores the
last known-good Cloudflare Worker version for each affected service and then
reruns the shared smoke check:

```bash
npx wrangler rollback <WEB_VERSION_ID> --config apps/web/wrangler.jsonc --env production --message "rollback <release_id>: web"
npx wrangler rollback <API_VERSION_ID> --config apps/api/wrangler.jsonc --env production --message "rollback <release_id>: api"
npx wrangler rollback <WORKFLOWS_VERSION_ID> --config apps/workflows/wrangler.jsonc --env production --message "rollback <release_id>: workflows"
npm run smoke:cloudflare
```

For single-service releases, include only the affected service rollback command
plus `npm run smoke:cloudflare`. Confirm the target Worker version IDs before
approving the production deploy.

## Abort conditions

- `/health` fails
- auth or workspace scope breaks
- billing checkout creation fails
- dashboard truth is wrong or unavailable
- provider/webhook verification errors spike
- approval-sensitive workflow becomes unsafe

## Rollback strategy

### Fast rollback

- run the approved `release.rollback_action`
- redeploy the last known-good Cloudflare Worker versions for web, API, and
  workflows when a multi-service release regresses
- rerun `npm run smoke:cloudflare` after rollback completes

### Schema rollback posture

- prefer forward-only schemas with behavior rollback
- only roll schema back when an explicit safe rollback exists
- verify that the target Worker versions are compatible with the active schema
  and bound Cloudflare resources before rollback

### Operational mitigation

- disable unsafe public entry points
- pause a channel or provider path
- narrow scope rather than leaving a broken feature half-enabled

## Evidence capture

After each production-sensitive rollout, record:

- what changed
- what was verified
- customer-critical journeys checked
- the `release.rollback_action` value for production Cloudflare deploys
- affected Cloudflare services and confirmed last known-good rollback targets
- rollback owner
- schema or data compatibility constraints, or an explicit no-impact note
- whether rollback was considered or executed
