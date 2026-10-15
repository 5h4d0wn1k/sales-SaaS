# Deploy and Rollback Policy

## Scope

This policy covers the first public-beta release discipline for:
- `apps/web`
- `apps/api`
- `packages/shared`
- `packages/database`

## Preconditions

- Clean understanding of what changed and why
- Required checks pass:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run repo:audit`
- For billing, auth, or schema changes:
  - targeted unit tests rerun
  - manual smoke of `/get-started`, `/pricing`, `/billing`, `/dashboard`, web `/health`, web `/ready`, API `/health`, and API `/ready`
- Required eyes:
  - owner reviews diff and rollout notes before production promotion

## Rollout Strategy

- Current mode:
  - manual rollout during a low-traffic window
- Preferred order:
  1. database migration if required
  2. API deploy
  3. web deploy
  4. public smoke checks
- Observe for:
  - auth regressions
  - checkout failures
  - dashboard load failures
  - provider webhook errors

## Abort Conditions

- web `/health`, web `/ready`, API `/health`, or API `/ready` fails
- get-started or auth flow breaks
- billing checkout creation fails
- webhook verification errors spike
- dashboard response contracts break

## Rollback Strategy

- Fast rollback:
  - redeploy the last known good web and API revision
- Schema rollback:
  - only attempt when a migration has an explicitly safe rollback path
  - otherwise restore service by reverting app behavior and leaving schema forward-only
- Manual mitigation:
  - temporarily disable public conversion or billing entry points if the flow is unsafe

## Ownership

- Deploy owner:
  - @5h4d0wn1k
- Monitor owner:
  - @5h4d0wn1k
- Escalation decision maker:
  - @5h4d0wn1k until an operations rotation exists

## Evidence

- Capture after each deploy:
  - commands run
  - critical user journeys checked
  - billing or webhook notes if relevant
  - rollback decision if anything regresses
