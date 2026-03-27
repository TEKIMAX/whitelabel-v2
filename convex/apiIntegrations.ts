import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper to confirm identity
async function requireAuth(ctx: any) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return identity;
}

/**
 * Add a new Custom API Integration
 */
export const addIntegration = mutation({
    args: {
        orgId: v.string(),
        name: v.string(),
        endpoint: v.string(),
        apiKey: v.optional(v.string()),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        
        return await ctx.db.insert("custom_api_integrations", {
            orgId: args.orgId,
            name: args.name,
            endpoint: args.endpoint,
            apiKey: args.apiKey,
            description: args.description,
            method: "POST", // Default to POST for AI-driven querying, can be enhanced later if needed
            createdAt: Date.now(),
        });
    }
});

/**
 * List all integrations for a specific organization
 */
export const listIntegrations = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        
        // Return without the apiKey for security on the frontend
        const orgIntegrations = await ctx.db
            .query("custom_api_integrations")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();
            
        let global1: any[] = [];
        let global2: any[] = [];
        
        if (args.orgId !== "global" && args.orgId !== "_global") {
            global1 = await ctx.db
                .query("custom_api_integrations")
                .withIndex("by_org", (q) => q.eq("orgId", "global"))
                .collect();
                
            global2 = await ctx.db
                .query("custom_api_integrations")
                .withIndex("by_org", (q) => q.eq("orgId", "_global"))
                .collect();
        }
            
        const all = [...orgIntegrations, ...global1, ...global2];
        const unique = Array.from(new Map(all.map(item => [item._id, item])).values());
            
        return unique.map(i => ({
            _id: i._id,
            name: i.name,
            endpoint: i.endpoint,
            description: i.description,
            method: i.method,
            requiresAuth: !!i.apiKey,
            createdAt: i.createdAt,
            isGlobal: i.orgId === "global" || i.orgId === "_global"
        }));
    }
});

/**
 * Remove an integration
 */
export const removeIntegration = mutation({
    args: { integrationId: v.id("custom_api_integrations") },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        const existing = await ctx.db.get(args.integrationId);
        if (existing) {
            // Prevent users from deleting global integrations
            if (existing.orgId === "global" || existing.orgId === "_global") {
                throw new Error("Cannot delete a global integration.");
            }
            await ctx.db.delete(args.integrationId);
        }
    }
});

/**
 * Internal query to fetch full integration details (including API Key)
 * Used by the AI backend to execute the API call.
 */
export const getIntegrationsInternal = internalQuery({
    args: { orgId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        let results: any[] = [];
        if (args.orgId) {
            results = await ctx.db
                .query("custom_api_integrations")
                .withIndex("by_org", (q) => q.eq("orgId", args.orgId as string))
                .collect();
        }
        
        if (args.orgId !== "global" && args.orgId !== "_global") {
            const global1 = await ctx.db
                .query("custom_api_integrations")
                .withIndex("by_org", (q) => q.eq("orgId", "global"))
                .collect();
                
            const global2 = await ctx.db
                .query("custom_api_integrations")
                .withIndex("by_org", (q) => q.eq("orgId", "_global"))
                .collect();
                
            results = [...results, ...global1, ...global2];
        }
        
        const unique = Array.from(new Map(results.map(item => [item._id, item])).values());
        return unique;
    }
});

/**
 * Internal query to fetch all integrations globally
 * Used by the server-side proxy from Customer-Portal-Provision to list all.
 */
export const getAllIntegrationsInternal = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("custom_api_integrations")
            .collect();
    }
});

/**
 * Internal query to fetch a single integration by ID for tool execution.
 */
export const getIntegrationByIdInternal = internalQuery({
    args: { integrationId: v.id("custom_api_integrations") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.integrationId);
    }
});

/**
 * Internal mutation to add a new API integration without user auth check.
 * Used by the server-side proxy from Customer-Portal-Provision.
 */
export const addIntegrationInternal = internalMutation({
    args: {
        orgId: v.string(),
        name: v.string(),
        endpoint: v.string(),
        apiKey: v.optional(v.string()),
        description: v.string(),
        method: v.optional(v.string()), // Added optional method for flexibility
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("custom_api_integrations", {
            orgId: args.orgId,
            name: args.name,
            endpoint: args.endpoint,
            apiKey: args.apiKey,
            description: args.description,
            method: args.method || "POST",
            createdAt: Date.now(),
        });
    }
});

/**
 * Internal mutation to remove an API integration without user auth check.
 * Used by the server-side proxy from Customer-Portal-Provision.
 */
export const removeIntegrationInternal = internalMutation({
    args: { integrationId: v.id("custom_api_integrations") },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.integrationId);
        if (existing) {
            await ctx.db.delete(args.integrationId);
        }
    }
});

/**
 * Internal mutation to update an existing API integration.
 * Used by the server-side proxy from Customer-Portal-Provision.
 */
export const updateIntegrationInternal = internalMutation({
    args: {
        integrationId: v.id("custom_api_integrations"),
        orgId: v.string(),
        name: v.optional(v.string()),
        endpoint: v.optional(v.string()),
        apiKey: v.optional(v.string()),
        description: v.optional(v.string()),
        method: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.integrationId);
        if (!existing) throw new Error("Integration not found");
        
        const updates: any = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.endpoint !== undefined) updates.endpoint = args.endpoint;
        
        if (args.apiKey === "REMOVE_KEY") {
            updates.apiKey = undefined;
        } else if (args.apiKey !== undefined && args.apiKey.trim() !== "") {
            updates.apiKey = args.apiKey;
        }
        
        if (args.description !== undefined) updates.description = args.description;
        if (args.method !== undefined) updates.method = args.method;
        
        // Also update orgId if it changed in the UI dropdown
        if (args.orgId && args.orgId !== existing.orgId && args.orgId !== "_all") {
            updates.orgId = args.orgId;
        }

        await ctx.db.patch(args.integrationId, updates);
    }
});

