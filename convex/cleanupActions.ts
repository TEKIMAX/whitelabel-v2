"use node";
import { internalAction } from "./_generated/server";
import Stripe from "stripe";

export const identifyPlatform = internalAction({
    args: {},
    handler: async () => {
        const key = process.env.STRIPE_SECRET_KEY!.trim();
        const stripe = new Stripe(key, { apiVersion: "2025-01-27.acacia" as any });

        try {
            // Retrieve "Self" account details
            const account = await stripe.accounts.retrieve();
            return {
                id: account.id,
                email: account.email,
                business_profile_name: account.business_profile?.name,
                settings_dashboard_name: account.settings?.dashboard?.display_name,
                type: account.type,
                charges_enabled: account.charges_enabled
            };
        } catch (e: any) {
            return { error: e.message };
        }
    }
});
