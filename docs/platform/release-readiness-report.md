# Release Readiness Report

- Mission: `mission-fe02ff14bef4`
- Node: `node-6f40795e0114`
- Workspace: `sales-saas`
- Branch: `node-57f374c2e811-agile-work-item`
- Base HEAD before this pass: `a0ea033`
- Date: `2026-05-25`
- Risk: `medium` per mission verification contract.
- Runtime behavior changed: `false`
- Deploy workflow behavior changed: `true`

## Scope

This pass first quarantines the inherited dirty worktree state in
`.jarvis/dirty_worktree_quarantine_2026-05-25_node-6f40795e0114.json`, then
keeps the agile ready/done contract, PR evidence manifest, daily observation
manifest, and learning memo promotion manifest aligned to the current mission.

It also preserves and finishes hardening the production metadata gate in
`.github/workflows/deploy-cloudflare.yml`. Production `workflow_dispatch` runs
now require `release_rollback_action` to be structured JSON with concrete
Cloudflare rollback targets for every service selected by the `services` input.
`services=all` expands to `web`, `api`, and `workflows`; single-service
dispatches require only that service target.

Application runtime code, worker bundles, routes, migrations, billing behavior,
auth behavior, tenancy logic, provider webhooks, approval gates, plan keys,
dependencies, and shared API contracts are unchanged.

Inherited local release-readiness edits from prior nodes remain present in the
worktree and were not discarded by this pass:

- `.jarvis/dirty_worktree_quarantine_2026-05-24_node-0972c3bef4bd.json`
- `.jarvis/dirty_worktree_quarantine_2026-05-25_node-6f40795e0114.json`
- `.jarvis/daily_observation.json`
- `.jarvis/learning_memo_promotion.json`
- `.jarvis/pr_evidence_manifest.json`
- `.jarvis/production_grade_profile.json` continuous-improvement wiring
- `.codex/scripts/validate_repo_contracts.py` advisory contract validation
  for those self-improvement surfaces

Those inherited surfaces were revalidated by `npm run repo:contracts -- --strict`
as part of this pass.

Cloudflare's current Workers rollback docs describe rollback to a previously
deployed Worker version through Wrangler or the dashboard, and note that
rollback creates a new active deployment from the selected version. This gate
therefore treats a concrete Worker version UUID or Cloudflare dashboard target
UUID as required release metadata before production verification can start.

Source: https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/

## Rollback Metadata Contract

Production `release_rollback_action` must be a JSON object with:

- `rollback_owner`
- `post_rollback_smoke_command` exactly `npm run smoke:cloudflare`
- `targets.web`, `targets.api`, and/or `targets.workflows` matching the selected
  deployment services, or matching `service_targets` entries for those services

Each service target must include a concrete UUID through one of these paths:

- a `rollback_command` containing `wrangler rollback`, the target UUID, and the
  service Wrangler config path
- a Cloudflare dashboard rollback target containing the target UUID

Placeholder text such as `todo`, `tbd`, `previous_release`,
`last known-good`, `<API_VERSION_ID>`, or generic "dashboard rollback target"
is rejected before the `verify` and `deploy` jobs can run.

## Acceptance Evidence

| Check | Result |
| --- | --- |
| Production dispatch with empty `release_rollback_action` | Failed validation before verify/deploy. |
| Production dispatch with placeholder rollback command using `<API_VERSION_ID>` | Failed validation before verify/deploy. |
| `services=all` with only `web` and `api` targets | Failed validation because `workflows` target was missing. |
| `services=api` with concrete API Worker version UUID and API Wrangler config path | Passed validation. |
| `services=all` with concrete `web`, `api`, and `workflows` Worker version UUIDs and config paths | Passed validation. |

The acceptance checks executed the validator extracted directly from
`.github/workflows/deploy-cloudflare.yml`.

## Verification Evidence

