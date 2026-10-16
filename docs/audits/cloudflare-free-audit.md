# Cloudflare Free-Tier Adoption Audit

Read-only audit of the production Cloudflare account/zone for features that are **included on the Cloudflare Free plan** and that materially improve security, reliability, or observability.

- **Audit date:** 2026-10-16
- **Account:** `07eae60a75b06661ea752a78cdf51565` (Salesxgrowthx@gmail.com's Account)
- **Zone:** `salesxgrowth.com` (`efb771adc30d98e9f4ab171f65891b7c`, active, `type: full`)
- **Plan:** Cloudflare **Free Plan** (confirmed via `cf accounts subscriptions get` → `rate_plan.id = free`, `product.public_name = "Cloudflare Free Plan"`, `intent = FREE`, `page_rules = 3`)
- **Method:** read-only `cf` CLI queries (search/list/get), Cloudflare docs lookup. **No Cloudflare resource was changed.** The only file written is this document.

Legend for **Status**: ✅ enabled · ⚪ available, not enabled · 🔒 not free (paid) · ➖ not applicable / no traffic.

---

## 1. Executive summary

The zone has a solid, cheap baseline (Cloudflare proxy, always-on L3/L4 + L7 DDoS, TLS, aggressive caching, one working API rate-limit rule) but leaves several **security controls that cost $0** switched off.

Highest-value, zero-cost gaps found:

1. **WAF Managed Free Ruleset is not deployed** (`http_request_firewall_managed` entrypoint returns 404). This is the single biggest free security win.
2. **Bot Fight Mode is off** (`fight_mode: false`).
3. **HSTS is disabled**, **SSL mode is `full` (not `strict`)**, **Minimum TLS is `1.0`**, and **Always Use HTTPS is off**.
4. **DNSSEC is disabled**, and there are **no SPF/DKIM/DMARC DNS records**.
5. **No Notifications/Alerts** are configured (free DDoS/SSL/security alerts unused).
6. **No Web Analytics (RUM)**, **no Turnstile**, **no Email Routing**, **no Cloudflare Access**, **no Logpush**.
7. **The one free rate-limit rule may not be enforced** — it uses `http.host` + `cf.colo.id`, which are outside the documented Free-plan field set (see §6).
8. **R2 is not enabled** on the account.

Already-good posture: always-on DDoS (L3/L4 + L7), TLS 1.3, Automatic HTTPS Rewrites, Opportunistic Encryption, Brotli, HTTP/2+3, WebSockets, `nosniff`/privacy pass, Workers Logs (`observability.enabled`), Hyperdrive, Workflows, and a Cloudflare Free Managed Ruleset available for deployment.

---

## 2. Free-tier adoption table

### 2.1 Edge security (WAF, bots, DDoS, IP)

| Feature | Status | Free limit | Action | Exact steps |
|---|---|---|---|---|
| Cloudflare Managed Free Ruleset (WAF) | ⚪ Not deployed (entrypoint `http_request_firewall_managed` = 404) | Ruleset available on Free (ruleset `77454fe2d30c4220b5701f6fdfb893ba`, v74) | **Deploy it** | Dashboard → **Security → WAF → Managed rules → Deploy** *Cloudflare Managed Free Ruleset*. CLI: `cf rulesets entrypoint update http_request_firewall_managed -z salesxgrowth.com --rules '[{"action":"execute","expression":"true","description":"Deploy Cloudflare Managed Free Ruleset","action_parameters":{"id":"77454fe2d30c4220b5701f6fdfb893ba"}}]'` |
| WAF Custom Rules | ⚪ None (`http_request_firewall_custom` = 404) | **5 rules**, all actions except *Log*, no regex, 1 zone custom ruleset | Add brute-force/abuse rules | Dashboard → **Security → WAF → Custom rules → Create rule**. Suggested: *Managed Challenge* on `/api/auth/*` and `/api/contact/*`. CLI: `cf rulesets entrypoint update http_request_firewall_custom -z salesxgrowth.com --rules '[{"action":"managed_challenge","expression":"(starts_with(http.request.uri.path, \"/api/auth/\"))","description":"Challenge auth endpoints"}]'` |
| Bot Fight Mode | ⚪ Off (`fight_mode: false`) | Free | **Enable** | Dashboard → **Security → Bots → Bot Fight Mode → On**. CLI: `cf bot-management update -z salesxgrowth.com --fight-mode true` |
| Security Level | ✅ `medium` | Free, configurable | Keep `medium`; raise during incidents | `cf zones settings edit security_level -z salesxgrowth.com --body '{"value":"high"}'` |
| Under Attack mode | ⚪ Off | Free (emergency) | Document only; enable during L7 flood | `cf zones settings edit security_level -z salesxgrowth.com --body '{"value":"under_attack"}'` → revert to `medium` after |
| DDoS L3/L4 protection | ✅ On (`advanced_ddos: on`) | Free, always-on | No action | — |
| DDoS L7 managed protection | ✅ Present (managed `ddos_l7` ruleset) | Free, always-on | No action; add alert (§2.7) | — |
| IP Access Rules | ⚪ None | **50,000 rules** (block-by-country = Enterprise only) | Optional allow/block | Dashboard → **Security → WAF → Tools → IP Access Rules**. Prefer Custom Rules for new IP/geo rules |
| SSL/TLS mode | ⚪ `full` (not strict) | Free | Upgrade to **`strict`** | `cf zones settings edit ssl -z salesxgrowth.com --body '{"value":"strict"}'` |
| Always Use HTTPS | ⚪ `off` | Free | **Turn on** | `cf zones settings edit always_use_https -z salesxgrowth.com --body '{"value":"on"}'` |
| Automatic HTTPS Rewrites | ✅ `on` | Free | No action | — |
| Minimum TLS Version | ⚪ `1.0` | Free | Set to **`1.2`** | `cf zones settings edit min_tls_version -z salesxgrowth.com --body '{"value":"1.2"}'` |
| Opportunistic Encryption | ✅ `on` | Free | No action | — |
| TLS 1.3 | ✅ `on` | Free | No action | — |
| 0-RTT (connection resumption) | ⚪ `off` | Free (requires TLS 1.3; has replay caveat) | Enable if replay risk acceptable | `cf zones settings edit 0rtt -z salesxgrowth.com --body '{"value":"on"}'` |
| HSTS | ⚪ Disabled (`security_header.strict_transport_security.enabled = false`) | Free | **Enable** (start small) | `cf zones settings edit security_header -z salesxgrowth.com --body '{"value":{"strict_transport_security":{"enabled":true,"max_age":15552000,"include_subdomains":true,"preload":false,"nosniff":true}}}'` (raise `max_age` toward 31536000 + `preload` later) |
| Browser Check | ✅ `on` | Free | No action | — |
| `X-Content-Type-Options: nosniff` | ⚪ Not confirmed | Free (via HSTS `nosniff` flag or response header rule) | Covered by HSTS `nosniff` above | — |

### 2.2 Access / Zero Trust

| Feature | Status | Free limit | Action | Exact steps |
|---|---|---|---|---|
| Cloudflare Access | ⚪ Not enabled (`access.api.error.not_enabled`) | **Up to 50 users** (Zero Trust Free) | Enable + gate internal/staging | Enable at **https://one.dash.cloudflare.com** (choose team name). Then **Access → Applications → Add an application → Self-hosted**. Candidate targets: `sales-web-staging.salesxgrowth.workers.dev`, `sales-api-staging.salesxgrowth.workers.dev`, `sales-workflows-production.salesxgrowth.workers.dev`, and optionally app paths `/dashboard`, `/settings`, `/billing` |
| Access Service Tokens | ⚪ None | **50 tokens** (free) | Use for CI ↔ internal services | Zero Trust → **Access → Service Auth → Create Service Token**; send `CF-Access-Client-Id` / `CF-Access-Client-Secret` |
| Access Device Posture | ⚪ N/A | Supported with WARP on Zero Trust (limited free checks) | Optional | Requires WARP client deployment per device |
| Access mTLS | 🔒 **NOT free** | Enterprise / pay-as-you-go only | **Use service tokens instead** | See above — do not budget for mTLS on Free |
| Identity Providers | ⚪ Default (one-time PIN) | 50 IdPs free | Add Google/Microsoft SSO if desired | Zero Trust → **Settings → Authentication** |

### 2.3 Turnstile (bot/abuse on public forms)

| Feature | Status | Free limit | Action | Exact steps |
|---|---|---|---|---|
| Turnstile widgets | ⚪ None (`cf turnstile widgets list` = `[]`) | **20 widgets/account**, 10 hostnames/widget, unlimited challenges, 7-day analytics | Add widget(s) + server Siteverify | Dashboard → **Turnstile → Add widget** (hostname `salesxgrowth.com`, mode *Managed*). Integrate on `/contact`, `/get-started`, `/reset-password`, `/forgot-password`, and auth forms; verify server-side via Siteverify. CLI: `cf turnstile widgets create --name sales-web --domains salesxgrowth.com --mode managed` (confirm flag names with `cf turnstile widgets create --help`) |

### 2.4 Rules (cache / transform / redirect / snippets)

| Feature | Status | Free limit | Action | Exact steps |
|---|---|---|---|---|
| Cache Rules | ✅ 1 of 10 used (`/opengraph-image`, `/twitter-image` edge TTL 1y) | **10 rules** | Capacity available | Dashboard → **Rules → Cache Rules** |
| Transform Rules (URL Rewrite) | ✅ 1 of 10 used (`/opengraph-image`, `/twitter-image` → `/og-image.png`) | **10 active rules**, no regex | Capacity available | Dashboard → **Rules → Transform Rules** |
| Single Redirect Rules | ⚪ 0 of 10 used | **10 rules**, wildcard yes, no regex | Capacity available | Dashboard → **Rules → Redirect Rules** |
| Bulk Redirects | ⚪ None | 15 rules / 5 lists / **10,000 URLs** | Optional | Dashboard → **Rules → Redirect Rules → Bulk** |
| Page Rules | ⚪ 0 of 3 used | **3 rules** | Deprecated — prefer the Rules above | — |
| Snippets | 🔒 **NOT free** | Free = **0** (Pro+) | Do not plan around Snippets | Use Transform/Redirect/Cache Rules or Workers instead |

### 2.5 Workers platform & storage

| Feature | Status | Free limit | Action | Exact steps |
|---|---|---|---|---|
| Workers (runtime) | ✅ 6 workers deployed (`sales-api/web/workflows` × prod+staging) | **100,000 req/day**, 10 ms CPU/invocation | No action (watch 1102 CPU errors) | — |
| Workers Logs (Observability) | ✅ Enabled (`observability.enabled: true` in all three `wrangler.jsonc`) | **200,000 events/day**, 3-day retention | No action | Already on; logs in dash → **Workers → (script) → Logs** |
| Workers KV | ⚪ None (no namespaces) | 100k reads/day, 1k writes/day, 1k deletes/day, 1k list/day, 1 GB | Use for caches/flags if needed | `npx wrangler kv namespace create <NAME>` |
| D1 (SQLite) | ⚪ None | 5M rows read/day, 100k rows written/day, 5 GB | Optional (app uses Supabase Postgres) | `npx wrangler d1 create <NAME>` |
| R2 (object storage) | 🔒 Not enabled (`403 [10042] enable R2 in the Dashboard`) | **10 GB-month**, 1M Class A + 10M Class B ops, free egress | Enable if used as Logpush destination | Dashboard → **R2 → Enable R2** (accept terms), then `cf r2 bucket create <name>` |
| Queues | ⚪ None | **10,000 ops/day**, 24h retention | Optional | `npx wrangler queues create <NAME>` |
| Durable Objects | ⚪ None | Free tier exists (SQLite-backed; 100k req/day, 13k GB-s/day, 5 GB) | Optional | Bind a DO class in `wrangler.jsonc` |
| Workflows | ✅ 1 (`campaign-approval-workflow`, 0 instances) | Included on Workers Free (within Workers daily limits) | No action | — |
| Hyperdrive | ✅ 1 (`sales-aaas-supabase`) | **100,000 queries/day** | No action | — |
| Cron Triggers | ⚪ None configured | Included on Free | Add if scheduled jobs are needed | Add `triggers.crons` in `wrangler.jsonc`, then `npx wrangler deploy` |

### 2.6 Email

| Feature | Status | Free limit | Action | Exact steps |
|---|---|---|---|---|
| Email Routing (inbound) | ⚪ Exists but disabled (`enabled: false`, `status: unconfigured`) | Free | Enable + add addresses/rules | Dashboard → **Email → Email Routing → Enable**. CLI: `cf email-routing enable -z salesxgrowth.com` |
| **Email Sending (arbitrary outbound)** | 🔒 **NOT free** | Requires Workers **Paid** | Do not recommend on Free | Inbound routing is free; outbound to *verified destination* addresses only |
| SPF (TXT) | ⚪ Missing (no TXT records exist) | Free (DNS) | Add SPF TXT | Add TXT on root, e.g. `v=spf1 include:_spf.<provider> ~all` matching the real sender |
| DKIM (TXT) | ⚪ Missing | Free (DNS) | Add provider DKIM TXT | Add the provider-issued DKIM `TXT` record(s) |
| DMARC (TXT) | ⚪ Missing (`_dmarc` absent) | Free (DNS) | Add DMARC | Add TXT `_dmarc` → `v=DMARC1; p=none; rua=mailto:dmarc@salesxgrowth.com` (tighten to `quarantine`/`reject` later) |
| DNSSEC | ⚪ Disabled (`status: disabled`) | Free | Enable | Dashboard → **DNS → Settings → DNSSEC → Enable**, then add the DS record at the registrar. CLI: `cf dns dnssec edit -z salesxgrowth.com --body '{"status":"active"}'` |

> Note: the app's `/.well-known/security.txt` points to `mailto:hello@salesxgrowth.com` (a different domain). Confirm which domain should own security/contact mail before enabling Email Routing on `salesxgrowth.com`.

### 2.7 Logs, analytics & notifications

| Feature | Status | Free limit | Action | Exact steps |
|---|---|---|---|---|
| Workers Logs | ✅ On | 200k events/day, 3-day retention (free) | No action | — |
| Logpush | ⚪ None (`cf logpush account-jobs list` = `[]`) | Free-plan, **usage-based**: 25 GB/mo internal included (~$0.03/GB after), 25 GB/mo external (~$0.10/GB after); 1 GB transform included | Optional — only if durable/external logs are needed | Dashboard → **Logs → Logpush → Create job**. Keep within the 25 GB included allotment. **Workers Trace Events Logpush = Workers Paid only** |
| Logpull | 🔒 **NOT free** | Enterprise only | Do not recommend | Use Logpush + R2, or Workers Logs |
| Web Analytics (RUM) | ⚪ None (`cf rum site-info list` = `[]`) | Free; unlimited proxied sites, 10 non-proxied | **Enable** | Dashboard → **Web Analytics → Add site** (or `cf rum site-info create --zone-tag efb771adc30d98e9f4ab171f65891b7c --auto-install true`). Auto-injects the beacon on proxied hosts |
| Notifications / Alerts | ⚪ None (`cf alerting policies list` = `[]`) | Free alerts: **HTTP DDoS Attack**, Security Insights, Abuse report, Universal SSL alert, Incident/Maintenance, Custom Alerts (beta) | **Create free alerts** | Dashboard → **Notifications → Add**. Recommended: HTTP DDoS Attack Alert, Universal SSL Alert, Security Insights. CLI: `cf alerting policies create --alert-type dos_attack_l7 ...` (see `--help`) |
| Health Checks alert | 🔒 Pro+ | Pro+ only | Do not recommend | — |

### 2.8 Reliability (paid-only — listed to avoid recommending)

| Feature | Status | Plan needed | Action |
|---|---|---|---|
| Health Checks | 🔒 Not free | Pro+ | Do not recommend; the repo already has a free GitHub Actions readiness monitor (`.github/workflows/readiness-monitor.yml`) polling `/health` + `/ready` every 30 min — this is the free substitute |
| Load Balancing | 🔒 Not free | Paid add-on | Do not recommend |
| Waiting Room | 🔒 Not free | Business+ | Do not recommend |
| API Shield | 🔒 Not free | Enterprise-only | Do not recommend |
| Automatic Platform Optimization | ➖ Off (`value: off`, not applicable) | Paid | Do not recommend |

---

## 3. Enable now (prioritized, all $0)

### P0 — do first (security gaps, minutes each)

1. **Deploy the Cloudflare Managed Free Ruleset** (WAF) — §2.1.
2. **Turn on Bot Fight Mode** — §2.1.
3. **Fix TLS/HSTS transport posture** (all free zone settings): `ssl=strict`, `always_use_https=on`, `min_tls_version=1.2`, HSTS enabled — §2.1.
4. **Enable DNSSEC** — §2.6.
5. **Verify or fix the free rate-limit rule** — the single free rule uses out-of-plan fields (`http.host`, `cf.colo.id`); confirm it fires in Security Events and, if not, rewrite it Path-based (§6).
6. **Create free Notifications** (HTTP DDoS Attack Alert + Universal SSL Alert + Security Insights) — §2.7.

### P1 — high value (hours)

7. **Add Turnstile** to public forms (`/contact`, `/get-started`) and auth flows, with server-side Siteverify — §2.3.
8. **Add WAF Custom Rules** (up to 5 free) for auth/contact abuse and, if abusive, edge challenge — §2.1.
9. **Enable Cloudflare Access** for staging/internal Worker URLs and, optionally, `/dashboard` `/settings` `/billing`; add **Service Tokens** for CI/internal calls — §2.2.
10. **Add SPF/DKIM/DMARC** DNS records; enable **Email Routing** (inbound) — §2.6.
11. **Enable Web Analytics (RUM)** auto-injection — §2.7.

### P2 — optional / when needed

12. **Enable R2** and add a **Logpush** job within the 25 GB included allotment (only if durable logs are required) — §2.5/§2.7.
13. Adopt **KV / D1 / Queues / Durable Objects / Cron Triggers** only if a feature needs them (all free within limits) — §2.5.
14. Raise HSTS `max_age` toward `31536000` and add `preload` once confident; optionally enable `0rtt` — §2.1.

---

## 4. Not free — do not recommend on the current plan

- Cloudflare Access **mTLS** (Enterprise / pay-as-you-go).
- **Snippets** (Pro+).
- **Email Sending** for arbitrary outbound mail (Workers Paid).
- **Logpull** (Enterprise) and **Workers Trace Events Logpush** (Workers Paid).
- **Health Checks** (Pro+), **Load Balancing** (paid), **Waiting Room** (Business+), **API Shield** (Enterprise).
- **Automatic Platform Optimization** (paid).
- WAF **OWASP Core Ruleset** / full **Cloudflare Managed Ruleset** (Pro+); Free only gets the *Managed Free Ruleset*.
- Rate limiting beyond **1 rule / 10 s period / IP counting** (Pro+ removes these caps).
- Block-by-country via **IP Access Rules** (Enterprise); use free **Custom Rules** for geo instead.

---

## 5. Current configuration snapshot (evidence)

Zone settings (`cf zones settings get ...`):

| Setting | Value | Setting | Value |
|---|---|---|---|
| `ssl` | `full` | `min_tls_version` | `1.0` |
| `always_use_https` | `off` | `automatic_https_rewrites` | `on` |
| `opportunistic_encryption` | `on` | `tls_1_3` | `on` |
| `0rtt` | `off` | `security_header` (HSTS) | disabled |
| `security_level` | `medium` | `challenge_ttl` | `1800` |
| `browser_check` | `on` | `cache_level` | `aggressive` |
| `brotli` | `on` | `http3` | `on` |
| `websockets` | `on` | `ipv6` | `on` |
| `privacy_pass` | `on` | `development_mode` | `off` |
| `advanced_ddos` | `on` | `rocket_loader` | `off` |
| `automatic_platform_optimization` | `off` | `ciphers` | default (`[]`) |

Rulesets (`cf rulesets list -z salesxgrowth.com`):

- Normalization (managed, `http_request_sanitize`) — always on.
- **Cloudflare Managed Free Ruleset** (managed, `http_request_firewall_managed`, `77454fe2d30c4220b5701f6fdfb893ba`, v74) — **available, not deployed**.
- DDoS L7 (managed, `ddos_l7`) — always on.
- Zone Rate Limiting Rules (`df0b5697af0747598e2bb84207e85f51`) — 1 rule:
  `(http.host eq "api.salesxgrowth.com")`, action `block`, characteristics `["cf.colo.id","ip.src"]`, `requests_per_period: 100`, `period: 10`, `mitigation_timeout: 10`.
- Zone Cache Rules (`d1562100467b486bb6e58ba0d34e15b7`) — 1 rule.
- Zone URL Rewrite Rules (`dc860818551445b0847627318ffccf34`) — 1 rule.

Other resources:

- **Workers:** `sales-api-production`, `sales-api-staging`, `sales-web-production`, `sales-web-staging`, `sales-workflows-production`, `sales-workflows-staging`.
- **Hyperdrive:** `sales-aaas-supabase` (`9c1c36b38d064425b8e7e3587c12635d`).
- **Workflows:** `campaign-approval-workflow` (0 instances).
- **KV / D1 / Queues / Durable Objects:** none.
- **R2:** not enabled.
- **Logpush / Alerts / Web Analytics / Turnstile / Access / Email Routing:** none enabled/configured.
- **DNS:** 3 proxied `AAAA 100::` records only (`salesxgrowth.com`, `www`, `api` — Workers custom domains, `read_only`). **No MX, no TXT (SPF/DKIM/DMARC), no CAA, no DS.**
- **DNSSEC:** `disabled`.

---

## 6. Verification notes & caveats

1. **The free rate-limit rule may not be enforced.** Documented Free-plan limits for rate limiting are: expression fields **Path** and **Verified Bot** only; counting characteristic **IP** only; period **10 s**; mitigation **10 s**; **1 rule**. The deployed rule uses `http.host` and `cf.colo.id`, which are outside that set. It was accepted via API, but it should be **verified** in **Security Events → Rate limiting** (or metrics) that it actually blocks. If it does not fire, rewrite it to the Free-safe form:
   - expression: `(starts_with(http.request.uri.path, "/v1/"))` (or the actual API path prefix)
   - characteristics: `["ip.src"]`
   - period `10`, `mitigation_timeout` `10`, `requests_per_period` tuned to the API contract.

   This matters because `apps/api` declares `RATE_LIMIT_BACKEND=edge` and `/ready` reports `rate-limits: ready` — that readiness signal assumes the edge rule is effective.
2. **Security Level vs Under Attack.** This zone uses the classic `security_level` setting (`medium`). Keep `medium` for normal operation and switch to `under_attack` only during an active L7 flood, then revert.
3. **Logpush is usage-based even on Free.** It is *not* unconditionally free: 25 GB/mo internal and 25 GB/mo external are included, then per-GB charges apply. Workers Logs (already on, 200k events/day) covers most needs without cost.
4. **R2 must be enabled in the dashboard first** (terms acceptance) before any `cf r2` command works; the account currently returns `403 [10042]`.
5. **Access user cap.** Zero Trust Free supports up to **50 users**; the Cloudflare One *account-limits* page documents per-resource caps (500 apps, 50 service tokens, 50 mTLS root certs) but not the seat cap, so confirm the current seat count in the Zero Trust dashboard. mTLS is explicitly **not** included on Free.
6. **Email domain ambiguity.** `security.txt` uses `hello@salesxgrowth.com` while the zone is `salesxgrowth.com`. Decide which domain owns inbound mail before enabling Email Routing, and align SPF/DKIM/DMARC to the real sender.
7. **Observability inference.** Workers Logs "enabled" is inferred from `observability.enabled: true` in all three deployed `wrangler.jsonc` files (the `cf` CLI does not expose a simple worker-settings GET). Confirm in **Workers → (script) → Logs**.
8. **No changes were made.** All commands in this document are instructions for the operator to run later; this audit was strictly read-only.

---

## 7. References

Cloudflare docs consulted (all current as of 2026-10):

- WAF Managed Rules / Cloudflare Managed Free Ruleset — https://developers.cloudflare.com/waf/managed-rules/
- WAF Custom Rules (Free = 5) — https://developers.cloudflare.com/waf/custom-rules/
- WAF Rate Limiting Rules (Free = 1, Path/Verified Bot, IP, 10 s) — https://developers.cloudflare.com/waf/rate-limiting-rules/
- IP Access Rules (Free = 50,000; country block = Enterprise) — https://developers.cloudflare.com/waf/tools/ip-access-rules/
- Bot Fight Mode (free) — https://developers.cloudflare.com/bots/get-started/bot-fight-mode/
- Security Level / Under Attack — https://developers.cloudflare.com/waf/tools/security-level/
- Cloudflare One / Access (Free ≤ 50 users; service tokens free; mTLS not free) — https://developers.cloudflare.com/cloudflare-one/ · https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/mutual-tls-authentication/
- Turnstile plans (Free = 20 widgets) — https://developers.cloudflare.com/turnstile/plans/
- Cache Rules (Free = 10) — https://developers.cloudflare.com/cache/how-to/cache-rules/
- Transform Rules (Free = 10) — https://developers.cloudflare.com/rules/transform/
- Single/Bulk Redirects (Free = 10 rules / 10,000 URLs) — https://developers.cloudflare.com/rules/url-forwarding/
- Snippets (Free = No) — https://developers.cloudflare.com/rules/snippets/
- Workers pricing/limits (Free = 100k req/day, 10 ms CPU) — https://developers.cloudflare.com/workers/platform/pricing/
- Logpush pricing (Free-plan usage-based, 25 GB included) — https://developers.cloudflare.com/logs/logpush/pricing/
- Web Analytics limits (free; unlimited proxied sites) — https://developers.cloudflare.com/web-analytics/limits/
- Available alerts — https://developers.cloudflare.com/notifications/notification-available/
- Waiting Room plans (Free = No) — https://developers.cloudflare.com/waiting-room/plans/
- API Shield (Enterprise-only) — https://developers.cloudflare.com/api-shield/
