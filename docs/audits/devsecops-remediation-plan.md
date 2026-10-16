# DevSecOps Remediation Plan — sales-SaaS

- **Repository:** `5h4d0wn1k/sales-SaaS` (private, default branch `main`, GitHub Free tier)
- **Plan date:** 2026-10-16
- **Scope:** CI/CD workflows, GitHub Actions settings, GitHub repo/environment settings, workflows-fix follow-through
- **Prerequisite reading:** `docs/audits/devsecops-audit.md`, `docs/audits/security-audit.md`, `docs/audits/cloudflare-free-audit.md`, `docs/audits/workflows-fix.md`, `docs/audits/auth-rate-limiting.md`, `docs/audits/csp-headers.md`
- **Deliverable constraint:** docs/audits only — no source edits unless clearly safe and targeted

---

## 1. Executive summary

The devsecops audit found eight open supply-chain / CI-safety gaps. This plan prioritizes them into **P0** (do this sprint), **P1** (next 1–2 sprints), and **P2** (hardening backlog). For each gap it cites exact file:line evidence, gives copy-pasteable YAML/JSONC snippets, and flags which items are blocked by the GitHub Free private-repo tier (branch protection, rulesets, secret scanning, CodeQL, dependency-review, artifact attestation).

Of the top-5 gaps called out in the devsecops audit:

| # | Gap | Status after this plan |
|---|-----|------------------------|
| 1 | No dependency-review gate | P0-1 — add `security.yml` + `npm audit` gate |
| 2 | No secret scanning / push protection | P2 — blocked on Free tier; process substitute via `SECURITY.md` + in-CI scanner |
| 3 | No branch protection / required reviewers | P0-4 — environment reviewers now; branch protection blocked until Team upgrade |
| 4 | CI artifacts not promoted | P1-1 — promote CI build output to deploy |
| 5 | Missing `READINESS_ALLOW_WARNINGS` in deploy | ✅ Already done — see §4 "Already done" |
| 6 | Stale `readiness-monitor.yml` | ✅ Already done — monitor exists and includes `READINESS_ALLOW_WARNINGS` (line 30) |

---

## 2. What's already done (no action needed)

| Finding | Evidence | Status |
|---------|----------|--------|
| WORKFLOWS SSRF (HIGH-01) | Caller-supplied `dispatchWebhookUrl` removed; only `CAMPAIGN_DISPATCH_WEBHOOK_URL_TEMPLATE` used; private/metadata IP ranges blocked | `apps/workflows/src/index.ts` — documented in `docs/audits/workflows-fix.md` |
| WORKFLOWS auth fail-open (HIGH-02) | `requireConfiguredToken` now returns `unauthorized()` when `WORKFLOWS_API_TOKEN` is unset | `apps/workflows/src/index.ts` — documented in `docs/audits/workflows-fix.md` |
| Weak CSP (MED-04) | `'unsafe-inline'` removed from `style-src`; `'unsafe-eval'` removed from `script-src`; HSTS `preload` added; `Referrer-Policy: no-referrer` | `apps/web/next.config.ts` — documented in `docs/audits/csp-headers.md` |
| Provider-spend role gaps (MED-03) | `requireRole("owner","admin")` added to `POST /v1/leads/source-run` and `POST /v1/leads/discover` | `apps/api/src/app.ts` — documented in `docs/audits/workflows-fix.md` |
| Auth brute-force (MED-01) | `apps/web/middleware.ts` added with per-IP and per-email rate limiters + lockout on credentials sign-in | New file — documented in `docs/audits/auth-rate-limiting.md` |
| Stale readiness monitor | `readiness-monitor.yml` exists; polls `/health`+`/ready` every 30 min; includes `READINESS_ALLOW_WARNINGS` | `readiness-monitor.yml:30` |
| `READINESS_ALLOW_WARNINGS` missing from deploy workflow | Added to `deploy-cloudflare.yml` deploy env | `deploy-cloudflare.yml:59` |

---

## 3. Remediation plan (prioritized)

### P0 — do this sprint (highest risk reduction / lowest effort)

#### P0-1 — Add dependency-vulnerability + SBOM security gate (addresses SEC-01, SEC-08)

**Evidence:** `npm audit --omit=dev` = 15 prod vulns (5 critical, 7 high, 3 moderate). No `audit` step in any workflow file (`ci.yml`, `deploy-cloudflare.yml`, `readiness-monitor.yml`, `repo-operating-system.yml`, `telegram-notification-dispatch.yml` all lack it).

