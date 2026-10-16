export type ContactStatusView = {
  tone: string;
  title: string;
  message: string;
  nextSteps: string[];
};

export function buildContactStatusView(
  status?: string,
  message?: string,
  priority?: string,
): ContactStatusView | null {
  if (status === "submitted") {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      title: priority === "high" ? "Priority request captured" : "Request captured",
      message:
        message ??
        "Your request is in the salesxgrowth intake queue. We will review the fit and follow up with the right next step.",
      nextSteps: [
        "Review company fit, sales goals, budget posture, and rollout blockers.",
        "Confirm plan, provider, approval, and managed-service boundaries before live work starts.",
        "Follow up through hello@salesxgrowth.com with the safest onboarding or rollout path.",
      ],
    };
  }

  if (status === "error") {
    return {
      tone: "border-red-200 bg-red-50 text-red-800",
      title: "Request was not captured",
      message:
        message ??
        "Please email hello@salesxgrowth.com with your company, goal, timeline, and the workflow you want to launch.",
      nextSteps: [
        "Send the same details to hello@salesxgrowth.com.",
        "Include company, goal, monthly lead target, timeline, budget posture, and channels.",
        "Avoid sending secrets, provider keys, or private customer data in the first email.",
      ],
    };
  }

  return null;
}
