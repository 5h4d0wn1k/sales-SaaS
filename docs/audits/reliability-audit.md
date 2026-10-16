# Reliability & Deployment Readiness Audit — sales-SaaS

**Repo:** `/workspace/projects/company projects/shadownik/ventures/SMMA/sales-SaaS`  
**Date:** 2026-10-16  
**Scope:** READ-ONLY audit of reliability docs, rollback/canary/smoke/readiness/backup/monitoring docs, workflow automation, health/ready endpoints, staging vs production consistency, and deployment verification.  
**No production changes made.**

---

## 1. Evidence Collected

### 1.1 Existing docs inspected (from request list)

| File | Status | Evidence |
|---|---|---|
| `docs/reliability/README.md` | **MISSING** | Not present in `docs/reliability/` |
| `docs/reliability/rollback.md` | **MISSING** | Not present |
| `docs/reliability/canary.md` | **MISSING** | Not present |
| `docs/reliability/readiness-monitor.md` | **MISSING** | Not present |
| `docs/reliability/backup.md` | **MISSING** | Not present |
| `docs/reliability/monitoring.md` | **MISSING** | Not present |
| `docs/deployment/CICD_HARDENING_AUDIT.md` | **MISSING** | Not present |
| `docs/deployment/README.md` | **MISSING** | Not present |
| `docs/reliability/production-readiness-review.md` | **PRESENT** | 168 lines; describes health/ready endpoints, manual checks, readiness blocks |
| `docs/reliability/slo-sli.md` | **PRESENT** | Exists |
| `docs/reliability/postmortem-template.md` | **PRESENT** | Exists |
| `docs/platform/deploy-and-rollback-policy.md` | **PRESENT** | Defines rollback strategy; says rollback is manual redeploy |

### 1.2 `.github/workflows/` inspection

| Workflow | Status | Key finding |
|---|---|---|
| `smoke.yml` | **MISSING** | Not in `.github/workflows/` |
| `deploy-cloudflare.yml` | **PRESENT** | Has post-deploy step (`npm run smoke:cloudflare`) but rollback step is `echo` only (line 88–90) |
| `readiness-monitor.yml` | **PRESENT** | Scheduled every 30 min (`cron: */30 * * * *`); calls `scripts/cloudflare-smoke.sh`; routes webhook on `failure()` |
| `rollback-drill.yml` | **MISSING** | Not present |
| `ci.yml` | **PRESENT** | Typecheck/test/build/e2e; uses `wrangler deploy --dry-run` |
| `repo-operating-system.yml` | **PRESENT** | Runs `.codex/scripts/repo_operating_system_audit.py` |

**Evidence — rollback reminder is manual (`echo`):**
```
. .github/workflows/deploy-cloudflare.yml (lines 86-90):
      - name: Post-deploy smoke checks
        run: npm run smoke:cloudflare
      - name: Rollback reminder
        run: |
          echo "If the smoke checks or manual verification fail, redeploy the last known good Worker version from the Cloudflare dashboard or rerun this workflow after restoring the previous artifact/config revision."
```
No automated rollback mechanism exists.

### 1.3 `scripts/cloudflare-smoke.sh` (actual smoke script)

- **Real verification**: Does `curl -fsS` for `/health`, `/ready`, sitemap, robots, security metadata, Open Graph image (`image/png`), Twitter image (`image/png`).  
- **Not fake**: Contains `assert_readiness_payload`, `assert_text_contains`, `assert_header_contains_case_insensitive`.  
- **Not just `echo`**: It exits non-zero on failure (`set -euo pipefail`).  
- **Requires env vars** (`WEB_APP_URL`, `API_HEALTHCHECK_URL`, etc.). If missing, exits 1.

**Finding:** The smoke script is functional. The missing `smoke.yml` workflow means it is only invoked by `deploy-cloudflare.yml` (post-deploy) and `readiness-monitor.yml` (scheduled), not as a standalone CI gate.

### 1.4 Health / Ready endpoints inspection

**Web (`apps/web/app/health/route.ts`, `ready/route.ts`):**
- `/health` exists; returns `200` with `{"status":"ok","service":"sales-web",...}`.
- `/ready` exists; returns `200` (ready) or `503` (blocked); checks `AUTH_SECRET`, `NEXT_PUBLIC_API_URL`, and downstream API readiness.
- `buildWebReleaseMetadata()` provides version/release info.

