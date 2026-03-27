import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";

// Internal query: get share link by token (called by HTTP handler)
export const getByToken = internalQuery({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("shareLinks")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();
    },
});

// Internal mutation: increment use count (called by HTTP handler after download)
export const incrementUseCount = internalMutation({
    args: { id: v.id("shareLinks") },
    handler: async (ctx, args) => {
        const link = await ctx.db.get(args.id);
        if (link) {
            await ctx.db.patch(args.id, { useCount: link.useCount + 1 });
        }
    },
});

// Internal mutation: log a download event (called by HTTP handler)
export const logDownload = internalMutation({
    args: {
        shareLinkId: v.id("shareLinks"),
        token: v.string(),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("downloadEvents", {
            shareLinkId: args.shareLinkId,
            token: args.token,
            downloadedAt: Date.now(),
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
        });
    },
});

// Internal query: check if the file associated with a storageId has watermark enabled
export const getWatermarkStatus = internalQuery({
    args: { storageId: v.string() },
    handler: async (ctx, args) => {
        // Look up the file record by storageId
        const allFiles = await ctx.db.query("files").collect();
        const file = allFiles.find(
            (f: any) => f.storageId === args.storageId
        );
        return {
            watermarkEnabled: file?.watermarkEnabled === true,
            fileName: file?.name || null,
        };
    },
});
