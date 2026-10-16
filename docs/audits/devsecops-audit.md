# DevSecOps / CI-CD & Supply-Chain Audit — sales-SaaS

- **Repository:** `5h4d0wn1k/sales-SaaS` (private, default branch `main`)
- **Audit date:** 2026-10-16
- **Auditor mode:** Read-only. No existing files were modified, no repo settings changed, nothing pushed.
- **Deliverable:** this report only (`docs/audits/devsecops-audit.md`).
- **Requested by:** platform / DevSecOps review of CI-CD and supply-chain posture.

---

## 1. Executive summary

The repository has a **good least-privilege foundation** (all five workflows set top-level `permissions: contents: read`, the org/repo default `GITHUB_TOKEN` permission is `read`, PR workflows use `pull_request` — never `pull_request_target` — and `npm ci` is used against a committed lockfile). However, the **supply-chain and release-safety controls are largely absent**, and several of them are blocked by the fact that the repo is a **private repository on the GitHub Free plan**.

Top-level risk themes:

1. **No dependency-vulnerability gate.** A read-only `npm audit --omit=dev` reports **15 production vulnerabilities (5 critical, 7 high, 3 moderate)** including a `next-auth` auth *fail-open* advisory and critical `@auth/core` / `next` / `tar` issues. Nothing in CI fails on this.
2. **Production can be deployed without any human approval.** Both GitHub Environments (`production`, `staging`) have `protection_rules: []`, `can_admins_bypass: true`, and `deployment_branch_policy: null`.
3. **No branch protection / rulesets** — the API returns `403 "Upgrade to GitHub Pro or make this repository public"`. There are therefore **no required reviews, no required status checks, and no force-push protection**, and the existing `CODEOWNERS` is unenforced.
4. **Actions are pinned to mutable tags, not commit SHAs**, `sha_pinning_required: false`, and `allowed_actions: "all"`.
5. **The deployed artifact is not the artifact CI verified.** CI builds/tests on **Node 20** (`engines: 20.x`, `.nvmrc: 20`), but the deploy workflow re-builds on **Node 22** and promotes nothing from CI.
6. **No SAST, no SBOM, no provenance, no push protection, Dependabot disabled.** No CodeQL/Semgrep, no CycloneDX SBOM, no attestation, Dependabot alerts disabled, secret scanning disabled.
7. **Release safety is manual.** Rollback is an `echo` reminder; there is no canary/gradual rollout, no version pinning, and **DB migrations are not part of the deploy pipeline** despite a documented policy that requires migration discipline.
8. **Quality gate is partial.** `verify:core` = `typecheck && test && build` — **no lint (no lint script exists at all), no e2e**, and the deploy pipeline runs only `verify:core`.

**Bottom line:** the code-level CI hygiene is decent, but there is **no security gate, no approval gate, and no supply-chain integrity gate** between a commit and production. The 3 highest-ROI additions are the dependency/SBOM security gate, minimum Actions hardening (SHA pinning + allowlist + timeouts + token scoping), and environment/branch protection with an automated canary-and-rollback deploy.

---

## 2. Scope, method and evidence sources

Read directly:

- `.github/workflows/ci.yml`, `deploy-cloudflare.yml`, `readiness-monitor.yml`, `repo-operating-system.yml`, `telegram-notification-dispatch.yml`
- `package.json` (root) + `apps/{api,web,workflows}/package.json`, `packages/{database,shared}/package.json`
- `apps/api/wrangler.jsonc`, `apps/web/wrangler.jsonc`
- `scripts/cloudflare-smoke.sh`, `scripts/build-workspaces.sh`
- `playwright.config.ts`, `.nvmrc`, `.gitignore`, `CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE.md`, `AGENTS.md`
- `docs/platform/deploy-and-rollback-policy.md`, `.codex/scripts/repo_operating_system_audit.py`

Read-only GitHub API (via authenticated `gh`):

| Query | Result |
| --- | --- |
| `gh api repos/5h4d0wn1k/sales-SaaS` | private, `default_branch=main`, `security_and_analysis=null`, `delete_branch_on_merge=false`, `allow_auto_merge=false`, merge/rebase/squash all enabled |
| `.../branches/main/protection` | **403** "Upgrade to GitHub Pro or make this repository public" |
| `.../rulesets` | **403** (same) |
| `.../environments` | `production` & `staging`, `protection_rules: []`, `can_admins_bypass: true`, `deployment_branch_policy: null` |
| `.../dependabot/alerts` | **403** "Dependabot alerts are disabled for this repository." |
| `.../secret-scanning/alerts` | **404** "Secret scanning is disabled on this repository." |
| `.../vulnerability-alerts` | **404** |
| `.../actions/permissions` | `{"enabled":true,"allowed_actions":"all","sha_pinning_required":false}` |
| `.../actions/permissions/workflow` | `{"default_workflow_permissions":"read","can_approve_pull_request_reviews":false}` (good) |
| `npm audit --omit=dev` | 15 vulns: 3 moderate, 7 high, 5 critical |

