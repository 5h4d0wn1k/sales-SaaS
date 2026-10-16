import { Hono } from "hono";
import Stripe from "stripe";
import Razorpay from "razorpay";
import crypto from "crypto";
import { and, eq, gt, desc } from "drizzle-orm";
import { db, subscriptions, payments, organizations, usageEvents } from "@sales/database";
import { getPlanByKey, getPlanIncludedChannels, getPlanProviderCostBudgetCents } from "@sales/shared";
import { getStorage } from "../storage";
import {
    getAllowedFrontendOrigins,
    isAllowedFrontendReturnUrl,
} from "../frontend-origin";
import {
    getStripeProviderPaymentId,
    insertPaymentIfMissing,
} from "./billing-payment-records";
import {
    invalidJsonPayloadResponse,
    isJsonParseError,
    isJsonPayloadRequest,
} from "../middleware/error-boundary";

interface BillingVars {
  user: {
    id: string;
    email: string;
    role: string;
    emailVerified: boolean;
    organizationId?: string;
  };
}

export const billingRoutes = new Hono<{ Variables: BillingVars }>();

// Helper to get authenticated user context
function getUserFromContext(c: any) {
    const user = c.get("user") as {
        id: string;
        email: string;
        role: string;
        emailVerified: boolean;
        organizationId?: string;
    } | undefined;
    if (!user) {
        throw new Error("Authentication required");
    }
    return user;
}

function canManageBilling(role: string) {
    return role === "owner" || role === "admin";
}

function requireBillingManager(c: any) {
    const user = getUserFromContext(c);
    if (!canManageBilling(user.role)) {
        return {
            user,
            response: c.json({ error: "Billing management requires owner or admin access" }, 403),
        };
    }

    if (!user.emailVerified) {
        return {
            user,
            response: c.json(
                {
                    error: "Verify your email before managing billing or starting paid checkout.",
                    code: "email_verification_required",
                },
                403,
            ),
        };
    }

    return { user };
}

function requireProviderConfig(c: any, provider: "stripe" | "razorpay", envNames: string[]) {
    if (process.env.NODE_ENV === "test") {
        return null;
    }

    const missing = envNames.filter((name) => !configuredEnvValue(name));

    if (missing.length === 0) {
        return null;
    }

    console.error(`Billing provider ${provider} is not fully configured. Missing: ${missing.join(", ")}`);
    return c.json({ error: `${provider} billing is not configured` }, 503);
}

function configuredEnvValue(name: string) {
    const value = process.env[name]?.trim();
    return value ? value : null;
}

function createStripeClient() {
    const secretKey = configuredEnvValue("STRIPE_SECRET_KEY");
    if (!secretKey) {
        throw new Error("STRIPE_SECRET_KEY is required before using Stripe billing.");
    }

    return new Stripe(secretKey);
}

