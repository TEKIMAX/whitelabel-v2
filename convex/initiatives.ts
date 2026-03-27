import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// --- Divisions ---

export const getDivisions = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("divisions")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .collect();
    },
});

export const createDivision = mutation({
    args: {
        projectId: v.id("projects"),
        name: v.string(),
        description: v.optional(v.string()),
        color: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // Fetch project to get orgId
        const project = await ctx.db.get(args.projectId);
        if (!project) throw new Error("Project not found");

        return await ctx.db.insert("divisions", {
            projectId: args.projectId,
            orgId: project.orgId,
            name: args.name,
            description: args.description,
            color: args.color,
            createdAt: Date.now(),
        });
    },
});

export const deleteDivision = mutation({
    args: { divisionId: v.id("divisions") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // Cascade delete initiatives
        const initiatives = await ctx.db
            .query("initiatives")
            .withIndex("by_division", q => q.eq("divisionId", args.divisionId))
            .collect();

        for (const initiative of initiatives) {
            // We could also call deleteInitiative for each, but doing it inline is efficient enough for now
            // Delete comments
            const comments = await ctx.db
                .query("initiative_comments")
                .withIndex("by_initiative", q => q.eq("initiativeId", initiative._id))
                .collect();
            for (const comment of comments) await ctx.db.delete(comment._id);

            // Unlink files
            const files = await ctx.db
                .query("files")
                .withIndex("by_initiative", q => q.eq("initiativeId", initiative._id))
                .collect();
            for (const file of files) await ctx.db.patch(file._id, { initiativeId: undefined });

            await ctx.db.delete(initiative._id);
        }

        await ctx.db.delete(args.divisionId);
    },
});

// --- Initiatives ---

export const getInitiatives = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("initiatives")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .collect();
    },
});

export const createInitiative = mutation({
    args: {
        projectId: v.id("projects"),
        divisionId: v.id("divisions"),
        title: v.string(),
        description: v.string(),
        status: v.string(),
        priority: v.string(),
        targetDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const project = await ctx.db.get(args.projectId);
        if (!project) throw new Error("Project not found");

        return await ctx.db.insert("initiatives", {
            projectId: args.projectId,
            divisionId: args.divisionId,
            orgId: project.orgId,
            title: args.title,
            description: args.description,
            status: args.status,
            priority: args.priority,
            targetDate: args.targetDate,
            assignedIds: [],
            createdAt: Date.now(),
        });
    },
});

export const updateInitiative = mutation({
    args: {
        initiativeId: v.id("initiatives"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        status: v.optional(v.string()),
        priority: v.optional(v.string()),
        targetDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { initiativeId, ...updates } = args;
        await ctx.db.patch(initiativeId, updates);
    },
});

export const toggleAssignMember = mutation({
    args: {
        initiativeId: v.id("initiatives"),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const initiative = await ctx.db.get(args.initiativeId);
        if (!initiative) throw new Error("Initiative not found");

        const currentAssignees = initiative.assignedIds || [];
        let newAssignees;

        if (currentAssignees.includes(args.userId)) {
            newAssignees = currentAssignees.filter(id => id !== args.userId);
        } else {
            newAssignees = [...currentAssignees, args.userId];
        }

        await ctx.db.patch(args.initiativeId, { assignedIds: newAssignees });
    },
});

export const deleteInitiative = mutation({
    args: { initiativeId: v.id("initiatives") },
    handler: async (ctx, args) => {
        // Delete comments
        const comments = await ctx.db
            .query("initiative_comments")
            .withIndex("by_initiative", q => q.eq("initiativeId", args.initiativeId))
            .collect();
        for (const comment of comments) await ctx.db.delete(comment._id);

        // Unlink files
        const files = await ctx.db
            .query("files")
            .withIndex("by_initiative", q => q.eq("initiativeId", args.initiativeId))
            .collect();
        for (const file of files) await ctx.db.patch(file._id, { initiativeId: undefined });

        await ctx.db.delete(args.initiativeId);
    },
});

// --- Details & Comments ---

export const getInitiativeDetails = query({
    args: { initiativeId: v.id("initiatives") },
    handler: async (ctx, args) => {
        const initiative = await ctx.db.get(args.initiativeId);
        if (!initiative) return null;

        // Fetch comments
        const comments = await ctx.db
            .query("initiative_comments")
            .withIndex("by_initiative", (q) => q.eq("initiativeId", args.initiativeId))
            .collect();

        // Fetch linked files
        const files = await ctx.db
            .query("files")
            .withIndex("by_initiative", (q) => q.eq("initiativeId", args.initiativeId))
            .collect();

        return {
            ...initiative,
            comments,
            files
        };
    }
});

export const addComment = mutation({
    args: {
        initiativeId: v.id("initiatives"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        if (!user) throw new Error("User not found");

        await ctx.db.insert("initiative_comments", {
            initiativeId: args.initiativeId,
            userId: user._id,
            userName: user.name || "User",
            userPicture: user.pictureUrl,
            content: args.content,
            createdAt: Date.now(),
        });
    }
});

export const linkFileToInitiative = mutation({
    args: {
        initiativeId: v.id("initiatives"),
        fileId: v.id("files")
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.fileId, { initiativeId: args.initiativeId });
    }
});

export const unlinkFileFromInitiative = mutation({
    args: {
        fileId: v.id("files")
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.fileId, { initiativeId: undefined });
    }
});

export const getProjectFiles = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("files")
            .withIndex("by_project_folder", (q) => q.eq("projectId", args.projectId))
            .collect();
    }
});