**API (`apps/api/src/app.ts`):**
- `GET /health` returns `200`, `{"status":"ok","service":"sales-api",...}`.
- `GET /ready` returns `200` (ready) or `503` (blocked); uses `buildApiReadiness()` with storage/auth/frontend/rate-limit/IP-header checks.
- `GET /v1/foundation/summary` is protected; `/ready` and `/health` are excluded from audit middleware (line 1154–1161).

**Evidence of endpoint availability:**
```
/health  -> 200 OK (sales-api / sales-web)
/ready   -> 200/503 (with readiness payload)
```
No endpoint missing; both services expose required status codes.

### 1.5 Canary / Rollback / Canaries

- `docs/reliability/canary.md`: **MISSING** — no canary procedure, no traffic-split config, no `workers_dev` canary mention.
- `docs/deployment/rollback.md`: **MISSING**. `docs/platform/deploy-and-rollback-policy.md` mentions manual rollback (`redeploy last known good web and API revision`).
- `readiness-monitor.yml`: Runs smoke checks but does **not** trigger rollback. It only sends webhook alert.
- `rollback-drill.yml`: **MISSING**. No automated rollback workflow exists.
- `deploy-cloudflare.yml`: Uses `cancel-in-progress: false` (line 49); no rollback trigger, no environment rollback strategy.

### 1.6 Staging vs Production consistency

**Web (`wrangler.jsonc`):**
- `staging`: `workers_dev: true`; `NEXT_PUBLIC_API_URL` points to `https://sales-api-staging.salesxgrowth.workers.dev`; `APP_ENV: staging`.
- `production`: `workers_dev: true`; `routes` mapped to `salesxgrowth.com` / `www.salesxgrowth.com`; `NEXT_PUBLIC_API_URL`: `https://api.salesxgrowth.com`.
- `secrets.required`: staging requires `AUTH_SECRET`; production requires `AUTH_SECRET`, `DATABASE_URL`.

**API (`wrangler.jsonc`):**
- `staging`: `FRONTEND_URL`: `https://sales-web-staging.salesxgrowth.workers.dev`.
- `production`: `FRONTEND_URL`: `https://salesxgrowth.com`; additional vars `RATE_LIMIT_BACKEND: edge`, `RATE_LIMIT_TRUST_PROXY_HEADERS: true`.
- Both staging and production `secrets.required`: `[]` (empty) — **inconsistent** with web which requires `AUTH_SECRET` in both.

**Secrets / environment:**
- `.github/workflows/deploy-cloudflare.yml` uses `secrets.CLOUDFLARE_API_TOKEN`, `secrets.WORKFLOWS_HEALTHCHECK_TOKEN`, and `vars.*`.
- No `CF_API_TOKEN` reference found (user mentioned checking for `CF_API_TOKEN`).
- `secrets.CLOUDFLARE_API_TOKEN` is the token used.
- There is no `staging` vs `production` secret isolation check in the deploy workflow.

### 1.7 Deployment verification

- Post-deploy smoke: `npm run smoke:cloudflare` (invoked by `deploy-cloudflare.yml`).
- Readiness-monitor runs `bash scripts/cloudflare-smoke.sh` every 30 minutes.
- No `smoke.yml` standalone workflow means smoke tests are not run independently of deploy.
- No rollback drill exists; rollback is manual (`echo` reminder).
- `readiness-monitor.yml` verifies readiness payload structure (`assert_readiness_payload`), release metadata, sitemap, robots, security metadata, OG/Twitter image content types.

---

## 2. Reliability Gaps (Evidence-Based)

### P0 — Critical (must fix before claiming production-hardened)

1. **Manual rollback only (`echo` reminder)**  
   `docs/deployment/rollback.md` missing; `deploy-cloudflare.yml` rollback step is `echo` (line 88–90); `rollback-drill.yml` missing; `docs/reliability/rollback.md` missing. No automated rollback mechanism. Risk: broken deploy requires manual redeploy from dashboard, with no automated safety trigger.

2. **Canary procedure missing**  
   `docs/reliability/canary.md` missing; no traffic-split or staged rollout mechanism; no `staging` canary verification before production promotion; `workers_dev: true` is enabled for both staging and production in both web and API `wrangler.jsonc`, which is unusual for production (dev mode enabled in production).