function createRazorpayClient() {
    const keyId = configuredEnvValue("RAZORPAY_KEY_ID");
    const keySecret = configuredEnvValue("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
        throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required before using Razorpay billing.");
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
}

function validateCheckoutReturnUrls(c: any, successUrl: string, cancelUrl: string) {
    const allowedOrigins = getAllowedFrontendOrigins();

    if (
        !isAllowedFrontendReturnUrl(successUrl, allowedOrigins) ||
        !isAllowedFrontendReturnUrl(cancelUrl, allowedOrigins)
    ) {
        return c.json({ error: "Checkout return URLs must use an allowed frontend origin" }, 400);
    }

    return null;
}

function billingFailureResponse(c: any, logLabel: string, publicMessage: string, error: unknown) {
    if (isJsonParseError(error) && isJsonPayloadRequest(c)) {
        return invalidJsonPayloadResponse(c, "Invalid billing JSON payload.");
    }

    console.error(logLabel, error);
    return c.json({ error: publicMessage }, 500);
}

function buildScheduledCancellationState() {
    return {
        cancelAtPeriodEnd: true,
        cancellationRequestedAt: new Date(),
        canceledAt: null,
    } as const;
}

function buildActiveSubscriptionState() {
    return {
        cancelAtPeriodEnd: false,
        cancellationRequestedAt: null,
        canceledAt: null,
    } as const;
}

function buildCanceledSubscriptionState() {
    return {
        status: "canceled" as const,
        cancelAtPeriodEnd: false,
        canceledAt: new Date(),
    };
}

// Billing portal - get subscription, payments, usage
billingRoutes.get("/portal", async (c) => {
    try {
        const user = getUserFromContext(c);
        if (!user.organizationId) {
            return c.json({ error: "No organization associated with user" }, 404);
        }

        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, user.organizationId))
            .limit(1);

        if (!org) {
            return c.json({ error: "Organization not found" }, 404);
        }

        // Get subscription
        const [subscription] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.organizationId, org.id))
            .limit(1);

        // Get payment history
        const paymentHistory = await db
            .select()
            .from(payments)
            .where(eq(payments.organizationId, org.id))
            .orderBy(desc(payments.createdAt))
            .limit(20);

        // Get usage for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const usageResult = await db
            .select({
                metric: usageEvents.metric,
                quantity: usageEvents.quantity,
            })
            .from(usageEvents)
            .where(and(
                eq(usageEvents.organizationId, org.id),
                gt(usageEvents.createdAt, thirtyDaysAgo),
            ));

        const usage: Record<string, number> = {};
        for (const event of usageResult) {
            usage[event.metric] = (usage[event.metric] || 0) + event.quantity;
        }

        return c.json({
            organization: {
                id: org.id,
                name: org.name,
                slug: org.slug,
            },
            subscription: subscription
                ? {
                    ...subscription,
                    providerCostBudgetCents: getPlanProviderCostBudgetCents(subscription.planKey),
                    includedChannels: getPlanIncludedChannels(subscription.planKey),
                }
                : null,
            paymentHistory,
            usage,
        });
    } catch (error: any) {
        return billingFailureResponse(
            c,
            "Billing portal error:",
            "Billing portal is temporarily unavailable.",
            error,
        );
    }
});

// Create Stripe checkout session
billingRoutes.post("/checkout/stripe", async (c) => {
    try {
        const access = requireBillingManager(c);
        if (access.response) {
            return access.response;
        }
        const configError = requireProviderConfig(c, "stripe", [
            "STRIPE_SECRET_KEY",
        ]);
        if (configError) {
            return configError;
        }
        const { user } = access;
        const { planKey, successUrl, cancelUrl } = await c.req.json();
        const plan = getPlanByKey(planKey);

        if (!plan) return c.json({ error: "Invalid plan" }, 400);
        const returnUrlError = validateCheckoutReturnUrls(c, successUrl, cancelUrl);
        if (returnUrlError) {
            return returnUrlError;
        }

        const organizationId = user.organizationId;
        if (!organizationId) {
            return c.json({ error: "No organization associated with user" }, 404);
        }
        const stripe = createStripeClient();

        // Get or create Stripe customer
        let [orgRecord] = await db
            .select({ stripeCustomerId: organizations.stripeCustomerId })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);

        let stripeCustomerId = orgRecord?.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    organizationId,
                    userId: user.id,
                },
            });
            stripeCustomerId = customer.id;
            await db
                .update(organizations)
                .set({ stripeCustomerId: customer.id })
                .where(eq(organizations.id, organizationId));
        }

        // Create checkout session
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
            customer: stripeCustomerId,
            metadata: {
                planKey,
                organizationId,
                userId: user.id,
            },
        });

        return c.json({ url: session.url });
    } catch (error: any) {
        return billingFailureResponse(
            c,
            "Stripe checkout error:",
            "Stripe checkout is temporarily unavailable.",
            error,
        );
    }
});

