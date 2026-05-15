# Production Readiness Review

## Change summary

The current launch baseline is a reviewable revenue execution platform with:

- public marketing and pricing
- get-started onboarding
- authenticated workspace access
- billing and subscription visibility
- dashboard visibility
- lead, campaign, meeting, and call foundations
- approval-aware dispatch posture

## Customer impact

### Workflows that must stay trustworthy

- visitor activation
- workspace creation and scope selection
- billing and payment visibility
- dashboard accuracy
- approval-aware outbound operations
- lifecycle recovery such as verify-email and password reset

### Worst credible failure

The user can sign in but cannot trust the workspace, billing, or dispatch state.

## Verification standard

### Required release checks for behavior-sensitive work

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run repo:audit`

### Required targeted checks for auth, billing, or tenancy work

- lifecycle route tests
- billing route tests
- workspace route tests
- dashboard and billing page smoke coverage

### Manual workflow checks before promotion

- get-started flow
- workspace selection
- billing page
- dashboard page
- `/health`

## Operational readiness

### Current posture

- better than prototype
- not yet full mature ops

### Needed to call the product truly production-hardened

- stronger observability
- clearer alerting
- more formal incident handling
- horizontally safe rate limiting and abuse protection

## Security and trust review

- auth and session correctness
- tenant-safe workspace scope
- billing and webhook correctness
- approval path integrity
- public-claim honesty

## Rollout safety

- roll out high-risk changes deliberately
- prefer forward-only schema posture with rollback-aware behavior changes
- never widen public claims ahead of runtime truth

## Open risks

- some org/team admin workflows are still maturing
- advanced entitlements and AI budget enforcement are still ahead
- some channel surfaces remain guarded or mock-backed by design

## Release Readiness Report: 2026-05-14 Mission Node node-ea3f5b42997f

### Scope

- Change type: metadata, process contract, and release-readiness documentation only.
- Runtime behavior changed: no.
- Production dependencies changed: no.
- Migrations changed: no.
- Workflow triggers or deploy behavior changed: no.
- Protected runtime surfaces touched: none.

### Delivery blockers found

- The branch started dirty with unstaged edits in `.codex/scripts/validate_repo_contracts.py`, `.jarvis/production_grade_profile.json`, and `docs/platform/deploy-and-rollback-policy.md`.
- The default host `node` is `v18.19.1`, while the repo contract and CI use Node `22.x`; `npm run test` failed under Node 18 before tests executed with `ERR_REQUIRE_ESM`.
- `/etc/cynik/apps/sales-saas.env` is not readable by this process, and `WEB_APP_URL`, `API_HEALTHCHECK_URL`, and `CLOUDFLARE_API_TOKEN` are not present in the shell.
- Actual last known-good Cloudflare Worker version IDs for `web`, `api`, and `workflows` were not confirmable locally because Cloudflare credentials were unavailable.

### Hardening changes

- The production grade profile now includes a required top-level `agile` section tied to `agile_work_item.json`, `.jarvis/agile_work_item.json`, `.jarvis/pr_evidence_manifest.json`, and `.github/PULL_REQUEST_TEMPLATE.md`.
- The advisory contract validator now requires `production_grade_profile.agile`, validates its ready/done, PR evidence, validation, and rollback metadata paths, and checks `agile.runtime_behavior_changed` remains `false`.
- Release policy metadata now requires PR/release evidence for affected Cloudflare services, rollback targets, rollback owner, schema or data compatibility notes, and `npm run smoke:cloudflare` as the post-rollback smoke command.

### Verification evidence

- `python3 -m py_compile .codex/scripts/validate_repo_contracts.py .codex/scripts/repo_operating_system_audit.py .codex/scripts/repo_operating_system_report.py` passed.
- `node -e "JSON.parse(require('fs').readFileSync('.jarvis/production_grade_profile.json','utf8')); JSON.parse(require('fs').readFileSync('agile_work_item.json','utf8')); JSON.parse(require('fs').readFileSync('.jarvis/agile_work_item.json','utf8')); JSON.parse(require('fs').readFileSync('.jarvis/pr_evidence_manifest.json','utf8')); console.log('json ok')"` passed.
- `npm run repo:contracts -- --format json` passed with 164 pass, 0 warn, 0 error.
- `npm run repo:audit` passed with score 100% and no priority gaps; it still reported `git_dirty: true` because this mission leaves a PR-ready diff.
- `npm run typecheck` passed under the host shell.
- `npx -y -p node@22 -c 'node -v && npm run test'` passed under Node `v22.22.2`: root 24 tests, API 63 tests, web 19 tests, database 1 test, shared 2 tests.
- `npx -y -p node@22 -c 'node -v && npm run build'` passed under Node `v22.22.2`.
- `npx -y -p node@22 -c 'node -v && npm run verify:core'` passed under Node `v22.22.2`.
- `npx -y -p node@22 -c 'node -v && npm run build:cf-worker --workspace @sales/web'` passed and generated an ignored OpenNext Cloudflare worker bundle.
- `npx -y -p node@22 -c 'node -v && ./node_modules/.bin/wrangler deploy --dry-run --env="" --config apps/web/wrangler.jsonc'` passed after restoring ownership of ignored local `.wrangler` artifacts.
- `npx -y -p node@22 -c 'node -v && ./node_modules/.bin/wrangler deploy --dry-run --env="" --config apps/api/wrangler.jsonc'` passed after restoring ownership of ignored local `.wrangler` artifacts.
- `npx -y -p node@22 -c 'node -v && ./node_modules/.bin/wrangler deploy --dry-run --env="" --config apps/workflows/wrangler.jsonc'` passed after restoring ownership of ignored local `.wrangler` artifacts.
- `npm run smoke:cloudflare` was blocked because `WEB_APP_URL` is unset.
- `git diff --check` passed.

### Release recommendation

This diff is PR-ready for review as metadata/process hardening. It is not production-promotion-ready as a service release until Cloudflare smoke can run with readable environment configuration and the rollback owner records actual last known-good Worker version IDs or dashboard rollback targets for every affected service.

### Rollback note

For this metadata-only change, revert the PR or restore the previous versions of `.jarvis/production_grade_profile.json`, `.codex/scripts/validate_repo_contracts.py`, `docs/platform/deploy-and-rollback-policy.md`, and this report section. No Cloudflare service rollback is required for this diff by itself. If this diff ships together with runtime service changes, redeploy the last known-good Cloudflare worker versions for web, api, and workflows, then rerun `npm run smoke:cloudflare`.

## Release Readiness Report: 2026-05-15 Mission Node node-b13eb8783364

### Scope

- Change type: metadata, process contract, architecture contract, and release-readiness documentation only.
- Runtime behavior changed: no.
- Production dependencies changed: no.
- Migrations changed: no.
- Workflow triggers or deploy behavior changed: no.
- Protected runtime surfaces touched: none.

### Delivery blockers found

- The branch started with unstaged edits in `.codex/scripts/validate_repo_contracts.py`, `.jarvis/production_grade_profile.json`, `docs/platform/deploy-and-rollback-policy.md`, and `docs/reliability/production-readiness-review.md`; this node committed the scoped diff and left the worktree clean with the branch ahead of origin by one commit.
- The host shell default is Node `v18.19.1`, while CI and the production profile use Node `22.x`; `npm run test` and host `npm run verify:core` fail before tests execute with Vitest/Vite `ERR_REQUIRE_ESM` under Node 18.
- `/etc/cynik/apps/sales-saas.env` is not readable by this process, and `WEB_APP_URL`, `API_HEALTHCHECK_URL`, and `CLOUDFLARE_API_TOKEN` are unset in the shell.
- Actual last known-good Cloudflare Worker version IDs or dashboard rollback targets for `web`, `api`, and `workflows` were not confirmable locally because Cloudflare credentials and environment configuration were unavailable.

### Hardening changes

- The production grade profile now includes a required top-level `architecture` section with source-backed runtime targets, service boundaries, data architecture, tenancy invariants, provider boundaries, deploy posture, ADR references, portability rules, and known architecture risks.
- The advisory contract validator now requires `production_grade_profile.architecture`, validates its key paths, and checks `architecture.runtime_behavior_changed` remains `false`.
- The current release-readiness report records PR-first git posture, CI-equivalent Node 22 verification, shadow deploy dry-run evidence, smoke blockers, and rollback posture for this metadata-only diff.

### Verification evidence

- `python3 -m py_compile .codex/scripts/validate_repo_contracts.py .codex/scripts/repo_operating_system_audit.py .codex/scripts/repo_operating_system_report.py` passed.
- `node -e "for (const p of ['.jarvis/production_grade_profile.json','agile_work_item.json','.jarvis/agile_work_item.json','.jarvis/pr_evidence_manifest.json']) JSON.parse(require('fs').readFileSync(p,'utf8')); console.log('json ok')"` passed.
- `npm run repo:contracts -- --format json` passed with 189 pass, 0 warn, 0 error.
- `git diff --check` passed.
- `npm run repo:audit` passed with score 100% and no priority gaps before the final commit; it reported `git_dirty: true` while the validated diff was still in progress.
- `git status --short --branch` after commit reported a clean worktree on `node-57f374c2e811-agile-work-item...origin/node-57f374c2e811-agile-work-item [ahead 1]`.
- `npm run typecheck` passed across API, web, workflows, database, and shared workspaces.
- `npm run test` failed under host Node `v18.19.1` before tests executed with Vitest/Vite `ERR_REQUIRE_ESM`.
- `npx -y -p node@22 -c 'node -v && npm run test'` passed under Node `v22.22.2`: root 24 tests, API 63 tests, web 19 tests, database 1 test, shared 2 tests.
- `npm run build` passed under the host shell.
- `npm run verify:core` failed under host Node `v18.19.1` during its `npm run test` substep with Vitest/Vite `ERR_REQUIRE_ESM`.
- `npx -y -p node@22 -c 'node -v && npm run verify:core'` passed under Node `v22.22.2`.
- `npm run smoke:cloudflare` was blocked with `WEB_APP_URL is required`.
- `test -r /etc/cynik/apps/sales-saas.env && echo readable || echo not-readable` returned `not-readable`.
- `WEB_APP_URL`, `API_HEALTHCHECK_URL`, and `CLOUDFLARE_API_TOKEN` were unset in the shell.
- `npx -y -p node@22 -c 'node -v && npm run build:cf-worker --workspace @sales/web'` passed and generated an ignored OpenNext Cloudflare worker bundle.
- `npx -y -p node@22 -c 'node -v && ./node_modules/.bin/wrangler deploy --dry-run --env="" --config apps/web/wrangler.jsonc'` passed.
- `npx -y -p node@22 -c 'node -v && ./node_modules/.bin/wrangler deploy --dry-run --env="" --config apps/api/wrangler.jsonc'` passed.
- `npx -y -p node@22 -c 'node -v && ./node_modules/.bin/wrangler deploy --dry-run --env="" --config apps/workflows/wrangler.jsonc'` passed.

### Release recommendation

This diff is PR-ready for review as metadata/process hardening. It is not production-promotion-ready as a service release until Cloudflare smoke can run with readable environment configuration and a release owner records actual last known-good Worker version IDs or dashboard rollback targets for every affected service.

### Rollback note

For this metadata-only change, revert the PR or restore the previous versions of `.jarvis/production_grade_profile.json`, `.codex/scripts/validate_repo_contracts.py`, `docs/platform/deploy-and-rollback-policy.md`, and this report section. No Cloudflare service rollback is required for this diff by itself. If this diff ships together with runtime service changes, redeploy the last known-good Cloudflare worker versions for web, api, and workflows, then rerun `npm run smoke:cloudflare`.
