import type { OutboundChannel } from "../domain";

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
    outreachDispatchLimit: number;
    voiceCallLimit: number;
    providerCostBudgetCents: number;
    aiWorkerTaskProposalLimit: number;
    aiWorkerExecutionBudgetCents: number;
    includedChannels: OutboundChannel[];
    seats: number;
    popular?: boolean;
}

export interface PlanUpgradeRecommendation {
    planKey: string;
    planName: string;
    description: string;
    price: PricingPlan["price"];
    usageLimit: number;
    outreachDispatchLimit: number;
    voiceCallLimit: number;
    providerCostBudgetCents: number;
    aiWorkerTaskProposalLimit: number;
    aiWorkerExecutionBudgetCents: number;
    includedChannels: OutboundChannel[];
    checkoutPath: string;
}

export const PRICING_PLANS: PricingPlan[] = [
    {
        key: "free",
        name: "Free",
        description: "A free workspace for validating your first outbound workflow",
        price: { usd: 0, inr: 0 },
        stripePriceId: "price_trial_usd",
        razorpayPlanId: "plan_trial_inr",
        features: ["Up to 100 leads", "0 live dispatches", "Email planning channel", "$0 provider-cost budget", "0 AI worker proposals", "$0 AI dry-run budget", "1 user seat", "Guided onboarding workspace", "Dashboard visibility"],
        usageLimit: 100,
        outreachDispatchLimit: 0,
        voiceCallLimit: 0,
        providerCostBudgetCents: 0,
        aiWorkerTaskProposalLimit: 0,
        aiWorkerExecutionBudgetCents: 0,
        includedChannels: ["email"],
        seats: 1,
    },
    {
        key: "starter",
        name: "Starter",
        description: "For founders building a repeatable outbound motion",
        price: { usd: 49, inr: 3999 },
        stripePriceId: "price_starter_usd",
        razorpayPlanId: "plan_starter_inr",
        features: ["Up to 1,000 leads/mo", "100 email dispatches/mo", "$15 provider-cost budget", "10 AI worker proposals/mo", "$25 AI dry-run budget/mo", "3 user seats", "Approval-gated campaigns", "Billing portal access", "Email support"],
        usageLimit: 1000,
        outreachDispatchLimit: 100,
        voiceCallLimit: 0,
        providerCostBudgetCents: 1500,
        aiWorkerTaskProposalLimit: 10,
        aiWorkerExecutionBudgetCents: 2500,
        includedChannels: ["email"],
        seats: 3,
    },
    {
        key: "pro",
        name: "Professional",
        description: "For teams managing active campaigns and review flows",
        price: { usd: 99, inr: 7999 },
        stripePriceId: "price_pro_usd",
        razorpayPlanId: "plan_pro_inr",
        features: ["Up to 5,000 leads/mo", "1,000 dispatches/mo", "250 voice calls/mo", "$50 provider-cost budget", "50 AI worker proposals/mo", "$150 AI dry-run budget/mo", "10 user seats", "Campaign activity tracking", "Priority support"],
        usageLimit: 5000,
        outreachDispatchLimit: 1000,
        voiceCallLimit: 250,
        providerCostBudgetCents: 5000,
        aiWorkerTaskProposalLimit: 50,
        aiWorkerExecutionBudgetCents: 15000,
        includedChannels: ["email", "call"],
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
        features: ["Up to 20,000 leads/mo", "5,000 dispatches/mo", "1,000 voice calls/mo", "$150 provider-cost budget", "250 AI worker proposals/mo", "$500 AI dry-run budget/mo", "Unlimited seats", "Expanded workspace capacity", "Priority rollout support"],
        usageLimit: 20000,
        outreachDispatchLimit: 5000,
        voiceCallLimit: 1000,
        providerCostBudgetCents: 15000,
        aiWorkerTaskProposalLimit: 250,
        aiWorkerExecutionBudgetCents: 50000,
        includedChannels: ["email", "call", "linkedin"],
        seats: 999,
    }
];

export function getPlanByKey(key: string): PricingPlan | undefined {
    return PRICING_PLANS.find(p => p.key === key);
}

export function getPlanProviderCostBudgetCents(key: string): number {
    return getPlanByKey(key)?.providerCostBudgetCents ?? 0;
}