// Create Razorpay subscription checkout
billingRoutes.post("/checkout/razorpay", async (c) => {
    try {
        const access = requireBillingManager(c);
        if (access.response) {
            return access.response;
        }
        const configError = requireProviderConfig(c, "razorpay", [
            "RAZORPAY_KEY_ID",
            "RAZORPAY_KEY_SECRET",
        ]);
        if (configError) {
            return configError;
        }
        const { user } = access;
        const { planKey, successUrl, cancelUrl } = await c.req.json();
        const plan = getPlanByKey(planKey);

        if (!plan) return c.json({ error: "Invalid plan" }, 400);
        const returnUrlError = validateCheckoutReturnUrls(c, successUrl, cancelUrl);
        if (returnUrlError) {
            return returnUrlError;
        }

        const organizationId = user.organizationId;
        if (!organizationId) {
            return c.json({ error: "No organization associated with user" }, 404);
        }
        const razorpay = createRazorpayClient();

        // Get or create Razorpay customer
        let [orgRecord] = await db
            .select({ razorpayCustomerId: organizations.razorpayCustomerId })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);

        let razorpayCustomerId = orgRecord?.razorpayCustomerId;

        if (!razorpayCustomerId) {
            const customer = await razorpay.customers.create({
                email: user.email,
                notes: {
                    organizationId,
                    userId: user.id,
                },
            });
            razorpayCustomerId = customer.id;
            await db
                .update(organizations)
                .set({ razorpayCustomerId: customer.id })
                .where(eq(organizations.id, organizationId));
        }

        // Create Razorpay subscription
        const subscription = await razorpay.subscriptions.create({
            plan_id: plan.razorpayPlanId,
            customer_notify: 1,
            total_count: 0, // infinite until canceled
            notes: {
                planKey,
                organizationId,
                userId: user.id,
                email: user.email,
            },
        });

        return c.json({
            subscriptionId: subscription.id,
            keyId: process.env.RAZORPAY_KEY_ID,
            amount: plan.price.inr * 100, // in paise (for initial payment if any)
            currency: "INR",
            name: "salesxgrowth Sales SaaS",
            description: plan.name,
        });
    } catch (error: any) {
        return billingFailureResponse(
            c,
            "Razorpay checkout error:",
            "Razorpay checkout is temporarily unavailable.",
            error,
        );
    }
});

