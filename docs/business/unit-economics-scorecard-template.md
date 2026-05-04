# Unit Economics Scorecard

## Business Context

- Product:
  - Sales AaaS public beta
- Primary segments:
  - owner-led service businesses
  - growth agencies
  - small outbound sales teams
- Pricing model:
  - recurring subscription by workspace with seat and usage thresholds

## Revenue

- Revenue per workspace:
  - Trial / Starter / Pro / Elite tiers
- Revenue per workflow:
  - today mostly plan-based, later expandable via AI/provider usage
- Expansion opportunities:
  - provider integrations
  - premium AI personalization
  - enterprise governance

## Cost to Serve

- Core costs:
  - Postgres and application hosting
  - Stripe and Razorpay payment processing
  - Twilio and Resend provider usage
  - future AI inference or enrichment costs
- Support burden:
  - billing and onboarding are likely the highest early support sources
- Manual operations burden:
  - release and incident handling are still owner-operated

## Gross Margin Risks

- Underpriced high-usage workspaces
- Expensive provider-assisted workflows without metering
- Manual support load on billing or auth failures
- Future AI features shipping before cost controls exist

## Retention and Value

- High-retention features:
  - trustworthy billing
  - reliable dashboard
  - lead/campaign continuity
  - approval-safe automation
- Low-value but expensive risks:
  - flashy AI features that do not improve activation or conversion

## Metrics to Track

- Trial-to-paid conversion
- Paid workspace retention
- Cost per active workspace
- Support tickets per 100 active workspaces
- Gross margin by plan
- Provider usage cost per paid workspace

## Improvement Opportunities

- Add explicit quota visibility before stronger usage enforcement
- Meter expensive workflows before expanding AI or provider breadth
- Keep public claims tied to proven product capabilities
- Reduce support burden by hardening auth, billing, and onboarding first
