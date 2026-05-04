# Market and Compliance Evidence

- Last updated: 2026-05-04
- Purpose: source-backed evidence for product positioning, launch scope, trust posture, and roadmap sequencing

## Direct answer

The strongest evidence supports building Sales AaaS as a hybrid SaaS + AaaS revenue execution platform, not as a day-one "fully autonomous global AI SDR." Buyer behavior is becoming more digital and multi-channel, AI is proving useful in assistive sales workflows, and teams are frustrated by tool sprawl and manual prospecting. At the same time, deliverability rules, direct-marketing law, and platform terms make a broad "all channels, globally compliant, fully automated" launch story too risky to document as current truth.

## What the market supports

### 1. Multi-channel selling is now table stakes

- McKinsey reported on 2024-09-12 that B2B buyers use an average of 10 channels during the buying journey and switch suppliers when omnichannel experience is poor.
- Gartner reported on 2026-03-09 that 67% of B2B buyers prefer a rep-free experience.
- HubSpot's 2025 State of Sales report found that sellers see meaningful response across multiple channels, not email alone.

Implication:
- The company should be framed around orchestration across lead generation, outreach, and conversion, not around a single outbound tactic.

### 2. AI helps most as workflow compression, prioritization, and augmentation

- McKinsey's 2025 State of AI survey says AI use is widespread, but scaling is still uneven and agentic AI remains early.
- A 2026 U.S. Census working paper found that many firms using AI still use it primarily to augment tasks rather than fully replace them.
- LinkedIn/Ipsos research in 2025 reported time savings and cycle improvements from AI in research and outreach tasks.
- Salesforce's 2026 State of Sales shows strong perceived value from AI in prospecting and sales support.

Implication:
- The best claim-safe product posture is "AI-assisted and increasingly automated over time," with humans still visible in approval, escalation, and conversion-sensitive moments.

### 3. The sharpest pain is still operational, not theatrical

- Salesforce's 2026 State of Sales highlights prospecting burden, tech sprawl, and inaccessible data.
- Salesloft's 2025 pipeline research shows resistance to rep contact and too much manual work as major sales constraints.
- Agency research in 2025 shows process inefficiency, system fragmentation, and tool sprawl across client operations.

Implication:
- The wedge is not "magical autonomous selling." The wedge is a more operable system for onboarding, targeting, planning, dispatch, review, meetings, and subscription visibility.

### 4. Launch wedge should prioritize service businesses and agencies

- Early-stage SMBs do feel the pain, but budget and operational maturity vary widely.
- Agencies concentrate the problem: multi-client workflows, approvals, reporting, channel coordination, and the need to operationalize AI for clients.
- Enterprises are attractive later but bring governance, security, procurement, and integration demands that slow early proof.

Implication:
- The documentation should lead with founder-led service businesses and agencies first, then treat enterprise governance as a roadmap expansion.

## What the compliance environment supports

### 1. Email can be launched with strong guardrails, not broad guarantees

- The FTC's CAN-SPAM guide remains the baseline for U.S. commercial email.
- Google's sender requirements for bulk mail to Gmail accounts took effect beginning 2024-02-01 and expect authentication, low spam rates, and easy unsubscribe for high-volume senders.

Implication:
- Email/lifecycle is the cleanest believable near-term channel, but only when sender hygiene, unsubscribe handling, and suppression are treated as product requirements.

### 2. SMS and automated calling require tighter consent and registration discipline

- Twilio's A2P 10DLC documentation requires registration for U.S. A2P long-code messaging in practice.
- Twilio's current messaging policy requires prior consent, clear sender identity, and opt-out handling.
- The FCC's 2024 consent-revocation order tightened expectations for honoring STOP-style revocation quickly.
- FTC and FCC enforcement around robocalls remains aggressive, and prerecorded or AI voice calling is especially sensitive.

Implication:
- SMS, robocalls, and AI voice calling must be documented as gated, consent-aware, and market-specific. They should not be presented as default launch capabilities.

### 3. LinkedIn-like automation is especially constrained

- LinkedIn's current User Agreement and help pages prohibit scraping, inauthentic automation, and many forms of bot-driven outreach.

Implication:
- The product should not document LinkedIn scraping, browser automation, auto-connect, or auto-DM behavior as supported launch behavior.

### 4. "Global compliance" is not a safe day-one promise

- UK ICO guidance and EU ePrivacy / privacy rules are stricter than U.S. rules for many electronic marketing activities.
- Country-by-country treatment varies enough that broad global claims are not operationally honest.

