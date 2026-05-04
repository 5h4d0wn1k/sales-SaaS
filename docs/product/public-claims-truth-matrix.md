# Public Claims Truth Matrix

Use this matrix before changing landing-page copy, pricing copy, investor materials, or sales collateral.

| Claim or capability | Status | Evidence in repo truth |
| --- | --- | --- |
| Guided business onboarding and structured business profile capture | Implemented | Onboarding schemas and get-started flow exist in `packages/shared/src/domain.ts`, `apps/web/app/get-started/*`, and API onboarding flows |
| Workspace-based dashboard with leads, campaigns, meetings, and billing visibility | Implemented | Dashboard contract and page exist in `packages/shared/src/domain.ts` and `apps/web/app/dashboard/page.tsx` |
| Subscription billing with Stripe and Razorpay support | Implemented | Billing pricing contract and routes exist in `packages/shared/src/billing/pricing.ts` and `apps/api/src/routes/billing.ts` |
| Multi-workspace selection and tenant-aware account scope | Implemented | Workspace membership flows exist in API and web account routes |
| Email verification and password reset foundations | Implemented | Auth lifecycle routes and pages exist in `apps/api/src/routes/auth.ts` and `apps/web/app/verify-email`, `forgot-password`, `reset-password` |
| Approval-aware outreach workflow | Implemented | Campaign, policy, and dispatch concepts exist in shared contracts, API routes, and provider adapters |
| Configured email delivery via provider path | Implemented with configuration | Resend-backed dispatch exists when provider secrets are configured |
| Voice dispatch foundation with review posture | Beta / guarded | Twilio voice foundation exists, but should be documented as controlled and not broadly autonomous |
| LinkedIn-style outreach automation | Beta / guarded | Current provider behavior is mock and review-gated; do not claim production-grade automation |
| SMS outreach | Roadmap | Data model supports SMS activity type, but no mature product flow should be claimed yet |
| Initial workspace invite management | Implemented with guardrails | Settings-based invite create, revoke, and acceptance foundations now exist for active workspaces |
| Mature org administration, ownership transfer, and last-owner protection | Roadmap | Not yet complete in current repo truth |
| Content / SEO generation and publishing workflow | Roadmap | Not yet represented as a mature product surface in repo truth |
| Full autonomous cross-channel sales execution | Roadmap | Not supported as current truth |
| Global outbound compliance out of the box | Do not claim | Current research and repo state do not support this claim |
| LinkedIn scraping, browser automation, auto-connect, or auto-DM behavior | Prohibited claim | Conflicts with platform-policy posture and current product stance |

## Rules

1. If a claim is not implemented, it must be labeled beta, guarded, roadmap, or removed.
2. If a capability depends on configuration, say so.
3. If a capability is high-risk by channel or jurisdiction, describe the guardrails before the promise.
4. If the repo truth changes, update this matrix before changing public copy.
