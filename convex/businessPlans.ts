import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { verifyProjectAccess } from "./auth";

// Get the latest draft for a project
export const getLatest = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("business_plans")
            .withIndex("by_project_latest", (q) =>
                q.eq("projectId", args.projectId).eq("isLatest", true)
            )
            .first();
    },
});

// Save a draft (debounce this on frontend)
export const saveDraft = mutation({
    args: {
        projectId: v.id("projects"),
        content: v.string(), // JSON string
    },
    handler: async (ctx, args) => {
        const { user, orgId } = await verifyProjectAccess(ctx, args.projectId);

        // Find existing draft
        const existing = await ctx.db
            .query("business_plans")
            .withIndex("by_project_latest", (q) =>
                q.eq("projectId", args.projectId).eq("isLatest", true)
            )
            .first();

        const timestamp = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                content: args.content,
                updatedAt: timestamp,
                createdBy: user.tokenIdentifier, // Update creator if different? Or keep original? Usually last editor.
            });
            return existing._id;
        } else {
            // Create new draft
            return await ctx.db.insert("business_plans", {
                projectId: args.projectId,
                orgId,
                content: args.content,
                version: 1, // Draft version logic, maybe not strict
                isLatest: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                createdBy: user.tokenIdentifier,
            });
        }
    },
});

// Create a named version snapshot
export const createVersion = mutation({
    args: {
        projectId: v.id("projects"),
        name: v.string(),
        source: v.optional(v.string()), // 'AI' | 'Human'
    },
    handler: async (ctx, args) => {
        const { user, orgId } = await verifyProjectAccess(ctx, args.projectId);

        // Get current draft content
        const draft = await ctx.db
            .query("business_plans")
            .withIndex("by_project_latest", (q) =>
                q.eq("projectId", args.projectId).eq("isLatest", true)
            )
            .first();

        if (!draft) {
            throw new Error("No draft content found to version.");
        }

        // Get strictly incremented version number based on historical versions
        const versions = await ctx.db
            .query("business_plan_versions")
            .withIndex("by_project", ((q) => q.eq("projectId", args.projectId)))
            .collect();

        // Calculate new version number: max(existing) + 1
        const nextVersion = versions.length > 0
            ? Math.max(...versions.map(v => v.version)) + 1
            : 1;

        // Create version entry
        const versionId = await ctx.db.insert("business_plan_versions", {
            projectId: args.projectId,
            orgId,
            content: draft.content,
            version: nextVersion,
            name: args.name,
            source: args.source,
            createdAt: Date.now(),
            createdBy: user.tokenIdentifier,
        });

        return versionId;
    },
});

// List all versions
export const listVersions = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const versions = await ctx.db
            .query("business_plan_versions")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .order("desc") // Newest first
            .collect();

        // Enrich with user details if needed, for now just return raw
        // We can fetch user names if required for the UI table

        // Fetch users for `createdBy`
        const userIds = [...new Set(versions.map(v => v.createdBy))];
        const users = await Promise.all(userIds.map(id =>
            ctx.db.query("users").withIndex("by_token", q => q.eq("tokenIdentifier", id)).first()
        ));
        const userMap = new Map(users.map(u => [u?.tokenIdentifier, u]));

        return versions.map(v => ({
            ...v,
            creatorName: userMap.get(v.createdBy)?.name || "Unknown User",
            creatorImage: userMap.get(v.createdBy)?.pictureUrl,
        }));
    },
});