Third-party Action SHAs were resolved from the GitHub API for the pinning appendix (§7.1).

---

## 3. Platform constraint: private repo on GitHub Free

Several requested controls are **not available** on a private repo on the Free plan. This is a hard constraint, not a misconfiguration, and it must shape the roadmap:

| Control | Available? | Evidence |
| --- | --- | --- |
| Branch protection rules | ❌ | `403 Upgrade to GitHub Pro` |
| Repository rulesets | ❌ | `403 Upgrade to GitHub Pro` |
| Required status checks / required reviews | ❌ (needs protection/rulesets) | same |
| Secret scanning + push protection | ❌ (private needs GHAS) | `secret-scanning/alerts` 404, feature "disabled" |
| Code scanning / CodeQL (GitHub-native) | ❌ (private needs GHAS) | `security_and_analysis: null` |
| Dependency review action | ❌ (private needs GHAS) | will not run on private w/o GHAS |
| Artifact attestations (`attest-build-provenance`) | ❌ (private needs GHEC) | not enabled |
| Dependabot alerts & version updates | ✅ free (currently **off**) | `dependabot/alerts` 403 "disabled" |
| Environment protection rules (reviewers) | ✅ free | env exists, `protection_rules: []` |
| Actions allowlist + require SHA pinning | ✅ | `allowed_actions: all`, `sha_pinning_required: false` |
| Semgrep OSS SAST via CI | ✅ | runs on free private |
| `npm audit` / `audit-ci` / CycloneDX SBOM as artifacts | ✅ | no Actions-ecosystem requirement |

> **Decision required:** either upgrade to GitHub Team (to unlock branch protection + rulesets), or mitigate in-CI (this report provides both paths). Making the repo public would also unlock secret scanning/push protection and CodeQL, but is a product decision and out of scope here.

---

## 4. Findings

Severity: **Critical / High / Medium / Low / Info**. "Evidence" cites the exact file/line or command output.

