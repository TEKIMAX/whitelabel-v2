
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectSafe, requireAuth, verifyProjectAccess } from "./auth";


export const getAnalysis = query({
    args: { projectId: v.string() }, // localId
    handler: async (ctx: any, args: any) => {
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return null;

        // Fetch Config (Columns + Summary)
        const config = await ctx.db
            .query("competitor_config")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .first();

        // Fetch Competitors
        const competitors = await ctx.db
            .query("competitors")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .collect();

        const mappedCompetitors = competitors.map((c: any) => ({
            id: c._id,
            name: c.name,
            tabId: c.tabId,
            source: c.source,
            tags: c.tags,
            creatorProfile: c.creatorProfile,
            ...JSON.parse(c.attributesData)
        }));

        // Construct SubTabs
        let subTabs = config?.subTabs || [];

        // Backward compatibility: If no subTabs, create a default one if there are attributes
        if (subTabs.length === 0 && (config?.attributes?.length > 0 || mappedCompetitors.length > 0)) {
            subTabs = [{
                id: 'tab_general',
                name: 'General',
                attributes: config?.attributes || ["Price", "Features"],
                competitors: [] // Will be filled below
            }];
        }

        // Populate competitors into subTabs
        if (subTabs.length > 0) {
            subTabs = subTabs.map((tab: any) => ({
                ...tab,
                competitors: mappedCompetitors.filter((c: any) => c.tabId === tab.id || (!c.tabId && tab.id === 'tab_general'))
            }));
        }

        return {
            attributes: config?.attributes || ["Price", "Features"],
            analysisSummary: config?.analysisSummary || "",
            competitors: mappedCompetitors, // Legacy flat list for safety
            subTabs: subTabs
        };
    },
});

export const updateConfig = mutation({
    args: {
        projectId: v.string(), // localId
        attributes: v.array(v.string()),
        analysisSummary: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);

        // Find/Create Project
        let project = await getProjectSafe(ctx, args.projectId);

        if (!project) {
            throw new Error("Project not found. Please create project first.");
        }

        const existing = await ctx.db
            .query("competitor_config")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .first();

        const payload = {
            attributes: args.attributes,
            analysisSummary: args.analysisSummary,
            updatedAt: Date.now()
        };

        if (existing) {
            await ctx.db.patch(existing._id, payload);
        } else {
            await ctx.db.insert("competitor_config", {
                projectId: project._id,
                orgId: project.orgId,
                ...payload
            });
        }
    }
});

export const addCompetitor = mutation({
    args: {
        projectId: v.string(),
        name: v.string(),
        attributesData: v.string(), // JSON
        tabId: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        await ctx.db.insert("competitors", {
            projectId: project._id,
            orgId: project.orgId,
            name: args.name,
            attributesData: args.attributesData,
            tabId: args.tabId
        });
    }
});

export const updateCompetitor = mutation({
    args: {
        id: v.id("competitors"),
        name: v.optional(v.string()),
        attributesData: v.optional(v.string()),
        tabId: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        // Here we just use default auth check but we should verify project ownership via orgId
        // Ideally we fetch the competitor, check its orgId against user's orgIds.
        // For simplicity, let's just use requireAuth and assume if they have the ID they might be ok,
        // BUT for strict multi-tenancy we MUST check orgId.
        const identity = await requireAuth(ctx);

        const competitor = await ctx.db.get(args.id);
        if (!competitor) return; // or throw

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || !user.orgIds.includes(competitor.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.id, args);
    }
});

export const deleteCompetitor = mutation({
    args: { id: v.id("competitors") },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);

        const competitor = await ctx.db.get(args.id);
        if (!competitor) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || !user.orgIds.includes(competitor.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.id);
    }
});

// Bulk Import for CSV
export const bulkAddCompetitors = mutation({
    args: {
        projectId: v.string(),
        competitors: v.array(v.object({
            name: v.string(),
            attributesData: v.string(),
            tabId: v.optional(v.string())
        }))
    },
    handler: async (ctx: any, args: any) => {
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        // Efficiently insert all
        await Promise.all(args.competitors.map((comp: any) =>
            ctx.db.insert("competitors", {
                projectId: project._id,
                orgId: project.orgId,
                name: comp.name,
                attributesData: comp.attributesData,
                tabId: comp.tabId
            })
        ));
    }
});

