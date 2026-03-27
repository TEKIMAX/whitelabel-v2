
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Auth Helper
async function checkAuth(ctx: any) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return {
        userId: identity.subject,
        orgId: identity.orgId || "personal"
    };
}

export const getFeatures = query({
    args: { projectId: v.string() }, // localId
    handler: async (ctx: any, args: any) => {
        const { orgId } = await checkAuth(ctx);

        let project;
        try {
            project = await ctx.db.get(args.projectId as any);
        } catch (e) { }

        if (!project) {
            project = await ctx.db
                .query("projects")
                .withIndex("by_localId", (q: any) => q.eq("localId", args.projectId))
                .filter((q: any) => q.eq(q.field("orgId"), orgId))
                .first();
        }

        if (!project) return [];

        const features = await ctx.db
            .query("features")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .collect();

        return features.map((f: any) => ({
            ...f,
            id: f._id // Map for frontend
        }));
    },
});

export const addFeature = mutation({
    args: {
        projectId: v.string(), // localId
        title: v.string(),
        description: v.string(),
        status: v.string(),
        priority: v.string(),
        stackLayer: v.optional(v.string()),
        systemId: v.optional(v.string()),
        eisenhowerQuadrant: v.optional(v.string()),
        assignedTo: v.optional(v.array(v.string())),
        tags: v.optional(v.array(v.string())),
        connectedGoalId: v.optional(v.string()),
        connectedKeyResultId: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const { orgId, userId } = await checkAuth(ctx);

        let project;
        try {
            project = await ctx.db.get(args.projectId as any);
        } catch (e) { }

        if (!project) {
            project = await ctx.db
                .query("projects")
                .withIndex("by_localId", (q: any) => q.eq("localId", args.projectId))
                .filter((q: any) => q.eq(q.field("orgId"), orgId))
                .first();
        }

        if (!project) {
            const id = await ctx.db.insert("projects", {
                orgId,
                userId,
                name: "Untitled Project",
                hypothesis: "",
                localId: args.projectId,
                updatedAt: Date.now()
            });
            project = await ctx.db.get(id);
        }

        await ctx.db.insert("features", {
            projectId: project._id,
            orgId,
            title: args.title,
            description: args.description,
            status: args.status,
            priority: args.priority,
            stackLayer: args.stackLayer,
            systemId: args.systemId,
            eisenhowerQuadrant: args.eisenhowerQuadrant,
            assignedTo: args.assignedTo,
            tags: args.tags,
            connectedGoalId: args.connectedGoalId,
            connectedKeyResultId: args.connectedKeyResultId,
            createdAt: Date.now()
        });
    }
});

export const updateFeature = mutation({
    args: {
        id: v.id("features"),
        updates: v.object({
            title: v.optional(v.string()),
            description: v.optional(v.string()),
            status: v.optional(v.string()),
            priority: v.optional(v.string()),
            stackLayer: v.optional(v.string()),
            systemId: v.optional(v.string()),
            eisenhowerQuadrant: v.optional(v.string()),
            assignedTo: v.optional(v.array(v.string())),
            tags: v.optional(v.array(v.string())),
            source: v.optional(v.string()),
            creatorProfile: v.optional(v.object({
                name: v.string(),
                avatarUrl: v.optional(v.string()),
                userId: v.string()
            })),
            connectedGoalId: v.optional(v.string()),
            connectedKeyResultId: v.optional(v.string())
        })
    },
    handler: async (ctx: any, args: any) => {
        await checkAuth(ctx);
        await ctx.db.patch(args.id, args.updates);
    }
});

export const deleteFeature = mutation({
    args: { id: v.id("features") },
    handler: async (ctx: any, args: any) => {
        await checkAuth(ctx);
        await ctx.db.delete(args.id);
    }
});

// --- Architecture Nodes ---

export const getArchitectureNodes = query({
    args: { projectId: v.string() }, // localId
    handler: async (ctx: any, args: any) => {
        const { orgId } = await checkAuth(ctx);

        let project;
        try {
            project = await ctx.db.get(args.projectId as any);
        } catch (e) { }

        if (!project) {
            project = await ctx.db
                .query("projects")
                .withIndex("by_localId", (q: any) => q.eq("localId", args.projectId))
                .filter((q: any) => q.eq(q.field("orgId"), orgId))
                .first();
        }

        if (!project) return [];

        const nodes = await ctx.db
            .query("architecture_nodes")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .collect();

        return nodes.map((n: any) => ({
            id: n._id,
            type: n.type,
            position: n.position,
            data: JSON.parse(n.data)
        }));
    },
});

export const saveArchitectureNode = mutation({
    args: {
        projectId: v.string(), // localId
        nodeId: v.optional(v.string()), // If updating existing
        type: v.string(),
        position: v.object({ x: v.number(), y: v.number() }),
        data: v.string() // JSON
    },
    handler: async (ctx: any, args: any) => {
        const { orgId, userId } = await checkAuth(ctx);

        let project;
        try {
            project = await ctx.db.get(args.projectId as any);
        } catch (e) { }

        if (!project) {
            project = await ctx.db
                .query("projects")
                .withIndex("by_localId", (q: any) => q.eq("localId", args.projectId))
                .filter((q: any) => q.eq(q.field("orgId"), orgId))
                .first();
        }

        if (!project) {
            const id = await ctx.db.insert("projects", {
                orgId,
                userId,
                name: "Untitled Project",
                hypothesis: "",
                localId: args.projectId,
                updatedAt: Date.now()
            });
            project = await ctx.db.get(id);
        }

        // Check if it's an update to an existing node (by ID)
        if (args.nodeId) {
            // Try to find by ID first
            try {
                const existing = await ctx.db.get(args.nodeId as any);
                if (existing) {
                    await ctx.db.patch(existing._id, {
                        position: args.position,
                        data: args.data
                    });
                    return existing._id;
                }
            } catch (e) { }
        }

        // Insert new
        const newId = await ctx.db.insert("architecture_nodes", {
            projectId: project._id,
            orgId,
            type: args.type,
            position: args.position,
            data: args.data,
            createdAt: Date.now()
        });
        return newId;
    }
});

export const deleteArchitectureNode = mutation({
    args: { id: v.id("architecture_nodes") },
    handler: async (ctx: any, args: any) => {
        await checkAuth(ctx);
        await ctx.db.delete(args.id);
    }
});
