// @ts-nocheck — Schema too large for TS type inference (62 tables). Convex validates at runtime.
"use node";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

export const createProSubscriptionSecret = action({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-01-27.acacia" as any,
        });

        // Load prices from billing_config if available
        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        const config = user?.orgIds?.[0]
            ? await ctx.runQuery(internal.billing.getConfig, { orgId: user.orgIds[0] })
            : null;
        const basePriceId = config?.basePriceId || process.env.STRIPE_BASE_PRICE_ID;

        if (!basePriceId) {
            throw new Error("Missing base price ID. Please configure billing.");
        }

        // 1. Get or Create Customer
        let customerId = user?.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: identity.email,
                name: identity.name,
                metadata: { userId: identity.subject }
            });
            customerId = customer.id;
        }

        // Save customer ID to user
        await ctx.runMutation(internal.stripe.saveStripeCustomerId, {
            userId: identity.subject,
            stripeCustomerId: customerId
        });

        // 2. Create Subscription
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: basePriceId, quantity: 1 }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                userId: identity.subject,
                type: "subscription_update",
                seats: 1
            }
        });

        const invoice = subscription.latest_invoice as any;
        const paymentIntent = invoice.payment_intent as any;

        if (!paymentIntent.client_secret) {
            throw new Error("Failed to create payment intent");
        }

        return {
            clientSecret: paymentIntent.client_secret,
            subscriptionId: subscription.id
        };
    }
});

// ... (existing code)

