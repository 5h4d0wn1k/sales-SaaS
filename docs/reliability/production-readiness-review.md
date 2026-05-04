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
