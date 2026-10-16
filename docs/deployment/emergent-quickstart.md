# Emergent Quickstart & Handoff

This is the front door for picking up `sales-SaaS` in a fresh environment
(Emergent or any other coding agent/IDE). It covers boot, required config, how
to verify, how to deploy, and — most importantly — the **prioritized backlog**
of remaining work.

- Repository: `github.com/5h4d0wn1k/sales-SaaS` (private)
- Production: `https://salesxgrowth.com` (web) · `https://api.salesxgrowth.com` (API)
- Stack: npm-workspaces monorepo · Next.js 15 + React 19 (web) · Hono (api) ·
  Cloudflare Workflows · PostgreSQL + Drizzle · deployed on Cloudflare Workers
  via OpenNext.

---

## 1. Prerequisites

| Tool | Version | Notes |
| ---- | ------- | ----- |
| Node | **22 LTS** | Pinned in `.nvmrc` / `.node-version`. Node ≥ 20 works. |
| npm  | 11+ | `packageManager` field is `npm@11.10.1` |
| Postgres | 16 | Either `docker compose` (local) **or** any hosted Postgres |
| (Deploy only) Wrangler | 4.x | Needs a Cloudflare API token for account `07eae60a…` |

> Docker-in-Docker is often unavailable in hosted sandboxes. If `npm run db:up`
> fails, point `DATABASE_URL` at a hosted Postgres instead — nothing else changes.

---

## 2. First-run setup (copy-paste)

```bash
# 1. Node 22 (if you use a version manager)
nvm use          # reads .nvmrc

# 2. Install
npm ci

# 3. Config
cp .env.example .env
# edit .env — see section 3 for the minimum required values

# 4. Database
npm run db:up        # starts postgres:16 on port 5434 (needs Docker)
npm run db:migrate   # applies the 21 Drizzle migrations

# 5. Run
npm run dev:api      # http://localhost:4000
npm run dev:web      # http://localhost:3000
```

---

## 3. Required environment variables

Only four values are needed to boot locally (everything else in `.env.example`
is optional / readiness-gated and can stay empty):

| Variable | Purpose | Local value |
| -------- | ------- | ----------- |
| `DATABASE_URL` | Postgres connection | `postgres://sales_saas:sales_saas@localhost:5434/sales_aaas` |
| `AUTH_SECRET` | NextAuth session secret (≥ 32 chars) | `openssl rand -base64 32` |
| `NEXT_PUBLIC_API_URL` | API origin the browser calls | `http://localhost:4000` |
| `FRONTEND_URL` | Web origin | `http://localhost:3000` |

Generate a real secret:

```bash
openssl rand -base64 32
```

> In production these live in **Wrangler secrets / dashboard variables**, not in
> `.env`. Never commit real secrets — `.env*` is git-ignored.

---

## 4. Quality gates (run before proposing any change)

```bash
npm run typecheck          # all workspaces — currently clean (exit 0)
npm test                   # root + all workspaces (root 42 · web 263 · shared 104 · api 236)
npm run build              # Next.js + api + workflows
npm run verify:core        # typecheck + test + build (the CI gate)
```

There is **no root `lint` script** — do not assume one exists.

---

## 5. Deployment (keep this manual and review-gated)

Production is Cloudflare Workers, account `07eae60a75b06661ea752a78cdf51565`.
Worker names are environment-suffixed: `sales-web-production`,
`sales-api-production`, `sales-workflows-production`.

```bash
export CLOUDFLARE_API_TOKEN="...path/to/project token..."
export CLOUDFLARE_ACCOUNT_ID=07eae60a75b06661ea752a78cdf51565
export NEXT_PUBLIC_API_URL="https://api.salesxgrowth.com"
export NEXT_PUBLIC_SITE_URL="https://salesxgrowth.com"

npm run deploy:api:production
npm run deploy:web:production
npm run deploy:workflows:production
```

- See `docs/deployment/cloudflare-workers-builds.md` for the **free CI/CD**
  setup (Workers Builds) and the GitHub Actions billing fallback.
- **Do not** create new Cloudflare resources or change account/zone settings
  without owner approval.

---

## 6. Remaining work — prioritized backlog

> Source: `docs/audits/security-verify.md`,
> `docs/audits/devsecops-remediation-plan.md`,
> `docs/audits/infrastructure-maturity.md`,
> `docs/audits/cloudflare-free-audit.md`,
> `docs/roadmap/year-one-engineering-roadmap.md`.

### P0 — security & correctness (highest risk reduction)