// Stripe webhook handler
billingRoutes.post("/webhook/stripe", async (c) => {
    const sig = c.req.header("stripe-signature");
    if (!sig) return c.json({ error: "No signature" }, 400);

    const rawBody = await c.req.text();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
        console.error("STRIPE_WEBHOOK_SECRET not set");
        return c.json({ error: "Webhook secret not configured" }, 500);
    }
    const configError = requireProviderConfig(c, "stripe", [
        "STRIPE_SECRET_KEY",
    ]);
    if (configError) {
        return configError;
    }

    const stripe = createStripeClient();
    let event: any;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, secret);
    } catch (err: any) {
        console.error("Stripe webhook signature verification failed:", err.message);
        return c.json({ error: "Webhook Error: " + err.message }, 400);
    }

    const storage = await getStorage();

    try {
        const eventType = event.type;
        const data = event.data.object as any;

        switch (eventType) {
            case "checkout.session.completed": {
                const session = data;
                const organizationId = session.metadata?.organizationId;
                const planKey = session.metadata?.planKey;
                const subscriptionId = session.subscription;

                if (!organizationId || !planKey || !subscriptionId) {
                    console.error("Missing metadata in checkout.session.completed", session);
                    break;
                }

                const plan = getPlanByKey(planKey);
                if (!plan) {
                    console.error("Invalid plan key:", planKey);
                    break;
                }

                // Upsert subscription
                const [existing] = await db
                    .select({ id: subscriptions.id })
                    .from(subscriptions)
                    .where(eq(subscriptions.organizationId, organizationId))
                    .limit(1);

                if (existing) {
                    await db
                        .update(subscriptions)
                        .set({
                            stripeSubscriptionId: subscriptionId,
                            status: "active",
                            ...buildActiveSubscriptionState(),
                            planKey,
                            usageLimit: plan.usageLimit,
                            seats: plan.seats,
                        })
                        .where(eq(subscriptions.id, existing.id));
                } else {
                    await db.insert(subscriptions).values({
                        organizationId,
                        planKey,
                        status: "active",
                        ...buildActiveSubscriptionState(),
                        usageLimit: plan.usageLimit,
                        seats: plan.seats,
                        stripeSubscriptionId: subscriptionId,
                    });
                }

                // Record initial payment if payment_intent present
                if (session.payment_intent) {
                    try {
                        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
                        await insertPaymentIfMissing(db, {
                            organizationId,
                            amount: paymentIntent.amount,
                            currency: paymentIntent.currency.toUpperCase(),
                            status: paymentIntent.status,
                            provider: "stripe",
                            providerPaymentId: paymentIntent.id,
                            receiptUrl: session.metadata?.receiptUrl || null,
                        });
                    } catch (piErr) {
                        console.error("Failed to retrieve payment intent:", piErr);
                    }
                }
                break;
            }

            case "customer.subscription.updated": {
                const stripeSub = data;
                const [sub] = await db
                    .select({
                        id: subscriptions.id,
                        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
                        cancellationRequestedAt: subscriptions.cancellationRequestedAt,
                    })
                    .from(subscriptions)
                    .where(eq(subscriptions.stripeSubscriptionId, stripeSub.id))
                    .limit(1);

                if (sub) {
                    const statusMap: Record<string, string> = {
                        active: "active",
                        trialing: "trialing",
                        past_due: "past_due",
                        canceled: "canceled",
                        unpaid: "past_due",
                        incomplete: "trialing",
                        incomplete_expired: "canceled",
                    };
                    const newStatus = statusMap[stripeSub.status] || stripeSub.status;
                    const cancelAtPeriodEnd = Boolean(stripeSub.cancel_at_period_end);

                    // Extract usageLimit from plan metadata if present
                    let usageLimit: number | undefined;
                    try {
                        const planMeta = stripeSub.items?.data?.[0]?.plan?.metadata;
                        if (planMeta?.usageLimit) {
                            usageLimit = parseInt(planMeta.usageLimit as string, 10);
                        }
                    } catch (e) {
                        // ignore
                    }

                    await db
                        .update(subscriptions)
                        .set({
                            status: newStatus,
                            cancelAtPeriodEnd: newStatus === "canceled" ? false : cancelAtPeriodEnd,
                            cancellationRequestedAt:
                                newStatus === "canceled"
                                    ? sub.cancellationRequestedAt ?? null
                                    : cancelAtPeriodEnd
                                        ? sub.cancellationRequestedAt ?? new Date()
                                        : null,
                            canceledAt: newStatus === "canceled" ? new Date() : null,
                            ...(usageLimit !== undefined && { usageLimit }),
                        })
                        .where(eq(subscriptions.id, sub.id));
                }
                break;
            }

            case "customer.subscription.deleted": {
                const stripeSub = data;
                const [sub] = await db
                    .select({
                        id: subscriptions.id,
                        cancellationRequestedAt: subscriptions.cancellationRequestedAt,
                    })
                    .from(subscriptions)
                    .where(eq(subscriptions.stripeSubscriptionId, stripeSub.id))
                    .limit(1);

                if (sub) {
                    await db
                        .update(subscriptions)
                        .set({
                            ...buildCanceledSubscriptionState(),
                            cancellationRequestedAt: sub.cancellationRequestedAt ?? new Date(),
                        })
                        .where(eq(subscriptions.id, sub.id));
                }
                break;
            }

            case "invoice.payment_succeeded": {
                const invoice = data;
                if (invoice.subscription) {
                    const [sub] = await db
                        .select({ id: subscriptions.id, organizationId: subscriptions.organizationId })
                        .from(subscriptions)
                        .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string))
                        .limit(1);

                    if (sub) {
                        await insertPaymentIfMissing(db, {
                            organizationId: sub.organizationId,
                            amount: invoice.amount_paid,
                            currency: invoice.currency.toUpperCase(),
                            status: "succeeded",
                            provider: "stripe",
                            providerPaymentId: getStripeProviderPaymentId(invoice),
                            receiptUrl: invoice.hosted_invoice_url || null,
                        });
                    }
                }
                break;
            }

            case "invoice.payment_failed": {
                const invoice = data;
                if (invoice.subscription) {
                    const [sub] = await db
                        .select({ id: subscriptions.id, organizationId: subscriptions.organizationId })
                        .from(subscriptions)
                        .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string))
                        .limit(1);

                    if (sub) {
                        await db
                            .update(subscriptions)
                            .set({ status: "past_due" })
                            .where(eq(subscriptions.id, sub.id));

                        await insertPaymentIfMissing(db, {
                            organizationId: sub.organizationId,
                            amount: invoice.amount_due,
                            currency: invoice.currency.toUpperCase(),
                            status: "failed",
                            provider: "stripe",
                            providerPaymentId: getStripeProviderPaymentId(invoice),
                        });
                    }
                }
                break;
            }

            default:
                console.log(`Unhandled Stripe event type ${eventType}`);
        }
    } catch (error) {
        console.error("Error processing Stripe webhook:", error);
        return c.json({ error: "Webhook processing failed" }, 500);
    }

    return c.json({ received: true });
});

