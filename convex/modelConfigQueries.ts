import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { getEntitlementsFromWorkOS, getEntitlements } from "./permissions";

// ─── Queries ────────────────────────────────────────────────

/**
 * Get the resolved Entitlements for the current user.
 * Checks WorkOS JWT entitlements first (synced from Stripe automatically),
 * then falls back to the user record's subscriptionTier.
 */
export const getMyEntitlements = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        // WorkOS puts entitlements in the JWT as `entitlements: string[]`
        const jwtEntitlements = (identity as any).entitlements as string[] | undefined;
        if (jwtEntitlements && jwtEntitlements.length > 0) {
            const fromWorkOS = getEntitlementsFromWorkOS(jwtEntitlements);
            if (fromWorkOS) return { ...fromWorkOS, source: "workos" as const };
        }

        // Fallback: derive from user record subscription tier
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .first();
        if (!user) return null;

        return { ...getEntitlements(user), source: "local" as const };
    },
});

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
        if (!user?.orgIds?.[0]) return null;

        return ctx.db
            .query("model_config")
            .withIndex("by_org", (q) => q.eq("orgId", user.orgIds[0]))
            .first();
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
    },
    handler: async (ctx, { orgId, selectedModels }) => {
        const existing = await ctx.db
            .query("model_config")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .first();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                selectedModels,
                updatedAt: now,
            });
            return existing._id;
        }

        return ctx.db.insert("model_config", {
            orgId,
            selectedModels,
            updatedAt: now,
        });
    },
});
