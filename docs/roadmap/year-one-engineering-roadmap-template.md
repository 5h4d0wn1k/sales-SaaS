# Year-One Engineering Roadmap

## Quarter 1

- Harden onboarding, auth, billing, and dashboard as the public-beta wedge
- Keep shared contracts stable between web and API
- Add repo-local Codex quality controls, ownership docs, and release discipline
- Expand unit and route-level tests for auth, billing, tenancy, and webhook correctness

## Quarter 2

- Improve activation from get-started to paid workspace
- Add reliable password reset, email verification, and team-invite flows
- Add quota visibility and initial usage enforcement
- Stand up baseline production dashboards and alerting

## Quarter 3

- Deepen provider integrations for the most valuable outbound channels
- Improve approval-gated AI-assisted campaign and calling workflows
- Add stronger audit, support, and operator tooling
- Start measuring cost-to-serve and support burden by plan

## Quarter 4

- Evaluate whether provider/event workflows need queue isolation or service extraction
- Harden release automation, backups, and recovery procedures
- Add enterprise-ready governance where it improves retention or expansion revenue
- Tighten billing correctness and usage-based expansion paths

## Re-architecture Triggers

- Auth, billing, or dashboard latency becomes a sustained customer problem
- Shared package changes create too much blast radius for a single-repo cadence
- Provider traffic or webhook complexity demands queue-based processing
- Margin pressure requires explicit cost controls around AI or provider usage
