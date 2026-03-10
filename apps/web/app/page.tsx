import { HeroSection } from "../components/blocks/hero-section";
import { Zap, Search, Mail, Phone, Calendar, BarChart3, Shield } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
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
            Your next 100 customers are already out there. <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent italic font-serif">We bring them to you.</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-5">
            <strong className="text-foreground">You didn&apos;t start a business to send cold emails.</strong> You started it to build something that matters. But growth requires momentum, and momentum requires sales.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            Right now, thousands of companies are looking for exactly what you offer. What if they could find you automatically, without you lifting a finger?
          </p>
          <p className="text-2xl font-bold tracking-tight">
            You&apos;re one system away from doubling your revenue.
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
              Finally, someone <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">handles this</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              We engineer the deals. You just show up and close them.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {[
              { num: "1", title: "Tell Us Your Story", desc: "A 5-minute conversation about your product, audience, and goals. No forms. No jargon.", color: "from-orange-500 to-orange-600" },
              { num: "2", title: "We Build Your Engine", desc: "AI discovers leads, writes personalized outreach, and starts real conversations.", color: "from-purple-500 to-purple-600" },
              { num: "3", title: "You Close & Grow", desc: "Meetings appear on your calendar. Deals flow in. You focus on what you love.", color: "from-emerald-500 to-emerald-600" },
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
              Built for those who <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">demand growth</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              This is possible for you. The fastest-growing companies already use AI to outpace the competition.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { emoji: "💡", title: "Dreamers & Makers", desc: "Got an idea? We'll find your first customers while you build." },
              { emoji: "🚀", title: "Startups", desc: "Move fast without hiring a sales team. Pipeline ready on day one." },
              { emoji: "🏪", title: "Small Businesses", desc: "Stop wearing 10 hats. Let automation handle outreach." },
              { emoji: "🏢", title: "Enterprises", desc: "Scale outbound with AI — compliance-safe and fully auditable." },
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
              Look what you&apos;ll <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">have</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              A dedicated team of AI agents completely scaling your outreach with zero emotional friction.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Search, title: "Smart Lead Discovery", desc: "AI scrapes websites and directories to find people who match your ideal customer profile.", wide: true },
              { icon: Mail, title: "Personalized Outreach", desc: "Every email is tailored to the individual — no templates, no spam." },
              { icon: Phone, title: "AI Voice Calls", desc: "Autonomous calling with sentiment detection and meeting booking." },
              { icon: Calendar, title: "Meeting Autopilot", desc: "Qualified leads get booked directly on your calendar." },
              { icon: BarChart3, title: "Live Dashboard", desc: "Track every lead, campaign, and conversion in a single view. Zero spreadsheets.", wide: true },
              { icon: Shield, title: "Human-in-the-Loop", desc: "AI handles volume, you approve what matters." },
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

      {/* ─── Testimonial ─── */}
      <section className="py-24 md:py-32 bg-stone-50/50">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            Confidence
          </span>
          <span className="text-6xl bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent font-serif block">&ldquo;</span>
          <blockquote className="text-2xl md:text-3xl font-semibold tracking-tight leading-snug mt-4 mb-8 italic">
            Winrate engineers growth. They automatically found 40 qualified leads in the first week and booked 6 meetings into my calendar. I simply showed up and won the deal.
          </blockquote>
          <p className="text-muted-foreground">
            <strong className="text-foreground">Aarav Malhotra</strong> — Founder, OrbitOps
          </p>
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
            Everything is set up. We&apos;re <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">waiting for you</span>.
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
            Your competitors are already running automated outbound. Don&apos;t wait to scale your revenue. Let&apos;s start engineering deals today.
          </p>
          <Link href="/get-started" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-8 py-4 text-base font-semibold hover:opacity-90 transition-opacity shadow-lg">
            Start Growing Today
            <Zap className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-10 border-t">
        <div className="mx-auto max-w-5xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">Winrate</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Winrate. Built for builders.</p>
        </div>
      </footer>
    </>
  );
}
