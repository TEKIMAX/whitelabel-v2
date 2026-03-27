import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Check if user completed story
export const getStoryProgress = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user) return null;

        return await ctx.db
            .query("story_progress")
            .withIndex("by_user", q => q.eq("userId", user._id))
            .unique();
    }
});

export const completeStory = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const existing = await ctx.db
            .query("story_progress")
            .withIndex("by_user", q => q.eq("userId", user._id))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                completed: true,
                completedAt: Date.now()
            });
        } else {
            await ctx.db.insert("story_progress", {
                userId: user._id,
                completed: true,
                completedAt: Date.now(),
                lastStepId: 6 // Assuming 6 steps
            });
        }
    }
});