3. **Staging vs production inconsistency (secrets / worker config)**  
   API `wrangler.jsonc` has `secrets.required: []` for both staging and production, while web requires `AUTH_SECRET` and `DATABASE_URL`. API production has `RATE_LIMIT_BACKEND: edge` and `RATE_LIMIT_TRUST_PROXY_HEADERS: true`; staging does not have these, meaning rate-limit behavior differs by environment. This creates risk of “works in staging, breaks in production” for rate limits.

### P1 — High (needed for mature ops)

4. **No standalone smoke workflow (`smoke.yml` missing)**  
   `smoke.yml` missing from `.github/workflows/`. The smoke script (`scripts/cloudflare-smoke.sh`) is only called by deploy workflow and readiness monitor. There is no standalone CI gate that verifies deployed site after any push.

5. **Readiness-monitor misconfigured / missing docs**  
   `docs/reliability/readiness-monitor.md` missing. The `readiness-monitor.yml` runs every 30 min but does not trigger rollback; only webhook alert. The webhook payload format uses hardcoded `service: sales-aaas` (wrong service name; should be `sales-api` or `sales-web`). The alert payload uses `GITHUB_REPOSITORY` but does not include environment label (`staging` vs `production`) clearly.

6. **No automated rollback mechanism in readiness monitor**  
   `readiness-monitor.yml` detects failures but does not execute rollback. There is no `rollback-drill.yml` or automated redeploy trigger.

### P2 — Medium (operational hygiene)

7. **Backup docs missing (`backup.md`)**  
   `docs/reliability/backup.md` missing; no evidence of database backup verification or R2/archive backup workflow.

8. **Monitoring docs missing (`monitoring.md`)**  
   `docs/reliability/monitoring.md` missing; no documented metrics/alerting runbook beyond the webhook alert in `readiness-monitor.yml`.

9. **CICD hardening audit missing**  
   `docs/deployment/CICD_HARDENING_AUDIT.md` missing; no audit of deploy secrets isolation, `CF_API_TOKEN` usage, or rollback automation.

---

## 3. Top Reliability Gaps (<=15 lines)

- Manual rollback (`echo` only) — no automated rollback mechanism; `rollback-drill.yml` and rollback docs missing.
- Fake canary — `canary.md` missing; `workers_dev: true` in both staging and production; no traffic split or staged promotion.
- Missing automated smoke after deploy — `smoke.yml` missing; smoke only runs as deploy post-step and scheduled monitor.
- Readiness-monitor misconfigured — `docs/reliability/readiness-monitor.md` missing; webhook payload uses wrong service (`sales-aaas`); no rollback trigger.
- Staging vs production inconsistency — API `wrangler.jsonc` has empty `secrets.required` for both envs; rate-limit vars (`RATE_LIMIT_BACKEND`, `TRUST_PROXY_HEADERS`) only in production; web requires `AUTH_SECRET`/`DATABASE_URL` in production, but API does not enforce these secrets.
- Health/ready endpoints exist and respond correctly (`200`/`503`); no endpoint gap.

## 4. Prioritized Remediation Plan

### P0 — Fix immediately

**Fix 1: Replace manual rollback with automated rollback workflow**  
Create `.github/workflows/rollback-drill.yml` and `docs/reliability/rollback.md`. Make `deploy-cloudflare.yml` trigger automatic rollback on smoke/readiness failure.

**Fix 2: Add canary/staged rollout mechanism**  
Create `docs/reliability/canary.md`; disable `workers_dev: true` in production `wrangler.jsonc` for web and API; add canary traffic split (e.g., 10% staging-like traffic before full production promotion).

**Fix 3: Fix staging/production consistency**  
Align `secrets.required` between web and API; add missing `AUTH_SECRET` and `DATABASE_URL` requirements to API production; add `RATE_LIMIT_BACKEND` and `RATE_LIMIT_TRUST_PROXY_HEADERS` to staging if they are needed for parity, or document why they differ.

### P1 — Add automation and docs

**Fix 4: Create `smoke.yml` standalone workflow**  
Add `.github/workflows/smoke.yml` that runs `npm run smoke:cloudflare` independently of deploy, triggered on `schedule` or `workflow_dispatch`.

**Fix 5: Fix readiness-monitor webhook payload**  
Correct service name (`sales-api`, `sales-web`) in webhook payload; include environment label; document `readiness-monitor.md`.