| ID | Sev | Area | Finding | Evidence |
| --- | --- | --- | --- | --- |
| SEC-01 | **High** | Supply chain | No dependency vulnerability gate in any workflow. `npm audit --omit=dev` = **15 prod vulns (5 critical, 7 high, 3 moderate)**, incl. `next-auth` critical "auth checks fail open", `@auth/core` critical, `next` critical, `tar` critical, `sharp`/`source-map-js`/`postcss`/`hono`/`axios` high. | `npm audit --omit=dev`; no `audit` step in `.github/workflows/*` |
| SEC-02 | **High** | Deploy safety | Production deploys need **no approval**. `production` environment has `protection_rules: []`, `can_admins_bypass: true`, `deployment_branch_policy: null` (any branch deployable). | `gh api .../environments` |
| SEC-03 | **High** | Repo settings | **No branch protection / rulesets** possible on free private repo → no required reviews, no required status checks, no force-push/delete protection. `CODEOWNERS` is therefore **advisory only**. | `gh api .../branches/main/protection` → 403; `CODEOWNERS` present |
| SEC-04 | **High** | Workflow security | All actions pinned to **mutable tags** (`@v5`, `@v4`, `@v3`), not commit SHAs; `sha_pinning_required:false`; `allowed_actions:"all"`. Supply-chain / tag-hijack exposure. | workflow files; `gh api .../actions/permissions` |
| SEC-05 | **High** | Build integrity | Deploy **re-builds on Node 22** while CI verifies on **Node 20** (`engines: 20.x`, `.nvmrc: 20`); **CI artifacts are never promoted** — the deployed artifact is not the tested artifact. | `ci.yml:28,56,97,117` = `'20'`; `deploy-cloudflare.yml:36,65` = `"22"`; commit `bbfe57b` |
| SEC-06 | **Medium** | Credentials | Long-lived `CLOUDFLARE_API_TOKEN` (+ `WORKFLOWS_HEALTHCHECK_TOKEN`) used for deploy; **no rotation policy documented**; no OIDC (not available for the Cloudflare API). Token is environment-scoped but never expires in code. | `deploy-cloudflare.yml:52,58`; no rotation doc |
| SEC-07 | **Medium** | Supply chain | **No secret scanning / push protection**, **Dependabot alerts disabled**, **no `dependabot.yml`**. | `gh api .../secret-scanning/alerts` 404; `.../dependabot/alerts` 403; no `dependabot.yml` |
| SEC-08 | **Medium** | Supply chain | **No SAST** (CodeQL/Semgrep), **no SBOM**, **no provenance/attestation**. | no codeql/semgrep/sbom/attest files/workflows |
| SEC-09 | **Medium** | Quality gates | `verify:core` = `typecheck && test && build` — **no lint** (no `lint` script exists anywhere), **no e2e**. Deploy runs only `verify:core`. | `package.json:29`; `grep '"lint"'` → none; `deploy-cloudflare.yml:41` |
| SEC-10 | **Medium** | Deploy safety | **DB migrations are not part of the deploy pipeline** and there is no ordering gate. Policy (`deploy-and-rollback-policy.md:40`) requires migration discipline but nothing enforces it before `wrangler deploy`. | `deploy-cloudflare.yml:77-85`; only CI test job runs `db:migrate` |
| SEC-11 | **Medium** | Deploy safety | **Rollback is a printed reminder**; no automated rollback, no canary/gradual rollout, no version pinning (`wrangler deploy` = immediate 100% cutover). | `deploy-cloudflare.yml:86-90` |
| SEC-12 | **Medium** | Deploy safety | API production declares `"secrets": { "required": [] }` — Wrangler will **not** warn when required prod secrets (`AUTH_SECRET`, `DATABASE_URL`, provider keys) are missing. | `apps/api/wrangler.jsonc:46-48` |
| SEC-13 | **Low** | Workflow security | No `timeout-minutes` on `ci.yml` (4 jobs), both `deploy-cloudflare.yml` jobs, or `repo-operating-system.yml` → default 360 min. (`readiness-monitor` and `telegram` correctly set 5.) | workflow files |
| SEC-14 | **Low** | Workflow security | `codecov/codecov-action@v3` is **EOL (Node 16 runtime)** and `fail_ci_if_error: false` → coverage never gates. | `ci.yml:83-87` |
| SEC-15 | **Low** | Secret exposure | Full HTTP bodies/headers echoed to logs/step summaries (`cloudflare-smoke.sh` prints readiness payloads; telegram workflow writes response JSON to `$GITHUB_STEP_SUMMARY`). Low today; grows as payloads evolve. | `scripts/cloudflare-smoke.sh:139,147,155,163,168,176,182`; `telegram-notification-dispatch.yml:74-80` |
| SEC-16 | **Low** | Untrusted input | `${{ inputs.* }}` interpolated directly into `run:` commands (deploy lines 79/82/85) and into `environment:`. Inputs are `type: choice`, so residual risk is low, but violates the GitHub-recommended "pass via `env`" pattern. | `deploy-cloudflare.yml:79,82,85` |
| SEC-17 | **Low** | Secret exposure | Hardcoded test `AUTH_SECRET: sales-aaas-ci-auth-secret` in the e2e job. Test-only, but normalizes secret literals in CI. | `ci.yml:126` |
| SEC-18 | **Info** | Governance | No repo `SECURITY.md` / coordinated-disclosure policy file (the *site* publishes `/.well-known/security.txt`, but the repo has none). | `find -iname SECURITY*` → none |

### Positive controls already in place (keep)

- Least-privilege tokens: every workflow sets `permissions: contents: read` (`ci.yml:9-10`, `deploy:23-24`, `readiness:8-9`, `repo-os:11-12`, `telegram:8-9`).
- Repo default `GITHUB_TOKEN` is `read`; `can_approve_pull_request_reviews=false`.
- **No `pull_request_target`** anywhere — the dangerous pwn-request pattern is absent.
- `concurrency` groups present on CI, readiness, telegram, repo-os; deploy's `deploy` job scopes `cloudflare-${{ inputs.environment }}` with `cancel-in-progress: false` (correct for deploys).
- `npm ci` used everywhere with a committed `package-lock.json` (lockfile integrity).
- Deploy is gated behind `workflow_dispatch` + a `verify` job that requires an environment.
- Scheduled production readiness monitor (every 30 min) with optional chat/webhook alerting and `/health`, `/ready`, sitemap, robots, OG/Twitter image, and `security.txt` checks.

