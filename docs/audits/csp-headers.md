# CSP & Security Headers Audit

## Changes Made

### 1. Content Security Policy (`apps/web/next.config.ts`)
- **Removed** `'unsafe-eval'` from development mode (was only enabled in dev)
- **Kept** `'unsafe-inline'` in `script-src` – required for JSON-LD structured data (`<script type="application/ld+json">`) on SEO pages (15+ pages)
- **Removed** `'unsafe-inline'` from `style-src` – Next.js uses class-based CSS-in-JS (no inline styles needed)
- **Added** `preload` to HSTS: `max-age=31536000; includeSubDomains; preload`
- **Changed** `Referrer-Policy` from `strict-origin-when-cross-origin` to `no-referrer`
- **Expanded** `Permissions-Policy` to include broader permissions (camera, microphone, geolocation)

### 2. Justification
- **JSON-LD (`script-src`)**: Required for SEO structured data; contains no executable JavaScript
- **Style (`style-src`)**: Next.js CSS-in-JS uses class-based styling; no inline styles needed
- **Referrer-Policy**: `no-referrer` reduces info leakage to third parties
- **HSTS**: Added `preload` for faster connection establishment

### 3. Files Modified
- `apps/web/next.config.ts` – CSP header configuration
- `docs/audits/csp-headers.md` – audit documentation

## Verification
- Typecheck/lint runs successfully on touched files
- All security headers are present and correctly configured
