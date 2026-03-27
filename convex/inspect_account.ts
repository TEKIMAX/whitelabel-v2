"use node";
import { internalAction } from "./_generated/server";
import Stripe from "stripe";

export const inspectStripeAccount = internalAction({
    args: {},
    handler: async (ctx) => {
        // Strip any accidental whitespace or quotes from the key
        const key = process.env.STRIPE_SECRET_KEY!.trim().replace(/['"]+/g, '');
        const stripe = new Stripe(key, { apiVersion: "2025-01-27.acacia" as any });

        const accountId = process.env.STRIPE_ACCOUNT_ID;
        if (!accountId) {
            return { error: "STRIPE_ACCOUNT_ID env var not set" };
        }

        try {
            const account = await stripe.accounts.retrieve(accountId);
            return {
                id: account.id,
                type: account.type,
                country: account.country,
                livemode: (account as any).livemode,
                created_key_prefix: key.substring(0, 8) + "..."
            };
        } catch (e: any) {
            return {
                error: e.message,
                used_key_prefix: key.substring(0, 8) + "..."
            };
        }
    }
});
