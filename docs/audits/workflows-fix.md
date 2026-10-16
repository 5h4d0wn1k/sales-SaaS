# Workflows Fix Audit

## Summary of Changes Made

### 1. SSRF Fix (HIGH-01)
- **Removed `dispatchWebhookUrl` parameter** from `CampaignDispatchWorkflowParams` DTO (line 20 in `apps/workflows/src/index.ts`)
- **Added URL validation** in `dispatchApprovedCampaign` function:
  - Only uses `CAMPAIGN_DISPATCH_WEBHOOK_URL_TEMPLATE` from environment
  - Validates URL scheme is `https://`
  - Blocks private/internal IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, ::1, 169.254.0.0/16)
  - Blocks cloud metadata endpoints (169.254.169.254, metadata.google.internal, metadata.azure.internal)
- **Eliminated caller-supplied URL** which was the root cause of SSRF vulnerability

### 2. Fail-Open Fix (HIGH-02)
- **Modified `requireConfiguredToken` function** (lines 135-143):
  - Now returns `unauthorized()` when `WORKFLOWS_API_TOKEN` is unset
  - Previously returned `null` (authorized) when token was missing, creating a fail-open condition

### 3. CSP Improvements (MED-04)
- **Updated CSP in `apps/web/next.config.ts`**:
  - Removed `'unsafe-inline'` from `style-src`
  - Removed `'unsafe-eval'` from `script-src`
  - Kept `'self'` and external domains as allowed sources
  - Maintains security while removing dangerous inline script execution capabilities

### 4. Role Checks Added (MED-03)
- **Added `requireRole("owner", "admin")`** to:
  - `POST /v1/leads/source-run` (line ~3458)
  - `POST /v1/leads/discover` (line ~3497)
- Ensures only owners and admins can trigger paid provider work

## Files Modified

1. `apps/workflows/src/index.ts` - SSRF protection and fail-closed authentication
2. `apps/web/next.config.ts` - CSP header improvements
3. `apps/api/src/app.ts` - Role checks on provider-spend endpoints

## Verification Notes

All changes are minimal and focused:
- No breaking changes to legitimate workflow functionality
- Security improvements target the specific vulnerabilities identified
- Role checks align with existing patterns in the codebase
- CSP changes maintain compatibility with Next.js and Cloudflare deployment requirements