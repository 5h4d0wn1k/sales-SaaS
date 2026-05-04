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
        name: "Free",
        description: "A free workspace for validating your first outbound workflow",
        price: { usd: 0, inr: 0 },
        stripePriceId: "price_trial_usd",
        razorpayPlanId: "plan_trial_inr",
        features: ["Up to 100 leads", "1 user seat", "Guided onboarding workspace", "Dashboard visibility"],
        usageLimit: 100,
        seats: 1,
    },
    {
        key: "starter",
        name: "Starter",
        description: "For founders building a repeatable outbound motion",
        price: { usd: 49, inr: 3999 },
        stripePriceId: "price_starter_usd",
        razorpayPlanId: "plan_starter_inr",
        features: ["Up to 1,000 leads/mo", "3 user seats", "Approval-gated campaigns", "Billing portal access", "Email support"],
        usageLimit: 1000,
        seats: 3,
    },
    {
        key: "pro",
        name: "Professional",
        description: "For teams managing active campaigns and review flows",
        price: { usd: 99, inr: 7999 },
        stripePriceId: "price_pro_usd",
        razorpayPlanId: "plan_pro_inr",
        features: ["Up to 5,000 leads/mo", "10 user seats", "Campaign activity tracking", "Call review foundations", "Priority support"],
        usageLimit: 5000,
        seats: 10,
        popular: true,
    },
    {
        key: "elite",
        name: "Elite",
        description: "For larger teams operating at higher monthly volume",
        price: { usd: 249, inr: 19999 },
        stripePriceId: "price_elite_usd",
        razorpayPlanId: "plan_elite_inr",
        features: ["Up to 20,000 leads/mo", "Unlimited seats", "Expanded workspace capacity", "Priority rollout support"],
        usageLimit: 20000,
        seats: 999,
    }
];

export function getPlanByKey(key: string): PricingPlan | undefined {
    return PRICING_PLANS.find(p => p.key === key);
}
