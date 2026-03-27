import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const log = internalMutation({
    args: {
        projectId: v.id("projects"),
        apiKeyId: v.id("api_keys"),
        externalUserId: v.string(),
        model: v.string(),
        inputTokens: v.number(),
        outputTokens: v.number(),
        cost: v.optional(v.number()),
        metadata: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("external_usage", {
            projectId: args.projectId,
            apiKeyId: args.apiKeyId,
            externalUserId: args.externalUserId,
            model: args.model,
            inputTokens: args.inputTokens,
            outputTokens: args.outputTokens,
            cost: args.cost,
            metadata: args.metadata,
            timestamp: Date.now()
        });
    }
});