---

## 5. Detailed notes by requested topic

### 5.1 Workflow security
- **Permissions:** good baseline (`contents: read`). No workflow requests `id-token`, `packages`, or `contents: write`. No over-broad grants found. Recommend adding `permissions: {}` at workflow top and granting per-job, to make the default deny-all explicit.
- **Pinning:** all five workflows use tag refs (SEC-04). `codecov/codecov-action@v3` is additionally EOL (SEC-14).
- **`pull_request_target`:** not used → no pwn-request exposure. `repo-operating-system.yml` triggers on bare `pull_request` and executes repo scripts; this is safe because it does not check out PR head with secrets, but the pattern should be kept that way.
- **Secret exposure in logs:** command string `test -n "$CLOUDFLARE_API_TOKEN"` prints nothing (good); the smoke script and telegram summary echo bodies (SEC-15). No `set -x`/`echo $SECRET` patterns.
- **Untrusted input:** SEC-16 (low, choice-typed inputs).
- **Concurrency:** present and sensible; `verify` job in deploy lacks a group (minor).
- **Timeouts:** missing on most jobs (SEC-13).

### 5.2 Long-lived credentials
- Deploy consumes `secrets.CLOUDFLARE_API_TOKEN` and `secrets.WORKFLOWS_HEALTHCHECK_TOKEN` from the environment (`deploy-cloudflare.yml:52,58`). Readiness/telegram consume additional provider secrets via `||` fallbacks.
- **Cloudflare OIDC reality:** Cloudflare's official GitHub Actions guidance still uses a repository/environment secret `CLOUDFLARE_API_TOKEN` (see Cloudflare "Workers Previews → GitHub Actions" docs). There is **no general GitHub-OIDC → Cloudflare API-token exchange** on the free tier; Cloudflare OIDC is used for Cloudflare Access / Workers Builds, not third-party API auth. So OIDC cannot replace `CLOUDFLARE_API_TOKEN` here.
- **Mitigations that *are* possible:** (a) create the token with the narrowest scope (Account → Workers Scripts → Edit, plus Workers KV/R2/Hyperdrive only if used) rather than a broad "Edit Cloudflare Workers" template; (b) set a **token expiry / TTL** in the Cloudflare dashboard and rotate on a schedule; (c) keep tokens at **environment scope** (already true) so they are not exposed to fork PRs; (d) note that Cloudflare now stamps API tokens with a **detectable pattern** for secret scanners (changelog 2026-04-10) — but GitHub secret scanning needs GHAS on private repos, so enable detection via the platform upgrade or an in-CI scanner.
- **GitHub-side:** if the repo is upgraded, adding `id-token: write` + a Cloudflare-compatible OIDC trust is still not usable for `wrangler` today; document this so the gap is a conscious decision.

### 5.3 Supply chain
- No Dependabot config, alerts off, security updates off.
- No dependency review, no `npm audit`/`audit-ci`, no license check.
- Lockfile committed and `npm ci` used (good), but no `--ignore-scripts` hardening and no SBOM/attestation.
- No SAST.
- `overrides` in root `package.json` pin some transitive deps (`axios`, `esbuild`, `postcss`, `qs`, `uuid`, `follow-redirects`) — helpful, but `next-auth`, `hono`, `sharp`, `source-map-js`, `tar` remain vulnerable (SEC-01).

### 5.4 Branch protection & repo settings
- Confirmed blocked on free private tier (§3). `delete_branch_on_merge=false`, `allow_auto_merge=false`. CODEOWNERS is decorative until protection/rulesets are enabled.

### 5.5 Environment protection rules
- `production`/`staging` exist but have **no required reviewers, no wait timer, no branch policy** (SEC-02).

### 5.6 Quality gates
- `verify:core` = `npm run typecheck && npm run test && npm run build` (`package.json:29`).
- Covers: typecheck (per workspace), unit tests (root vitest + workspace vitest), build (custom `build-workspaces.sh`).
- **Does not cover:** lint (no lint tooling at all), e2e in the deploy path, dependency audit, SAST, SBOM, license, coverage gating. CI *does* run an e2e smoke job, but that job is **not part of the deploy gate**.
- Node/engine drift (SEC-05): `engines: 20.x` + `.nvmrc: 20` vs deploy `node-version: "22"`.