| Check | Command | Result |
| --- | --- | --- |
| Missing metadata acceptance | `TARGET_SERVICES=api RELEASE_ROLLBACK_ACTION='' node < <(awk ... .github/workflows/deploy-cloudflare.yml)` | Passed expected failure. |
| Placeholder metadata acceptance | `TARGET_SERVICES=api RELEASE_ROLLBACK_ACTION='{"rollback_owner":"DevOps","post_rollback_smoke_command":"npm run smoke:cloudflare","targets":{"api":{"rollback_command":"npx wrangler rollback <API_VERSION_ID> --config apps/api/wrangler.jsonc --env production"}}}' node < <(awk ... .github/workflows/deploy-cloudflare.yml)` | Passed expected failure. |
| Missing service target acceptance | `TARGET_SERVICES=all RELEASE_ROLLBACK_ACTION='<web-and-api-targets-only-json>' node < <(awk ... .github/workflows/deploy-cloudflare.yml)` | Passed expected failure. |
| Single-service concrete target acceptance | `TARGET_SERVICES=api RELEASE_ROLLBACK_ACTION='<api-target-json-with-worker-version-id-22222222-2222-4222-8222-222222222222>' node < <(awk ... .github/workflows/deploy-cloudflare.yml)` | Passed. |
| All-service concrete target acceptance | `TARGET_SERVICES=all RELEASE_ROLLBACK_ACTION='<web-api-workflows-target-json-with-worker-version-ids>' node < <(awk ... .github/workflows/deploy-cloudflare.yml)` | Passed. |
| `service_targets` concrete target acceptance | `TARGET_SERVICES=api RELEASE_ROLLBACK_ACTION='<api-service-targets-json-with-worker-version-id-22222222-2222-4222-8222-222222222222>' node < <(awk ... .github/workflows/deploy-cloudflare.yml)` | Passed. |
| Whitespace check | `git diff --check` | Passed. |
| JSON parse gate | `node -e "for (const path of ['.jarvis/production_grade_profile.json','.jarvis/pr_evidence_manifest.json','.jarvis/daily_observation.json','.jarvis/learning_memo_promotion.json','.jarvis/dirty_worktree_quarantine_2026-05-24_node-0972c3bef4bd.json','.jarvis/dirty_worktree_quarantine_2026-05-25_node-6f40795e0114.json','agile_work_item.json','.jarvis/agile_work_item.json']) JSON.parse(require('fs').readFileSync(path,'utf8')); console.log('json parse ok')"` | Passed. |
| Agile mirror check | `cmp -s agile_work_item.json .jarvis/agile_work_item.json` | Passed. |
| Python syntax gate | `python3 -m py_compile .codex/scripts/validate_repo_contracts.py` | Passed for inherited validator changes present in this worktree. |
| Workflow YAML parse | `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-cloudflare.yml')); print('yaml parse ok')"` | Passed. |
| GitHub Actions lint attempt | `npx --yes actionlint@latest .github/workflows/deploy-cloudflare.yml` | Blocked: npm package has no executable in this environment. |
| Repo contract validation | `npm run repo:contracts -- --strict` | Passed: `345 pass, 0 warn, 0 error`. |
| Repo operating-system audit | `npm run repo:audit` | Passed: score `100%`, no priority gaps; `git_dirty=true` because the release-readiness diff is still local. |
| Typecheck | `npm run typecheck` | Passed across API, web, workflows, database, and shared workspaces. |
| Automated tests | `npm run test` | Passed: root `24`, API `63`, web `19`, database `1`, shared `2` tests. |
| Build / release bundle | `npm run build` | Passed, including Next.js production build and workspace builds. |
| Core verification | `npm run verify:core` | Passed; reran typecheck, test, and build. |
| Cloudflare web worker bundle | `npx -y -p node@22 -p npm@11.10.1 -c 'node -v && npm -v && npm run build:cf-worker --workspace @sales/web'` | Passed under Node `v22.22.3` and npm `11.10.1`; OpenNext generated `.open-next/worker.js`. |
| Cloudflare web dry-run | `npx -y -p node@22 -p npm@11.10.1 -c './node_modules/.bin/wrangler deploy --dry-run --env="" --config apps/web/wrangler.jsonc'` | Passed with Wrangler `4.87.0`. |
| Cloudflare API dry-run | `npx -y -p node@22 -p npm@11.10.1 -c './node_modules/.bin/wrangler deploy --dry-run --env="" --config apps/api/wrangler.jsonc'` | Passed with Wrangler `4.87.0`. |
| Cloudflare workflows dry-run | `npx -y -p node@22 -p npm@11.10.1 -c './node_modules/.bin/wrangler deploy --dry-run --env="" --config apps/workflows/wrangler.jsonc'` | Passed with Wrangler `4.87.0`. |
| Smoke environment check | `if [ -r /etc/cynik/apps/sales-saas.env ]; then echo env-file-readable; else echo env-file-not-readable; fi; for name in WEB_APP_URL API_HEALTHCHECK_URL WORKFLOWS_HEALTHCHECK_URL WORKFLOWS_HEALTHCHECK_TOKEN CLOUDFLARE_API_TOKEN; do if [ -n "${!name:-}" ]; then echo "$name=set"; else echo "$name=unset"; fi; done` | Blocked: env file not readable; all listed smoke variables unset. |
| Cloudflare smoke | `npm run smoke:cloudflare` | Blocked: `WEB_APP_URL is required`. |

