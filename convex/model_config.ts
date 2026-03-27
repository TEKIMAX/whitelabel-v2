import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ────────────────────────────────────────────────

/**
 * Get model config for the current user's org.
 */
export const getModelConfig = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .first();

        // Try org-specific config first
        if (user?.orgIds?.[0]) {
            const orgConfig = await ctx.db
                .query("model_config")
                .withIndex("by_org", (q) => q.eq("orgId", user.orgIds[0]))
                .first();
            if (orgConfig) return orgConfig;
        }

        // Fall back to global config (used for default/seed data)
        const globalConfig = await ctx.db
            .query("model_config")
            .withIndex("by_org", (q) => q.eq("orgId", "_global"))
            .first();
        if (globalConfig) return globalConfig;

        // Hardcoded defaults for fresh deployments (before sync from Customer Portal)
        return {
            orgId: "_default",
            selectedModels: [
                { isDefault: true, modelId: "anthropic/claude-3-haiku", provider: "Anthropic" },
                { isDefault: false, modelId: "anthropic/claude-3-opus", provider: "Anthropic" },
                { isDefault: false, modelId: "anthropic/claude-3.5-sonnet", provider: "Anthropic" },
                { isDefault: false, modelId: "google/gemini-2.5-flash", provider: "Google" },
                { isDefault: false, modelId: "google/gemini-2.5-flash-lite", provider: "Google" },
                { isDefault: false, modelId: "google/gemini-2.5-pro", provider: "Google" },
                { isDefault: false, modelId: "inception/mercury", provider: "Inception" },
                { isDefault: false, modelId: "mistralai/mistral-medium-3.1", provider: "Mistralai" },
                { isDefault: false, modelId: "openai/gpt-5", provider: "OpenAI" },
                { isDefault: false, modelId: "perplexity/sonar", provider: "Perplexity" },
                { isDefault: false, modelId: "qwen/qwen3-235b-a22b-thinking-2507", provider: "Qwen" }
            ],
            billingCycle: "monthly",
            updatedAt: Date.now(),
        };
    },
});

/**
 * Internal query — used by HTTP endpoints.
 */
export const getConfig = internalQuery({
    args: { orgId: v.string() },
    handler: async (ctx, { orgId }) => {
        return ctx.db
            .query("model_config")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .first();
    },
});

// ─── Mutations ──────────────────────────────────────────────

/**
 * Save model config for an org. Called from the whitelabel app settings
 * or from the BRAIN via /api/sync-config.
 */
export const saveModelConfig = internalMutation({
    args: {
        orgId: v.string(),
        selectedModels: v.array(v.object({
            provider: v.string(),
            modelId: v.string(),
            isDefault: v.boolean(),
        })),
        billingCycle: v.optional(v.string()),
    },
    handler: async (ctx, { orgId, selectedModels, billingCycle }) => {
        const existing = await ctx.db
            .query("model_config")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .first();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                selectedModels,
                ...(billingCycle ? { billingCycle } : {}),
                updatedAt: now,
            });
            return existing._id;
        }

        return ctx.db.insert("model_config", {
            orgId,
            selectedModels,
            ...(billingCycle ? { billingCycle } : {}),
            updatedAt: now,
        });
    },
});
