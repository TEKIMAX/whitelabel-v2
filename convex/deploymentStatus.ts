import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

// Called by the Go worker via /api/deployment-status HTTP endpoint
export const upsertStatus = internalMutation({
    args: {
        deploymentId: v.string(),
        status: v.string(),
        projectName: v.optional(v.string()),
        customDomain: v.optional(v.string()),
        convexUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("deploymentStatus")
            .withIndex("by_deploymentId", (q) => q.eq("deploymentId", args.deploymentId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                status: args.status,
                projectName: args.projectName,
                customDomain: args.customDomain,
                convexUrl: args.convexUrl,
                updatedAt: Date.now(),
            });
        } else {
            await ctx.db.insert("deploymentStatus", {
                deploymentId: args.deploymentId,
                status: args.status,
                projectName: args.projectName,
                customDomain: args.customDomain,
                convexUrl: args.convexUrl,
                updatedAt: Date.now(),
            });
        }
    },
});

// Frontend can reactively subscribe to provisioning status
export const getStatus = query({
    args: { deploymentId: v.string() },
    handler: async (ctx, args) => {
        return ctx.db
            .query("deploymentStatus")
            .withIndex("by_deploymentId", (q) => q.eq("deploymentId", args.deploymentId))
            .first();
    },
});
