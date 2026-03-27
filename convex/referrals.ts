import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Helper to generate random code
function generateRandomCode(length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, 1, O, 0 for clarity
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export const generateReferralCode = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .first();

        if (!user) throw new Error("User not found");

        // If user already has a code, return it (idempotent)
        if (user.referralCode) {
            return { code: user.referralCode };
        }

        // Generate unique code (try loop to avoid collisions)
        let code = generateRandomCode();
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 5) {
            const existing = await ctx.db
                .query("users")
                .withIndex("by_referral_code", (q) => q.eq("referralCode", code))
                .first();

            if (!existing) {
                isUnique = true;
            } else {
                code = generateRandomCode();
                attempts++;
            }
        }

        if (!isUnique) throw new Error("Failed to generate unique code");

        // Update user
        await ctx.db.patch(user._id, {
            referralCode: code,
            referralCount: 0,
            hasReceivedReferralSetupCredit: false, // Explicitly false initially
        });

        // Schedule the credit action
        // Schedule the credit action
        await ctx.scheduler.runAfter(0, api.stripeActions.applyReferralSetupCredit, { tokenIdentifier: identity.subject });

        return { code };
    },
});

export const markSetupCreditReceived = internalMutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            hasReceivedReferralSetupCredit: true,
        });
    },
});

export const getReferralStats = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .first();

        if (!user || !user.referralCode) return null;

        return {
            code: user.referralCode,
            count: user.referralCount || 0,
            hasReceivedCredit: user.hasReceivedReferralSetupCredit || false,
        };
    },
});

export const validateReferralCode = query({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_referral_code", (q) => q.eq("referralCode", args.code))
            .first();
        return !!user;
    },
});

export const processReferralSuccess = internalMutation({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_referral_code", (q) => q.eq("referralCode", args.code))
            .first();

        if (user) {
            // Check if we should cap it? Or just increment.
            // Requirement: "credit or the referel is only applied... when users have a paid account".
            // This mutation is called ON payment.
            await ctx.db.patch(user._id, {
                referralCount: (user.referralCount || 0) + 1
            });
        }
    },
});
