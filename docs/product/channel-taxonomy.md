# Channel Taxonomy

This document standardizes how the company talks about channels in product, sales, marketing, and roadmap discussions.

## GA, beta, roadmap, and prohibited

### GA

Capabilities that can be described as a current, customer-facing product truth.

Current GA posture:

- email/lifecycle workflow foundations with unsubscribe and provider-aware delivery posture
- meeting and call record visibility inside the workspace
- approval-aware campaign review and dispatch flow
- billing, usage visibility, and workspace-aware dashboard operations

### Beta / approval-gated

Capabilities that exist in some form but require explicit guardrails, configuration, or controlled rollout.

Current beta / guarded posture:

- voice calling foundations
- LinkedIn-style outreach review flows
- provider-specific dispatch behavior that depends on runtime configuration

### Roadmap

Capabilities the company intends to build, but should not present as delivered today.

Current roadmap posture:

- content / SEO generation and publishing workflow
- SMS as a mature customer-facing product flow
- richer CRM and provider integrations
- enterprise governance depth
- deeper autonomous decision-making beyond first-action approval patterns

### Prohibited claims or behaviors

These are not just "not yet." They are things the documentation must not normalize as supported launch behavior.

- LinkedIn scraping or browser automation
- auto-connect or auto-DM claims on restricted platforms
- blanket "globally compliant outbound automation" claims
- prerecorded or AI voice outreach presented as default-safe
- unregistered, consent-light SMS posture

## Channel definitions

### Email / lifecycle

Messages sent over email channels for outbound contact, follow-up, or lifecycle workflow. This is the cleanest near-term execution channel when suppression, unsubscribe, sender hygiene, and provider controls are respected.

### SMS

Direct mobile messaging. Treat as a stricter-consent, registration-sensitive channel that must remain gated until country and provider rules are satisfied.

### Voice

Outbound calling and call workflow support. Treat as high-risk, heavily policy-bound, and approval-aware.

### LinkedIn-like outreach

Professional-network outreach or workflow assistance. Treat official API use and human-in-the-loop support differently from scraping or browser automation.

### Content / SEO

Research, creation, approval, and publishing workflow for discoverability and inbound support. Current repo truth supports beta opportunity planning and reviewable brief inputs; autonomous publishing, distribution, and scaled content operations remain roadmap.

## Documentation rules

1. Every channel mention must name whether it is GA, beta / guarded, roadmap, or prohibited.
2. Marketing copy must not collapse roadmap and GA into the same promise.
3. High-risk channels must mention approval, configuration, or jurisdiction gating before outcome claims.