export const createBillingPortalSession = action({
    args: {
        origin: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        if (!user) throw new Error("User not found");

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-01-27.acacia" as any,
        });

        let customerId = user.stripeCustomerId;

        // Fallback: Find customer by email if not found
        if (!customerId) {
            const customers = await stripe.customers.list({
                email: user.email,
                limit: 1,
            });
            customerId = customers.data[0]?.id;

            // If found by email, save it for next time
            if (customerId) {
                await ctx.runMutation(internal.stripe.saveStripeCustomerId, {
                    userId: identity.subject,
                    stripeCustomerId: customerId
                });
            }
        }

        if (!customerId) {
            throw new Error("No Stripe customer found");
        }

        const returnDomain = (args.origin || process.env.HOST_URL || "").replace(/\/$/, "");
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${returnDomain}/team`,
        });

        return session.url;
    },
});

export const createSubscriptionCheckout = action({
    args: {
        seats: v.number(),
        interval: v.optional(v.string()),
        referralCode: v.optional(v.string()),
        origin: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: "2025-01-27.acacia" as any });
        const domain = (args.origin || process.env.HOST_URL || "https://adaptivestartup.io").replace(/\/$/, "");

        // Load prices from billing_config (DB), fallback to env vars
        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        const config = user?.orgIds?.[0]
            ? await ctx.runQuery(internal.billing.getConfig, { orgId: user.orgIds[0] })
            : null;
        const basePriceId = config?.basePriceId || process.env.STRIPE_BASE_PRICE_ID;
        const yearlyPriceId = config?.yearlyPriceId || process.env.STRIPE_YEARLY_PRICE_ID;
        const seatPriceId = config?.seatPriceId || process.env.STRIPE_SEAT_PRICE_ID;

        if (!basePriceId || !seatPriceId) {
            throw new Error("Billing not configured. Please set up billing from your dashboard.");
        }

        let discounts = undefined;
        if (args.referralCode) {
            // Validate code via query or schema check if needed
        }

        const selectedPriceId = args.interval === 'year' && yearlyPriceId ? yearlyPriceId : basePriceId;

        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
            {
                price: selectedPriceId,
                quantity: 1,
            }
        ];

        if (args.seats > 1) {
            line_items.push({
                price: seatPriceId,
                quantity: args.seats - 1,
            });
        }

        const session = await stripe.checkout.sessions.create({
            customer_email: identity.email,
            line_items: line_items,
            mode: "subscription",
            allow_promotion_codes: true,
            success_url: `${domain}/?subscription_success=true`,
            cancel_url: `${domain}/?subscription_canceled=true`,
            metadata: {
                userId: identity.subject,
                seats: args.seats,
                type: "subscription_update",
                interval: args.interval || 'month'
            },
            subscription_data: {
                metadata: {
                    userId: identity.subject,
                    seats: args.seats,
                    type: "subscription_update",
                    interval: args.interval || 'month'
                }
            }
        });

        return { url: session.url };
    },
});

export const buyTokens = action({
    args: {
        packs: v.number(),
        origin: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: "2025-01-27.acacia" as any });
        const domain = (args.origin || process.env.HOST_URL || "https://adaptivestartup.io").replace(/\/$/, "");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        const config = user?.orgIds?.[0]
            ? await ctx.runQuery(internal.billing.getConfig, { orgId: user.orgIds[0] })
            : null;
        const tokenPriceId = config?.tokenPackPriceId || process.env.STRIPE_TOKEN_PACK_PRICE_ID;

        if (!tokenPriceId) {
            throw new Error("Billing not configured. Please set up billing from your dashboard.");
        }

        const totalTokens = args.packs * 1000000;

        const session = await stripe.checkout.sessions.create({
            customer_email: identity.email,
            line_items: [{ price: tokenPriceId, quantity: args.packs }],
            mode: "payment",
            success_url: `${domain}/subscription?tokens_purchased=true`,
            cancel_url: `${domain}/subscription?canceled=true`,
            metadata: {
                userId: identity.subject,
                type: "token_purchase",
                tokens: totalTokens
            },
        });

        return { url: session.url };
    },
});

export const addSeats = action({
    args: {
        seatsToAdd: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        if (!user || !user.stripeCustomerId) throw new Error("No Stripe customer found");

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-27.acacia" as any });

        const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'active',
            limit: 1,
            expand: ['data.items']
        });

        const subscription = subscriptions.data[0];
        if (!subscription) throw new Error("No active subscription found");

        const isYearly = subscription.items.data[0].price.recurring?.interval === 'year';

        const config = user?.orgIds?.[0]
            ? await ctx.runQuery(internal.billing.getConfig, { orgId: user.orgIds[0] })
            : null;

        let seatPriceId: string | undefined;
        if (isYearly) {
            seatPriceId = config?.seatPriceIdYearly || process.env.STRIPE_SEAT_PRICE_ID_YEARLY;
            if (!seatPriceId) throw new Error("Missing Yearly Seat Price ID — run billing setup");
        } else {
            seatPriceId = config?.seatPriceId || process.env.STRIPE_SEAT_PRICE_ID;
            if (!seatPriceId) throw new Error("Missing Monthly Seat Price ID — run billing setup");
        }

        const seatItem = subscription.items.data.find(item => item.price.id === seatPriceId);

        if (seatItem) {
            await stripe.subscriptionItems.update(seatItem.id, {
                quantity: (seatItem.quantity || 1) + args.seatsToAdd,
                proration_behavior: 'always_invoice',
            });
        } else {
            await stripe.subscriptionItems.create({
                subscription: subscription.id,
                price: seatPriceId!,
                quantity: args.seatsToAdd,
                proration_behavior: 'always_invoice',
            });
        }

        return { success: true };
    }
});

// --- PLATFORM CONNECT ---
export const createAccountLink = action({
    args: { projectId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        if (!user || !user.isFounder) {
            throw new Error("Access denied: Founder status required");
        }

        const clientId = process.env.STRIPE_CLIENT_ID?.trim();
        if (!clientId) throw new Error("Missing STRIPE_CLIENT_ID");

        const state = args.projectId;
        const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&state=${state}`;
        return { url };
    }
});

export const exchangeConnectCode = action({
    args: { code: v.string(), projectId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        if (!user || !user.isFounder) {
            throw new Error("Access denied: Founder status required");
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: "2025-01-27.acacia" as any });
        const response = await stripe.oauth.token({
            grant_type: 'authorization_code',
            code: args.code,
        });

        const connectedAccountId = response.stripe_user_id;

        await ctx.runMutation(internal.projects.saveStripeAccount, {
            projectId: args.projectId,
            stripeAccountId: connectedAccountId
        });

        return { success: true, accountId: connectedAccountId };
    }
});

