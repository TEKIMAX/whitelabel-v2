
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function checkAuth(ctx: any) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return { userId: identity.subject, orgId: identity.orgId || "personal" };
}

export const logSource = mutation({
    args: {
        projectId: v.string(),
        name: v.string(),
        type: v.string(),
        source: v.string(),
        wordCount: v.number(),
        tags: v.array(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const { orgId, userId } = await checkAuth(ctx);
        let project = await ctx.db.query("projects").withIndex("by_localId", (q: any) => q.eq("localId", args.projectId)).filter((q: any) => q.eq(q.field("orgId"), orgId)).first();

        if (!project) {
            const id = await ctx.db.insert("projects", { orgId, userId, name: "Untitled", hypothesis: "", localId: args.projectId, updatedAt: Date.now() });
            project = await ctx.db.get(id);
        }

        await ctx.db.insert("data_sources", {
            projectId: project._id,
            orgId,
            name: args.name,
            type: args.type,
            source: args.source,
            wordCount: args.wordCount,
            tags: args.tags,
            timestamp: Date.now()
        });
    }
});

export const getAuditLog = query({
    args: { projectId: v.string() },
    handler: async (ctx: any, args: any) => {
        const { orgId } = await checkAuth(ctx);
        const project = await ctx.db.query("projects").withIndex("by_localId", (q: any) => q.eq("localId", args.projectId)).filter((q: any) => q.eq(q.field("orgId"), orgId)).first();
        if (!project) return [];
        return await ctx.db.query("data_sources").withIndex("by_project", (q: any) => q.eq("projectId", project._id)).collect();
    }
});

// New: Get Activity Log (Comprehensive Audit Trail)
export const getActivityLog = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx: any, args: any) => {
        const { orgId } = await checkAuth(ctx);

        // Verify project belongs to org
        const project = await ctx.db.get(args.projectId);
        if (!project || project.orgId !== orgId) return [];

        // Get all activity for this project, sorted by most recent
        const activities = await ctx.db
            .query("activity_log")
            .withIndex("by_project", (q: any) => q.eq("projectId", args.projectId))
            .order("desc")
            .take(100); // Limit to last 100 entries

        return activities;
    }
});

// New: Log Activity (Utility for other modules)
export const logActivity = mutation({
    args: {
        projectId: v.optional(v.id("projects")),
        action: v.string(),
        entityType: v.string(),
        entityId: v.string(),
        entityName: v.optional(v.string()),
        changes: v.optional(v.string()),
        metadata: v.optional(v.string()),
        signature: v.optional(v.string()),
        publicKey: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const { orgId, userId } = await checkAuth(ctx);

        // Get user details
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", userId))
            .unique();

        await ctx.db.insert("activity_log", {
            projectId: args.projectId,
            orgId,
            userId,
            userName: user?.name || "Unknown User",
            action: args.action,
            entityType: args.entityType,
            entityId: args.entityId,
            entityName: args.entityName,
            changes: args.changes,
            metadata: args.metadata,
            signature: args.signature,
            publicKey: args.publicKey,
            timestamp: Date.now()
        });
    }
});