1. **Dependency vulnerabilities.** `npm audit --omit=dev` currently reports
   **15 production vulns (5 critical, 7 high, 3 moderate)** — dominated by
   `tar` pulled in through `supabase`. Run `npm audit fix`, verify tests still
   pass, and pin/override as needed.
2. **Add a security workflow** (`.github/workflows/security.yml`): `npm audit`
   gate + CycloneDX SBOM artifact. Add `.github/dependabot.yml`. Concrete YAML
   is already drafted in `docs/audits/devsecops-remediation-plan.md` (P0-1/P0-2).
3. **CSP still allows `'unsafe-inline'`** in `script-src`
   (`apps/web/next.config.ts`). Migrate JSON-LD `<script type="application/ld+json">`
   to a **nonce or hash** before removing it, or SEO pages regress.
4. **CSRF helper fails open** — `apps/web/lib/same-origin.ts` returns `true` when
   **both** `Origin` and `Referer` are missing. Reject, or require a session
   token / double-submit cookie.
5. **Empty `secrets.required`** in `apps/api/wrangler.jsonc` (staging **and**
   production). Populate so a deploy fails fast when required secrets are absent.
6. **Rate limiting is process-local** (`Map`) in
   `apps/api/src/middleware/security.ts` and `apps/web/middleware.ts`. Move to a
   durable/edge backend (Cloudflare rate-limit binding, Durable Objects, or D1)
   so limits survive restarts and horizontal scale.

### P1 — platform & operations

7. **Cloudflare free edge security** (needs token scope `zone:edit`):
   deploy the **Managed Free Ruleset** (WAF), enable **Bot Fight Mode**, fix TLS
   posture (`ssl=strict`, `always_use_https`, `min_tls_version=1.2`, HSTS),
   enable **DNSSEC**, verify/rewrite the free rate-limit rule, and create free
   **Notifications** (HTTP DDoS, Universal SSL, Security Insights).
8. **Turnstile** on public forms (`/contact`, `/get-started`) + server-side
   Siteverify.
9. **Cloudflare Access** (Zero Trust) for staging/internal Worker URLs and,
   optionally, `/dashboard` `/settings` `/billing`.
10. **Email DNS**: SPF/DKIM/DMARC + Email Routing.
11. **Observability**: structured logging + worker metrics; **automated rollback**
    in `deploy-cloudflare.yml` when post-deploy smoke checks fail.
12. **CI resilience**: GitHub Actions is currently blocked by a **billing /
    spending-limit** issue on the private repo. Either fix billing or switch to
    Workers Builds (§5).

### P2 — nice-to-have

13. HSTS `preload` + longer `max_age`; Web Analytics (RUM); R2 + Logpush only if
    durable logs are required.

### Product — "final touch"

14. **Landing page polish** (`apps/web/app/page.tsx` and section components):
    make sure the hero, feature sections, and social proof *clearly represent the
    product* (AI-assisted, approval-gated outbound sales workspace). Currently
    accurate but can be sharpened.
15. **Roadmap delivery** (`docs/roadmap/year-one-engineering-roadmap.md`):
    account-lifecycle maturity, team invites & role admin, entitlements + usage
    visibility, plan-aware enforcement (seats/volume/premium workflows), and
    initial AI budget controls.
16. **End-to-end billing check**: exercise checkout in Stripe/Razorpay test mode
    for Trial → Starter ($20) → Professional ($45) → Elite ($100).

---

## 7. Guardrails — do NOT undo these

- **Never commit secrets.** `.env*` is ignored; keep it that way.
- **Preserve the security posture**: approval-gated automation by default,
  tenant isolation, role checks (`requireRole`), SSRF allow-listing in
  `apps/workflows`, and the CSP/security headers.
- **Pricing plan keys are stable**: the internal key for the trial tier is
  `"free"` (display name "7-Day Trial"). Do **not** rename keys — entitlements,
  the get-started flow, and tests depend on them.
- **Deploys are manual + review-gated**. Get owner approval before touching
  production Cloudflare config.
- Run `npm run verify:core` before proposing changes.

---

## 8. Known state (as of handoff)

- Git: `main` clean and in sync; latest work pushed.
- `npm run typecheck` → clean. `npm test` → all green. `npm run build` → passes.
- Brand: fully rebranded **Winrate → salesxgrowth** (source, copy, SEO, emails).
- Pricing: 7-Day Trial · Starter $20 · Professional $45 · Elite $100.
- Security fixes already landed: workflows SSRF allow-list, fail-closed workflow
  auth, admin role gates on lead endpoints, tighter API CSP, credentials
  rate-limiting.
- Node version unified to 22 (`.nvmrc`, `.node-version`, CI).
- GitHub Actions CI is blocked by a billing issue (see P1-12).