### 5.7 Deploy safety
- `deploy-cloudflare.yml` = manual dispatch → `verify:core` → `wrangler deploy` (API, then Web, then Workflows) → `npm run smoke:cloudflare` → echo rollback advice.
- No canary/gradual rollout, no version pin, no automated rollback (SEC-11).
- Migrations not in the pipeline (SEC-10); API secrets not declared required (SEC-12).
- Post-deploy smoke and a 30-min readiness monitor **do** exist (good), but the smoke step runs before the rollback reminder and cannot trigger rollback.

### 5.8 Secrets rotation
- No rotation policy doc; no cadence; no owner; no expiry enforcement. `docs/platform/deploy-and-rollback-policy.md` mentions rollback, not rotation. `docs/product/*` references "rotation cadence" as a *product feature/roadmap*, not an operational policy for the repo's own CI secrets.

---

## 6. Prioritized remediation plan

Ordered by ROI. **P0** = do first (highest risk reduction / lowest effort). Copy-pasteable YAML follows each item.

### P0-1 — Add a dependency + SBOM security gate (addresses SEC-01, SEC-08)
Runs on PRs and `main`, fails on high/critical, and produces a CycloneDX SBOM artifact. Works on free private repos.

`.github/workflows/security.yml`
```yaml
name: Security

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: "0 6 * * 1" # weekly, catches new advisories against unchanged deps

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
      # Fail the build on high/critical production vulnerabilities.
      # Start at --audit-level=critical, tighten to high once SEC-01 is burned down.
      - name: npm audit (production, high+)
        run: npm audit --omit=dev --audit-level=high

  sast:
    name: SAST (Semgrep OSS)
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
      - uses: actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065 # v5
        with:
          python-version: "3.x"
      - name: Install Semgrep
        run: pip install "semgrep==1.95.0"   # pin; bump deliberately
      - name: Run Semgrep (OSS rules, exit on findings)
        run: semgrep scan --config "p/ci" --error --sarif --output semgrep.sarif
      - name: Upload SARIF artifact
        if: always()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
        with:
          name: semgrep-sarif
          path: semgrep.sarif
          if-no-files-found: ignore
          retention-days: 14

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

> **GitHub-native alternatives (need plan upgrade):** on a public repo or with GHAS you can additionally enable `.github/workflows/codeql.yml` (`github/codeql-action@ce5e7eeac396d720fe2d802714996c8ce561e311 # v3`) and `actions/dependency-review-action`. On this private free repo they will not run, so Semgrep + `npm audit` are the working substitutes. Artifact attestation (`actions/attest-build-provenance@e8998f949152b193b063cb0ec769d69d929409be # v2`) requires GitHub Enterprise Cloud for private repos.

### P0-2 — Add Dependabot (addresses SEC-07)
Dependabot version updates and alerts are **free**; alerts are currently disabled and must be turned on in settings.

`.github/dependabot.yml`
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
      day: monday
      time: "06:00"
      timezone: "Asia/Kolkata"
    open-pull-requests-limit: 10
    versioning-strategy: increase
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
Enable alerts (read-only command shown in §6 P0-4) — **requires the repo owner** to run the write API/UI.

### P0-3 — Harden Actions + token scope (addresses SEC-04, SEC-13, SEC-14)
1. In **Settings → Actions → General**, set:
   - *Actions permissions* → "Allow select actions" (allow GitHub-authored, `codecov/codecov-action`, `anchore/*`, verified marketplace only) instead of `all`.
   - *Require actions to be pinned to a full-length commit SHA* → **on**.
2. Upgrade Codecov and pin everything (see §7.1 for the full SHA table). Example hardened `ci.yml` changes:

```yaml
# .github/workflows/ci.yml  (deltas only)
permissions: {}                       # explicit deny-all default; grant per job

jobs:
  typecheck:
    timeout-minutes: 15               # ADD
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
      - uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5

  # ...repeat timeout-minutes: 20 (test), 25 (build), 20 (e2e)
  e2e:
    permissions:
      contents: read
    steps:
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4

  # replace the coverage step in `test` with:
      - name: Upload coverage to Codecov
        if: always()
        uses: codecov/codecov-action@b9fd7d16f6d7d1b5d2bec1a2887e65ceed900238 # v4 (v3 is EOL/Node16)
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: false
          token: ${{ secrets.CODECOV_TOKEN }}   # optional; needed for private repos
```

### P0-4 — Environment + branch protection (addresses SEC-02, SEC-03)
**Environment required reviewers (available on free tier).** First get the reviewer user id, then apply:

