import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyProjectAccess } from "./auth";

export const saveDeck = mutation({
    args: {
        projectId: v.id("projects"),
        versionId: v.optional(v.id("deck_versions")),
        slides: v.array(v.object({
            id: v.string(),
            title: v.string(),
            content: v.string(),
            items: v.optional(v.string()), // JSON stringified CanvasItem[]
            notes: v.optional(v.string()),
            imageUrl: v.optional(v.string()),
            imagePrompt: v.optional(v.string()), // Added this field
            order: v.number(),
        })),
        theme: v.optional(v.string()), // JSON stringified DeckTheme
        name: v.optional(v.string()), // Explicit version name
        createdBy: v.optional(v.string()),
        createdByPicture: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { orgId } = await verifyProjectAccess(ctx, args.projectId);

        let finalVersionId;

        if (args.versionId) {
            // Update existing version
            await ctx.db.patch(args.versionId, {
                name: args.name || args.slides[0]?.title || "Update",
                slidesData: JSON.stringify(args.slides),
                theme: args.theme,
            });
            finalVersionId = args.versionId;
        } else {
            // We save the latest as a version
            finalVersionId = await ctx.db.insert("deck_versions", {
                projectId: args.projectId,
                orgId,
                name: args.name || args.slides[0]?.title || "Auto-save",
                slidesData: JSON.stringify(args.slides),
                theme: args.theme,
                createdAt: Date.now(),
                createdBy: args.createdBy,
                createdByPicture: args.createdByPicture,
            });
        }

        // Also update slide records for granular fetching if needed
        const existingSlides = await ctx.db
            .query("deck_slides")
            .withIndex("by_project", q => q.eq("projectId", args.projectId))
            .collect();

        for (const slide of existingSlides) {
            await ctx.db.delete(slide._id);
        }

        for (const slide of args.slides) {
            await ctx.db.insert("deck_slides", {
                projectId: args.projectId,
                orgId,
                title: slide.title,
                content: slide.content,
                items: slide.items,
                notes: slide.notes,
                imageUrl: slide.imageUrl,
                imagePrompt: slide.imagePrompt, // Added this field
                order: slide.order,
            });
        }

        return finalVersionId;
    },
});

export const deleteVersion = mutation({
    args: { versionId: v.id("deck_versions") },
    handler: async (ctx, args) => {
        const version = await ctx.db.get(args.versionId);
        if (!version) throw new Error("Version not found");

        await verifyProjectAccess(ctx, version.projectId);
        await ctx.db.delete(args.versionId);
    },
});

export const listVersions = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        try {
            const { orgId } = await verifyProjectAccess(ctx, args.projectId);

            return await ctx.db
                .query("deck_versions")
                .withIndex("by_project", q => q.eq("projectId", args.projectId))
                .order("desc")
                .collect();
        } catch (e) {
            return [];
        }
    },
});

export const getLatestDeck = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        try {
            const { project } = await verifyProjectAccess(ctx, args.projectId);

            const latestVersion = await ctx.db
                .query("deck_versions")
                .withIndex("by_project", q => q.eq("projectId", args.projectId))
                .order("desc")
                .first();

            if (!latestVersion) return null;

            return {
                slides: JSON.parse(latestVersion.slidesData),
                theme: latestVersion.theme ? JSON.parse(latestVersion.theme) : null,
                versionId: latestVersion._id,
            };
        } catch (e) {
            return null;
        }
    },
});
