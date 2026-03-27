import { query } from "./_generated/server";

export const getEnvDebug = query({
    args: {},
    handler: async (ctx) => {
        const key = process.env.STRIPE_SECRET_KEY || "";
        return {
            keyPrefix: key.substring(0, 8), // sk_test_ or sk_live_
            basePriceId: process.env.STRIPE_BASE_PRICE_ID,

            // Auth Debug
            WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID || "not set",
            hasWorkOSKey: !!process.env.WORKOS_API_KEY,
            hasWebhookSecret: !!process.env.WORKOS_WEBHOOK_SECRET,

            // Deployment Info
            CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT || "unknown"
        };
    }
});
