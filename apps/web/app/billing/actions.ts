"use server";

import { redirect } from "next/navigation";
import { cancelSubscription } from "@/app/api";

export async function cancelSubscriptionAction() {
  await cancelSubscription();
  redirect("/billing?canceled=1");
}
