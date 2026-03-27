
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectSafe, requireAuth, verifyProjectAccess, findUserByIdentity } from "./auth";

export const getRevenueModel = query({
    args: { projectId: v.string() },
    handler: async (ctx: any, args: any) => {
        const project = await getProjectSafe(ctx, args.projectId);

        if (!project) return { streams: [], costs: [] };

        const streams = await ctx.db.query("revenue_streams").withIndex("by_project", (q: any) => q.eq("projectId", project._id)).collect();
        const costs = await ctx.db.query("costs").withIndex("by_project", (q: any) => q.eq("projectId", project._id)).collect();

        return {
            streams: streams.map((s: any) => ({ ...s, id: s._id })),
            costs: costs.map((c: any) => ({ ...c, id: c._id }))
        };
    },
});

export const addRevenueStream = mutation({
    args: {
        projectId: v.string(),
        name: v.string(),
        price: v.number(),
        frequency: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);

        if (!project) {
            throw new Error("Project not found. Please create project first.");
        }

        await ctx.db.insert("revenue_streams", {
            projectId: project._id,
            orgId: project.orgId,
            name: args.name,
            price: args.price,
            frequency: args.frequency
        });
    }
});

export const updateRevenueStream = mutation({
    args: {
        id: v.id("revenue_streams"),
        updates: v.object({
            name: v.optional(v.string()),
            price: v.optional(v.number()),
            frequency: v.optional(v.string())
        })
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const item = await ctx.db.get(args.id);
        if (!item) return;

        await verifyProjectAccess(ctx, item.projectId);

        await ctx.db.patch(args.id, args.updates);
    }
});

export const deleteRevenueStream = mutation({
    args: { id: v.id("revenue_streams") },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const item = await ctx.db.get(args.id);
        if (!item) return;

        await verifyProjectAccess(ctx, item.projectId);

        await ctx.db.delete(args.id);
    }
});

export const addCost = mutation({
    args: {
        projectId: v.string(),
        name: v.string(),
        amount: v.number(),
        frequency: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);

        if (!project) {
            throw new Error("Project not found");
        }

        await ctx.db.insert("costs", {
            projectId: project._id,
            orgId: project.orgId,
            name: args.name,
            amount: args.amount,
            frequency: args.frequency
        });
    }
});

export const updateCost = mutation({
    args: {
        id: v.id("costs"),
        updates: v.object({
            name: v.optional(v.string()),
            amount: v.optional(v.number()),
            frequency: v.optional(v.string())
        })
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const item = await ctx.db.get(args.id);
        if (!item) return;

        await verifyProjectAccess(ctx, item.projectId);

        await ctx.db.patch(args.id, args.updates);
    }
});

export const deleteCost = mutation({
    args: { id: v.id("costs") },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const item = await ctx.db.get(args.id);
        if (item) {
            await verifyProjectAccess(ctx, item.projectId);
            await ctx.db.delete(args.id);
        }
    }
});

export const saveSnapshot = mutation({
    args: { projectId: v.string(), name: v.string(), data: v.string() },
    handler: async (ctx: any, args: any) => {
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        await ctx.db.insert("revenue_versions", {
            projectId: project._id,
            orgId: project.orgId,
            name: args.name,
            data: args.data,
            createdAt: Date.now()
        });
    }
});
