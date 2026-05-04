# Channel and Jurisdiction Posture

- Status: internal operating guidance
- Purpose: define what the platform can responsibly claim, what it can help enforce, and what must remain customer- and market-specific

## Core rule

Sales AaaS provides compliance guardrails, evidence, and safer defaults. It does not make legal determinations for every customer, every list source, or every jurisdiction.

## Day-one posture

### What we can responsibly document now

- email/lifecycle workflow with unsubscribe and suppression expectations
- approval-gated outreach and auditability
- provider-aware dispatch posture
- workspace-level review before risky actions
- channel expansion as a gated roadmap, not a blanket promise

### What we must not document as current truth

- globally compliant outbound automation out of the box
- unrestricted SMS or robocall execution
- LinkedIn scraping or browser automation
- one-size-fits-all legality across U.S., UK, EU, India, and future markets

## Channel posture

### Email

#### Product posture

- credible near-term execution channel
- must support unsubscribe handling, suppression awareness, sender hygiene, and separation of promotional vs transactional behavior

#### Why

- U.S. commercial email rules are comparatively workable when CAN-SPAM obligations are respected
- large mailbox providers impose meaningful sender-quality expectations

#### Documentation rule

Document email as a supported workflow surface only when guardrails are mentioned with it.

### SMS

#### Product posture

- not a broad launch promise
- gated behind sender registration, consent-aware workflow, and country/provider readiness

#### Why

- U.S. A2P registration and consent expectations are real operational requirements
- cross-country rules vary too much for a blanket launch promise

#### Documentation rule

Document SMS as beta / guarded or roadmap unless country-specific controls are truly operational.

### Voice

#### Product posture

- high-risk, approval-aware, tightly constrained
- current documentation should emphasize review, visibility, and policy gates over autonomy

#### Why

- telemarketing and robocall rules are more sensitive than generic workflow automation claims suggest
- AI voice or prerecorded calling is especially risky

#### Documentation rule

Do not document voice as a default autonomous channel. Document it as controlled workflow support.

### LinkedIn-like outreach

#### Product posture

- treat as highly constrained
- allow only official API-compatible or human-in-the-loop positioning in public docs

#### Why

- platform terms directly constrain scraping and inauthentic automation

#### Documentation rule

Never present LinkedIn scraping, extension-based automation, auto-connect, or auto-DM behavior as supported launch functionality.

### Content / SEO

#### Product posture

- strategically important and lower-risk than direct outbound in many cases
- still roadmap in current repo truth

#### Documentation rule

Document as a deliberate next expansion area, not current delivered product.

## Jurisdiction posture

### United States

- Most workable near-term direct-marketing posture for launch documentation
- Still requires CAN-SPAM, mailbox-provider hygiene, DNC discipline, and consent-aware SMS / voice handling

### UK / EU

- More restrictive for electronic direct marketing
- Must not be described as "covered automatically"
- Treat market expansion as gated by channel and list-source policy

### India

- Commercially important because of payment and operator context
- Do not generalize from payment support to outbound-marketing readiness

### Global

- Global ambition is valid
- Global compliance guarantee is not

## Guardrails the product should own over time

- suppression and unsubscribe evidence
- approval state for risky actions
- provider-configuration awareness
- audit event capture
- usage and entitlement boundaries
- channel- and market-readiness flags

## What remains customer-owned

- legal basis for a given list, contact set, or market
- contractual and privacy obligations for their data sources
- country-specific policy review before expansion
- brand and risk tolerance for higher-sensitivity channels

## Source anchors

- FTC CAN-SPAM guide
- FTC Telemarketing Sales Rule guidance
- FCC consent-revocation and robocall guidance
- Google email sender guidelines
- Twilio A2P 10DLC and messaging policy
- LinkedIn User Agreement and help guidance
- ICO direct-marketing guidance
- ePrivacy / privacy-law framework references

See [Market and Compliance Evidence](../research/market-and-compliance-evidence.md) for source links.