Implication:
- The docs should say the platform provides guardrails, audit evidence, and safer defaults, while customer legal review remains necessary for market-specific campaigns.

## Repo-truth alignment

The current repo most clearly supports:

- guided business onboarding and structured business profile capture
- workspace-based tenancy and authenticated dashboard access
- plan selection, billing, payment history, and usage visibility
- lead, campaign, meeting, and call data models
- approval-aware outreach flows
- review-gated LinkedIn-style outreach behavior
- Twilio and Resend provider foundations
- email verification and password reset foundations

The repo does not yet justify documenting as current truth:

- full team invite and org administration maturity
- content/SEO generation and publishing as delivered product
- autonomous cross-channel execution without approval
- blanket "globally compliant" outbound automation
- LinkedIn scraping or browser automation

## Confidence notes

- High confidence:
  - multi-channel buyer behavior
  - assistive AI value in sales workflows
  - operational pain around tool sprawl and manual prospecting
  - compliance sensitivity around SMS, robocalls, and LinkedIn automation
- Medium confidence:
  - exact launch sequencing between SMB and agencies in all geographies
  - the timing for when content/SEO should become a true GA product surface
- Low confidence:
  - any hard claim that one country-neutral compliance model can cover all launch use cases

## Sources

### Market and buyer behavior

- McKinsey, "Five fundamental truths: How B2B winners keep growing" (2024-09-12)
  - https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/five-fundamental-truths-how-b2b-winners-keep-growing
- Gartner, "67% of B2B Buyers Prefer a Rep-Free Experience" (2026-03-09)
  - https://www.gartner.com/en/newsroom/press-releases/2026-03-09-gartner-sales-survey-finds-67-percent-of-b2b-buyers-prefer-a-rep-free-experience
- McKinsey, "The state of AI: Global survey 2025" (2025-11-05)
  - https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai
- U.S. Census Bureau, "The Microstructure of AI Diffusion" (2026-04)
  - https://www.census.gov/library/working-papers/2026/adrm/CES-WP-26-25.html
- Salesforce, "State of Sales, 7th Edition" (2026)
  - https://www.salesforce.com/en-us/wp-content/uploads/sites/4/documents/reports/sales/salesforce-state-of-sales-report-2026.pdf
- LinkedIn Sales Solutions / Ipsos, "The ROI of AI" (2025)
  - https://business.linkedin.com/en-us/sales-solutions/cx/25/03/sales-leader-compass-the-roi-of-ai
- HubSpot, "State of Sales Report" (updated 2025-09-09)
  - https://blog.hubspot.com/sales/hubspot-sales-strategy-report
- Salesloft, "2025 State of Pipeline Generation"
  - https://www.salesloft.com/resources/guides/state-of-pipeline-generation

### Compliance, platform policy, and deliverability

- FTC, "CAN-SPAM Act: A Compliance Guide for Business"
  - https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- FTC, "Complying with the Telemarketing Sales Rule"
  - https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule
- FTC, "FTC Implements New Protections for Businesses Against Telemarketing Fraud and Affirms Protections Against AI-enabled Scam Calls" (2024-03-07)
  - https://www.ftc.gov/news-events/news/press-releases/2024/03/ftc-implements-new-protections-businesses-against-telemarketing-fraud-affirms-protections-against-ai
- FCC consent revocation order (adopted 2024-02-15)
  - https://docs.fcc.gov/public/attachments/DOC-400039A1.pdf
- Google Workspace Admin Help, "Email sender guidelines"
  - https://support.google.com/a/answer/81126
- Google Workspace Admin Help, "Email sender guidelines FAQ"
  - https://support.google.com/a/answer/14229414
- Twilio, "A2P 10DLC"
  - https://www.twilio.com/docs/messaging/compliance/a2p-10dlc
- Twilio, "Messaging Policy" (current 2026-04-09 policy page)
  - https://www.twilio.com/en-us/legal/messaging-policy
- LinkedIn, "User Agreement" (effective 2025-11-03)
  - https://www.linkedin.com/legal/user-agreement
- LinkedIn Help, "Prohibited software and extensions"
  - https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions
- ICO, "Electronic and telephone marketing"
  - https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/
- EUR-Lex, ePrivacy Directive 2002/58/EC
  - https://eur-lex.europa.eu/eli/dir/2002/58/oj?locale=en
