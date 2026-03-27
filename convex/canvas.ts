
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectSafe, requireAuth, verifyProjectAccess } from "./auth";

// Helper to map CanvasSection string to schema field
function mapSectionToField(section: string): string {
    switch (section) {
        case "Problem": return "problem";
        case "Customer Segments": return "customerSegments";
        case "Unique Value Proposition": return "uniqueValueProposition";
        case "Solution": return "solution";
        case "Unfair Advantage": return "unfairAdvantage";
        case "Revenue Streams": return "revenueStreams";
        case "Cost Structure": return "costStructure";
        case "Key Metrics": return "keyMetrics";
        case "Channels": return "channels";
        default: throw new Error(`Unknown section: ${section}`);
    }
}

// 1. Get Canvas (Active or Specific)
export const getCanvas = query({
    args: {
        projectId: v.string(),
        canvasId: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return null;

        let canvasDoc;
        if (args.canvasId) {
            canvasDoc = await ctx.db.get(args.canvasId);
        } else if (project.currentCanvasId) {
            canvasDoc = await ctx.db.get(project.currentCanvasId);
        } else {
            canvasDoc = await ctx.db
                .query("canvases")
                .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
                .first();
        }

        if (!canvasDoc) return null;

        // Map fields to frontend format
        const canvas: Record<string, string> = {
            "Problem": canvasDoc.problem || "",
            "Customer Segments": canvasDoc.customerSegments || "",
            "Unique Value Proposition": canvasDoc.uniqueValueProposition || "",
            "Solution": canvasDoc.solution || "",
            "Unfair Advantage": canvasDoc.unfairAdvantage || "",
            "Revenue Streams": canvasDoc.revenueStreams || "",
            "Cost Structure": canvasDoc.costStructure || "",
            "Key Metrics": canvasDoc.keyMetrics || "",
            "Channels": canvasDoc.channels || ""
        };

        return canvas;
    },
});

// 2. Update Section (Upsert on Active Canvas)
export const updateSection = mutation({
    args: {
        projectId: v.string(),
        section: v.string(),
        content: v.string(),
        canvasId: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        signature: v.optional(v.string()),
        publicKey: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const { subject } = identity;

        let project = await getProjectSafe(ctx, args.projectId);

        if (!project) {
            throw new Error("Project not found. Please create project first.");
        }

        const orgId = project.orgId;

        // Determine target canvas
        let targetCanvasId = args.canvasId;
        if (!targetCanvasId) {
            if (project.currentCanvasId) {
                targetCanvasId = project.currentCanvasId;
            } else {
                // Find or create default
                const existing = await ctx.db
                    .query("canvases")
                    .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
                    .first();

                if (existing) {
                    targetCanvasId = existing._id;
                } else {
                    targetCanvasId = await ctx.db.insert("canvases", {
                        projectId: project._id,
                        orgId,
                        name: "Main",
                        updatedAt: Date.now()
                    });
                    await ctx.db.patch(project._id, { currentCanvasId: targetCanvasId });
                }
            }
        }

        let newContent = args.content;
        if (args.tags && args.tags.includes("AI Assisted")) {
            // Append badge if not present
            if (!newContent.includes("![AI Assisted]")) {
                newContent += "\n\n![AI Assisted](https://img.shields.io/badge/AI-Assisted-purple)";
            }
        }

        const fieldName = mapSectionToField(args.section);
        await ctx.db.patch(targetCanvasId, {
            [fieldName]: newContent,
            updatedAt: Date.now()
        });

        // Also update project timestamp
        await ctx.db.patch(project._id, { updatedAt: Date.now() });

        // Automated Audit Trail with Signature
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        await ctx.db.insert("activity_log", {
            projectId: project._id,
            orgId,
            userId: identity.subject,
            userName: user?.name || "Unknown User",
            action: "UPDATE",
            entityType: "canvas",
            entityId: targetCanvasId,
            entityName: `${args.section} Suggestion Approved`,
            changes: `Updated ${args.section} with AI content`,
            signature: args.signature,
            publicKey: args.publicKey,
            timestamp: Date.now()
        });
    }
});

// 3. Create New Canvas (Version)
export const createCanvas = mutation({
    args: {
        projectId: v.string(),
        name: v.string(),
        fromCanvasId: v.optional(v.string()) // Copy from existing
    },
    handler: async (ctx: any, args: any) => {
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");
        const orgId = project.orgId;

        let initialData = {};
        if (args.fromCanvasId) {
            const source = await ctx.db.get(args.fromCanvasId);
            if (source) {
                initialData = {
                    problem: source.problem,
                    solution: source.solution,
                    keyMetrics: source.keyMetrics,
                    uniqueValueProposition: source.uniqueValueProposition,
                    unfairAdvantage: source.unfairAdvantage,
                    channels: source.channels,
                    customerSegments: source.customerSegments,
                    costStructure: source.costStructure,
                    revenueStreams: source.revenueStreams,
                };
            }
        }

        const newCanvasId = await ctx.db.insert("canvases", {
            projectId: project._id,
            orgId,
            name: args.name,
            updatedAt: Date.now(),
            ...initialData
        });

        // Automatically switch to new canvas
        await ctx.db.patch(project._id, { currentCanvasId: newCanvasId });
        return newCanvasId;
    }
});

// 4. Switch Active Canvas
export const switchCanvas = mutation({
    args: {
        projectId: v.string(),
        canvasId: v.id("canvases")
    },
    handler: async (ctx: any, args: any) => {
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        await ctx.db.patch(project._id, { currentCanvasId: args.canvasId });
    }
});

// 5. Delete Canvas
export const deleteCanvas = mutation({
    args: { canvasId: v.id("canvases") },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const canvas = await ctx.db.get(args.canvasId);
        if (!canvas) return;

        // Explicit check via user lookup
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || !user.orgIds.includes(canvas.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.canvasId);
    }
});

// 6. Clear Canvas
export const clearCanvas = mutation({
    args: { canvasId: v.id("canvases") },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const canvas = await ctx.db.get(args.canvasId);

        if (!canvas) throw new Error("Canvas not found");

        // Explicit check via user lookup
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || !user.orgIds.includes(canvas.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.canvasId, {
            problem: "",
            solution: "",
            keyMetrics: "",
            uniqueValueProposition: "",
            unfairAdvantage: "",
            channels: "",
            customerSegments: "",
            costStructure: "",
            revenueStreams: "",
            updatedAt: Date.now()
        });
    }
});