```bash
# read-only lookup
gh api users/5h4d0wn1k --jq .id

# APPLY (write — run only after owner approval):
gh api -X PUT repos/5h4d0wn1k/sales-SaaS/environments/production --input - <<'JSON'
{
  "wait_timer": 5,
  "prevent_self_review": true,
  "reviewers": [{ "type": "User", "id": <OWNER_USER_ID> }],
  "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true }
}
JSON
# then restrict the environment to main:
gh api -X POST repos/5h4d0wn1k/sales-SaaS/environments/production/deployment-branch-policies \
  -f name=main -f type=branch
```
**Branch protection (NOT available on free private — will 403).** If/when the repo is upgraded to Team (or made public), apply:

```bash
gh api -X PUT repos/5h4d0wn1k/sales-SaaS/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Type Check", "Unit Tests", "Build", "E2E Smoke", "Dependency audit (prod)", "SAST (Semgrep OSS)"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_code_owner_reviews": true,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
```
Until then, mitigate the missing gate with the process rule in §6 P1-4 (no direct pushes to `main`; PRs must show the `Security` workflow green).

### P1-1 — Fix the build/deploy integrity gap (addresses SEC-05)
Make CI and deploy use the **same Node version** and **promote the CI-built artifact** instead of rebuilding.

```yaml
# .github/workflows/ci.yml — build job
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
        with:
          name: build-output
          path: |
            apps/web/.open-next
            apps/api/dist
            packages/database/dist
            packages/shared/dist
          retention-days: 7

# .github/workflows/deploy-cloudflare.yml — deploy job
      - uses: actions/download-artifact@<PIN_SHA> # same artifact CI verified
        with:
          name: build-output
```
And align Node: change `deploy-cloudflare.yml` `node-version` to `"20"` (or bump `engines`/`.nvmrc` to 22 and CI to 22 — pick one). Add `npm ci --engine-strict` to fail fast on drift.

### P1-2 — Automated rollback + canary + migration ordering (addresses SEC-10, SEC-11, SEC-12)
Replace the "Rollback reminder" with a real, pinned rollout and rollback path. Wrangler supports uploading a version and deploying it at a percentage, plus `wrangler rollback`.

```yaml
# .github/workflows/deploy-cloudflare.yml  (hardened, key deltas)
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
        default: "10"
        required: false

permissions: {}                    # deny-all by default

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
          node-version: "20"        # MATCH CI (was 22 — SEC-05)
          cache: "npm"
      - run: npm ci
      - run: npm run verify:core
      - run: npm run test:e2e       # ADD: e2e is now a deploy gate (SEC-09)

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
      TARGET_ENV: ${{ inputs.environment }}          # pass inputs via env (SEC-16)
      SERVICES: ${{ inputs.services }}
      CANARY_PERCENT: ${{ inputs.canary_percent }}
      NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}
      NEXT_PUBLIC_SITE_URL: ${{ vars.NEXT_PUBLIC_SITE_URL }}
      WEB_APP_URL: ${{ vars.WEB_APP_URL }}
      API_HEALTHCHECK_URL: ${{ vars.API_HEALTHCHECK_URL }}
      WORKFLOWS_HEALTHCHECK_URL: ${{ vars.WORKFLOWS_HEALTHCHECK_URL }}
      WORKFLOWS_HEALTHCHECK_TOKEN: ${{ secrets.WORKFLOWS_HEALTHCHECK_TOKEN }}
      READINESS_ALLOW_WARNINGS: ${{ vars.READINESS_ALLOW_WARNINGS }}
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
      - uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci

      # 0. MIGRATION ORDERING (SEC-10): run migrations BEFORE shipping code that
      #    depends on them, and never auto-rollback schema. Requires a prod DB URL.
      - name: Apply DB migrations (expand-first)
        if: ${{ inputs.services == 'all' || inputs.services == 'api' }}
        run: npm run db:migrate --workspace @sales/database
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}

      # 1. Capture the currently live version for rollback.
      - name: Record rollback target
        run: |
          npx wrangler deployments list --config apps/api/wrangler.jsonc > /tmp/prev.txt || true
          echo "Previous deployment:" && cat /tmp/prev.txt

      # 2. Deploy as before (services switch via env, not string interpolation)
      - name: Deploy API
        if: ${{ inputs.services == 'all' || inputs.services == 'api' }}
        run: npm run "deploy:api:${TARGET_ENV}"
      - name: Deploy Web
        if: ${{ inputs.services == 'all' || inputs.services == 'web' }}
        run: npm run "deploy:web:${TARGET_ENV}"
      - name: Deploy Workflows
        if: ${{ inputs.services == 'all' || inputs.services == 'workflows' }}
        run: npm run "deploy:workflows:${TARGET_ENV}"

      # 3. Post-deploy smoke. On failure, roll back automatically.
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
Notes:
- For a true percentage canary use `wrangler versions upload` then `wrangler versions deploy <version-id>@<n>%`; `CANARY_PERCENT` is reserved for that. If not implemented yet, keep the smoke+auto-rollback path (already a large improvement over the `echo`).
- Set `PRODUCTION_DATABASE_URL` as an **environment** secret, not a repo secret.
- Consider expand/contract migrations and forward-only schema with behavior rollback, per `docs/platform/deploy-and-rollback-policy.md:63-66`.

### P1-3 — Declare required Worker secrets (addresses SEC-12)
```jsonc
// apps/api/wrangler.jsonc  (production block)
"production": {
  "secrets": {
    "required": ["AUTH_SECRET", "DATABASE_URL"]
  },
  // ...
}
```
Add provider keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RAZORPAY_*`, `RESEND_*`, `TWILIO_*`) only once they are actually provisioned, so Wrangler warns when a required secret is missing.

