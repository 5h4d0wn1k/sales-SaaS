# Application Security Audit — Sales AaaS ("salesxgrowth") Monorepo

- **Repository:** `/workspace/projects/company projects/shadownik/ventures/SMMA/sales-SaaS`
- **Audit type:** Read-only, source-level application security review
- **Date:** 2026-10-16
- **Scope:** `apps/web` (Next.js + NextAuth on Cloudflare Workers), `apps/api` (Hono on Cloudflare Workers, Postgres via Hyperdrive/Supabase), `apps/workflows` (Cloudflare Workflows), `apps/admin` (placeholder), `packages/*`, CI workflows, Wrangler config, and secret handling.
- **Constraints observed:** No source, workflow, infra, or config files were modified. The only file created is this report.
- **Method:** Manual review of authentication/authorization code paths, webhook verification, secret handling, input validation, rate limiting, security headers, SQL construction, outbound requests, PII handling, and configuration. Every finding cites exact `file:line` evidence.

---

## 1. Executive Summary

The platform is a multi-tenant B2B sales-automation SaaS. Overall security engineering maturity is **above average for a v0/v1 product**: tenant isolation is enforced at the data-access layer, webhook signatures are verified with the providers' official libraries, secrets are not committed, input validation uses `zod` widely, SQL is parameterized via Drizzle, and production storage fails closed.

However, the audit identified **two high-severity issues in the `apps/workflows` worker** — a caller-controlled outbound URL that is fetched with a secret bearer token attached (SSRF + credential exfiltration), and an authentication check that **fails open** when its token is not configured. Several **medium** issues affect defense-in-depth: no brute-force protection on the credentials login path, process-local rate limiting that is declared "edge-enforced" purely by an environment variable, missing role gates on provider-spend endpoints, permissive CSP, and an under-specified `secrets.required` list in the production API Wrangler config. A cluster of low-severity hardening items (legacy JWT algorithm fallback, token leakage into API responses/redirects in non-production, weak session-lifetime defaults, type-checking disabled on auth files) rounds out the report.

No SQL injection, no cross-tenant IDOR, and no committed secrets were found.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 2 |
| Medium   | 6 |
| Low      | 11 |
| Info     | 3 |

**Top risks to address first:** `HIGH-01`, `HIGH-02`, `MED-01`, `MED-02`, `MED-03`.

---

## 2. Findings Summary Table