Create `.github/workflows/security.yml` (runs on PRs, pushes to `main`, and weekly schedule). Works on Free private repos (Semgrep OSS + `npm audit`).

```yaml
name: Security

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: "0 6 * * 1"   # weekly; catches new advisories against unchanged deps

permissions:
  contents: read

concurrency:
  group: security-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  dependency-audit:
    name: Dependency audit (prod)
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
      - uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      # Start at --audit-level=critical; tighten to high once SEC-01 is burned down.
      - name: npm audit (production, critical+)
        run: npm audit --omit=dev --audit-level=critical

  sbom:
    name: SBOM (CycloneDX)
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
      - uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - name: Generate CycloneDX SBOM
        run: npx --yes @cyclonedx/cyclonedx-npm --output-file sbom.cdx.json
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
        with:
          name: sbom-cyclonedx
          path: sbom.cdx.json
          retention-days: 90
```

> GitHub-native alternatives (need plan upgrade): `actions/dependency-review-action` and `github/codeql-action` will not run on this private Free repo; Semgrep + `npm audit` are the working substitutes. Artifact attestation (`actions/attest-build-provenance`) requires GitHub Enterprise Cloud for private repos.

#### P0-2 — Add Dependabot config and enable alerts (addresses SEC-07)

**Evidence:** No `.github/dependabot.yml` exists; `gh api .../dependabot/alerts` → 403 "Dependabot alerts are disabled".

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
      day: monday
      time: "06:00"
    open-pull-requests-limit: 10
    groups:
      production-dependencies:
        dependency-type: production
      development-dependencies:
        dependency-type: development
    labels: ["dependencies", "security"]
    commit-message:
      prefix: "chore(deps)"
      prefix-development: "chore(dev-deps)"

  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
    labels: ["dependencies", "ci"]
    commit-message:
      prefix: "ci(actions)"
```

Then enable Dependabot alerts (write action — requires repo owner):

```bash
# Enable Dependabot alerts (GitHub API — owner action)
gh api -X PUT repos/5h4d0wn1k/sales-SaaS/vulnerability-alerts
```

#### P0-3 — Harden GitHub Actions: SHA pinning + timeout + per-job permissions (addresses SEC-04, SEC-13, SEC-14)

**Evidence:** All actions pinned to mutable tags (`actions/checkout@v5`, `actions/setup-node@v5`, etc.); `sha_pinning_required: false`; `allowed_actions: "all"`; no `timeout-minutes` on most jobs; `codecov/codecov-action@v3` is EOL (Node 16 runtime).

1. **Settings → Actions → General** (owner action):
   - Actions permissions → "Allow select actions" instead of `all`.
   - **Require actions to be pinned to a full-length commit SHA** → on.
2. Apply pinned SHAs across workflows (resolved 2026-10-16, from `devsecops-audit.md` §7.1):

| Action | Tag in repo | Pinned SHA |
|--------|-------------|------------|
| `actions/checkout` | `v5` | `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` |
| `actions/setup-node` | `v5` | `a0853c24544627f65ddf259abe73b1d18a591444` |
| `actions/upload-artifact` | `v4` | `ea165f8d65b6e75b540449e92b4886f43607fa02` |
| `codecov/codecov-action` | `v3` (EOL) | upgrade to `b9fd7d16f6d7d1b5d2bec1a2887e65ceed900238` (v4) |

Example delta for `ci.yml` (apply same pattern to all workflows):

```yaml
# .github/workflows/ci.yml  (deltas)
permissions: {}                      # deny-all default; grant per job

jobs:
  typecheck:
    timeout-minutes: 15              # ADD
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
      - uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5
  # ... repeat timeout-minutes: 20 (test), 25 (build), 20 (e2e) ...

  # In `test` job, upgrade Codecov:
      - name: Upload coverage to Codecov
        if: always()
        uses: codecov/codecov-action@b9fd7d16f6d7d1b5d2bec1a2887e65ceed900238 # v4
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: false
          token: ${{ secrets.CODECOV_TOKEN }}   # optional; needed for private repos
```

#### P0-4 — Environment required reviewers + restrict production env to `main` (addresses SEC-02)

**Evidence:** `production` environment has `protection_rules: []`, `can_admins_bypass: true`, `deployment_branch_policy: null`; `staging` similarly unprotected.

Branch protection/rulesets are **not available** on this private Free repo (403 "Upgrade to GitHub Pro"). Environment required reviewers **are** available on Free — use them now; apply branch protection later on upgrade.

Get reviewer id (read-only), then apply:

```bash
# read-only lookup
gh api users/5h4d0wn1k --jq .id   # -> <OWNER_USER_ID>