// Razorpay webhook handler
billingRoutes.post("/webhook/razorpay", async (c) => {
    const rawBody = await c.req.text();
    const signature = c.req.header("X-Razorpay-Signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
        return c.json({ error: "Missing signature or secret" }, 400);
    }

    // Verify signature
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

    if (signature !== expectedSignature) {
        return c.json({ error: "Invalid signature" }, 400);
    }

    try {
        const event = JSON.parse(rawBody);
        const payload = event.payload || event;
        const eventType = event.event || event.event_type;

        switch (eventType) {
            case "subscription.activated":
            case "subscription.completed": {
                const subData = payload.subscription || payload;
                const subscriptionId = subData.id;
                const organizationId = subData.notes?.organizationId;
                const planKey = subData.notes?.planKey;

                if (!organizationId || !planKey) {
                    console.error("Missing notes in Razorpay subscription event", subData);
                    break;
                }

                const plan = getPlanByKey(planKey);
                if (!plan) {
                    console.error("Invalid plan key:", planKey);
                    break;
                }

                const [existing] = await db
                    .select({ id: subscriptions.id })
                    .from(subscriptions)
                    .where(eq(subscriptions.razorpaySubscriptionId, subscriptionId))
                    .limit(1);

                if (existing) {
                    await db
                        .update(subscriptions)
                        .set({
                            status: "active",
                            ...buildActiveSubscriptionState(),
                            planKey,
                            usageLimit: plan.usageLimit,
                            seats: plan.seats,
                        })
                        .where(eq(subscriptions.id, existing.id));
                } else {
                    await db.insert(subscriptions).values({
                        organizationId,
                        planKey,
                        status: "active",
                        ...buildActiveSubscriptionState(),
                        usageLimit: plan.usageLimit,
                        seats: plan.seats,
                        razorpaySubscriptionId: subscriptionId,
                    });
                }
                break;
            }

            case "subscription.cancelled": {
                const subData = payload.subscription || payload;
                const subscriptionId = subData.id;
                const [sub] = await db
                    .select({
                        id: subscriptions.id,
                        cancellationRequestedAt: subscriptions.cancellationRequestedAt,
                    })
                    .from(subscriptions)
                    .where(eq(subscriptions.razorpaySubscriptionId, subscriptionId))
                    .limit(1);

                if (sub) {
                    await db
                        .update(subscriptions)
                        .set({
                            ...buildCanceledSubscriptionState(),
                            cancellationRequestedAt: sub.cancellationRequestedAt ?? new Date(),
                        })
                        .where(eq(subscriptions.id, sub.id));
                }
                break;
            }

            case "payment.captured": {
                const paymentData = payload.payment || payload;
                const organizationId = paymentData.notes?.organizationId;
                if (organizationId) {
                    await insertPaymentIfMissing(db, {
                        organizationId,
                        amount: paymentData.amount,
                        currency: paymentData.currency.toUpperCase(),
                        status: "succeeded",
                        provider: "razorpay",
                        providerPaymentId: paymentData.id,
                        receiptUrl: paymentData.invoice?.url || null,
                    });
                }
                break;
            }

            case "payment.failed": {
                const paymentData = payload.payment || payload;
                const organizationId = paymentData.notes?.organizationId;
                if (organizationId) {
                    await insertPaymentIfMissing(db, {
                        organizationId,
                        amount: paymentData.amount,
                        currency: paymentData.currency.toUpperCase(),
                        status: "failed",
                        provider: "razorpay",
                        providerPaymentId: paymentData.id,
                    });
                }
                break;
            }

            default:
                console.log(`Unhandled Razorpay event type ${eventType}`);
        }
    } catch (error) {
        console.error("Error processing Razorpay webhook:", error);
        return c.json({ error: "Webhook processing failed" }, 500);
    }

    return c.json({ status: "ok" });
});

