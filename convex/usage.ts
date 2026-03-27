import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper: extract org-level identity from JWT custom claims
function getOrgContext(identity: any): { orgId: string; entitlements: string[] } {
    // WorkOS JWT: org_id is the organization, entitlements is the feature list
    const orgId = identity.org_id || identity.orgId || identity.subject;
    const entitlements: string[] = identity.entitlements || [];
    return { orgId, entitlements };
}

// ─── Track Usage (per org, daily) ──────────────────────────────────
export const trackUsage = mutation({
    args: {
        model: v.string(),
        tokens: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return;
        }

        const { orgId } = getOrgContext(identity);
        const today = new Date().toISOString().split('T')[0];

        // Try org-level daily record first
        const existingUsage = await ctx.db
            .query("usage")
            .withIndex("by_org_date", (q) => q.eq("orgId", orgId).eq("date", today))
            .first();

        if (existingUsage) {
            await ctx.db.patch(existingUsage._id, {
                tokens: existingUsage.tokens + args.tokens,
                requests: existingUsage.requests + 1,
            });
        } else {
            await ctx.db.insert("usage", {
                userId: identity.subject, // Keep for backwards compat
                orgId,
                date: today,
                tokens: args.tokens,
                requests: 1,
                model: args.model,
            });
        }
    },
});

// ─── Get Usage History (per org, last 30 days) ─────────────────────
export const getUsage = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const { orgId } = getOrgContext(identity);

        // Prefer org-level index, fallback to user-level for old data
        let usage = await ctx.db
            .query("usage")
            .withIndex("by_org_date", (q) => q.eq("orgId", orgId))
            .order("desc")
            .take(30);

        // Fallback: if no org-level data, try legacy user-level data
        if (usage.length === 0) {
            usage = await ctx.db
                .query("usage")
                .withIndex("by_user_date", (q) => q.eq("userId", identity.subject))
                .order("desc")
                .take(30);
        }

        return usage.reverse();
    },
});

// ─── Check Limits (entitlements-driven) ────────────────────────────
export const checkLimit = query({
    args: { skipAuth: v.optional(v.boolean()) },
    handler: async (_ctx, _args) => {
        // ALL FEATURES FREE — no limits enforced
        return { allowed: true, reason: "All features free", isPro: true, limitType: null, tier: "pro" };
    },
});

// ─── Subscription Status (entitlements-driven) ─────────────────────
export const getSubscriptionStatus = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { status: "active", isTrialing: false, isPro: true, usage: 0, limit: 999_999_999, tier: "pro", stripeCustomerId: undefined };

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .first();

        // ALL FEATURES FREE — always return pro status
        return {
            status: "active",
            isTrialing: false,
            isPro: true,
            daysLeft: 0,
            usage: 0,
            limit: 999_999_999,
            tier: "pro",
            seatCount: user?.seatCount || 0,
            interval: user?.subscriptionInterval || 'month',
            stripeCustomerId: user?.stripeCustomerId,
        };
    },
});
