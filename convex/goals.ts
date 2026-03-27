
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findUserByIdentity, getProjectSafe, requireAuth, verifyProjectAccess } from "./auth";

export const getGoals = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const project = await getProjectSafe(ctx, args.projectId);
    if (!project) return [];

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    const goalsWithKRs = await Promise.all(goals.map(async (g) => {
      const keyResults = await ctx.db
        .query("key_results")
        .withIndex("by_goal", (q) => q.eq("goalId", g._id))
        .collect();

      return {
        ...g,
        id: g._id,
        keyResults: keyResults.map(kr => ({ ...kr, id: kr._id }))
      };
    }));

    return goalsWithKRs;
  }
});

export const addGoal = mutation({
  args: {
    projectId: v.string(), // Local or Convex ID
    title: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    timeframe: v.string(),
    status: v.string(),
    quarter: v.optional(v.string()),
    year: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const project = await getProjectSafe(ctx, args.projectId);

    if (!project) throw new Error("Project not found");

    const goalId = await ctx.db.insert("goals", {
      projectId: project._id,
      orgId: project.orgId,
      title: args.title,
      description: args.description || "",
      type: args.type,
      timeframe: args.timeframe,
      status: args.status,
      quarter: args.quarter,
      year: args.year,
      createdAt: Date.now()
    });

    return goalId;
  }
});

export const updateGoal = mutation({
  args: {
    id: v.id("goals"),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      type: v.optional(v.string()),
      timeframe: v.optional(v.string()),
      status: v.optional(v.string()),
      archived: v.optional(v.boolean()),
      quarter: v.optional(v.string()),
      year: v.optional(v.number()),
      health: v.optional(v.string()),
      targetDate: v.optional(v.number()),
      linkedGoalIds: v.optional(v.array(v.string())),
    })
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const goal = await ctx.db.get(args.id);
    if (!goal) return;

    const user = await findUserByIdentity(ctx, identity);

    if (!user || !user.orgIds.includes(goal.orgId)) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, args.updates);
  }
});

export const deleteGoal = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const goal = await ctx.db.get(args.id);
    if (!goal) return;

    const user = await findUserByIdentity(ctx, identity);

    if (!user || !user.orgIds.includes(goal.orgId)) {
      throw new Error("Unauthorized");
    }

    // Cascade delete KRs
    const krs = await ctx.db.query("key_results").withIndex("by_goal", (q) => q.eq("goalId", args.id)).collect();
    for (const kr of krs) {
      await ctx.db.delete(kr._id);
    }

    await ctx.db.delete(args.id);
  }
});

// Key Results Placeholders (if used by frontend, keep basic logic but add auth)

export const addKeyResult = mutation({
  args: {
    goalId: v.id("goals"),
    description: v.string(),
    target: v.number(),
    current: v.optional(v.number()),
    unit: v.string(),
    updateType: v.optional(v.string()),
    metricSource: v.optional(v.string()),
    status: v.optional(v.string())
  },
  handler: async (ctx: any, args: any) => {
    const identity = await requireAuth(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new Error("Goal not found");

    const user = await findUserByIdentity(ctx, identity);

    if (!user || !user.orgIds.includes(goal.orgId)) {
      throw new Error("Unauthorized");
    }

    await ctx.db.insert("key_results", {
      goalId: args.goalId,
      projectId: goal.projectId,
      description: args.description,
      target: args.target,
      current: args.current ?? 0,
      unit: args.unit,
      updateType: args.updateType || 'manual',
      metricSource: args.metricSource,
      lastUpdated: Date.now(),
      status: args.status || 'Not Started'
    });
  }
});

export const updateKeyResult = mutation({
  args: {
    id: v.id("key_results"),
    updates: v.object({
      description: v.optional(v.string()),
      target: v.optional(v.number()),
      current: v.optional(v.number()),
      unit: v.optional(v.string()),
      updateType: v.optional(v.string()),
      metricSource: v.optional(v.string()),
      status: v.optional(v.string())
    })
  },
  handler: async (ctx: any, args: any) => {
    const identity = await requireAuth(ctx);
    const kr = await ctx.db.get(args.id);
    if (!kr) return;

    // Need to find goal to find orgId (unless KR has orgId, which it might not based on insert above)
    // goal has orgId.
    const goal = await ctx.db.get(kr.goalId);
    if (!goal) return;

    const user = await findUserByIdentity(ctx, identity);

    // Check if user is in goal's org
    if (!user || !user.orgIds.includes(goal.orgId)) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, args.updates);
  }
});