// Cancel subscription
billingRoutes.post("/cancel", async (c) => {
    try {
        const access = requireBillingManager(c);
        if (access.response) {
            return access.response;
        }
        const { user } = access;
        if (!user.organizationId) {
            return c.json({ error: "No organization associated" }, 404);
        }

        const [sub] = await db
            .select({
                id: subscriptions.id,
                status: subscriptions.status,
                stripeSubscriptionId: subscriptions.stripeSubscriptionId,
                razorpaySubscriptionId: subscriptions.razorpaySubscriptionId,
            })
            .from(subscriptions)
            .where(eq(subscriptions.organizationId, user.organizationId))
            .limit(1);

        if (!sub) {
            return c.json({ error: "No subscription found" }, 404);
        }

        if (sub.stripeSubscriptionId) {
            const configError = requireProviderConfig(c, "stripe", [
                "STRIPE_SECRET_KEY",
            ]);
            if (configError) {
                return configError;
            }
            const stripe = createStripeClient();
            // Cancel at period end
            await stripe.subscriptions.update(sub.stripeSubscriptionId, {
                cancel_at_period_end: true,
            });
            await db
                .update(subscriptions)
                .set(buildScheduledCancellationState())
                .where(eq(subscriptions.id, sub.id));

            return c.json({
                success: true,
                message: "Subscription will cancel at the end of the current billing period",
                status: sub.status,
                cancelAtPeriodEnd: true,
            });
        } else if (sub.razorpaySubscriptionId) {
            const configError = requireProviderConfig(c, "razorpay", [
                "RAZORPAY_KEY_ID",
                "RAZORPAY_KEY_SECRET",
            ]);
            if (configError) {
                return configError;
            }
            const razorpay = createRazorpayClient();
            await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId, true);
            await db
                .update(subscriptions)
                .set(buildScheduledCancellationState())
                .where(eq(subscriptions.id, sub.id));

            return c.json({
                success: true,
                message: "Subscription will cancel at the end of the current billing period",
                status: sub.status,
                cancelAtPeriodEnd: true,
            });
        } else {
            return c.json({ error: "No payment provider configured" }, 400);
        }
    } catch (error: any) {
        return billingFailureResponse(
            c,
            "Cancel subscription error:",
            "Billing cancellation is temporarily unavailable.",
            error,
        );
    }
});
