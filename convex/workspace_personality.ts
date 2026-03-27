import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save or update a workspace personality (.md governance file).
 * Called from the Customer Portal via HTTP endpoint.
 */
export const savePersonality = internalMutation({
    args: {
        orgId: v.string(),
        workspaceId: v.optional(v.string()),
        title: v.optional(v.string()),
        content: v.string(),
        updatedBy: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("workspace_personality")
            .withIndex("by_org_workspace", (q) =>
                q.eq("orgId", args.orgId).eq("workspaceId", args.workspaceId)
            )
            .first();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                content: args.content,
                title: args.title,
                updatedAt: now,
                updatedBy: args.updatedBy,
            });
            return existing._id;
        }

        return ctx.db.insert("workspace_personality", {
            orgId: args.orgId,
            workspaceId: args.workspaceId,
            title: args.title,
            content: args.content,
            updatedAt: now,
            updatedBy: args.updatedBy,
        });
    },
});

/**
 * Get the personality content for a given org (and optional workspace).
 */
export const getPersonality = internalQuery({
    args: {
        orgId: v.string(),
        workspaceId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Try workspace-specific first, then fall back to global (no workspaceId)
        if (args.workspaceId) {
            const specific = await ctx.db
                .query("workspace_personality")
                .withIndex("by_org_workspace", (q) =>
                    q.eq("orgId", args.orgId).eq("workspaceId", args.workspaceId)
                )
                .first();
            if (specific) return specific;
        }

        // Global personality for the org
        return ctx.db
            .query("workspace_personality")
            .withIndex("by_org_workspace", (q) =>
                q.eq("orgId", args.orgId).eq("workspaceId", undefined)
            )
            .first();
    },
});

/**
 * List all personality files for an org.
 */
export const listPersonalities = internalQuery({
    args: { orgId: v.string() },
    handler: async (ctx, { orgId }) => {
        return ctx.db
            .query("workspace_personality")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect();
    },
});

/**
 * Delete a personality file.
 */
export const deletePersonality = internalMutation({
    args: { id: v.id("workspace_personality") },
    handler: async (ctx, { id }) => {
        await ctx.db.delete(id);
    },
});

/**
 * Create a project/venture from the Customer Portal.
 */
export const createProject = internalMutation({
    args: {
        orgId: v.string(),
        userId: v.string(),
        name: v.string(),
        hypothesis: v.string(),
        businessStructure: v.optional(v.string()),
        industry: v.optional(v.string()),
        yearsInBusiness: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const slug = args.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const orgDetails: Record<string, any> = {};
        if (args.industry) orgDetails.industry = args.industry;
        if (args.yearsInBusiness) orgDetails.yearsInBusiness = args.yearsInBusiness;

        return ctx.db.insert("projects", {
            orgId: args.orgId,
            userId: args.userId,
            name: args.name,
            hypothesis: args.hypothesis,
            slug,
            businessStructure: args.businessStructure,
            organizationDetails: Object.keys(orgDetails).length > 0 ? JSON.stringify(orgDetails) : undefined,
            updatedAt: Date.now(),
        });
    },
});

/**
 * List all projects for an org.
 */
export const listProjects = internalQuery({
    args: { orgId: v.string() },
    handler: async (ctx, { orgId }) => {
        return ctx.db
            .query("projects")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect();
    },
});

/**
 * List ALL projects across all orgs (for admin portal).
 */
export const listAllProjects = internalQuery({
    args: {},
    handler: async (ctx) => {
        const all = await ctx.db.query("projects").collect();
        return all.filter((p: any) => p.status !== "Deleted");
    },
});

/**
 * List all unique org IDs from the users table.
 */
export const listOrgs = internalQuery({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const orgSet = new Set<string>();
        for (const u of users) {
            for (const oid of (u as any).orgIds || []) {
                orgSet.add(oid);
            }
        }
        return Array.from(orgSet);
    },
});

/**
 * List users (tokenIdentifier + orgIds) for project linking.
 */
export const listUsers = internalQuery({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").take(10);
        return users.map((u: any) => ({
            tokenIdentifier: u.tokenIdentifier,
            orgIds: u.orgIds || [],
            name: u.name,
        }));
    },
});

// ── Public API (authenticated frontend) ──────────────────────────────────

/**
 * List all RAG docs (workspace_personality rows) for the current user's org.
 */
export const listMyDocs = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        const orgId = (identity as any)?.orgId || "_global";
        return ctx.db
            .query("workspace_personality")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect();
    },
});

/**
 * Upsert a workspace doc (typed/pasted .md content) from the frontend.
 */
export const upsertDoc = mutation({
    args: {
        workspaceId: v.optional(v.string()),
        title: v.string(),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        const orgId = (identity as any)?.orgId || "_global";

        const existing = await ctx.db
            .query("workspace_personality")
            .withIndex("by_org_workspace", (q) =>
                q.eq("orgId", orgId).eq("workspaceId", args.workspaceId)
            )
            .first();

        const now = Date.now();
        if (existing) {
            await ctx.db.patch(existing._id, {
                content: args.content,
                title: args.title,
                updatedAt: now,
                updatedBy: identity.subject,
            });
            return existing._id;
        }

        return ctx.db.insert("workspace_personality", {
            orgId,
            workspaceId: args.workspaceId,
            title: args.title,
            content: args.content,
            updatedAt: now,
            updatedBy: identity.subject,
        });
    },
});

/**
 * Delete a RAG doc from the frontend.
 */
export const deleteDoc = mutation({
    args: { id: v.id("workspace_personality") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        await ctx.db.delete(args.id);
    },
});

/**
 * Delete a project.
 */
export const deleteProject = internalMutation({
    args: { id: v.id("projects") },
    handler: async (ctx, { id }) => {
        await ctx.db.delete(id);
    },
});

/**
 * Ensure a user exists with Admin role for a given org.
 * Called when a workspace is created from the Customer Portal.
 */
export const ensureAdminUser = internalMutation({
    args: {
        email: v.string(),
        name: v.optional(v.string()),
        orgId: v.string(),
    },
    handler: async (ctx, args) => {
        // Try to find by email first
        const allUsers = await ctx.db.query("users").collect();
        let user = allUsers.find((u: any) => u.email === args.email);

        if (user) {
            // User exists — ensure they have this org + Admin role
            const orgIds: string[] = (user as any).orgIds || [];
            const roles: { orgId: string; role: string }[] = (user as any).roles || [];

            const updates: any = {};
            if (!orgIds.includes(args.orgId)) {
                updates.orgIds = [...orgIds, args.orgId];
            }
            if (!roles.find((r) => r.orgId === args.orgId)) {
                updates.roles = [...roles, { orgId: args.orgId, role: "Admin" }];
            }
            // Mark as founder (can create ventures)
            if (!(user as any).isFounder) {
                updates.isFounder = true;
            }

            if (Object.keys(updates).length > 0) {
                await ctx.db.patch(user._id, updates);
            }
            return user._id;
        }

        // Create new user record
        const tokenId = `portal|${args.email}`;
        return ctx.db.insert("users", {
            tokenIdentifier: tokenId,
            email: args.email,
            name: args.name || args.email.split("@")[0],
            orgIds: [args.orgId],
            roles: [{ orgId: args.orgId, role: "Admin" }],
            isFounder: true,
            onboardingCompleted: true,
            subscriptionStatus: "active",
        });
    },
});