export function getPlanOutreachDispatchLimit(key: string): number {
    return getPlanByKey(key)?.outreachDispatchLimit ?? 0;
}

export function getPlanVoiceCallLimit(key: string): number {
    return getPlanByKey(key)?.voiceCallLimit ?? 0;
}

export function getPlanAiWorkerTaskProposalLimit(key: string): number {
    return getPlanByKey(key)?.aiWorkerTaskProposalLimit ?? 0;
}

export function getPlanAiWorkerExecutionBudgetCents(key: string): number {
    return getPlanByKey(key)?.aiWorkerExecutionBudgetCents ?? 0;
}

export function getPlanIncludedChannels(key: string): OutboundChannel[] {
    return [...(getPlanByKey(key)?.includedChannels ?? [])];
}

function toUpgradeRecommendation(plan: PricingPlan): PlanUpgradeRecommendation {
    return {
        planKey: plan.key,
        planName: plan.name,
        description: plan.description,
        price: plan.price,
        usageLimit: plan.usageLimit,
        outreachDispatchLimit: plan.outreachDispatchLimit,
        voiceCallLimit: plan.voiceCallLimit,
        providerCostBudgetCents: plan.providerCostBudgetCents,
        aiWorkerTaskProposalLimit: plan.aiWorkerTaskProposalLimit,
        aiWorkerExecutionBudgetCents: plan.aiWorkerExecutionBudgetCents,
        includedChannels: [...plan.includedChannels],
        checkoutPath: `/get-started?plan=${plan.key}`,
    };
}

function planRank(key: string) {
    return PRICING_PLANS.findIndex((plan) => plan.key === key);
}

export function getUpgradeRecommendation(input: {
    currentPlanKey: string;
    minUsageLimit?: number;
    minOutreachDispatchLimit?: number;
    minVoiceCallLimit?: number;
    minProviderCostBudgetCents?: number;
    minAiWorkerTaskProposalLimit?: number;
    minAiWorkerExecutionBudgetCents?: number;
    requiredChannel?: OutboundChannel;
    requiredChannels?: OutboundChannel[];
}): PlanUpgradeRecommendation | null {
    const currentRank = planRank(input.currentPlanKey);
    const requiredChannels = [
        ...(input.requiredChannel ? [input.requiredChannel] : []),
        ...(input.requiredChannels ?? []),
    ];

    if (
        input.minUsageLimit === undefined &&
        input.minOutreachDispatchLimit === undefined &&
        input.minVoiceCallLimit === undefined &&
        input.minProviderCostBudgetCents === undefined &&
        input.minAiWorkerTaskProposalLimit === undefined &&
        input.minAiWorkerExecutionBudgetCents === undefined &&
        requiredChannels.length === 0
    ) {
        return null;
    }

    const candidates = PRICING_PLANS.filter((plan, index) => {
        if (currentRank >= 0 && index <= currentRank) {
            return false;
        }

        if (input.minUsageLimit !== undefined && plan.usageLimit < input.minUsageLimit) {
            return false;
        }

        if (
            input.minOutreachDispatchLimit !== undefined &&
            plan.outreachDispatchLimit < input.minOutreachDispatchLimit
        ) {
            return false;
        }

        if (
            input.minVoiceCallLimit !== undefined &&
            plan.voiceCallLimit < input.minVoiceCallLimit
        ) {
            return false;
        }

        if (
            input.minProviderCostBudgetCents !== undefined &&
            plan.providerCostBudgetCents < input.minProviderCostBudgetCents
        ) {
            return false;
        }

        if (
            input.minAiWorkerTaskProposalLimit !== undefined &&
            plan.aiWorkerTaskProposalLimit < input.minAiWorkerTaskProposalLimit
        ) {
            return false;
        }

        if (
            input.minAiWorkerExecutionBudgetCents !== undefined &&
            plan.aiWorkerExecutionBudgetCents < input.minAiWorkerExecutionBudgetCents
        ) {
            return false;
        }

        if (requiredChannels.some((channel) => !plan.includedChannels.includes(channel))) {
            return false;
        }

        return true;
    });

    return candidates[0] ? toUpgradeRecommendation(candidates[0]) : null;
}
