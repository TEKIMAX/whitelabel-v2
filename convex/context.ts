import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { components } from "./_generated/api";

// Helper for AI Actions to fetch context safely
export const getContextForAI = internalQuery({
    args: { tokenIdentifier: v.string() },
    handler: async (ctx, args) => {
        // 1. Find User
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
            .unique();

        if (!user) return null;

        // 2. Find Profile (via Component)
        const profile = await ctx.runQuery(components.adaptive_learning.public.getProfile, { userId: user._id });

        // 3. Fetch recent negative feedback (Rating < 3) to improve adaptability
        // Use orgId filter if user has one to ensure we track org-specific feedback
        let negativeFeedback;
        const limit = 10;

        if (user.orgIds && user.orgIds.length > 0) {
            negativeFeedback = await ctx.runQuery(components.adaptive_learning.public.getOrgNegativeFeedback, {
                orgId: user.orgIds[0],
                limit
            });
        } else {
            negativeFeedback = await ctx.runQuery(components.adaptive_learning.public.getNegativeFeedback, {
                userId: user._id,
                limit
            });
        }

        // Filter in memory for negative ones (simple approach) or use filtered index if available
        // Schema has rating, let's filter here
        // Component query might already sort by desc, but we do filtering here just in case or rely on component provided filtering (which seems minimal in public.ts)
        const criticalFeedback = (negativeFeedback || []).filter((f: any) => f.rating <= 3);

        return {
            userName: user.name,
            profile: profile ? {
                riskTolerance: profile.riskTolerance,
                communicationStyle: profile.communicationStyle,
                learningStyle: profile.learningStyle
            } : null,
            negativeFeedback: criticalFeedback.map((f: any) => ({
                topic: f.targetType,
                comment: f.comment,
                rating: f.rating
            }))
        };
    }
});
