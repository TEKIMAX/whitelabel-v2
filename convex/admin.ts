import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const toggleProStatus = mutation({
    args: { enabled: v.boolean() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        if (args.enabled) {
            await ctx.db.patch(user._id, {
                subscriptionStatus: 'active',
                subscriptionTier: 'pro',
                isFounder: true,
                tokenLimit: 4000000,
            });
        } else {
            // Revert to basic/starter
            await ctx.db.patch(user._id, {
                subscriptionStatus: 'trialing', // Fallback to trialing or active-starter
                subscriptionTier: 'starter',
                isFounder: false,
                tokenLimit: 50000,
            });
        }
    }
});
