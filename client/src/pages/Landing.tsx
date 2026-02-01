import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart2, Zap, Globe, CheckCircle2, Cpu } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-background font-bold">
                S
              </div>
              <span className="font-display font-bold text-xl tracking-tight">SalesGenetics</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground hidden md:block">Features</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground hidden md:block">Pricing</a>
              <a href="/api/login">
                <Button variant="ghost" className="text-foreground hover:bg-white/5">Log in</Button>
              </a>
              <a href="/api/login">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Get Started</Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        
        <div className="container relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6 border border-accent/20">
              <Zap className="w-4 h-4" /> AI-Powered Sales Evolution
            </span>
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6">
              Grow your revenue using <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-accent">
                Genetic Algorithms
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-muted-foreground mb-10 leading-relaxed">
              The first sales platform that evolves with your business. Automate networking, 
              optimize pipelines, and clone your best strategies instantly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/api/login">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                  Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </a>
              <a href="#demo">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-white/10 hover:bg-white/5">
                  View Demo
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-card/30 border-y border-white/5">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Everything you need to grow</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From lead generation to closing, our genetic algorithms optimize every step of your funnel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: BarChart2,
                title: "Sales Automation",
                desc: "Automate follow-ups, lead scoring, and pipeline movement with intelligent workflows."
              },
              {
                icon: Globe,
                title: "Network Growth",
                desc: "Identify high-value connections and networking opportunities automatically."
              },
              {
                icon: Cpu,
                title: "Genetic Optimization",
                desc: "Our AI tests thousands of sales strategies to find the perfect DNA for your business."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl bg-card border border-white/5 hover:border-primary/20 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Transparent Pricing</h2>
            <p className="text-muted-foreground">Start small and scale as you grow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { name: "Basic", price: "$29", features: ["Up to 1,000 Leads", "Basic Analytics", "Email Support"] },
              { name: "Pro", price: "$79", features: ["Unlimited Leads", "Genetic AI Mode", "Priority Support", "Advanced Reporting"], popular: true },
              { name: "Business", price: "$199", features: ["Custom API Access", "Dedicated Manager", "White-labeling", "Team Training"] }
            ].map((plan, i) => (
              <div 
                key={i} 
                className={`relative p-8 rounded-3xl border ${plan.popular ? 'border-primary bg-primary/5' : 'border-white/10 bg-card'} flex flex-col`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-display font-bold mb-6">{plan.price}<span className="text-base font-normal text-muted-foreground">/mo</span></div>
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="/api/login" className="w-full">
                  <Button className={`w-full ${plan.popular ? 'bg-primary' : 'bg-white/10 hover:bg-white/20'}`} size="lg">
                    Choose {plan.name}
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-card/50">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-background font-bold text-xs">
              S
            </div>
            <span className="font-display font-bold text-lg">SalesGenetics</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 SalesGenetics Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
