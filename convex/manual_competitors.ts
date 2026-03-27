
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectSafe, requireAuth } from "./auth";

/**
 * Lists all competitors manually added for a project.
 * Merges raw name with details from the attributesData JSON.
 */
export const listManualCompetitors = query({
    args: { projectId: v.string() },
    handler: async (ctx, args) => {
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return [];

        const competitors = await ctx.db
            .query("competitors")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect();

        return competitors.map((c) => {
            let details = {};
            try {
                details = JSON.parse(c.attributesData || "{}");
            } catch (e) {
            }

            return {
                id: c._id,
                name: c.name,
                source: c.source,
                tags: c.tags || [],
                ...details
            };
        });
    },
});

/**
 * Adds a new competitor manually to the project.
 * Stores description and website in the attributesData JSON blob.
 */
export const addManualCompetitor = mutation({
    args: {
        projectId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        website: v.optional(v.string()),
        // Extended attributes found in AI generation
        focus: v.optional(v.string()),
        differentiation: v.optional(v.string()),
        technology: v.optional(v.string()),
        matchProbability: v.optional(v.string()),
        // Override source (e.g. "AI" or "Human")
        source: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        // Merge standard and extended attributes
        const attributesData = JSON.stringify({
            Description: args.description || "",
            Website: args.website || "",
            Focus: args.focus || "",
            Differentiation: args.differentiation || "",
            Technology: args.technology || "",
            "Match Probability": args.matchProbability || "",
        });

        const competitorId = await ctx.db.insert("competitors", {
            projectId: project._id,
            orgId: project.orgId,
            name: args.name,
            attributesData,
            source: args.source || "Human",
            tags: args.source === "AI" ? ["AI Generated"] : ["Manual"],
            creatorProfile: {
                name: identity.name || "Unknown",
                avatarUrl: identity.pictureUrl,
                userId: identity.subject,
            },
        });

        return competitorId;
    },
});

export const updateManualCompetitor = mutation({
    args: {
        id: v.id("competitors"),
        updates: v.object({
            name: v.optional(v.string()),
            description: v.optional(v.string()),
            website: v.optional(v.string()),
            focus: v.optional(v.string()),
            differentiation: v.optional(v.string()),
            technology: v.optional(v.string()),
            matchProbability: v.optional(v.string()),
            source: v.optional(v.string()),
            tags: v.optional(v.array(v.string())),
        }),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const existing = await ctx.db.get(args.id);
        if (!existing) throw new Error("Competitor not found");

        let attributesData = {};
        try {
            attributesData = JSON.parse(existing.attributesData || "{}");
        } catch (e) {
            // ignore
        }

        const newAttributes = {
            ...attributesData,
            ...(args.updates.description !== undefined ? { Description: args.updates.description } : {}),
            ...(args.updates.website !== undefined ? { Website: args.updates.website } : {}),
            ...(args.updates.focus !== undefined ? { Focus: args.updates.focus } : {}),
            ...(args.updates.differentiation !== undefined ? { Differentiation: args.updates.differentiation } : {}),
            ...(args.updates.technology !== undefined ? { Technology: args.updates.technology } : {}),
            ...(args.updates.matchProbability !== undefined ? { "Match Probability": args.updates.matchProbability } : {}),
        };

        await ctx.db.patch(args.id, {
            ...(args.updates.name !== undefined ? { name: args.updates.name } : {}),
            ...(args.updates.source !== undefined ? { source: args.updates.source } : {}),
            ...(args.updates.tags !== undefined ? { tags: args.updates.tags } : {}),
            attributesData: JSON.stringify(newAttributes),
        });
    },
});

export const deleteManualCompetitor = mutation({
    args: { id: v.id("competitors") },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        await ctx.db.delete(args.id);
    },
});

export const bulkDeleteCompetitors = mutation({
    args: { ids: v.array(v.id("competitors")) },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        for (const id of args.ids) {
            await ctx.db.delete(id);
        }
    },
});
