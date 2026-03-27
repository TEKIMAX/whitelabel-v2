"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * User-facing action to save model config.
 * Validates auth and resolves orgId automatically.
 */
export const updateMyModelConfig = action({
    args: {
        selectedModels: v.array(v.object({
            provider: v.string(),
            modelId: v.string(),
            isDefault: v.boolean(),
        })),
    },
    handler: async (ctx, { selectedModels }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.runQuery(internal.users.getUserByToken, {
            tokenIdentifier: identity.subject,
        });
        if (!user?.isFounder) throw new Error("Founder status required");
        if (!user.orgIds?.[0]) throw new Error("No organization found");

        await ctx.runMutation(internal.model_config.saveModelConfig, {
            orgId: user.orgIds[0],
            selectedModels,
        });

        return { success: true };
    },
});
