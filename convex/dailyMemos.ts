import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

export const getDailyMemo = query({
    args: { projectId: v.id("projects"), date: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("daily_memos")
            .withIndex("by_project_date", (q) => q.eq("projectId", args.projectId).eq("date", args.date))
            .first();
    }
});

export const getLatestMemo = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("daily_memos")
            .withIndex("by_project_date", (q) => q.eq("projectId", args.projectId))
            .order("desc") // Get the most recent one
            .first();
    }
});

export const saveDailyMemo = internalMutation({
    args: {
        projectId: v.id("projects"),
        orgId: v.string(),
        content: v.string(),
        date: v.string()
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("daily_memos")
            .withIndex("by_project_date", (q) => q.eq("projectId", args.projectId).eq("date", args.date))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { content: args.content });
            return existing._id;
        } else {
            return await ctx.db.insert("daily_memos", {
                projectId: args.projectId,
                orgId: args.orgId,
                content: args.content,
                date: args.date,
                isRead: false,
                createdAt: Date.now()
            });
        }
    }
});

export const markAsRead = mutation({
    args: { memoId: v.id("daily_memos") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.memoId, { isRead: true });
    }
});
