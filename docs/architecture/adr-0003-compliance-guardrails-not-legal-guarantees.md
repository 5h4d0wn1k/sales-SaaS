# ADR-0003: Compliance Guardrails, Not Legal Guarantees

- Status: Accepted
- Date: 2026-05-04
- Owners: @5h4d0wn1k

## Context

The platform wants to support lead generation, outreach, and conversion across channels and markets. Direct-marketing, privacy, deliverability, and platform-policy rules vary by channel and geography, and they change over time.

If the product is documented as "globally compliant by design," the company takes on a promise the current platform and evidence do not justify.

## Decision

Position Sales AaaS as a platform that provides:

- guardrails
- evidence
- auditability
- approval-aware workflow
- safer defaults

But do not position it as making blanket legal determinations for every campaign, list source, or jurisdiction.

## Why

- email, SMS, voice, and professional-network channels have materially different requirements
- provider and platform policies add operational constraints beyond formal law
- customer data source quality and legal basis remain customer-specific

## Consequences

### Positive

- stronger credibility
- lower chance of unsafe product or sales claims
- clearer division of responsibility between product and customer

### Negative

- requires more nuanced messaging
- prevents easy broad-brush compliance promises in sales collateral

## Operational rules

1. Document channel posture explicitly.
2. Treat market expansion as gated.
3. Keep prohibited behaviors out of roadmap and marketing normalization.
4. Update compliance docs when provider or regulator posture changes materially.
