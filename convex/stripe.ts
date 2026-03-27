import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Internal Mutations (no "use node" — these run in V8) ─────

export const updateSubscription = internalMutation({
    args: {
        userId: v.string(),
        subscriptionStatus: v.string(),
        seatCount: v.number(),
        tier: v.string(),
        tokenLimit: v.number(),
        endsOn: v.optional(v.number()),
        stripeCustomerId: v.optional(v.string()),
        subscriptionInterval: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", args.userId))
            .first();

        if (user) {
            const isFounder = (args.subscriptionStatus === 'active' || args.subscriptionStatus === 'trialing') &&
                (args.tier === 'pro' || args.tier === 'enterprise');

            await ctx.db.patch(user._id, {
                subscriptionStatus: args.subscriptionStatus,
                seatCount: args.seatCount,
                subscriptionTier: args.tier,
                tokenLimit: args.tokenLimit,
                isFounder: isFounder,
                onboardingCompleted: true,
                ...(args.endsOn !== undefined && { endsOn: args.endsOn }),
                ...(args.stripeCustomerId && { stripeCustomerId: args.stripeCustomerId }),
            });
        }
    },
});

export const topUpTokens = internalMutation({
    args: {
        userId: v.string(),
        tokensToAdd: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", args.userId))
            .first();

        if (user) {
            const currentLimit = user.tokenLimit || 50000;
            await ctx.db.patch(user._id, {
                tokenLimit: currentLimit + args.tokensToAdd
            });
        }
    },
});

export const updateSubscriptionStatus = internalMutation({
    args: {
        userId: v.string(),
        subscriptionStatus: v.string(),
        endsOn: v.optional(v.number()),
        tier: v.optional(v.string()),
        seatCount: v.optional(v.number()),
        stripeCustomerId: v.optional(v.string()),
        subscriptionInterval: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", args.userId))
            .first();

        if (user) {
            const effectiveTier = args.tier || user.subscriptionTier;
            const isFounder = (args.subscriptionStatus === 'active' || args.subscriptionStatus === 'trialing') &&
                (effectiveTier === 'pro' || effectiveTier === 'enterprise');

            await ctx.db.patch(user._id, {
                subscriptionStatus: args.subscriptionStatus,
                isFounder: isFounder,
                onboardingCompleted: true,
                ...(args.endsOn !== undefined && { endsOn: args.endsOn }),
                ...(args.tier !== undefined && { subscriptionTier: args.tier }),
                ...(args.seatCount !== undefined && { seatCount: args.seatCount }),
                ...(args.stripeCustomerId && { stripeCustomerId: args.stripeCustomerId }),
                ...(args.subscriptionInterval && { subscriptionInterval: args.subscriptionInterval }),
                ...(effectiveTier === 'pro' && { tokenLimit: 4000000 }),
                ...(effectiveTier !== 'pro' && effectiveTier !== 'enterprise' && { tokenLimit: undefined }),
            });
        }
    },
});

export const saveStripeCustomerId = internalMutation({
    args: {
        userId: v.string(),
        stripeCustomerId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", args.userId))
            .first();

        if (user) {
            await ctx.db.patch(user._id, {
                stripeCustomerId: args.stripeCustomerId
            });
        }
    },
});

export const updateConnectedAccountStatus = internalMutation({
    args: {
        stripeAccountId: v.string(),
        accountData: v.any()
    },
    handler: async (ctx, args) => {
        const project = await ctx.db
            .query("projects")
            .filter(q => q.eq(q.field("stripeAccountId"), args.stripeAccountId))
            .first();

        if (project) {
            await ctx.db.patch(project._id, {
                stripeData: JSON.stringify(args.accountData)
            });
        }
    }
});

export const disconnectStripeAccount = internalMutation({
    args: {
        stripeAccountId: v.string()
    },
    handler: async (ctx, args) => {
        const project = await ctx.db
            .query("projects")
            .filter(q => q.eq(q.field("stripeAccountId"), args.stripeAccountId))
            .first();

        if (project) {
            await ctx.db.patch(project._id, {
                stripeAccountId: undefined,
                stripeConnectedAt: undefined,
                stripeData: undefined
            });
        } else {
        }
    }
});
