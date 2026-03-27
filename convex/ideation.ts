
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
    args: {
        orgId: v.string(),
        projectId: v.optional(v.string()), // Link to Venture
        name: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        coverImageStorageId: v.optional(v.id("_storage")),
        coverColor: v.optional(v.string()),
        items: v.string(), // JSON
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }

        const userId = identity.subject;

        const workspaceId = await ctx.db.insert("ideation_workspaces", {
            orgId: args.orgId,
            projectId: args.projectId,
            userId: userId,
            name: args.name,
            description: args.description,
            category: args.category,
            coverImage: args.coverImage,
            coverImageStorageId: args.coverImageStorageId,
            coverColor: args.coverColor,
            items: args.items,
            updatedAt: Date.now(),
        });

        return workspaceId;
    },
});

export const update = mutation({
    args: {
        id: v.id("ideation_workspaces"),
        items: v.optional(v.string()),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        coverImageStorageId: v.optional(v.id("_storage")),
        coverColor: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }

        const updates: any = { updatedAt: Date.now() };
        if (args.items !== undefined) updates.items = args.items;
        if (args.name !== undefined) updates.name = args.name;
        if (args.description !== undefined) updates.description = args.description;
        if (args.category !== undefined) updates.category = args.category;
        if (args.coverImage !== undefined) updates.coverImage = args.coverImage;
        if (args.coverColor !== undefined) updates.coverColor = args.coverColor;

        // Handle Storage Update & Cleanup
        if (args.coverImageStorageId !== undefined) {
            updates.coverImageStorageId = args.coverImageStorageId;

            // Fetch old data to cleanup
            const oldWorkspace = await ctx.db.get(args.id);
            if (oldWorkspace && oldWorkspace.coverImageStorageId && oldWorkspace.coverImageStorageId !== args.coverImageStorageId) {
                await ctx.storage.delete(oldWorkspace.coverImageStorageId);
            }
        }

        await ctx.db.patch(args.id, updates);
    },
});

export const list = query({
    args: {
        orgId: v.optional(v.string()),
        projectId: v.optional(v.string()) // Filter by Venture
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            // Return empty if not authenticated
            return [];
        }

        // Filter by Project (priority) > Org > User
        let workspaces;

        if (args.projectId) {
            if (args.orgId) {
                const orgWorkspaces = await ctx.db
                    .query("ideation_workspaces")
                    .withIndex("by_org", (q) => q.eq("orgId", args.orgId!))
                    .collect();
                workspaces = orgWorkspaces.filter(w => w.projectId === args.projectId);
            } else {
                const userWorkspaces = await ctx.db
                    .query("ideation_workspaces")
                    .withIndex("by_user", (q) => q.eq("userId", identity.subject))
                    .collect();
                workspaces = userWorkspaces.filter(w => w.projectId === args.projectId);
            }
        } else if (args.orgId) {
            workspaces = await ctx.db
                .query("ideation_workspaces")
                .withIndex("by_org", (q) => q.eq("orgId", args.orgId!))
                .collect();
        } else {
            // Fallback: list by user for personal workspaces
            workspaces = await ctx.db
                .query("ideation_workspaces")
                .withIndex("by_user", (q) => q.eq("userId", identity.subject))
                .collect();
        }

        // Generate URLs for storage images
        return await Promise.all(workspaces.map(async (w) => {
            let coverImage = w.coverImage;
            if (w.coverImageStorageId) {
                coverImage = await ctx.storage.getUrl(w.coverImageStorageId) || w.coverImage;
            }
            return { ...w, coverImage };
        }));
    },
});

export const get = query({
    args: { id: v.id("ideation_workspaces") },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.id);
        if (!workspace) return null;

        if (workspace.coverImageStorageId) {
            const url = await ctx.storage.getUrl(workspace.coverImageStorageId);
            if (url) workspace.coverImage = url;
        }
        return workspace;
    },
});

export const remove = mutation({
    args: { id: v.id("ideation_workspaces") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const workspace = await ctx.db.get(args.id);
        if (!workspace) return;

        // Cascade delete image
        if (workspace.coverImageStorageId) {
            await ctx.storage.delete(workspace.coverImageStorageId);
        }

        await ctx.db.delete(args.id);
    },
});