### P1-4 — Quality gate completion (addresses SEC-09)
- Add a real lint step (choose **ESLint** flat config or **Biome**) and wire `lint` into `verify:core`:
  ```jsonc
  // package.json
  "lint": "npm run lint --workspaces --if-present",
  "verify:core": "npm run lint && npm run typecheck && npm run test && npm run build"
  ```
- Add `npm audit --omit=dev --audit-level=high` and Semgrep to the required checks.
- Keep e2e in the deploy gate (already added in P1-2).
- Until branch protection is available, make "PR + green `Security` + no direct pushes to `main`" an explicit team rule in `AGENTS.md` / PR template (the template already asks about rollback and canary — enforce it).

### P2 — Rotate long-lived secrets (addresses SEC-06, SEC-08, SEC-18)
- Create `docs/security/secrets-rotation.md` (template below) and set an actual TTL/rotation cadence for `CLOUDFLARE_API_TOKEN`, `WORKFLOWS_HEALTHCHECK_TOKEN`, provider keys, and `PRODUCTION_DATABASE_URL`.
- Scope the Cloudflare token to the minimum (Workers Scripts edit for account `07eae60a75b06661ea752a78cdf51565`; add KV/R2/Hyperdrive only if required).
- Add `SECURITY.md` with a disclosure contact (mirror the site's `security.txt`).

`docs/security/secrets-rotation.md` (new file, template)
```markdown
# Secrets Rotation Policy

| Secret | Where stored | Scope / least privilege | TTL | Rotation cadence | Owner | Last rotated |
| --- | --- | --- | --- | --- | --- | --- |
| CLOUDFLARE_API_TOKEN | GitHub env `production`/`staging` | Workers Scripts:Edit (account 07eae60a…) | 90d | Every 90 days + on any suspected exposure | @5h4d0wn1k | (date) |
| WORKFLOWS_HEALTHCHECK_TOKEN | GitHub env `production` | Workflows health endpoint only | 90d | 90 days | @5h4d0wn1k | (date) |
| PRODUCTION_DATABASE_URL | GitHub env `production` | Read/Write app role (not superuser) | 90d | 90 days | @5h4d0wn1k | (date) |
| AUTH_SECRET | Wrangler secret | Session signing | 180d | 180 days (forces re-login) | @5h4d0wn1k | (date) |
| STRIPE_* / RAZORPAY_* / RESEND_* / TWILIO_* | Wrangler secrets | Provider API | per provider | 180 days | @5h4d0wn1k | (date) |

Procedure: create the new secret → set it in GitHub Environment + Wrangler → deploy → verify `/ready` → revoke the old value. Never log secret values; CI only ever asserts `test -n "$SECRET"`.
```

### P2 — reduce log exposure (addresses SEC-15, SEC-17)
- In `scripts/cloudflare-smoke.sh`, keep only `status`/`service`/`release.version` from readiness payloads; do not `echo` the whole body. Same for the telegram workflow — summarize instead of dumping response JSON into the step summary.
- Replace hardcoded test `AUTH_SECRET` with a generated per-run value (`echo "AUTH_SECRET=$(openssl rand -hex 32)" >> "$GITHUB_ENV"`).

---

## 7. Appendices

### 7.1 Action pinning reference (resolved 2026-10-16)

| Action | Tag in repo | Pinned SHA | Note |
| --- | --- | --- | --- |
| actions/checkout | `v5` | `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` | used in all workflows |
| actions/setup-node | `v5` | `a0853c24544627f65ddf259abe73b1d18a591444` | |
| actions/setup-python | `v5` | `a26af69be951a213d495a4c3e4e4022e16d87065` | repo-os workflow |
| actions/upload-artifact | `v4` | `ea165f8d65b6e75b540449e92b4886f43607fa02` | |
| codecov/codecov-action | `v3` (EOL) | `ab904c41d6ece82784817410c45d8b8c02684457` | **upgrade to v4** `b9fd7d16f6d7d1b5d2bec1a2887e65ceed900238` |
| github/codeql-action | `v3` | `ce5e7eeac396d720fe2d802714996c8ce561e311` | needs GHAS/public |
| actions/dependency-review-action | `v4.9.0` | `2031cfc080254a8a887f58cffee85186f0e49e48` | needs GHAS/public |
| ossf/scorecard-action | `v2.4.3` | `4eaacf0543bb3f2c246792bd56e8cdeffafb205a` | optional |
| step-security/harden-runner | `v2` | `ccd8616d44fd3846e67624a50d5aad6d37bf2d25` | optional egress control |
| anchore/sbom-action | `v0` | `e22c389904149dbc22b58101806040fa8d37a610` | alternative to cyclonedx-npm |
| actions/attest-build-provenance | `v2` | `e8998f949152b193b063cb0ec769d69d929409be` | needs GHEC for private |

Tip: adopt `pinact` (`pinact run`) or `ratchet` to pin/refresh all SHAs mechanically, then enable "require SHA pinning" in repo settings.

### 7.2 Verification commands (read-only reproduction)

```bash
gh api repos/5h4d0wn1k/sales-SaaS --jq '{default_branch,visibility,delete_branch_on_merge}'
gh api repos/5h4d0wn1k/sales-SaaS/branches/main/protection           # 403 on free private
gh api repos/5h4d0wn1k/sales-SaaS/environments                       # protection_rules: []
gh api repos/5h4d0wn1k/sales-SaaS/actions/permissions                # allowed_actions/sha_pinning
gh api repos/5h4d0wn1k/sales-SaaS/actions/permissions/workflow       # default token perms
gh api repos/5h4d0wn1k/sales-SaaS/dependabot/alerts                  # 403 disabled
gh api repos/5h4d0wn1k/sales-SaaS/secret-scanning/alerts             # 404 disabled
npm audit --omit=dev
```

### 7.3 Suggested implementation order (2-week view)

| Day | Action | IDs resolved |
| --- | --- | --- |
| 1 | Add `security.yml` (audit + Semgrep + SBOM) and `dependabot.yml` | SEC-01, SEC-07, SEC-08 |
| 1 | Pin all actions to SHAs; require SHA pinning; restrict Actions allowlist; upgrade Codecov to v4 | SEC-04, SEC-14 |
| 2 | Add `timeout-minutes` to all jobs; `permissions: {}` + per-job grants | SEC-13 |
| 2 | Enable environment required reviewers + restrict production env to `main` | SEC-02 |
| 3–4 | Align Node 20/22; promote CI artifact; add e2e to deploy gate; add lint to `verify:core` | SEC-05, SEC-09 |
| 4–5 | Add migration step + auto-rollback to deploy; declare required Worker secrets | SEC-10, SEC-11, SEC-12 |
| 5 | Publish `docs/security/secrets-rotation.md` + `SECURITY.md`; scope + TTL the Cloudflare token | SEC-06, SEC-18 |
| 6+ | Decision: upgrade to Team to unlock branch protection/rulesets (+ optionally GHAS for secret scanning/CodeQL/dependency-review) | SEC-03 |

### 7.4 Residual risk / conscious exceptions

- **Cloudflare OIDC is not available** for third-party API auth; `CLOUDFLARE_API_TOKEN` remains a long-lived bearer credential. Mitigated by environment scoping, least-privilege scope, TTL + rotation, and Cloudflare's token-pattern detection.
- **No branch protection, CodeQL, secret scanning, dependency review, or artifact attestation** on a private free-tier repo. Substituted with Semgrep OSS, `npm audit`, in-CI SBOM artifacts, environment reviewers, and a process gate — a Team/GHAS upgrade removes the substitution.
- **Canary** is described at the design level; wiring `wrangler versions upload/deploy --percentage` needs a small follow-up change to the deploy scripts.

---

*End of audit. No repository files were modified except the creation of this report.*
