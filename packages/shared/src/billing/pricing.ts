export interface PricingPlan {
    key: string;
    name: string;
    description: string;
    price: {
        usd: number;
        inr: number;
    };
    stripePriceId: string;
    razorpayPlanId: string;
    features: string[];
    usageLimit: number;
    seats: number;
    popular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
    {
        key: "free",
        name: "Trial",
        description: "14-day free trial to test the engine",
        price: { usd: 0, inr: 0 },
        stripePriceId: "price_trial_usd",
        razorpayPlanId: "plan_trial_inr",
        features: ["Up to 100 leads", "1 user seat", "Email support", "Basic AI discovery"],
        usageLimit: 100,
        seats: 1,
    },
    {
        key: "starter",
        name: "Starter",
        description: "For solo founders and small teams",
        price: { usd: 49, inr: 3999 },
        stripePriceId: "price_starter_usd",
        razorpayPlanId: "plan_starter_inr",
        features: ["Up to 1,000 leads/mo", "3 user seats", "Priority support", "Full AI discovery", "Basic CRM integration"],
        usageLimit: 1000,
        seats: 3,
    },
    {
        key: "pro",
        name: "Professional",
        description: "For growing sales teams",
        price: { usd: 99, inr: 7999 },
        stripePriceId: "price_pro_usd",
        razorpayPlanId: "plan_pro_inr",
        features: ["Up to 5,000 leads/mo", "10 user seats", "24/7 priority support", "Advanced AI personalization", "Full CRM sync", "Custom webhooks"],
        usageLimit: 5000,
        seats: 10,
        popular: true,
    },
    {
        key: "elite",
        name: "Elite",
        description: "For mature organizations scaling up",
        price: { usd: 249, inr: 19999 },
        stripePriceId: "price_elite_usd",
        razorpayPlanId: "plan_elite_inr",
        features: ["Up to 20,000 leads/mo", "Unlimited seats", "Dedicated account manager", "Custom AI models", "Whitelabeling", "On-premise option"],
        usageLimit: 20000,
        seats: 999,
    }
];

export function getPlanByKey(key: string): PricingPlan | undefined {
    return PRICING_PLANS.find(p => p.key === key);
}