| ID | Title | Severity | Area | Primary evidence |
|----|-------|----------|------|------------------|
| HIGH-01 | Caller-supplied `dispatchWebhookUrl` fetched with bearer secret (SSRF + token exfiltration) | High | SSRF / Secrets | `apps/workflows/src/index.ts:20,139-165,249-256` |
| HIGH-02 | Workflows worker auth fails **open** when `WORKFLOWS_API_TOKEN` is unset | High | Auth | `apps/workflows/src/index.ts:96-104` |
| MED-01 | No brute-force / rate limiting on credentials sign-in | Medium | Auth / Abuse | `apps/web/auth.config.ts:25-52`; no `apps/web/middleware.ts` |
| MED-02 | All rate limiters are process-local; production "edge" enforcement is asserted by env var only | Medium | Abuse controls | `apps/api/src/middleware/security.ts:10-12`; `auth-abuse.ts:34`; `contact-intake-abuse.ts:25`; `telegram.ts:25`; `readiness.ts:187-220`; `apps/api/wrangler.jsonc` |
| MED-03 | Provider-spend endpoints lack role checks (member can spend budget) | Medium | Authorization | `apps/api/src/app.ts:3458-3495,3497-3559` |
| MED-04 | Weak CSP: `'unsafe-inline'` (web) and `'unsafe-inline' 'unsafe-eval'` (API) script-src | Medium | Headers / CSP | `apps/api/src/middleware/security.ts:171-178`; `apps/web/next.config.ts:11-16,43` |
| MED-05 | API production Wrangler `secrets.required` is empty (no declared required secrets) | Medium | Secret handling | `apps/api/wrangler.jsonc` (`env.staging/production.secrets.required: []`) |
| MED-06 | CSRF helper treats requests with no `Origin` **and** no `Referer` as trusted | Medium | CSRF | `apps/web/lib/same-origin.ts:59-80` (return `true` at line 79) |
| LOW-01 | Legacy raw-secret HS256 JWT acceptance fallback | Low | Auth | `apps/api/src/auth-session-token.ts:84-96` |
| LOW-02 | Password-reset / verify-email raw token returned in response `delivery.previewUrl` (non-production) | Low | Auth / Secrets | `apps/api/src/auth-lifecycle.ts:76-85`; `apps/api/src/routes/auth.ts:196-203,282-288` |
| LOW-03 | Reset token reflected into redirect query strings and logs on error | Low | Auth | `apps/web/app/api/auth/password-reset/confirm/route.ts:41,53` |
| LOW-04 | No explicit session `maxAge`/cookie flags; `trustHost` enabled in production | Low | Auth | `apps/web/auth.config.ts:14,54`; `apps/web/wrangler.jsonc` |
| LOW-05 | `// @ts-nocheck` on auth files; beta `next-auth@5.0.0-beta.30` in production | Low | Auth / Supply chain | `apps/web/auth.ts:1`; `apps/web/auth.config.ts:1`; `apps/web/package.json` |
| LOW-06 | Public-path check uses `startsWith` prefix matching | Low | Auth | `apps/api/src/middleware/auth.ts:85` |
| LOW-07 | Outbound email HTML built by string interpolation of preview content | Low | Injection | `apps/api/src/providers.ts:202` |
| LOW-08 | Account/email verification-status enumeration in verify-email request | Low | Enumeration | `apps/api/src/routes/auth.ts:176-184` |
| LOW-09 | Stripe webhook returns signature error message to caller | Low | Info disclosure | `apps/api/src/routes/billing.ts:438` |
| LOW-10 | Local `.env` files are world-readable and hold a real-looking Google OAuth secret + weak dev `AUTH_SECRET` | Low | Secret handling | `.env`, `apps/web/.env.local`, `apps/api/.env` (mode `755`) |
| LOW-11 | Audit export available to any authenticated role | Low | Authorization | `apps/api/src/app.ts:2068-2097` |
| INFO-01 | `apps/admin` is an empty, unreferenced placeholder | Info | Placeholder surface | `apps/admin/` (0 files) |
| INFO-02 | No explicit webhook event-idempotency store for Stripe/Razorpay | Info | Webhooks | `apps/api/src/routes/billing.ts:415-798` |
| INFO-03 | Tenant isolation relies solely on app-layer scoping (no Postgres RLS) | Info | Data | `packages/database/src/client.ts`; `supabase/` (no RLS migrations) |

---

## 3. Required-Area Coverage Matrix

| # | Required area | Coverage in this report |
|---|---------------|-------------------------|
| 1 | Auth (NextAuth config, session secret, cookie flags, session lifetime, CSRF, email verification, password reset) | MED-01, MED-06, LOW-01, LOW-02, LOW-03, LOW-04, LOW-05, §4.1 |
| 2 | Authorization / tenancy IDOR | §4.2 (no IDOR found — positive), MED-03 |
| 3 | Role checks on sensitive endpoints | MED-03, §4.2 |
| 4 | Webhook signature verification + idempotency | §4.3 (verified), LOW-09, INFO-02 |
| 5 | Secret handling | MED-05, LOW-02, LOW-10, §4.4 |
| 6 | Input validation (zod) coverage | §4.5 (strong; residual note) |
| 7 | Rate limiting / abuse controls | MED-01, MED-02 |
| 8 | Security headers / CSP | MED-04, §4.6 |
| 9 | SQL safety / raw SQL | §4.7 (no injection found — positive) |
| 10 | SSRF / unsafe outbound fetches | HIGH-01, §4.8 |
| 11 | PII / logging | LOW-02, LOW-03, LOW-07, §4.9 |
| 12 | Empty `apps/admin` placeholder risks | INFO-01 |

---

## 4. Detailed Findings

### HIGH-01 — Caller-supplied `dispatchWebhookUrl` fetched with bearer secret (SSRF + credential exfiltration)

- **Severity:** High
- **Area:** SSRF / Secret handling
- **Evidence:**
  - `apps/workflows/src/index.ts:20` — request DTO includes a caller-provided `dispatchWebhookUrl?: string`.
  - `apps/workflows/src/index.ts:249-256` — `POST /workflows/campaign-dispatch` reads the JSON body and stores it as workflow params (`normalizeParams(body)`).
  - `apps/workflows/src/index.ts:139-142` — the fetched URL is `request.dispatchWebhookUrl ?? env.CAMPAIGN_DISPATCH_WEBHOOK_URL_TEMPLATE`; the only check is `isConfigured(url)` (non-empty), with no scheme/host allowlisting.
  - `apps/workflows/src/index.ts:148-165` — the worker `fetch()`es that URL and attaches `authorization: Bearer ${env.CAMPAIGN_DISPATCH_BEARER_TOKEN}`.
  - `apps/workflows/src/index.ts:167-176` — up to 1000 bytes of the fetched response body are returned to the caller (`bodyPreview`), giving SSRF read-back.