export const deleteKeyResult = mutation({
  args: { id: v.id("key_results") },
  handler: async (ctx: any, args: any) => {
    const identity = await requireAuth(ctx);
    const kr = await ctx.db.get(args.id);
    if (!kr) return;

    const goal = await ctx.db.get(kr.goalId);
    if (!goal) {
      // If goal deleted, KR might be orphan, just delete?
      await ctx.db.delete(args.id);
      return;
    }

    const user = await findUserByIdentity(ctx, identity);

    if (!user || !user.orgIds.includes(goal.orgId)) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  }
});

// New mutation: sync automatic Key Result
export const syncKeyResult = mutation({
  args: { id: v.id("key_results") },
  handler: async (ctx: any, args: any) => {
    const identity = await requireAuth(ctx);
    const kr = await ctx.db.get(args.id);
    if (!kr) throw new Error("Key Result not found");
    const goal = await ctx.db.get(kr.goalId);
    if (!goal) throw new Error("Goal not found");
    const user = await findUserByIdentity(ctx, identity);
    if (!user || !user.orgIds.includes(goal.orgId)) {
      throw new Error("Unauthorized");
    }
    // Mock metric fetching based on metricSource
    let fetchedValue = 0;
    switch (kr.metricSource) {
      case "revenue":
        fetchedValue = 5000; // placeholder revenue value
        break;
      case "users":
        fetchedValue = 120; // placeholder user count
        break;
      case "burn_rate":
        fetchedValue = 2000; // placeholder burn rate
        break;
      case "runway":
        fetchedValue = 12; // placeholder months of runway
        break;
      default:
        fetchedValue = 0;
    }
    await ctx.db.patch(args.id, { current: fetchedValue, lastUpdated: Date.now() });
    return fetchedValue;
  }
});

export const saveGoalWithKRs = mutation({
  args: {
    projectId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    timeframe: v.string(),
    status: v.string(),
    keyResults: v.array(v.object({
      label: v.string(),
      target: v.string(),
      current: v.string(),
      status: v.string()
    })),
    signature: v.optional(v.string()),
    publicKey: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const project = await getProjectSafe(ctx, args.projectId);
    if (!project) throw new Error("Project not found");

    const goalId = await ctx.db.insert("goals", {
      projectId: project._id,
      orgId: project.orgId,
      title: args.title,
      description: args.description || "",
      type: args.type,
      timeframe: args.timeframe,
      status: args.status,
      createdAt: Date.now()
    });

    for (const kr of args.keyResults) {
      // Parse target/current if numeric, otherwise use raw
      const targetNum = parseFloat(kr.target.replace(/[^0-9.-]+/g, "")) || 0;
      const currentNum = parseFloat(kr.current.replace(/[^0-9.-]+/g, "")) || 0;

      await ctx.db.insert("key_results", {
        goalId,
        projectId: project._id,
        description: kr.label,
        target: targetNum,
        current: currentNum,
        unit: kr.target.includes("%") ? "%" : kr.target.includes("$") ? "$" : "units",
        updateType: 'manual',
        lastUpdated: Date.now(),
        status: kr.status === 'completed' ? 'Completed' : 'In Progress'
      });
    }

    // Log Activity with Signature
    const user = await findUserByIdentity(ctx, identity);

    await ctx.db.insert("activity_log", {
      projectId: project._id,
      orgId: project.orgId,
      userId: identity.subject,
      userName: user?.name || "Unknown User",
      action: "CREATE",
      entityType: "goal",
      entityId: goalId,
      entityName: args.title,
      changes: `Created goal with ${args.keyResults.length} KR(s) via AI Suggestion`,
      signature: args.signature,
      publicKey: args.publicKey,
      timestamp: Date.now()
    });

    return goalId;
  }
});
