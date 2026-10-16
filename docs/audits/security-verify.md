# Security Verification Checklist

## HIGH-01 — Caller-supplied `dispatchWebhookUrl` removed from request DTO (SSRF + token exfiltration)
- **Status:** PASS
- **Evidence:** `apps/workflows/src/index.ts` — `CampaignDispatchWorkflowParams` type no longer includes `dispatchWebhookUrl`; dispatch destination resolved exclusively from `env.CAMPAIGN_DISPATCH_WEBHOOK_URL_TEMPLATE` server config. `isValidUrl()` added with scheme/host/IP/metadata-endpoint allowlisting.
- **Line:** 20, 70-111, 175-190

## HIGH-02 — Workflows worker auth fails open when token is not configured
- **Status:** PASS
- **Evidence:** `apps/workflows/src/index.ts` — `requireConfiguredToken()` returns `unauthorized()` (401) when `WORKFLOWS_API_TOKEN` is missing instead of returning `null`.
- **Line:** 135-143

## MED-03 — Provider-spend endpoints lack role checks
- **Status:** PASS
- **Evidence:** `apps/api/src/app.ts` — `POST /v1/leads/source-run` (line 3458) and `POST /v1/leads/discover` (line 3497) both have `requireRole("owner", "admin")` decorator.
- **Line:** 3458, 3497

## MED-04 — Weak Content-Security-Policy
- **Status:** FAIL
- **Evidence:** `apps/web/next.config.ts` — CSP `script-src` still includes `'unsafe-inline'` (line 11). Comment notes it's required for JSON-LD structured data (`<script type="application/ld+json">`) on SEO pages. `style-src` correctly excludes `'unsafe-inline'` (line 18).
- **Line:** 9-27
- **Conflict/Regression risk:** Removing `'unsafe-inline'` from `script-src` may break JSON-LD structured data rendering on SEO pages. A nonce-based approach is needed before removal to avoid regressions.

## MED-02 — Process-local rate limiting; production "edge enforcement" asserted by env var only
- **Status:** PARTIAL
- **Evidence:** `apps/api/src/middleware/security.ts` — rate limiter remains process-local `Map` (lines 10-12) with comment: "Production deployments should pair this with edge/WAF or durable rate limiting before horizontal scale."
- **Line:** 7-12

## MED-01 — No brute-force / rate limiting on credentials sign-in
- **Status:** PARTIAL
- **Evidence:** `apps/web/middleware.ts` — New rate limiting applied to `/api/auth/callback/credentials` with IP + email tracking, lockout window, and `429` responses. Still process-local `Map`-backed (not edge-enforced), lost on worker restart.
- **Line:** 1-183

## MED-06 — CSRF helper trusts requests with no Origin/Referer
- **Status:** FAIL
- **Evidence:** `apps/web/lib/same-origin.ts` — `isTrustedMutationOrigin()` returns `true` when neither `Origin` nor `Referer` header is present.
- **Line:** 79

## MED-05 — API production Wrangler `secrets.required` is empty
- **Status:** FAIL
- **Evidence:** `apps/api/wrangler.jsonc` — `env.staging.secrets.required` and `env.production.secrets.required` are empty arrays, allowing production deploys to succeed without required secrets.
- **Line:** (in wrangler.jsonc)

---

## Build Verification
- **Status:** PASS
- **Evidence:** `npm run build` completed cleanly with exit code 0 (Next.js 15.5.18, 72 static pages, typecheck passed for all workspaces).

---

## Open Items (summary)
1. CSP `script-src` still contains `'unsafe-inline'` — requires nonce/hash migration before removal to avoid JSON-LD breakage.
2. Rate limiting remains process-local (`Map`) — not edge/durable; readiness check verifies env flag only, not real enforcement.
3. CSRF helper accepts requests missing both `Origin` and `Referer` — should reject or require session token.
4. `secrets.required` empty in API Wrangler config — deploy succeeds without required secrets validated.