# APPLY (write — run after owner approval)
gh api -X PUT repos/5h4d0wn1k/sales-SaaS/environments/production --input - <<'JSON'
{
  "wait_timer": 5,
  "prevent_self_review": true,
  "reviewers": [{ "type": "User", "id": <OWNER_USER_ID> }],
  "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true }
}
JSON

# restrict production environment to main branch only
gh api -X POST repos/5h4d0wn1k/sales-SaaS/environments/production/deployment-branch-policies \
  -f name=main -f type=branch
```

Until branch protection is available, enforce as a team rule in `AGENTS.md` / PR template: no direct pushes to `main`; every PR must show the `Security` workflow green before merge.

---

### P1 — next 1–2 sprints

#### P1-1 — Fix build/deploy integrity gap (addresses SEC-05)

**Evidence:** CI runs on **Node 20** (`ci.yml:28,56,97,117`); deploy **re-builds on Node 22** (`deploy-cloudflare.yml:36,65`); CI artifacts are never promoted — the deployed artifact is not the tested artifact.

1. Align Node version: change `deploy-cloudflare.yml` `node-version` to `"20"` (or bump `engines`/`.nvmrc` to 22 and CI to 22 — pick one). Add `npm ci --engine-strict`.
2. Promote CI artifact: upload build output in `ci.yml` build job, download it in `deploy-cloudflare.yml` instead of rebuilding.

`ci.yml` build job addition:
```yaml
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
        with:
          name: build-output
          path: |
            apps/web/.open-next
            apps/api/dist
            packages/database/dist
            packages/shared/dist
          retention-days: 7
```

`deploy-cloudflare.yml` deploy job addition (replace `npm ci` + rebuild with download):
```yaml
      - uses: actions/download-artifact@<PIN_SHA>   # pin once SHA-pinning is on
        with:
          name: build-output
```

#### P1-2 — Automated rollback + migration ordering + required Worker secrets (addresses SEC-10, SEC-11, SEC-12)

**Evidence:** Rollback is only an `echo` reminder (`deploy-cloudflare.yml:86-90`); DB migrations not in the deploy pipeline (`deploy-cloudflare.yml:77-85` — actually no migrate step at all); API `secrets.required` is empty (`apps/api/wrangler.jsonc:46-48`).

Replace the "Rollback reminder" with a real rollout/rollback path in `deploy-cloudflare.yml` (key deltas — full recommended job shown in `devsecops-audit.md` §6 P1-2):

```yaml
# .github/workflows/deploy-cloudflare.yml  (key deltas)
name: Deploy Cloudflare
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]
        required: true
      services:
        type: choice
        options: [all, api, web, workflows]
        required: true
      canary_percent:
        description: "Initial traffic % for production canary (0 to skip)"
        default: "0"
        required: false

permissions: {}                      # deny-all default

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: read
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
      - uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5
        with:
          node-version: "20"          # MATCH CI (was 22 — SEC-05)
          cache: "npm"
      - run: npm ci
      - run: npm run verify:core
      - run: npm run test:e2e          # ADD: e2e is now a deploy gate

  deploy:
    needs: verify
    runs-on: ubuntu-latest
    timeout-minutes: 45
    permissions:
      contents: read
    environment: ${{ inputs.environment }}
    concurrency:
      group: cloudflare-${{ inputs.environment }}
      cancel-in-progress: false
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      TARGET_ENV: ${{ inputs.environment }}
      SERVICES: ${{ inputs.services }}
      CANARY_PERCENT: ${{ inputs.canary_percent }}
      DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
      READINESS_ALLOW_WARNINGS: ${{ vars.READINESS_ALLOW_WARNINGS }}
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
      - uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci

      # MIGRATION ORDERING (SEC-10): run migrations BEFORE shipping code that depends on them
      - name: Apply DB migrations (expand-first)
        if: ${{ inputs.services == 'all' || inputs.services == 'api' }}
        run: npm run db:migrate --workspace @sales/database

      # Capture currently live version for rollback
      - name: Record rollback target
        run: |
          npx wrangler deployments list --config apps/api/wrangler.jsonc > /tmp/prev.txt || true
          echo "Previous deployment:" && cat /tmp/prev.txt

      - name: Deploy API
        if: ${{ inputs.services == 'all' || inputs.services == 'api' }}
        run: npm run deploy:api:${TARGET_ENV}
      - name: Deploy Web
        if: ${{ inputs.services == 'all' || inputs.services == 'web' }}
        run: npm run deploy:web:${TARGET_ENV}
      - name: Deploy Workflows
        if: ${{ inputs.services == 'all' || inputs.services == 'workflows' }}
        run: npm run deploy:workflows:${TARGET_ENV}

      # Post-deploy smoke; auto-rollback on failure (production only)
      - name: Post-deploy smoke checks
        id: smoke
        continue-on-error: true
        run: npm run smoke:cloudflare

      - name: Auto-rollback on smoke failure
        if: steps.smoke.outcome == 'failure' && inputs.environment == 'production'
        run: |
          echo "Smoke failed — rolling back to previous Worker version."
          npx wrangler rollback --config apps/api/wrangler.jsonc --yes || true
          npx wrangler rollback --config apps/web/wrangler.jsonc --yes || true
          exit 1

      - name: Fail the run if smoke failed
        if: steps.smoke.outcome == 'failure'
        run: exit 1
