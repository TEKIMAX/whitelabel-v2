import { query, mutation, action } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";

export const getOrgMemoryStats = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.runQuery(components.adaptive_learning.public.getOrgMemoryStats, args);
    },
});

export const getMemories = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.runQuery(components.adaptive_learning.public.getMemories, args);
    },
});

export const getOrgPulse = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.runQuery(components.adaptive_learning.public.getOrgPulse, args);
    },
});

export const approveProposal = mutation({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.runMutation(components.adaptive_learning.public.approveProposal, args);
    },
});

export const rejectProposal = mutation({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.runMutation(components.adaptive_learning.public.rejectProposal, args);
    },
});

export const resetAdaptability = mutation({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.runMutation(components.adaptive_learning.public.resetAdaptability, args);
    },
});

export const trackFeedback = mutation({
    args: {
        userId: v.string(),
        orgId: v.string(),
        projectId: v.optional(v.string()),
        targetType: v.string(),
        targetId: v.string(),
        rating: v.number(),
        comment: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        return await ctx.runMutation(components.adaptive_learning.public.trackFeedback, args);
    },
});

export const toggleAdaptability = mutation({
    args: { orgId: v.string(), enabled: v.boolean(), userId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        return await ctx.runMutation(components.adaptive_learning.public.toggleAdaptability, args);
    },
});

export const reflectiveOptimization = action({
    args: { orgId: v.string(), userId: v.string(), apiKey: v.string() },
    handler: async (ctx, args) => {
        return await ctx.runAction(components.adaptive_learning.public.reflectiveOptimization, args);
    },
});

// Market Intelligence Proxies - TODO: Implement in component first
// export const getAgentConfigs = query({
//     args: { projectId: v.string() },
//     handler: async (ctx, args) => {
//         return await ctx.runQuery(components.adaptive_learning.public.getAgentConfigs, args);
//     }
// });

// export const updateAgentConfig = mutation({
//     args: {
//         orgId: v.string(),
//         projectId: v.string(),
//         agentType: v.string(),
//         instructions: v.string(),
//         tags: v.array(v.string())
//     },
//     handler: async (ctx, args) => {
//         return await ctx.runMutation(components.adaptive_learning.public.updateAgentConfig, args);
//     }
// });

// export const runMarketIntelligence = action({
//     args: { orgId: v.string(), projectId: v.string(), userId: v.string() },
//     handler: async (ctx, args) => {
//         return await ctx.runAction(components.adaptive_learning.public.runMarketIntelligence, args);
//     }
// });

// export const getIntelligenceReports = query({
//     args: { projectId: v.string() },
//     handler: async (ctx, args) => {
//         return await ctx.runQuery(components.adaptive_learning.public.getIntelligenceReports, args);
//     }
// });

