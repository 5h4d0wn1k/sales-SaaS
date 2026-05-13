## Summary
- What changed?
- Why?
- Changed files:
- Runtime behavior changed? yes/no

## User and Business Impact
- Which user journey or workflow is affected?
- What metric or outcome should improve?
- Product claims changed? yes/no

## Scope and Contract Impact
- Affected surfaces:
- Shared contract / public API impact:
- Auth, billing, tenancy, audit, webhook, approval, or schema impact:
- Demo-storage behavior, Postgres-backed behavior, or both:
- New production dependency, plan key, migration, or safety-control change:

## Release Metadata
- release.path:
- release.rollback_action:
- Cloudflare services affected: web / api / workflows / none
- Last known-good Cloudflare Worker version IDs or dashboard rollback targets:
  - web:
  - api:
  - workflows:
- Rollback owner:
- Schema or data compatibility constraints:
- Post-rollback smoke command: `npm run smoke:cloudflare`
- Feature flag or staged rollout:
- Backward compatibility notes:

## Verification Evidence
- Contract validation:
- Tests:
- Lint / typecheck / build:
- Manual QA:
- Blocked or skipped checks and why:

## Risk
- Backward compatibility concerns:
- Migration or rollout risk:
- Security or privacy concerns:
- Residual risk:

## Deploy Evidence
- Staging deploy:
- Production deploy:
- Smoke checks:
- Monitoring or health evidence:

## Follow-up
- Docs to update:
- Flags to remove:
- Known deferred work:

## Ready / Done Confirmation
- [ ] Definition of Ready was met before implementation, or gaps are documented above.
- [ ] Definition of Done is met, or blockers and next safe steps are documented above.
- [ ] Runtime behavior, dependencies, migrations, workflows, and deploy behavior are unchanged or explicitly described above.
- [ ] Rollback action is concrete for the release path, or this is metadata-only and can be reverted by closing/reverting the PR.
- [ ] Remaining risk and unverified areas are named for reviewers.
