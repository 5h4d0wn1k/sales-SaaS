# Auth Rate Limiting — Credentials Sign-In

## Summary

The security audit identified that the credentials sign-in path (`apps/web/auth.config.ts`, `apps/web/auth.ts`) had no brute-force protection. The API-side rate limiter (`apps/api/src/auth-abuse.ts`) covered register, verify-email, and password-reset, but **not** the credentials sign-in flow, which is served through NextAuth's `/api/auth/callback/credentials` endpoint.

## Changes

### New: `apps/web/middleware.ts`

A Next.js middleware that gates the credentials sign-in path with **two independent rate limiters**:

| Scope | Key | Limit | Window | Lockout |
|-------|-----|-------|--------|---------|
| Per IP | `x-forwarded-for` → `x-real-ip` → `cf-connecting-ip` | 5 attempts | 10 min | 15 min |
| Per email | Lowercased email from request body | 5 attempts | 10 min | 15 min |

**Design decisions:**
- **In-memory `Map`-backed rate limiter** — reuses the same sliding-window + lockout pattern as `apps/api/src/auth-abuse.ts` (no new dependencies). Each Next.js worker instance maintains its own counter; Cloudflare Workers deployment is single-worker by default, so this is sufficient for the current topology.
- **Lockout window** (15 min) is longer than the attempt window (10 min) so that after 5 failed attempts, the attacker is blocked for 15 minutes regardless of when the window resets.
- **Fail-open on body parsing** — if the request body cannot be parsed (non-JSON, malformed), the email-based limiter is skipped; only the IP limiter applies. This avoids breaking legitimate sign-in flows.
- **IP extraction** follows the same header precedence as the API (`apps/api/src/client-ip.ts`): `x-forwarded-for` (first IP), then `x-real-ip`, then `cf-connecting-ip`.
- **Response format** mirrors the API rate-limit responses: `429` status, `Retry-After` header, `X-RateLimit-*` headers, and a JSON body with `error`, `retryAfterSeconds`, and `lockedUntil`.

### Matcher configuration

The middleware runs on:
- `/api/auth/callback/credentials` — the actual NextAuth credentials callback
- `/api/auth/signin/credentials` — the sign-in route
- `/get-started` — the sign-in page (to catch any direct POSTs)

## Files touched

| File | Change |
|------|--------|
| `apps/web/middleware.ts` | **Created** — rate limiting + lockout for credentials sign-in |
| `docs/audits/auth-rate-limiting.md` | **Created** — this document |

## Verification

- `npm run typecheck` (in `apps/web/`) passes with no errors.
- No changes to `apps/web/auth.config.ts` or `apps/web/auth.ts` — the middleware intercepts before NextAuth's authorize function runs, so the credential verification logic is unchanged.

## Notes / Limitations

- **Process-local state**: In-memory counters are lost on worker restart. For multi-instance deployments, an external rate-limit backend (Redis, Cloudflare Durable Object, or KV) should be used. The API readiness check (`apps/api/src/readiness.ts`) already flags this pattern for production scaling.
- **Cloudflare Workers**: The middleware runs at the Cloudflare edge layer, which provides additional WAF rate limiting. This middleware is a defense-in-depth measure for the specific credentials path that the API limiter did not cover.
- **No lockout on successful login**: The rate limiter only counts failed attempts (it runs before the authorize function). A successful login does not increment the counter — only failures do, since the middleware returns `429` before reaching NextAuth.