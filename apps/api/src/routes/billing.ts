import { Hono } from "hono";
import Stripe from "stripe";
import Razorpay from "razorpay";
import { getPlanByKey } from "@sales/shared";
import { getStorage } from "../storage";

// Initialize providers
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
    apiVersion: "2025-02-24.acacia",
});

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummy",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "dummy",
});

export const billingRoutes = new Hono();

billingRoutes.post("/checkout/stripe", async (c) => {
    const { planKey, successUrl, cancelUrl, userEmail } = await c.req.json();
    const plan = getPlanByKey(planKey);

    if (!plan) return c.json({ error: "Invalid plan" }, 400);

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price: plan.stripePriceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: userEmail,
            metadata: {
                planKey,
            },
        });

        return c.json({ url: session.url });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

billingRoutes.post("/checkout/razorpay", async (c) => {
    const { planKey, userEmail } = await c.req.json();
    const plan = getPlanByKey(planKey);

    if (!plan) return c.json({ error: "Invalid plan" }, 400);

    try {
        // For subscriptions, Razorpay requires creating a subscription instead of a regular order.
        // If we were just doing one-time, we'd use razorpay.orders.create
        const subscription = await razorpay.subscriptions.create({
            plan_id: plan.razorpayPlanId,
            customer_notify: 1,
            total_count: 12, // example: billing for 12 months, or indefinite depending on setup
            notes: {
                planKey,
                email: userEmail,
            },
        });

        return c.json({
            subscriptionId: subscription.id,
            keyId: process.env.RAZORPAY_KEY_ID,
            amount: plan.price.inr * 100, // Amount in paise
            currency: "INR",
            name: "Winrate Sales SaaS",
            description: plan.name,
        });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

billingRoutes.post("/webhook/stripe", async (c) => {
    const sig = c.req.header("stripe-signature");
    if (!sig) return c.json({ error: "No signature" }, 400);

    const rawBody = await c.req.text();
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET || "whsec_dummy"
        );
    } catch (err: any) {
        return c.json({ error: "Webhook Error: " + err.message }, 400);
    }

    const storage = await getStorage();

    // Handle the event
    switch (event.type) {
        case "checkout.session.completed":
            const session = event.data.object as Stripe.Checkout.Session;
            // create/update subscription in db
            console.log("Stripe checkout completed", session);
            break;
        case "customer.subscription.deleted":
            const subscription = event.data.object as Stripe.Subscription;
            // mark canceled
            console.log("Stripe sub deleted", subscription);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return c.json({ received: true });
});

billingRoutes.post("/webhook/razorpay", async (c) => {
    // Similarly handle Razorpay webhooks using their validation methods
    const rawBody = await c.req.text();
    const signature = c.req.header("X-Razorpay-Signature");
    // Validate signature...

    // parse body, update DB

    return c.json({ status: "ok" });
});