- **Why it matters:** A caller who can reach `POST /workflows/campaign-dispatch` (which requires the shared `WORKFLOWS_API_TOKEN`, but see HIGH-02 for the fail-open path) can make the worker issue outbound requests to arbitrary internal or external URLs **while attaching the platform's dispatch bearer token**. This yields (a) SSRF to internal services / metadata endpoints, (b) exfiltration of `CAMPAIGN_DISPATCH_BEARER_TOKEN` to an attacker-controlled host, and (c) response-body read-back. If the API is later wired to this worker, a lower-privileged platform user could inherit the primitive.
- **Remediation:**
  1. Do **not** accept a webhook URL from the request body. Resolve the dispatch destination exclusively from server-side configuration (`CAMPAIGN_DISPATCH_WEBHOOK_URL_TEMPLATE`).
  2. If per-request URLs are unavoidable, validate against an allowlist of schemes (`https`) and hosts, reject private/link-local/loopback ranges and cloud metadata endpoints (169.254.169.254, `*.internal`, RFC1918, `100.64/10`, `::1`).
  3. Never attach `CAMPAIGN_DISPATCH_BEARER_TOKEN` to a destination that is not a pre-approved platform host; prefer not to return upstream response bodies to callers.

### HIGH-02 — Workflows worker authentication fails open when the token is not configured

- **Severity:** High
- **Area:** Authentication
- **Evidence:** `apps/workflows/src/index.ts:96-104`
  ```
  function requireConfiguredToken(request, env) {
    const expectedToken = env.WORKFLOWS_API_TOKEN;
    if (!isConfigured(expectedToken)) {
      return null;                 // <- authorized when no token configured
    }
    return getAccessToken(request) === expectedToken ? null : unauthorized();
  }
  ```
- **Why it matters:** If `WORKFLOWS_API_TOKEN` is unset (a new environment, a local/`workers.dev` deploy, an accidental secret removal, or preview), **every** request to the worker is authorized: anyone can create campaign-dispatch workflows (HIGH-01) and send approval events (`/workflows/:id/approval`). Wrangler declares this secret as required (`apps/workflows/wrangler.jsonc`), but fail-open logic defeats that guardrail at the application layer.
- **Remediation:** Fail closed. If the expected token is missing, return `503`/`500` and refuse all non-`/health` requests. Compare tokens with a constant-time function (the current `===` at line 103 is not constant-time). Consider accepting the token only via the `Authorization: Bearer` header.

### MED-01 — No brute-force / rate limiting on credentials sign-in

- **Severity:** Medium
- **Area:** Auth / Abuse controls
- **Evidence:**
  - `apps/web/auth.config.ts:25-52` — the `Credentials` provider validates email/password with bcrypt but performs no per-account or per-IP throttling, lockout, or CAPTCHA.
  - No `apps/web/middleware.ts` exists (verified), so `/api/auth/callback/credentials` is unthrottled at the edge.
  - The API's abuse limiter (`apps/api/src/auth-abuse.ts:5-11`) only covers `register`, `email_verification_request/confirm`, and `password_reset_request/confirm` — **not** login.
- **Why it matters:** The login endpoint is the highest-value target for credential stuffing and password spraying. NextAuth provides CSRF protection for the credentials callback but no brute-force protection.
- **Remediation:** Add rate limiting/lockout keyed by IP **and** by normalized email on the sign-in path (e.g., middleware or a Cloudflare WAF/rate-limiting rule), plus exponential backoff or temporary lockout after repeated failures, and consider CAPTCHA/Turnstile after N failures.

### MED-02 — Process-local rate limiting; production "edge enforcement" asserted only by an environment variable