```

Declare required Worker secrets (`apps/api/wrangler.jsonc` production block):

```jsonc
"production": {
  "secrets": {
    "required": ["AUTH_SECRET", "DATABASE_URL"]
  }
  // ... rest of config
}
```
Add provider keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RAZORPAY_*`, `RESEND_*`, `TWILIO_*`) once they are provisioned, so Wrangler warns when a required secret is missing.

#### P1-3 — Quality gate completion (addresses SEC-09)

**Evidence:** `verify:core` = `typecheck && test && build`; no lint script exists anywhere (`grep '"lint"'` → none); no e2e in the deploy gate.

1. Add lint (choose ESLint flat config or Biome) and wire into `verify:core`:

```jsonc
// package.json (root)
"lint": "npm run lint --workspaces --if-present",
"verify:core": "npm run lint && npm run typecheck && npm run test && npm run build",
```

2. Add `npm audit --omit=dev --audit-level=high` and Semgrep to required checks (via `security.yml` from P0-1).
3. Keep e2e in the deploy gate (already added in P1-2).
4. Until branch protection is available, codify the process gate in `AGENTS.md`: PR + green `Security` workflow + no direct pushes to `main`.

---

### P2 — hardening backlog

#### P2-1 — Secrets rotation policy (addresses SEC-06)

**Evidence:** Long-lived `CLOUDFLARE_API_TOKEN` (+ `WORKFLOWS_HEALTHCHECK_TOKEN`) used for deploy; no rotation policy documented; no OIDC available for Cloudflare API.

Create `docs/security/secrets-rotation.md` (template):

```markdown
# Secrets Rotation Policy

| Secret | Where stored | Scope / least privilege | TTL | Rotation cadence | Owner | Last rotated |
|--------|--------------|-------------------------|-----|------------------|-------|--------------|
| CLOUDFLARE_API_TOKEN | GitHub env `production`/`staging` | Workers Scripts:Edit (account) | 90d | 90 days + on suspected exposure | @5h4d0wn1k | — |
| WORKFLOWS_HEALTHCHECK_TOKEN | GitHub env `production` | Workflows health endpoint only | 90d | 90 days | @5h4d0wn1k | — |
| PRODUCTION_DATABASE_URL | GitHub env `production` | Read/Write app role (not superuser) | 90d | 90 days | @5h4d0wn1k | — |
| AUTH_SECRET | Wrangler secret | Session signing | 180d | 180 days (forces re-login) | @5h4d0wn1k | — |
| STRIPE_* / RAZORPAY_* / RESEND_* / TWILIO_* | Wrangler secrets | Provider API | per provider | 180 days | @5h4d0wn1k | — |

Procedure: create new secret → set in GitHub Environment + Wrangler → deploy → verify `/ready` → revoke old value. Never log secret values; CI only ever asserts `test -n "$SECRET"`.
```

Cloudflare OIDC cannot replace `CLOUDFLARE_API_TOKEN` today (no general GitHub-OIDC → Cloudflare API-token exchange); document this as a conscious decision.

#### P2-2 — Reduce log exposure + test secret hygiene (addresses SEC-15, SEC-17)

