/**
 * Internal venture workspace mutations — called from HTTP sync endpoint.
 * These wrap the public ventureWorkspaces functions for use by the sync API.
 */
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// ── Queries ──

export const listByOrg = internalQuery({
  args: { parentOrgId: v.string() },
  handler: async (ctx, { parentOrgId }) => {
    return ctx.db
      .query("venture_workspaces")
      .withIndex("by_parentOrg", (q) => q.eq("parentOrgId", parentOrgId))
      .collect();
  },
});

export const listByDeployment = internalQuery({
  args: { deploymentId: v.string() },
  handler: async (ctx, { deploymentId }) => {
    return ctx.db
      .query("venture_workspaces")
      .withIndex("by_deployment", (q) => q.eq("deploymentId", deploymentId))
      .collect();
  },
});

// ── Mutations ──

export const upsertWorkspace = internalMutation({
  args: {
    parentOrgId: v.string(),
    deploymentId: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if a workspace with this parentOrgId + deploymentId already exists
    const existing = await ctx.db
      .query("venture_workspaces")
      .withIndex("by_parentOrg", (q) => q.eq("parentOrgId", args.parentOrgId))
      .collect();

    const match = existing.find(
      (w) => w.deploymentId === args.deploymentId && w.name === args.name
    );

    if (match) {
      // Update existing
      await ctx.db.patch(match._id, {
        name: args.name,
        description: args.description,
        updatedAt: Date.now(),
      });
      return match._id;
    }

    // Create new
    const now = Date.now();
    return ctx.db.insert("venture_workspaces", {
      ...args,
      members: [],
      files: [],
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const unlinkWorkspace = internalMutation({
  args: {
    parentOrgId: v.string(),
    deploymentId: v.optional(v.string()),
  },
  handler: async (ctx, { parentOrgId, deploymentId }) => {
    const workspaces = await ctx.db
      .query("venture_workspaces")
      .withIndex("by_parentOrg", (q) => q.eq("parentOrgId", parentOrgId))
      .collect();

    const toRemove = workspaces.filter((w) => w.deploymentId === deploymentId);
    for (const ws of toRemove) {
      await ctx.db.delete(ws._id);
    }
    return toRemove.length;
  },
});

export const syncMembers = internalMutation({
  args: {
    parentOrgId: v.string(),
    deploymentId: v.optional(v.string()),
    members: v.array(
      v.object({
        userId: v.string(),
        email: v.string(),
        role: v.string(),
      })
    ),
  },
  handler: async (ctx, { parentOrgId, deploymentId, members }) => {
    const workspaces = await ctx.db
      .query("venture_workspaces")
      .withIndex("by_parentOrg", (q) => q.eq("parentOrgId", parentOrgId))
      .collect();

    const target = workspaces.find((w) => w.deploymentId === deploymentId);
    if (!target) return;

    await ctx.db.patch(target._id, {
      members: members.map((m) => ({
        ...m,
        addedAt: Date.now(),
      })),
      updatedAt: Date.now(),
    });
  },
});