export const createAccountSession = action({
    args: { stripeAccountId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        if (!user || !user.isFounder) {
            throw new Error("Access denied: Founder status required");
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: "2025-01-27.acacia" as any });

        const accountSession = await stripe.accountSessions.create({
            account: args.stripeAccountId,
            components: {
                payment_details: { enabled: true, features: { capture_payments: true, destination_on_behalf_of_charge_management: true, refund_management: true, dispute_management: true } },
                payments: { enabled: true, features: { capture_payments: true, destination_on_behalf_of_charge_management: true, refund_management: true, dispute_management: true } },
                payouts: { enabled: true, features: { edit_payout_schedule: true, instant_payouts: true, standard_payouts: true } },
                account_onboarding: { enabled: true },
                balances: { enabled: true, features: { edit_payout_schedule: true, instant_payouts: true, standard_payouts: true } },
                documents: { enabled: true },
                notification_banner: { enabled: true },
                account_management: { enabled: true, features: { external_account_collection: true } },
            },
        });

        return { clientSecret: accountSession.client_secret };
    }
});

export const getConnectedAccountData = action({
    args: { stripeAccountId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        if (!user || !user.isFounder) {
            throw new Error("Access denied: Founder status required");
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-27.acacia" as any });

        const customers = await stripe.customers.list({ limit: 20 }, { stripeAccount: args.stripeAccountId });
        const invoices = await stripe.invoices.list({ limit: 20 }, { stripeAccount: args.stripeAccountId });
        const charges = await stripe.charges.list({ limit: 20 }, { stripeAccount: args.stripeAccountId });

        return {
            customers: customers.data,
            invoices: invoices.data,
            charges: charges.data
        };
    }
});

export const createConnectedLoginLink = action({
    args: { stripeAccountId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        if (!user || !user.isFounder) {
            throw new Error("Access denied: Founder status required");
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-27.acacia" as any });

        try {
            const link = await stripe.accounts.createLoginLink(args.stripeAccountId);
            return { url: link.url };
        } catch (e: any) {
            return { url: "https://dashboard.stripe.com" };
        }
    }
});

export const applyReferralSetupCredit = action({
    args: { tokenIdentifier: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: args.tokenIdentifier });
        if (!user) {
            return;
        }

        if (user.hasReceivedReferralSetupCredit) {
            return;
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: "2025-01-27.acacia" as any });
        let customerId = user.stripeCustomerId;

        if (!customerId) {
            try {
                const customer = await stripe.customers.create({
                    email: user.email,
                    name: user.name,
                    metadata: { userId: user._id }
                });
                customerId = customer.id;

                await ctx.runMutation(internal.stripe.saveStripeCustomerId, {
                    userId: args.tokenIdentifier,
                    stripeCustomerId: customerId
                });
            } catch (err: any) {
                return;
            }
        }

        if (!customerId) {
            return;
        }

        try {
            await stripe.customers.createBalanceTransaction(customerId, {
                amount: -5000,
                currency: 'usd',
                description: 'Referral Program Setup Bonus'
            });

            await ctx.runMutation(internal.referrals.markSetupCreditReceived, { userId: user._id });

        } catch (e: any) {
        }
    }
});

export const processReferralPayment = action({
    args: { subscriptionId: v.string() },
    handler: async (ctx, args) => {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: "2025-01-27.acacia" as any });

        try {
            const subscription = await stripe.subscriptions.retrieve(args.subscriptionId);
            const referralCode = subscription.metadata?.referral_code;

            if (referralCode) {
                await ctx.runMutation(internal.referrals.processReferralSuccess, { code: referralCode });
            }
        } catch (e) {
        }
    }
});

// --- CONNECTED ACCOUNT PRODUCT & INVOICE ACTIONS ---

