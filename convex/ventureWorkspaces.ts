import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// List venture workspaces by parent org
export const listByOrg = query({
  args: { parentOrgId: v.string() },
  handler: async (ctx, { parentOrgId }) => {
    return ctx.db
      .query("venture_workspaces")
      .withIndex("by_parentOrg", (q) => q.eq("parentOrgId", parentOrgId))
      .collect();
  },
});

// List venture workspaces by deployment
export const listByDeployment = query({
  args: { deploymentId: v.string() },
  handler: async (ctx, { deploymentId }) => {
    return ctx.db
      .query("venture_workspaces")
      .withIndex("by_deployment", (q) => q.eq("deploymentId", deploymentId))
      .collect();
  },
});

// Get single workspace
export const get = query({
  args: { id: v.id("venture_workspaces") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

// Create a venture workspace
export const create = mutation({
  args: {
    parentOrgId: v.string(),
    deploymentId: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
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

// Update workspace name/description
export const update = mutation({
  args: {
    id: v.id("venture_workspaces"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Workspace not found");
    const patch: Record<string, any> = { updatedAt: Date.now() };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.status !== undefined) patch.status = updates.status;
    await ctx.db.patch(id, patch);
  },
});

// Add member to workspace
export const addMember = mutation({
  args: {
    id: v.id("venture_workspaces"),
    userId: v.string(),
    email: v.string(),
    role: v.string(),
  },
  handler: async (ctx, { id, userId, email, role }) => {
    const ws = await ctx.db.get(id);
    if (!ws) throw new Error("Workspace not found");
    const members = ws.members || [];
    // Avoid duplicates
    if (members.some((m) => m.userId === userId)) return;
    members.push({ userId, email, role, addedAt: Date.now() });
    await ctx.db.patch(id, { members, updatedAt: Date.now() });
  },
});

// Remove member from workspace
export const removeMember = mutation({
  args: {
    id: v.id("venture_workspaces"),
    userId: v.string(),
  },
  handler: async (ctx, { id, userId }) => {
    const ws = await ctx.db.get(id);
    if (!ws) throw new Error("Workspace not found");
    const members = (ws.members || []).filter((m) => m.userId !== userId);
    await ctx.db.patch(id, { members, updatedAt: Date.now() });
  },
});

// Add file reference to workspace
export const addFile = mutation({
  args: {
    id: v.id("venture_workspaces"),
    fileId: v.string(),
    filename: v.string(),
    assignedUserId: v.optional(v.string()),
    assignedEmail: v.optional(v.string()),
  },
  handler: async (ctx, { id, fileId, filename, assignedUserId, assignedEmail }) => {
    const ws = await ctx.db.get(id);
    if (!ws) throw new Error("Workspace not found");
    const files = ws.files || [];
    files.push({
      id: fileId,
      filename,
      assignedUserId,
      assignedEmail,
      uploadedAt: Date.now(),
    });
    await ctx.db.patch(id, { files, updatedAt: Date.now() });
  },
});

// Remove file reference from workspace
export const removeFile = mutation({
  args: {
    id: v.id("venture_workspaces"),
    fileId: v.string(),
  },
  handler: async (ctx, { id, fileId }) => {
    const ws = await ctx.db.get(id);
    if (!ws) throw new Error("Workspace not found");
    const files = (ws.files || []).filter((f) => f.id !== fileId);
    await ctx.db.patch(id, { files, updatedAt: Date.now() });
  },
});

// Delete workspace
export const remove = mutation({
  args: { id: v.id("venture_workspaces") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// List venture workspaces for multiple orgs (for org switcher)
export const listByOrgIds = query({
  args: { orgIds: v.array(v.string()) },
  handler: async (ctx, { orgIds }) => {
    const results = await Promise.all(
      orgIds.map((orgId) =>
        ctx.db
          .query("venture_workspaces")
          .withIndex("by_parentOrg", (q) => q.eq("parentOrgId", orgId))
          .collect()
      )
    );
    return results.flat();
  },
});
