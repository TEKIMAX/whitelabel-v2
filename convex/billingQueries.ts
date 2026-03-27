import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ────────────────────────────────────────────────

/**
 * Get billing config for the current user's org.
 */
export const getMyBillingConfig = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .first();
        if (!user?.orgIds?.[0]) return null;

        return ctx.db
            .query("billing_config")
            .withIndex("by_org", (q) => q.eq("orgId", user.orgIds[0]))
            .first();
    },
});

/**
 * Internal query — used by stripe.ts actions to load config.
 */
export const getConfig = internalQuery({
    args: { orgId: v.string() },
    handler: async (ctx, { orgId }) => {
        return ctx.db
            .query("billing_config")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .first();
    },
});

// ─── Mutations ──────────────────────────────────────────────

export const upsertConfig = internalMutation({
    args: {
        orgId: v.string(),
        stripeAccountId: v.optional(v.string()),
        basePriceId: v.optional(v.string()),
        yearlyPriceId: v.optional(v.string()),
        seatPriceId: v.optional(v.string()),
        seatPriceIdYearly: v.optional(v.string()),
        tokenPackPriceId: v.optional(v.string()),
        basePrice: v.optional(v.number()),
        yearlyPrice: v.optional(v.number()),
        seatPrice: v.optional(v.number()),
        seatPriceYearly: v.optional(v.number()),
        tokenPackPrice: v.optional(v.number()),
        setupComplete: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("billing_config")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .first();

        const now = Date.now();
        const { orgId, ...fields } = args;

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...fields,
                updatedAt: now,
            });
            return existing._id;
        }

        return ctx.db.insert("billing_config", {
            orgId,
            setupComplete: false,
            createdAt: now,
            updatedAt: now,
            ...fields,
        });
    },
});