export const listConnectedProducts = action({
    args: { stripeAccountId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        if (!user || !user.isFounder) {
            throw new Error("Access denied: Founder status required");
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: "2025-01-27.acacia" as any });

        const products = await stripe.products.list(
            { limit: 20, active: true, expand: ['data.default_price'] },
            { stripeAccount: args.stripeAccountId }
        );

        const paymentLinks = await stripe.paymentLinks.list(
            { limit: 50, active: true, expand: ['data.line_items'] },
            { stripeAccount: args.stripeAccountId }
        );

        const productsWithLinks = products.data.map(product => {
            const link = paymentLinks.data.find(pl => {
                const lineItem = pl.line_items?.data[0];
                return lineItem?.price?.product === product.id;
            });
            return {
                ...product,
                paymentLinkUrl: link?.url
            };
        });

        return productsWithLinks;
    }
});

export const createConnectedProduct = action({
    args: {
        stripeAccountId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        amount: v.number(),
        imageUrl: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        if (!user || !user.isFounder) {
            throw new Error("Access denied: Founder status required");
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: "2025-01-27.acacia" as any });

        const product = await stripe.products.create(
            {
                name: args.name,
                description: args.description,
                images: args.imageUrl ? [args.imageUrl] : undefined,
                default_price_data: {
                    currency: 'usd',
                    unit_amount: args.amount,
                }
            },
            { stripeAccount: args.stripeAccountId }
        );

        const priceId = typeof product.default_price === 'string'
            ? product.default_price
            : product.default_price?.id;

        if (!priceId) throw new Error("Failed to create price for product");

        const paymentLink = await stripe.paymentLinks.create(
            {
                line_items: [{ price: priceId, quantity: 1 }]
            },
            { stripeAccount: args.stripeAccountId }
        );

        return { product, paymentLink };
    }
});

export const archiveConnectedProduct = action({
    args: {
        stripeAccountId: v.string(),
        productId: v.string()
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        if (!user || !user.isFounder) {
            throw new Error("Access denied: Founder status required");
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: "2025-01-27.acacia" as any });

        await stripe.products.update(
            args.productId,
            { active: false },
            { stripeAccount: args.stripeAccountId }
        );

        return { success: true };
    }
});

export const listConnectedInvoices = action({
    args: { stripeAccountId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        if (!user || !user.isFounder) {
            throw new Error("Access denied: Founder status required");
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: "2025-01-27.acacia" as any });

        const invoices = await stripe.invoices.list(
            { limit: 20, expand: ['data.customer'] },
            { stripeAccount: args.stripeAccountId }
        );

        return invoices.data;
    }
});

export const createConnectedInvoice = action({
    args: {
        stripeAccountId: v.string(),
        customerName: v.string(),
        customerEmail: v.string(),
        amount: v.number(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, { tokenIdentifier: identity.subject });
        if (!user || !user.isFounder) {
            throw new Error("Access denied: Founder status required");
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: "2025-01-27.acacia" as any });

        const customers = await stripe.customers.list(
            { email: args.customerEmail, limit: 1 },
            { stripeAccount: args.stripeAccountId }
        );
        let customerId = customers.data[0]?.id;

        if (!customerId) {
            const newCustomer = await stripe.customers.create(
                { email: args.customerEmail, name: args.customerName },
                { stripeAccount: args.stripeAccountId }
            );
            customerId = newCustomer.id;
        }

        await stripe.invoiceItems.create(
            {
                customer: customerId,
                amount: args.amount,
                currency: 'usd',
                description: args.description,
            },
            { stripeAccount: args.stripeAccountId }
        );

        const invoice = await stripe.invoices.create(
            {
                customer: customerId,
                auto_advance: false,
                collection_method: 'send_invoice',
                days_until_due: 30,
            },
            { stripeAccount: args.stripeAccountId }
        );

        return invoice;
    }
});

export const deleteConnectedInvoice = action({
    args: {
        stripeAccountId: v.string(),
        invoiceId: v.string()
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: "2025-01-27.acacia" as any });

        try {
            await stripe.invoices.del(
                args.invoiceId,
                { stripeAccount: args.stripeAccountId }
            );
        } catch (e: any) {
            if (e.code === 'invoice_not_editable') {
                await stripe.invoices.voidInvoice(
                    args.invoiceId,
                    { stripeAccount: args.stripeAccountId }
                );
            } else {
                throw e;
            }
        }

        return { success: true };
    }
});