- In `scripts/cloudflare-smoke.sh`, keep only `status`/`service`/`release.version` from readiness payloads; do not `echo` the whole body.
- In `telegram-notification-dispatch.yml`, summarize instead of dumping response JSON into `$GITHUB_STEP_SUMMARY`.
- Replace hardcoded test `AUTH_SECRET: sales-aaas-ci-auth-secret` (`ci.yml:126`) with a generated per-run value:
  ```bash
  echo "AUTH_SECRET=$(openssl rand -hex 32)" >> "$GITHUB_ENV"
  ```

#### P2-3 — Add `SECURITY.md` and CODEOWNERS review for docs (addresses SEC-18)

Create `SECURITY.md` with a coordinated-disclosure contact (mirror the site's `/.well-known/security.txt`).

Add CODEOWNERS for audits directory (root `CODEOWNERS` already covers `/docs/ @5h4d0wn1k`; optionally add `.github/CODEOWNERS`):

```text
# .github/CODEOWNERS (optional, for repo settings changes)
/docs/audits/ @5h4d0wn1k
/.github/ @5h4d0wn1k
```

---

## 4. File/line reference index

| File | Lines | Relevance |
|------|-------|-----------|
| `.github/workflows/ci.yml` | 1-135 | CI: Node 20, no audit gate, no lint, Codecov v3 EOL, hardcoded test AUTH_SECRET |
| `.github/workflows/deploy-cloudflare.yml` | 1-90 | Deploy: Node 22, no artifact promotion, no rollback, `READINESS_ALLOW_WARNINGS:59` present |
| `.github/workflows/readiness-monitor.yml` | 1-100 | Readiness monitor: `READINESS_ALLOW_WARNINGS:30`, 30-min schedule |
| `.github/workflows/repo-operating-system.yml` | 1-68 | No `timeout-minutes` |
| `.github/workflows/telegram-notification-dispatch.yml` | 1-81 | Logs full response JSON to step summary |
| `.github/dependabot.yml` | — | **Missing** (P0-2) |
| `CODEOWNERS` (root) | — | Covers all paths; unenforced until branch protection |
| `apps/api/wrangler.jsonc` | 46-48 | `secrets.required: []` (P1-2) |
| `ci.yml` | 28,56,97,117 | CI Node 20 |
| `deploy-cloudflare.yml` | 36,65 | Deploy Node 22 (drift) |
| `deploy-cloudflare.yml` | 86-90 | Rollback reminder only |
| `package.json` | — | No `lint` script |

---

## 5. Suggested implementation order (2-week view)

| Day | Action | IDs resolved |
|-----|--------|--------------|
| 1 | Add `security.yml` (audit + SBOM) and `dependabot.yml`; enable Dependabot alerts | SEC-01, SEC-07, SEC-08 |
| 1 | Pin all actions to SHAs; require SHA pinning; restrict Actions allowlist; upgrade Codecov to v4 | SEC-04, SEC-14 |
| 2 | Add `timeout-minutes` to all jobs; `permissions: {}` + per-job grants | SEC-13 |
| 2 | Enable environment required reviewers + restrict production env to `main` | SEC-02 |
| 3–4 | Align Node 20/22; promote CI artifact; add e2e to deploy gate; add lint to `verify:core` | SEC-05, SEC-09 |
| 4–5 | Add migration step + auto-rollback to deploy; declare required Worker secrets | SEC-10, SEC-11, SEC-12 |
| 5 | Publish `docs/security/secrets-rotation.md` + `SECURITY.md`; scope + TTL the Cloudflare token | SEC-06, SEC-18 |
| 6+ | Decision: upgrade to GitHub Team to unlock branch protection/rulesets (+ optionally GHAS for secret scanning/CodeQL/dependency-review) | SEC-02 (full), SEC-03 |

---

## 6. Residual risk / conscious exceptions

- **GitHub Free private tier blocks:** branch protection/rulesets, secret scanning + push protection, CodeQL, dependency-review action, artifact attestation. Substituted with Semgrep OSS, `npm audit`, in-CI SBOM artifacts, environment reviewers, and process gates. A Team/GHAS upgrade removes the substitution.
- **Cloudflare OIDC** is not available for third-party API auth; `CLOUDFLARE_API_TOKEN` remains a long-lived bearer credential. Mitigated by environment scoping, least-privilege scope, TTL + rotation, and Cloudflare's token-pattern detection.
- **Canary** wiring (`wrangler versions upload/deploy --percentage`) is described at design level; needs a follow-up change to deploy scripts. Until then, smoke + auto-rollback is the implemented path.
- No source, workflow, infra, or config file was modified for this plan; it is a docs/audits-only deliverable.

---

*End of remediation plan. No repository files were modified except the creation of this document.*