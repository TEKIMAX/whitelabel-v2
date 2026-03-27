import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

export const getNotifications = query({
    args: {
        projectId: v.id("projects"),
        paginationOpts: paginationOptsValidator,
        filterMonth: v.optional(v.number()), // 0-11
        filterYear: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        let q = ctx.db
            .query("notifications")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .order("desc");

        // Note: Convex doesn't support complex date filtering in the query builder easily without separate indexes
        // For now, we fetch and filter in memory for simplicity if month/year are provided, 
        // but for a production app we'd want indexes for month/year.
        // However, since notifications are "never deleted", we'll just handle pagination.

        const result = await q.paginate(args.paginationOpts);

        // Optional: Filter in memory if needed, though this breaks pagination offsets.
        // Better approach for filtering: Add indexes or just fetch all and filter client side for small volumes.
        // Given "never deleted" and "timeline", we'll assume the client handles the month/year grouping for now.

        return result;
    }
});

export const addNotification = mutation({
    args: {
        projectId: v.id("projects"),
        orgId: v.string(),
        userId: v.optional(v.string()),
        title: v.string(),
        description: v.string(),
        type: v.string(),
        metadata: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("notifications", {
            projectId: args.projectId,
            orgId: args.orgId,
            userId: args.userId,
            title: args.title,
            description: args.description,
            type: args.type,
            isRead: false,
            createdAt: Date.now(),
            metadata: args.metadata
        });
    }
});

export const markAsRead = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.notificationId, { isRead: true });
    }
});

export const markAllAsRead = mutation({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .filter((q) => q.eq(q.field("isRead"), false))
            .collect();

        for (const note of unread) {
            await ctx.db.patch(note._id, { isRead: true });
        }
    }
});
