import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
    args: { projectId: v.string() },
    handler: async (ctx, args) => {
        const roles = await ctx.db
            .query("roles")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .collect();
        return roles;
    },
});

export const create = mutation({
    args: {
        projectId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        allowedPages: v.array(v.string()),
        isSystem: v.boolean(),
    },
    handler: async (ctx, args) => {
        const roleId = await ctx.db.insert("roles", {
            projectId: args.projectId,
            name: args.name,
            description: args.description,
            allowedPages: args.allowedPages,
            isSystem: args.isSystem,
        });
        return roleId;
    },
});


export const update = mutation({
    args: {
        id: v.id("roles"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        allowedPages: v.optional(v.array(v.string())),
        permissions: v.optional(v.object({
            global: v.object({
                view: v.boolean(),
                create: v.boolean(),
                edit: v.boolean(),
                delete: v.boolean(),
            }),
            project: v.optional(v.object({
                create: v.boolean(),
                delete: v.boolean(),
            })),
            canvas: v.optional(v.object({
                create: v.boolean(),
                update: v.boolean(),
            }))
        })),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    },
});

export const deleteRole = mutation({
    args: { id: v.id("roles") },
    handler: async (ctx, args) => {
        const role = await ctx.db.get(args.id);
        if (role && role.isSystem) {
            throw new Error("Cannot delete system roles.");
        }
        await ctx.db.delete(args.id);
    },
});

