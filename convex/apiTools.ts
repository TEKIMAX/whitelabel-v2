import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const saveToolsConfig = internalMutation({
    args: {
        orgId: v.string(),
        toolIds: v.array(v.string())
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("api_tools_config")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                toolIds: args.toolIds,
                updatedAt: Date.now()
            });
        } else {
            await ctx.db.insert("api_tools_config", {
                orgId: args.orgId,
                toolIds: args.toolIds,
                updatedAt: Date.now()
            });
        }
    }
});

export const getToolsConfig = internalQuery({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("api_tools_config")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .first();
        return existing;
    }
});
