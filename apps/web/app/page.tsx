import { HeroSection } from "../components/blocks/hero-section";
import { Zap, Search, Mail, Phone, Calendar, BarChart3, Shield } from "lucide-react";
import Link from "next/link";
import { MarketingFooter } from "../components/blocks/marketing-footer";

export default async function LandingPage() {
  return (
    <>
      <HeroSection />

      {/* ─── The Problem ─── */}
      <section className="py-24 md:py-32 bg-stone-50/50">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            The Reality
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-8">
            Outbound breaks down when the system around it is messy. <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent italic font-serif">We make it reviewable.</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-5">
            <strong className="text-foreground">You did not start a business to juggle spreadsheets, approvals, and payment links across five tools.</strong> You started it to build something customers actually want.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            Winrate gives you a single workspace for onboarding, lead planning, campaign review, activity tracking, and billing so your team can run outbound with more clarity and less chaos.
          </p>
          <p className="text-2xl font-bold tracking-tight">
            The goal is not hype. The goal is a system you can actually operate.
          </p>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-24 md:py-32" id="how-it-works">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
              Relief
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">
              A calmer workflow for teams building <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">repeatable outbound</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              The current beta helps you structure the work, review the risky steps, and keep the whole motion visible.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {[
              { num: "1", title: "Capture The Context", desc: "Document the business, audience, channels, and constraints in one guided onboarding workspace.", color: "from-orange-500 to-orange-600" },
              { num: "2", title: "Generate The Plan", desc: "Turn that context into lead plans, campaign drafts, and activity queues your team can inspect.", color: "from-purple-500 to-purple-600" },
              { num: "3", title: "Review And Run", desc: "Approve the risky steps, track what happened, and keep billing and usage visible as the motion grows.", color: "from-emerald-500 to-emerald-600" },
            ].map((step) => (
              <div key={step.num} className="text-center px-8 py-8 relative">
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${step.color} text-white font-bold text-xl flex items-center justify-center mx-auto mb-6`}>
                  {step.num}
                </div>
                <h3 className="text-lg font-bold tracking-tight mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Who It's For ─── */}
      <section className="py-24 md:py-32 bg-stone-50/50" id="audience">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
              Ambition
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">
              Built for teams that need <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">control with momentum</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Winrate fits best when you want a sharper sales operating system without pretending every workflow is fully autonomous.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { emoji: "💡", title: "Founders", desc: "Centralize outbound setup, early pipeline tracking, and billing without spinning up a larger RevOps stack." },
              { emoji: "🚀", title: "Startups", desc: "Run structured experiments on lead quality, campaign approval, and follow-up before scaling headcount." },
              { emoji: "🏪", title: "Agencies", desc: "Keep client work reviewable with shared visibility into leads, campaign activity, and meeting outcomes." },
              { emoji: "🏢", title: "Operators", desc: "Adopt AI-assisted workflows gradually, with approval gates and auditable changes built into the flow." },
            ].map((card) => (
              <div key={card.title} className="group rounded-2xl border bg-background p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-transparent relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-4xl block mb-4">{card.emoji}</span>
                <h3 className="text-base font-bold tracking-tight mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 md:py-32" id="features">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
              Excitement
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">
              What the current beta already <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">does well</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              We only highlight capabilities that exist in the product today and can be pressure-tested by real teams.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Search, title: "Guided Business Onboarding", desc: "Capture the business profile, audience, channels, and constraints in a structured workspace.", wide: true },
              { icon: Mail, title: "Approval-Gated Outreach", desc: "Draft campaigns and activity queues, then keep the first risky action behind explicit review." },
              { icon: Phone, title: "Call Review Foundations", desc: "Track call tasks, provider results, and dispositions without claiming fully autonomous voice execution." },
              { icon: Calendar, title: "Meeting Records", desc: "Keep scheduled meetings, owners, notes, and outcomes visible inside the same workflow." },
              { icon: BarChart3, title: "Shared Dashboard", desc: "See leads, campaigns, usage, meetings, and subscription state in one workspace.", wide: true },
              { icon: Shield, title: "Safer Operations", desc: "Billing, approvals, and audit-aware flows are designed to make the system more trustworthy over time." },
            ].map((feature) => (
              <div key={feature.title} className={`group rounded-2xl border bg-background p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-transparent ${feature.wide ? 'md:col-span-2' : ''}`}>
                <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mb-5 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-purple-100 transition-colors">
                  <feature.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <h3 className="text-base font-bold tracking-tight mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Principles ─── */}
      <section className="py-24 md:py-32 bg-stone-50/50">
        <div className="mx-auto max-w-5xl px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            Product Principles
          </span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                title: "Honest automation",
                desc: "The platform should help operators move faster without hiding where human approval is still required.",
              },
              {
                title: "Shared visibility",
                desc: "Leads, campaigns, meetings, calls, and billing belong in one place so the team can reason about the whole system.",
              },
              {
                title: "Portable foundations",
                desc: "The stack is being shaped so infrastructure providers can change later without rewriting the core product model.",
              },
            ].map((principle) => (
              <article key={principle.title} className="rounded-2xl border bg-background p-8 shadow-sm">
                <h3 className="text-lg font-semibold tracking-tight">{principle.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{principle.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-stone-50/50 to-stone-100/50">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            Urgency & Joy
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">
            Start with a real workspace, not a promise deck.
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
            Launch the free workspace, pressure-test the current beta with your team, and upgrade only when the operating model already fits.
          </p>
          <Link href="/get-started" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-8 py-4 text-base font-semibold hover:opacity-90 transition-opacity shadow-lg">
            Start Free
            <Zap className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <MarketingFooter />
    </>
  );
}
