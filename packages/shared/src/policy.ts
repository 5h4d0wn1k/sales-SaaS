import { z } from "zod";

export const campaignPolicyInputSchema = z.object({
  approved: z.boolean(),
  firstAction: z.boolean(),
  highRiskChannel: z.boolean(),
  campaignStage: z.enum(["draft", "approved", "running", "paused"]),
  monthlyUsage: z.number().int().min(0),
  planLimit: z.number().int().positive(),
});

export type CampaignPolicyInput = z.infer<typeof campaignPolicyInputSchema>;

export type CampaignPolicyResult = {
  allowed: boolean;
  reason: string;
  nextStage: CampaignPolicyInput["campaignStage"];
};

export function evaluateCampaignPolicy(input: CampaignPolicyInput): CampaignPolicyResult {
  if (input.monthlyUsage >= input.planLimit) {
    return {
      allowed: false,
      reason: "Monthly plan limit reached",
      nextStage: "paused",
    };
  }

  if (input.firstAction && !input.approved) {
    return {
      allowed: false,
      reason: "First outbound action requires approval",
      nextStage: "draft",
    };
  }

  if (input.highRiskChannel && !input.approved) {
    return {
      allowed: false,
      reason: "High-risk channels require approval",
      nextStage: "draft",
    };
  }

  return {
    allowed: true,
    reason: "Campaign execution permitted",
    nextStage: input.campaignStage === "draft" ? "running" : input.campaignStage,
  };
}