## Deploy Evidence

- Release bundle creation passed through `npm run build`.
- Cloudflare shadow deploy dry-runs passed for web, API, and workflows after
  building the OpenNext Cloudflare worker bundle under Node 22.
- Shadow smoke was blocked because Cloudflare smoke URLs and credentials are
  unavailable in this session.
- Service restart validation was not applicable for a GitHub Actions validation
  change.
- Rollback target confirmation was hardened at the workflow gate; actual
  last known-good Worker version IDs still require Cloudflare provider access
  during a real production promotion.

## Rollout And Abort Rules

This change should land through branch, PR evidence, checks, review, and release
gate. It should not trigger a production deploy by itself.

Abort or hold release if any of the following are observed:

- Production workflow dispatch accepts empty rollback metadata.
- Production workflow dispatch accepts placeholder rollback metadata.
- Production workflow dispatch accepts `services=all` without `web`, `api`, and
  `workflows` targets.
- Strict repo contract validation, typecheck, tests, build, or `verify:core`
  fail because of this diff.
- Cloudflare smoke remains blocked for a runtime-impacting release and no
  approved substitute is documented.

## Rollback

For this release-gate-only change, rollback is to revert the PR or restore the
previous versions of:

- `.github/workflows/deploy-cloudflare.yml`
- `.codex/scripts/validate_repo_contracts.py`
- `.jarvis/production_grade_profile.json`
- `.jarvis/pr_evidence_manifest.json`
- `.jarvis/daily_observation.json`
- `.jarvis/learning_memo_promotion.json`
- `.jarvis/dirty_worktree_quarantine_2026-05-25_node-6f40795e0114.json`
- `docs/platform/release-readiness-report.md`

No Cloudflare worker rollback is required for this change by itself. If bundled
with runtime service changes, use the approved `release.rollback_action` JSON
targets for each affected service, redeploy the last known-good Cloudflare
worker versions for `web`, `api`, and `workflows` as applicable, then rerun
`npm run smoke:cloudflare`.

Cloudflare rollback does not change connected resources such as KV, D1, R2, or
queues, so schema, binding, or resource changes still need explicit compatibility
review even when Worker code rollback is available.

Post-rollback validation:

- Workflow YAML parse for `.github/workflows/deploy-cloudflare.yml`
- JSON parse for `.jarvis/pr_evidence_manifest.json`
- `npm run repo:contracts -- --strict`
- `npm run verify:core`
- `npm run smoke:cloudflare` when runtime services were deployed or rolled back

## Remaining Risk

- GitHub PR checks for the final pushed commit must be observed before merge.
- Cloudflare smoke did not execute because required environment values are
  unavailable in this session.
- No production deploy, service restart, or runtime rollback target
  confirmation was authorized or needed by this pass.
- Actual last known-good Cloudflare Worker version IDs or dashboard rollback
  targets remain unconfirmed without Cloudflare provider access for runtime
  releases.
- `actionlint` could not be run from npm here; workflow YAML parsing and direct
  extracted-validator execution covered syntax and intended behavior.
- The host default `node` is `v18.19.1`; Cloudflare packaging and dry-run
  verification used `node@22` and `npm@11.10.1`, matching the repo toolchain and
  CI setup-node target.
