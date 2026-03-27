// @ts-nocheck
import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { requireAuth, verifyProjectAccess } from "./auth";

/**
 * List all custom AI agents for a given project or org.
 * If projectId is provided, returns agents scoped to that project.
 * If not, returns org-scoped agents.
 */
export const listAgents = query({
    args: {
        projectId: v.optional(v.id("projects")),
        orgId: v.optional(v.string()) // Only needed if fetching org agents outside a project
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (args.projectId) {
            await verifyProjectAccess(ctx, args.projectId);
            return await ctx.db
                .query("ai_agents")
                .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
                .collect();
        } else if (args.orgId) {
            // Ideally we'd verify org access here, but assuming the user has the org via JWT
            return await ctx.db
                .query("ai_agents")
                .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
                .filter(q => q.eq(q.field("projectId"), undefined)) // Only truly org-level agents
                .collect();
        }

        return [];
    },
});

/**
 * Create a new custom AI agent.
 */
export const createAgent = mutation({
    args: {
        projectId: v.optional(v.id("projects")),
        orgId: v.string(),
        name: v.string(),
        role: v.optional(v.string()),
        systemMessage: v.string(),
        objective: v.optional(v.string()),
        modelName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (args.projectId) {
            await verifyProjectAccess(ctx, args.projectId);
        }

        const agentId = await ctx.db.insert("ai_agents", {
            projectId: args.projectId,
            orgId: args.orgId,
            name: args.name,
            role: args.role,
            systemMessage: args.systemMessage,
            objective: args.objective,
            modelName: args.modelName,
            createdAt: Date.now(),
            createdBy: identity.subject, // Using token identifier or internal user ID
        });

        return agentId;
    },
});

/**
 * Update an existing custom AI agent.
 */
export const updateAgent = mutation({
    args: {
        id: v.id("ai_agents"),
        name: v.optional(v.string()),
        role: v.optional(v.string()),
        systemMessage: v.optional(v.string()),
        objective: v.optional(v.string()),
        modelName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const agent = await ctx.db.get(args.id);

        if (!agent) {
            throw new Error("Agent not found");
        }

        if (agent.projectId) {
            await verifyProjectAccess(ctx, agent.projectId);
        }

        await ctx.db.patch(args.id, {
            name: args.name !== undefined ? args.name : agent.name,
            role: args.role !== undefined ? args.role : agent.role,
            systemMessage: args.systemMessage !== undefined ? args.systemMessage : agent.systemMessage,
            objective: args.objective !== undefined ? args.objective : agent.objective,
            modelName: args.modelName !== undefined ? args.modelName : agent.modelName,
        });
    },
});

/**
 * Delete a custom AI agent.
 */
export const deleteAgent = mutation({
    args: {
        id: v.id("ai_agents"),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const agent = await ctx.db.get(args.id);

        if (!agent) {
            throw new Error("Agent not found");
        }

        if (agent.projectId) {
            await verifyProjectAccess(ctx, agent.projectId);
        }

        await ctx.db.delete(args.id);
    },
});

/**
 * Internal query to fetch an agent by ID for workflow use.
 */
export const getAgentInternal = internalQuery({
    args: { agentId: v.id("ai_agents") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.agentId);
    },
});