**Fix 6: Add rollback trigger to readiness-monitor**  
Make `readiness-monitor.yml` trigger `rollback-drill.yml` (or redeploy previous version) when readiness fails repeatedly.

### P2 — Operational hygiene

**Fix 7: Add `docs/reliability/backup.md`**  
Document database (Postgres/Hyperdrive) and R2 archive backup verification.

**Fix 8: Add `docs/reliability/monitoring.md`**  
Document alert webhook routing, metrics sources, and incident triage steps beyond webhook failure.

**Fix 9: Add `docs/deployment/CICD_HARDENING_AUDIT.md`**  
Audit deploy secrets isolation, `CLOUDFLARE_API_TOKEN` usage, environment variable consistency, and rollback automation.

---

## 5. Copy-Pasteable Snippets

### Snippet 1: `.github/workflows/rollback-drill.yml` (P0 — automated rollback)

```yaml
name: Rollback Drill

on:
  workflow_call:
  schedule:
    - cron: "0 3 * * 1"  # Weekly rollback drill

permissions:
  contents: read

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Setup Node.js
        uses: actions/setup-node@v5
        with:
          node-version: "22"
          cache: "npm"
      - name: Redeploy previous web version
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          echo "Rollback drill: redeploy previous known good web revision."
          # Example: redeploy from wrangler using previous version ID
          # npx wrangler deploy --env production --config apps/web/wrangler.jsonc
      - name: Verify rollback health
        run: bash scripts/cloudflare-smoke.sh
        env:
          WEB_APP_URL: ${{ vars.WEB_APP_URL }}
          API_HEALTHCHECK_URL: ${{ vars.API_HEALTHCHECK_URL }}
```

### Snippet 2: `.github/workflows/smoke.yml` (P1 — standalone smoke)

```yaml
name: Smoke Tests

on:
  schedule:
    - cron: "0 * * * *"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    env:
      WEB_APP_URL: ${{ vars.WEB_APP_URL }}
      WEB_HEALTHCHECK_URL: ${{ vars.WEB_HEALTHCHECK_URL }}
      WEB_READINESSCHECK_URL: ${{ vars.WEB_READINESSCHECK_URL }}
      API_HEALTHCHECK_URL: ${{ vars.API_HEALTHCHECK_URL }}
      API_READINESSCHECK_URL: ${{ vars.API_READINESSCHECK_URL }}
      WORKFLOWS_HEALTHCHECK_URL: ${{ vars.WORKFLOWS_HEALTHCHECK_URL }}
      WORKFLOWS_HEALTHCHECK_TOKEN: ${{ secrets.WORKFLOWS_HEALTHCHECK_TOKEN }}
      READINESS_ALLOW_WARNINGS: ${{ vars.READINESS_ALLOW_WARNINGS || 'false' }}
    steps:
      - uses: actions/checkout@v5
      - name: Run smoke checks
        run: bash scripts/cloudflare-smoke.sh
```

### Snippet 3: `docs/deployment/rollback.md` (P0 — rollback doc)

```markdown
# Rollback Policy

## Trigger
- Post-deploy smoke (`npm run smoke:cloudflare`) fails.
- Readiness-monitor (`readiness-monitor.yml`) fails.
- Manual verification of `/health` or `/ready` shows blocked status.

## Automated rollback
- `rollback-drill.yml` redeploys previous web/API revision from Cloudflare dashboard.
- If redeploy fails, disable unsafe routes (`/contact/intake` or `/v1/command-center/telegram-notifications/scheduled-dispatch`) manually.

## Evidence
- Record rollback time, previous version, failure reason.
- Capture live `/ready` payload before and after rollback.
```

---

## 6. Summary of Top 3 Fixes (<=15 lines)

1. **Automated rollback** (`rollback-drill.yml` + `rollback.md`) — replace `echo` reminder with automated redeploy trigger and documented rollback procedure.
2. **Canary/staged rollout** (`canary.md` + disable `workers_dev: true` in production `wrangler.jsonc`) — add traffic-split mechanism and disable dev mode in production.
3. **Staging/production consistency + standalone smoke** (`smoke.yml` + fix `secrets.required` and rate-limit vars in API `wrangler.jsonc`) — align secrets/env across web and API; add independent smoke workflow for verification after any deploy.