- **Severity:** Medium
- **Area:** Abuse controls
- **Evidence:**
  - `apps/api/src/middleware/security.ts:10-12` — global limiter is an in-process `Map` (100 req/min), explicitly commented as needing edge/WAF or durable limiting at scale.
  - `apps/api/src/auth-abuse.ts:34`, `apps/api/src/contact-intake-abuse.ts:25`, and `apps/api/src/telegram.ts:25` — all additional limiters are per-process `Map`s.
  - `apps/api/src/readiness.ts:187-221` — the production readiness check is satisfied when `DURABLE_RATE_LIMITS_ENABLED=true` **or** `RATE_LIMIT_BACKEND` is `durable`/`edge`.
  - `apps/api/wrangler.jsonc` (production `vars`) sets `RATE_LIMIT_BACKEND: "edge"`, which satisfies the readiness gate, but no actual Cloudflare rate-limiting rule (or Durable Object limiter) exists in this repository (`infra/` is empty).
- **Why it matters:** Cloudflare Workers scale horizontally across isolates. In-memory counters are per-isolate and reset on eviction, so the effective limit is far higher than 100/min and provides little protection against distributed brute force, credential stuffing, or provider-cost abuse. The readiness check can report "ready" while enforcement is effectively absent, creating a false sense of safety.
- **Remediation:** Implement durable/edge rate limiting (Cloudflare Zone rate-limiting rules, a Durable Object counter, or Cloudflare's Rate Limiting binding) and make the readiness check verify real configuration rather than a self-declared env flag. Document the edge rule as code (or remove the flag-gated "ready" status).

### MED-03 — Provider-spend endpoints lack role checks

- **Severity:** Medium
- **Area:** Authorization
- **Evidence:**
  - `apps/api/src/app.ts:3458-3495` — `POST /v1/leads/source-run` (no `requireRole`); runs a configured source provider and consumes provider-cost budget.
  - `apps/api/src/app.ts:3497-3559` — `POST /v1/leads/discover` (no `requireRole`); same, across multiple adapters.
  - Contrast with sibling sensitive routes that **are** gated: `app.ts:3568` (`POST /v1/campaigns`), `app.ts:3606`/`3628`/`3680` (campaign approve/run/dispatch), `app.ts:3840` (calls dispatch), `app.ts:3979`/`4016` (meetings), `app.ts:2642`–`2786` (team management), `app.ts:2889` (provider setup), `app.ts:3124`/`3149` (telegram configure/disable).
- **Why it matters:** Any authenticated `member` can trigger paid provider work (source discovery/crawling that debits `provider_cost_cents` budget). This is a billing/abuse and least-privilege concern, even though an entitlement check limits the absolute spend.
- **Remediation:** Add `requireRole("owner", "admin")` (and where appropriate `requireVerifiedEmail`) to `POST /v1/leads/source-run` and `POST /v1/leads/discover`, consistent with campaign/outbound dispatch. Audit remaining un-gated mutation routes: `POST /v1/calls` (`app.ts:3821`), `POST /v1/onboarding/session*` (`app.ts:3367-3399`), `POST /v1/leads` (`app.ts:3409`).

### MED-04 — Weak Content-Security-Policy

- **Severity:** Medium
- **Area:** Security headers / CSP
- **Evidence:**
  - `apps/api/src/middleware/security.ts:171-178` — API CSP sets `script-src 'self' 'unsafe-inline' 'unsafe-eval'`.
  - `apps/web/next.config.ts:11-16` — web `script-src` includes `'self' 'unsafe-inline'` (plus `'unsafe-eval'` only in development, line 15); `style-src 'self' 'unsafe-inline'` (line 21); CSP assembled at line 43.
- **Why it matters:** `'unsafe-inline'` (and especially `'unsafe-eval'`) largely neutralizes CSP as an XSS mitigation. In combination with `dangerouslySetInnerHTML` usage in the web app (all currently safe — see §4.6), a future injection flaw would be far more damaging.
- **Remediation:** Adopt a nonce- or hash-based `script-src` and remove `'unsafe-inline'`/`'unsafe-eval'` where feasible. Razorpay's checkout can be scoped via `script-src-elem`/host allowlists. For the API worker (no HTML rendering), tighten to `default-src 'none'` with only the directives actually needed, and add `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'none'`, `object-src 'none'`.

### MED-05 — API production Wrangler `secrets.required` is empty

- **Severity:** Medium
- **Area:** Secret handling / deployment safety
- **Evidence:** `apps/api/wrangler.jsonc` — both `env.staging.secrets.required` and `env.production.secrets.required` are `[]`, even though the app throws at import time without `AUTH_SECRET` (`apps/api/src/middleware/auth.ts:11-16`) and depends on `DATABASE_URL`, `STRIPE_*`, `RAZORPAY_*`, `RESEND_*`, `TWILIO_*`, etc. (documented in the same file's trailing comment and `apps/api/src/providers.ts:419-443`).
- **Why it matters:** Wrangler's `secrets.required` makes deploys fail fast when a secret is missing. Leaving it empty allows a production deploy to succeed and then fail at runtime (or silently degrade providers), turning configuration mistakes into production incidents. Contrast the web worker, which correctly lists `AUTH_SECRET` (and `DATABASE_URL` for production).
- **Remediation:** Populate `secrets.required` for each environment with at minimum `AUTH_SECRET` and `DATABASE_URL`, plus the provider secrets that must exist for the enabled feature set.

### MED-06 — CSRF helper trusts requests that omit both `Origin` and `Referer`

- **Severity:** Medium
- **Area:** CSRF
- **Evidence:** `apps/web/lib/same-origin.ts:59-80` — `isTrustedMutationOrigin()` returns `false` for cross-site `sec-fetch-site`, checks `Origin`, then `Referer`, and finally `return true` at line 79 when neither header is present.
- **Why it matters:** All state-changing web routes use `rejectCrossOriginMutation` (verified across every mutating `apps/web/app/api/**/route.ts`), so this helper is the CSRF gate. Accepting requests with no `Origin` and no `Referer` widens the accepted surface; modern browsers send `Origin` on cross-site POSTs, but non-browser clients and some embedding/privacy contexts can omit both. A safer default is to reject when the origin cannot be established.
- **Remediation:** Return `false` (reject) when neither `Origin` nor `Referer` is present for state-changing methods, or require a per-session CSRF token/triple-submit cookie as a second factor. Keep the `sec-fetch-site` check.

---

## 5. Low-Severity and Informational Findings

### LOW-01 — Legacy raw-secret HS256 JWT acceptance fallback
- **Evidence:** `apps/api/src/auth-session-token.ts:84-96` — after trying NextAuth's salted decoders, the API falls back to `jwtVerify(token, legacySecret, { algorithms: ["HS256"] })` using the raw `AUTH_SECRET`.
- **Why it matters:** Any service or actor in possession of `AUTH_SECRET` can mint sessions with a plain, unsalted HS256 token, and the accepted token surface is wider than intended. If `AUTH_SECRET` is weak or shared with unrelated components, session forgery is possible.
- **Remediation:** Remove the legacy fallback once all live sessions have rotated, or gate it behind a short-lived migration flag. Rotate `AUTH_SECRET` if the legacy path was ever reachable in production.

### LOW-02 — Raw reset/verification token returned in API `delivery.previewUrl` (non-production)
- **Evidence:** `apps/api/src/auth-lifecycle.ts:76-85` returns `{ mode: "preview", previewUrl }` when email is unconfigured and `NODE_ENV !== "production"`; `apps/api/src/routes/auth.ts:196-203` and `:282-288` include `delivery` in the JSON response. The `previewUrl` embeds the raw token (`auth-lifecycle.ts:201-204,237-240`).
- **Why it matters:** In local/dev/staging-with-dev-semantics, the account-flow endpoints return a URL containing the raw password-reset/verify token in the HTTP response body, which can be captured by proxies/logs/telemetry. Production behavior returns `unavailable` (no URL), so impact is limited to non-production environments.
- **Remediation:** Never return tokens in responses; if a preview link is needed for developer UX, render it only in a local-only tool and log it to stderr, not the response. Confirmed mitigated: tokens are 192-bit, SHA-256-hashed at rest, TTL 30 min/24 h, single-use, and password reset invalidates sessions (`auth-lifecycle.ts:32-38,108-174,304-347`).

### LOW-03 — Reset token reflected into redirect query strings and logs on error
- **Evidence:** `apps/web/app/api/auth/password-reset/confirm/route.ts:41,53` — on failure the `token` is placed into the redirect query string; the token is also passed in the request body (line 34).
- **Why it matters:** Secrets in URLs are recorded in browser history, `Referer` headers, and access logs.
- **Remediation:** Do not echo the token back in redirect URLs; keep it in a POST body/HTTP-only cookie and surface only a generic error.

### LOW-04 — No explicit session lifetime / cookie flags; `trustHost` enabled in production
- **Evidence:** `apps/web/auth.config.ts:54` uses `session: { strategy: "jwt" }` with no `maxAge`/`updateAge` (NextAuth default ≈30 days) and no explicit cookie `sameSite`/`secure`/`httpOnly`; `apps/web/auth.config.ts:14` sets `trustHost: true` in production, and `apps/web/wrangler.jsonc` sets `AUTH_TRUST_HOST: "true"`.
- **Why it matters:** A 30-day JWT session lengthens the window for stolen-token abuse, and `trustHost` means the `Host`/forwarded host is trusted when building URLs. These are common NextAuth-on-Workers requirements, but they should be deliberate and minimized.
- **Remediation:** Set an explicit, shorter `session.maxAge` (e.g., 8–24 h) with `updateAge`, confirm `__Secure-` cookies are issued in production (HTTPS), and ensure `trustHost` is safe given the fixed custom-domain routing.

### LOW-05 — Type-checking disabled on auth files; beta auth dependency
- **Evidence:** `apps/web/auth.ts:1` and `apps/web/auth.config.ts:1` begin with `// @ts-nocheck`; `apps/web/package.json` pins `next-auth: ^5.0.0-beta.30`.
- **Why it matters:** The most security-critical web module is excluded from type checking, and a beta auth release is used in production.
- **Remediation:** Remove `@ts-nocheck` (or narrow it with typed wrappers) and track/pin the NextAuth release; plan an upgrade path off the beta.

### LOW-06 — Public-path prefix matching
- **Evidence:** `apps/api/src/middleware/auth.ts:85` — `publicPaths.some((path) => c.req.path.startsWith(path))`. Public prefixes include `/health`, `/v1/foundation/summary`, `/v1/webhooks/telegram`, `/v1/auth/register`, etc. (`auth.ts:66-83`).
- **Why it matters:** No current route is unintentionally public, but prefix matching means any future route whose path begins with a public prefix (e.g., `/v1/webhooks/resend-admin`, `/v1/auth/healthz`, `/v1/foundation/summary/x`) would silently bypass authentication.
- **Remediation:** Match exact path segments (or use method+path tuples) instead of `startsWith`.

### LOW-07 — Outbound email HTML built by interpolation
- **Evidence:** `apps/api/src/providers.ts:191-204` builds the Resend email body as `` `<p>${activity.preview}</p>` `` (line 202), and `activity.preview` is generated/stored content.
- **Why it matters:** This is outbound content (not browser XSS), but unsanitized interpolation into HTML email permits markup/link injection in messages sent on the platform's behalf.
- **Remediation:** Escape HTML entities for interpolated values or render from a template with proper escaping.

### LOW-08 — Email verification-status enumeration
- **Evidence:** `apps/api/src/routes/auth.ts:176-184` returns `requiresEmailVerification: !user?.emailVerified`. For a verified account it returns `false`; for missing or unverified accounts it returns `true`.
- **Why it matters:** An attacker can distinguish "registered and verified" from other states, enabling account enumeration for verified users. (Password-reset request correctly returns a uniform response — good.)
- **Remediation:** Return an identical response shape/timing regardless of account state.

### LOW-09 — Stripe webhook returns internal signature error
- **Evidence:** `apps/api/src/routes/billing.ts:435-438` returns `{ error: "Webhook Error: " + err.message }` to the caller.
- **Why it matters:** Minor information disclosure of verification internals.
- **Remediation:** Log the detail server-side and return a generic `400 { error: "Invalid signature" }`.

### LOW-10 — Local secret file hygiene
- **Evidence:** `.env`, `apps/api/.env`, `apps/web/.env.local` are mode `0755` (world-readable) and contain a real-looking Google OAuth client secret (`GOCSPX-…`) plus a short, predictable shared dev `AUTH_SECRET` (`local-dev-auth-secret-for-salesxgrowth-sales-saas-platform`). All three are gitignored and were never tracked (`git ls-files`, `git log -- .env`).
- **Why it matters:** The absence of committed secrets is good, but world-readable secret files and weak/shared local secrets risk leakage on shared hosts and accidental reuse. The embedded Google client secret should be treated as potentially exposed and rotated.
- **Remediation:** `chmod 600` env files, use distinct high-entropy secrets per environment, and rotate the Google OAuth client secret shown in local `.env`.

### LOW-11 — Audit export available to any authenticated role
- **Evidence:** `apps/api/src/app.ts:2068-2097` — `GET /v1/audit/export` requires authentication only (no `requireRole`). (PII is redacted: `packages/shared/src/audit-log.ts:379-421` excludes `body`/`ip`/`userAgent` and emits derived evidence only; workspace scoping applies via `storageFor`.)
- **Why it matters:** Exfiltration of workspace audit metadata by a plain `member` may exceed intended least privilege.
- **Remediation:** Gate audit export behind `requireRole("owner", "admin")` if that matches policy.

### INFO-01 — Empty `apps/admin` placeholder
- **Evidence:** `apps/admin/` contains 0 files (no `package.json`, no Wrangler config), and is referenced nowhere in the workspace, scripts, or CI (`grep` for `apps/admin`/`@sales/admin` returns nothing). Root `workspaces` globs `apps/*` (`package.json:9-12`).
- **Why it matters:** There is **no admin vulnerability today** because there is no admin code. The risk is forward-looking: the directory name implies a future privileged console. If added without the platform's existing controls, it could bypass the API's role checks, tenant scoping, and verified-email gates.
- **Remediation:** Either remove the empty directory or scaffold it with an explicit security baseline before use: all admin actions must go through the same `apps/api` authorization path (no direct DB access, no separate trust boundary), enforce owner/admin + verified email, and be covered by the tenant-scoping tests. Add the directory to CODEOWNERS review.

### INFO-02 — No explicit webhook event-idempotency store (Stripe/Razorpay)
- **Evidence:** `apps/api/src/routes/billing.ts:415-655` (Stripe) and `:658-798` (Razorpay). Payment inserts are deduped via `insertPaymentIfMissing` (`billing-payment-records.ts`), and subscription updates set idempotent state; there is no explicit `event.id` replay table.
- **Why it matters:** Replays are largely harmless because operations are idempotent, but an explicit processed-event store would harden against duplicate side effects and make replay handling auditable.
- **Remediation:** Persist processed provider event IDs (with TTL) and short-circuit duplicates. (Telegram already does this — `storage.ts` `claimTelegramWebhookUpdate`, `app.ts:3274-3282`.)

### INFO-03 — Tenant isolation is application-layer only
- **Evidence:** All tenant queries are scoped in code (`apps/api/src/storage.ts:1348,1358,1369,1381` use `and(eq(<table>.id, id), eq(<table>.workspaceId, workspace.id))`; `apps/api/src/tenant-access.ts` filters by `actor.workspaceId`/`actor.organizationId`; `workspaceContext()` throws without a workspace, `storage.ts:1144-1181`). `supabase/` contains only `.temp` CLI metadata — no RLS policies; the DB role is a single application user (`docker-compose.yml`, `packages/database/src/client.ts:5-6,27-33`).
- **Why it matters:** Correct today, but any future query that forgets the workspace predicate would expose cross-tenant data; there is no database-enforced backstop.
- **Remediation:** Consider Postgres Row-Level Security (or a scoped DB role) as defense-in-depth, plus lint/test rules that require a workspace predicate in tenant queries.

---

## 6. Positive Controls Observed (working well)

- **Tenant isolation:** Workspace/organization scoping is centralized (`apps/api/src/storage.ts`, `apps/api/src/tenant-access.ts`) and consistently applied; ID-based lookups are scoped and return 404 cross-tenant (`app.ts:3441-3449,3955-3963`, `storage.ts:1348-1396`). `selectActiveWorkspaceForUser` verifies membership before switching (`tenant-access.ts:611-654`).
- **Webhook verification:** Stripe `constructEvent` (`billing.ts:435`); Resend via svix (`webhooks.ts:11-39`); Twilio `validateRequest` (`webhooks.ts:41-66`); Telegram secret header with constant-time compare + replay protection (`telegram.ts:47-113`, `app.ts:3274-3282`); scheduled dispatch gated by a constant-time-compared scheduler secret (`telegram.ts:58-90`, `app.ts:1657-1676`).
- **Authorization on sensitive actions:** Billing management requires owner/admin + verified email (`billing.ts:50-77`); campaign run/dispatch, call dispatch, meeting create/update, team role/removal/transfer, invites, provider setup, and Telegram configure/disable are all role- and/or verification-gated (`app.ts:2588-2786,2889-2916,3124-3163,3606-3815,3840-3954,3979-4035`).
- **Secret hygiene:** `.env*`/`.dev.vars*` are gitignored (`.gitignore:8-12`) and never tracked; no hardcoded secrets in `apps/*/src` or `packages/*/src`; Wrangler secrets are expected to be set out-of-band.
- **Input validation:** `zod` schemas are applied broadly (e.g., `routes/auth.ts`, `app.ts` throughout, `packages/shared` schemas), and a central error boundary maps validation/parse errors to 400 (`middleware/error-boundary.ts`).
- **SQL safety:** No raw SQL injection found — Drizzle query builders plus parameterized `sql``` templates only (`storage.ts:1759,2230,2249,2463,3866,4405-4407`).
- **Output encoding:** JSON-LD uses `dangerouslySetInnerHTML` only via `jsonLd()` which escapes `<` (`apps/web/lib/seo.ts:242-244`), preventing `</script>` breakout.
- **Storage resilience:** Production refuses the in-memory fallback (`storage.ts:4416-4444`), and readiness surfaces blockers (`readiness.ts`).
- **Auth token lifecycle:** Reset/verify tokens are 192-bit, hashed at rest, TTL-bounded, single-use; password reset invalidates sessions (`auth-lifecycle.ts`).
- **CORS:** Explicit origin allowlist with credentials (`middleware/cors.ts`, `app.ts:1167-1201`; `frontend-origin.ts`).
- **Security headers:** HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` on both surfaces, plus body-size and JSON content-type guards (`middleware/security.ts:154-224`).
- **PII in audit export:** Redacted (`packages/shared/src/audit-log.ts:379-421`).

---

## 7. Prioritized Remediation Plan

**Immediate (this sprint)**
1. **HIGH-01** — Remove caller-controlled `dispatchWebhookUrl`; resolve dispatch destination from server config only, and add SSRF allowlisting/destination checks before attaching the bearer token (`apps/workflows/src/index.ts`).
2. **HIGH-02** — Make `requireConfiguredToken` fail closed when the token is absent; use constant-time comparison (`apps/workflows/src/index.ts:96-104`).
3. **MED-01** — Add IP+account brute-force protection/lockout to the credentials sign-in path.

**Near-term (next 1–2 sprints)**
4. **MED-02** — Implement real edge/durable rate limiting and make readiness verify it (not just the `RATE_LIMIT_BACKEND` flag).
5. **MED-03** — Add `requireRole("owner","admin")` (+ verified email) to `POST /v1/leads/source-run` and `POST /v1/leads/discover`; audit remaining un-gated mutations (`POST /v1/calls`, onboarding, `POST /v1/leads`).
6. **MED-05** — Populate `secrets.required` in `apps/api/wrangler.jsonc` for staging and production.
7. **MED-04** — Move both CSPs to nonce/hash-based `script-src`; drop `'unsafe-inline'`/`'unsafe-eval'` and tighten the API CSP.
8. **MED-06** — Reject mutations that present neither `Origin` nor `Referer` (`apps/web/lib/same-origin.ts:79`).

**Hardening backlog**
9. **LOW-01/LOW-04/LOW-05** — Remove the legacy HS256 fallback, set explicit session `maxAge`/cookie flags, remove `@ts-nocheck` and plan the NextAuth GA upgrade.
10. **LOW-02/LOW-03/LOW-08/LOW-09** — Eliminate token/link leakage into responses and redirects, normalize enumeration responses, and return generic webhook errors.
11. **LOW-06/LOW-07/LOW-10/LOW-11** — Exact-match public paths, escape outbound email HTML, restrict env-file permissions and rotate the exposed local Google secret, and gate audit export.
12. **INFO-01/INFO-02/INFO-03** — Decide the fate of `apps/admin` (remove or scaffold with a security baseline + CODEOWNERS), add an explicit webhook event-idempotency store, and consider DB-level (RLS) tenant backstops.

---

## 8. Verification Notes & Limitations

- This was a **static, read-only** review. No runtime exploitation, penetration testing, dependency CVE scanning, or infrastructure review (Cloudflare zone rules, WAF, Hyperdrive/Supabase configuration) was performed.
- Findings rely on the source in the repository as of the audit date; behavior may depend on deployment-time secrets and Cloudflare configuration not present in the repo (notably the actual existence of edge rate-limiting rules referenced by `RATE_LIMIT_BACKEND: "edge"` and the workflows worker's deployed URL/secrets).
- No source, workflow, infra, or configuration file was modified; the sole artifact produced is this document.
