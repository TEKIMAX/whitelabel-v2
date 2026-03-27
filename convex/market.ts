
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyProjectAccess, requireAuth, getProjectSafe } from "./auth";

export const getMarket = query({
  args: { projectId: v.string() }, // localId or ID
  handler: async (ctx: any, args: any) => {
    const project = await getProjectSafe(ctx, args.projectId);
    if (!project) return null;

    const data = await ctx.db
      .query("market_data")
      .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
      .first();

    return data || {
      tam: 0,
      sam: 0,
      som: 0,
      reportContent: "",
      keywords: [],
      tags: [],
      creatorProfile: undefined,
      source: undefined,
      naicsCode: undefined
    };
  },
});

export const updateMarket = mutation({
  args: {
    projectId: v.string(), // localId
    tam: v.number(),
    sam: v.number(),
    som: v.number(),
    reportContent: v.string(),
    keywords: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    creatorProfile: v.optional(v.object({
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      userId: v.string()
    })),
    source: v.optional(v.string()),
    naicsCode: v.optional(v.string())
  },
  handler: async (ctx: any, args: any) => {
    const identity = await requireAuth(ctx);

    // Find/Create Project
    let project = await getProjectSafe(ctx, args.projectId);

    // 3. If still not found, create new (only if it looks like a localId timestamp or UUID)
    // NOTE: Creating via this mutation is legacy behavior. We prefer explicit creation.
    // However, to maintain compatibility:
    if (!project) {
      // Fallback to strict "Active" org creation if really needed, but ideally we fail.
      // For now, let's assume if it fails, we throw, unless we want to restore strict legacy creation.
      // But preventing accidental creation in wrong org is better. 
      // We'll throw if not found. The proper flow is Projects -> Create -> Edit Market.
      // If the user is editing a "new" project that hasn't swum to server yet, they should use the `create` action.
      throw new Error("Project not found. Please create the project first.");
    }

    // Update Market Data
    const existing = await ctx.db
      .query("market_data")
      .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
      .first();

    const payload = {
      tam: args.tam,
      sam: args.sam,
      som: args.som,
      reportContent: args.reportContent,
      keywords: args.keywords,
      tags: args.tags,
      creatorProfile: args.creatorProfile,
      source: args.source,
      naicsCode: args.naicsCode,
      updatedAt: Date.now()
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("market_data", {
        projectId: project._id,
        orgId: project.orgId,
        ...payload
      });
    }
  },
});

export const resetMarketStatus = mutation({
  args: {
    projectId: v.string(),
    status: v.string(), // 'cancelled' | 'timeout' | 'idle'
  },
  handler: async (ctx: any, args: any) => {
    const project = await getProjectSafe(ctx, args.projectId);
    if (!project) return;

    const existing = await ctx.db
      .query("market_data")
      .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        updatedAt: Date.now(),
      });
    }
  },
});

export const saveMarketAnalysisResult = internalMutation({
  args: {
    projectId: v.string(), // real ID
    tam: v.number(),
    sam: v.number(),
    som: v.number(),
    reportContent: v.string(),
    sources: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string()
    })))
  },
  handler: async (ctx, args) => {
    // Cast to any to resolve union type issues quickly
    const project = (await ctx.db.get(args.projectId as any)) as any;

    if (!project || !project.orgId) return; // Basic safety check

    const existing = await ctx.db
      .query("market_data")
      .withIndex("by_project", (q: any) => q.eq("projectId", args.projectId))
      .first();

    const timestamp = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tam: args.tam,
        sam: args.sam,
        som: args.som,
        reportContent: args.reportContent,
        sources: args.sources,
        status: 'completed',
        workflowId: undefined,
        source: 'AI',
        tags: ['AI Assisted'],
        updatedAt: timestamp,
      });
    } else {
      await ctx.db.insert("market_data", {
        projectId: args.projectId as any,
        orgId: project.orgId,
        tam: args.tam,
        sam: args.sam,
        som: args.som,
        reportContent: args.reportContent,
        sources: args.sources,
        status: 'completed',
        workflowId: undefined,
        source: 'AI',
        tags: ['AI Assisted'],
        updatedAt: timestamp
      } as any);
    }

    // Trigger Notification
    try {
      // @ts-ignore
      await ctx.runMutation(internal.notifications.addNotification, {
        projectId: args.projectId as any,
        userId: project.userId,
        orgId: project.orgId,
        title: "Market Research Completed",
        description: `Deep research for ${(project as any).name || "Project"} is ready.`,
        type: "success",
        metadata: `/market-research`
      });
    } catch (e) {
    }
  }
});

export const updateMarketWithSignature = mutation({
  args: {
    projectId: v.id("projects"),
    tam: v.number(),
    sam: v.number(),
    som: v.number(),
    reportContent: v.string(),
    signature: v.optional(v.string()),
    publicKey: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { project, orgId, user } = await verifyProjectAccess(ctx, args.projectId);

    const existing = await ctx.db
      .query("market_data")
      .withIndex("by_project", (q: any) => q.eq("projectId", args.projectId))
      .first();

    const payload = {
      tam: args.tam,
      sam: args.sam,
      som: args.som,
      reportContent: args.reportContent,
      updatedAt: Date.now(),
      source: 'AI'
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("market_data", {
        projectId: args.projectId,
        orgId,
        ...payload
      });
    }

    // Log Activity with Signature
    await ctx.db.insert("activity_log", {
      projectId: args.projectId,
      orgId,
      userId: user.tokenIdentifier,
      userName: user.name || "Unknown User",
      action: "UPDATE",
      entityType: "market_research",
      entityId: args.projectId as string,
      entityName: "Market Sizing",
      changes: "Updated market sizing via AI Suggestion",
      signature: args.signature,
      publicKey: args.publicKey,
      timestamp: Date.now()
    });
  }
});
