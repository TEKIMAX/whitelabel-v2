"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

// ─── Actions ────────────────────────────────────────────────

/**
 * Set up default billing products/prices on the tenant's Stripe Connect account.
 *
 * This creates the standard product catalog:
 *   1. Base Subscription (monthly)
 *   2. Annual Subscription
 *   3. Seat Add-on (monthly)
 *   4. Seat Add-on (yearly)
 *   5. Token Pack (one-time)
 *
 * The tenant can customize amounts later via their Stripe Dashboard.
 */
export const setupBilling = action({
    args: {
        stripeAccountId: v.string(),
        // Optional custom pricing (in cents). Defaults provided.
        basePrice: v.optional(v.number()),     // default 2900 ($29)
        yearlyPrice: v.optional(v.number()),   // default 29000 ($290)
        seatPrice: v.optional(v.number()),     // default 1000 ($10)
        seatPriceYearly: v.optional(v.number()), // default 10000 ($100)
        tokenPackPrice: v.optional(v.number()), // default 1000 ($10)
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, {
            tokenIdentifier: identity.subject,
        });
        if (!user?.isFounder) throw new Error("Founder status required");
        if (!user.orgIds?.[0]) throw new Error("No organization found");

        const orgId = user.orgIds[0];
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
            apiVersion: "2025-01-27.acacia" as any,
        });

        const basePriceCents = args.basePrice || 2900;
        const yearlyPriceCents = args.yearlyPrice || 29000;
        const seatPriceCents = args.seatPrice || 1000;
        const seatPriceYearlyCents = args.seatPriceYearly || 10000;
        const tokenPackPriceCents = args.tokenPackPrice || 1000;

        // 1. Base Subscription Product
        const baseProduct = await stripe.products.create(
            {
                name: "Pro Subscription",
                description: "Monthly Pro subscription",
                default_price_data: {
                    currency: "usd",
                    unit_amount: basePriceCents,
                    recurring: { interval: "month" },
                },
            },
            { stripeAccount: args.stripeAccountId }
        );

        // 2. Annual Subscription Price (same product)
        const yearlyPrice = await stripe.prices.create(
            {
                product: baseProduct.id,
                currency: "usd",
                unit_amount: yearlyPriceCents,
                recurring: { interval: "year" },
            },
            { stripeAccount: args.stripeAccountId }
        );

        // 3. Seat Add-on Product (monthly)
        const seatProduct = await stripe.products.create(
            {
                name: "Additional Seat",
                description: "Per-seat add-on",
                default_price_data: {
                    currency: "usd",
                    unit_amount: seatPriceCents,
                    recurring: { interval: "month" },
                },
            },
            { stripeAccount: args.stripeAccountId }
        );

        // 4. Seat Add-on (yearly)
        const seatPriceYearly = await stripe.prices.create(
            {
                product: seatProduct.id,
                currency: "usd",
                unit_amount: seatPriceYearlyCents,
                recurring: { interval: "year" },
            },
            { stripeAccount: args.stripeAccountId }
        );

        // 5. Token Pack Product (one-time)
        const tokenProduct = await stripe.products.create(
            {
                name: "Token Pack (1M)",
                description: "1,000,000 AI tokens",
                default_price_data: {
                    currency: "usd",
                    unit_amount: tokenPackPriceCents,
                },
            },
            { stripeAccount: args.stripeAccountId }
        );

        // Extract price IDs
        const basePriceId = typeof baseProduct.default_price === "string"
            ? baseProduct.default_price
            : baseProduct.default_price?.id || "";
        const seatPriceId = typeof seatProduct.default_price === "string"
            ? seatProduct.default_price
            : seatProduct.default_price?.id || "";
        const tokenPackPriceId = typeof tokenProduct.default_price === "string"
            ? tokenProduct.default_price
            : tokenProduct.default_price?.id || "";

        // Save to billing_config
        await ctx.runMutation(internal.billing.upsertConfig, {
            orgId,
            stripeAccountId: args.stripeAccountId,
            basePriceId,
            yearlyPriceId: yearlyPrice.id,
            seatPriceId,
            seatPriceIdYearly: seatPriceYearly.id,
            tokenPackPriceId,
            basePrice: basePriceCents,
            yearlyPrice: yearlyPriceCents,
            seatPrice: seatPriceCents,
            seatPriceYearly: seatPriceYearlyCents,
            tokenPackPrice: tokenPackPriceCents,
            setupComplete: true,
        });

        return {
            success: true,
            products: {
                base: baseProduct.id,
                seat: seatProduct.id,
                tokenPack: tokenProduct.id,
            },
            prices: {
                basePriceId,
                yearlyPriceId: yearlyPrice.id,
                seatPriceId,
                seatPriceIdYearly: seatPriceYearly.id,
                tokenPackPriceId,
            },
        };
    },
});