// Save Full Analysis (Config + Competitors)
export const saveCompetitorAnalysisV2 = mutation({
    args: {
        projectId: v.string(), // localId
        attributes: v.array(v.string()),
        analysisSummary: v.optional(v.string()),
        subTabs: v.optional(v.array(v.object({
            id: v.string(),
            name: v.string(),
            attributes: v.array(v.string())
        }))),
        competitors: v.array(v.object({
            id: v.string(),
            name: v.string(),
            attributesData: v.string(),
            tabId: v.optional(v.string()),
            source: v.optional(v.string()),
            tags: v.optional(v.array(v.string())),
            creatorProfile: v.optional(v.object({
                name: v.string(),
                avatarUrl: v.optional(v.string()),
                userId: v.string()
            }))
        }))
    },
    handler: async (ctx: any, args: any) => {

        const identity = await requireAuth(ctx);

        // Find Project
        let project = await getProjectSafe(ctx, args.projectId);
        if (!project) {
            throw new Error("Project not found. Please create project first.");
        }

        // 1. Update Config
        const existingConfig = await ctx.db
            .query("competitor_config")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .first();

        const configPayload = {
            attributes: args.attributes,
            analysisSummary: args.analysisSummary,
            subTabs: args.subTabs,
            updatedAt: Date.now()
        };

        if (existingConfig) {
            await ctx.db.patch(existingConfig._id, configPayload);
        } else {
            await ctx.db.insert("competitor_config", {
                projectId: project._id,
                orgId: project.orgId,
                ...configPayload
            });
        }

        // 2. Replace Competitors (Delete all for project, then insert new)
        // This is simpler than diffing for this use case
        const existingCompetitors = await ctx.db
            .query("competitors")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .collect();

        await Promise.all(existingCompetitors.map((c: any) => ctx.db.delete(c._id)));

        await Promise.all(args.competitors.map((comp: any) =>
            ctx.db.insert("competitors", {
                projectId: project._id,
                orgId: project.orgId,
                name: comp.name,
                attributesData: comp.attributesData,
                tabId: comp.tabId,
                source: comp.source,
                tags: comp.tags,
                creatorProfile: comp.creatorProfile
            })
        ));
    }
});

export const getDebugDataByOrg = query({
    args: { orgId: v.string() },
    handler: async (ctx: any, args: any) => {
        const config = await ctx.db
            .query("competitor_config")
            .filter((q: any) => q.eq(q.field("orgId"), args.orgId))
            .collect();

        const competitors = await ctx.db
            .query("competitors")
            .filter((q: any) => q.eq(q.field("orgId"), args.orgId))
            .collect();

        return { config, competitors };
    },
});

export const saveSWOTAsCompetitor = mutation({
    args: {
        projectId: v.string(),
        competitorName: v.string(),
        swotData: v.object({
            strengths: v.array(v.string()),
            weaknesses: v.array(v.string()),
            opportunities: v.array(v.string()),
            threats: v.array(v.string())
        }),
        signature: v.optional(v.string()),
        publicKey: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        const attributesData = JSON.stringify({
            "Strengths": args.swotData.strengths.join(", "),
            "Weaknesses": args.swotData.weaknesses.join(", "),
            "Opportunities": args.swotData.opportunities.join(", "),
            "Threats": args.swotData.threats.join(", ")
        });

        const competitorId = await ctx.db.insert("competitors", {
            projectId: project._id,
            orgId: project.orgId,
            name: args.competitorName,
            attributesData,
            tags: ["AI Analyzed", "SWOT"]
        });

        // Log Activity with Signature
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        await ctx.db.insert("activity_log", {
            projectId: project._id,
            orgId: project.orgId,
            userId: identity.subject,
            userName: user?.name || "Unknown User",
            action: "CREATE",
            entityType: "competitor",
            entityId: competitorId,
            entityName: args.competitorName,
            changes: `Created SWOT analysis for ${args.competitorName} via AI Suggestion`,
            signature: args.signature,
            publicKey: args.publicKey,
            timestamp: Date.now()
        });

        return competitorId;
    }
});
