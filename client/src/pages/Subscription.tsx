import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Subscription() {
  const { data: subscription, isLoading } = useSubscription();

  const tiers = [
    { 
      id: "free",
      name: "Free", 
      price: "$0", 
      features: ["Up to 50 Leads", "Basic Dashboard", "Community Support"],
      color: "border-border"
    },
    { 
      id: "basic",
      name: "Basic", 
      price: "$29", 
      features: ["Up to 1,000 Leads", "Email Integration", "Standard Support"],
      color: "border-blue-500/50"
    },
    { 
      id: "pro",
      name: "Pro", 
      price: "$79", 
      features: ["Unlimited Leads", "Genetic Mode Access", "Priority Support", "Advanced Analytics"],
      popular: true,
      color: "border-accent shadow-lg shadow-accent/10"
    },
    { 
      id: "business",
      name: "Business", 
      price: "$199", 
      features: ["Team Access (5 Seats)", "Custom Workflows", "Dedicated Manager", "API Access"],
      color: "border-purple-500/50"
    },
    { 
      id: "enterprise",
      name: "Enterprise", 
      price: "$999", 
      features: ["Unlimited Seats", "White-labeling", "Custom AI Models", "24/7 SLA Support"],
      color: "border-white/20"
    },
  ];

  const currentTier = subscription?.tier || "free";

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-4xl font-display font-bold tracking-tight mb-4">Upgrade your growth</h2>
        <p className="text-muted-foreground text-lg">
          Choose the plan that fits your business scale. Unlock the full power of Genetic Sales.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {tiers.map((tier) => {
          const isCurrent = currentTier === tier.id;
          return (
            <Card 
              key={tier.id} 
              className={`relative p-6 flex flex-col ${tier.color} ${isCurrent ? 'bg-accent/5 ring-1 ring-accent' : 'bg-card'}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent text-accent-foreground text-xs font-bold rounded-full">
                  Recommended
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="text-lg font-bold">{tier.name}</h3>
                <div className="mt-2 flex items-baseline">
                  <span className="text-3xl font-bold font-display">{tier.price}</span>
                  <span className="text-muted-foreground ml-1 text-sm">/mo</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full ${isCurrent ? 'bg-muted text-muted-foreground cursor-default' : 'bg-primary'}`}
                variant={isCurrent ? "outline" : "default"}
                disabled={isCurrent}
              >
                {isCurrent ? "Current Plan" : "Upgrade"}
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold mb-1">Secure & Encrypted</h4>
            <p className="text-sm text-muted-foreground">Your data is encrypted at rest and in transit. We prioritize security.</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-accent/10 text-accent">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold mb-1">Instant Activation</h4>
            <p className="text-sm text-muted-foreground">Upgrade instantly and get access to premium features immediately.</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold mb-1">Cancel Anytime</h4>
            <p className="text-sm text-muted-foreground">No long-term contracts. Upgrade, downgrade, or cancel whenever you want.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
