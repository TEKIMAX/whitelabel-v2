import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get branding for an organization (used by BrandingProvider)
export const getLogo = query({
    args: { orgId: v.optional(v.string()), projectId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.orgId) return null;
        const branding = await ctx.db
            .query("branding")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId!))
            .first();
        if (!branding) return null;
        let resolvedLogoUrl = branding.logoUrl || null;
        if (branding.logoStorageId) {
            resolvedLogoUrl = await ctx.storage.getUrl(branding.logoStorageId) || resolvedLogoUrl;
        }
        return {
            ...branding,
            logoUrl: resolvedLogoUrl,
        };
    },
});

// Alias query
export const getBranding = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        const branding = await ctx.db
            .query("branding")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .first();
        if (!branding) return null;
        let resolvedLogoUrl = branding.logoUrl || null;
        if (branding.logoStorageId) {
            resolvedLogoUrl = await ctx.storage.getUrl(branding.logoStorageId) || resolvedLogoUrl;
        }
        return {
            ...branding,
            logoUrl: resolvedLogoUrl,
        };
    },
});

// ---- MUTATIONS ----

// Generate upload URL (Convex storage pattern)
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// Alias: generateLogoUploadUrl
export const generateLogoUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const saveBranding = mutation({
    args: {
        orgId: v.string(),
        logoStorageId: v.optional(v.id("_storage")),
        logoUrl: v.optional(v.string()),
        isLogoTransparent: v.optional(v.boolean()),
        appName: v.optional(v.string()),
        primaryColor: v.optional(v.string()),
        removeLogo: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("branding")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .first();

        // Resolve logo URL if storage ID was provided
        let resolvedLogoUrl = args.logoUrl;
        if (args.logoStorageId) {
            resolvedLogoUrl = await ctx.storage.getUrl(args.logoStorageId) || resolvedLogoUrl;
        }

        const data: any = {
            orgId: args.orgId,
            updatedAt: Date.now(),
        };

        if (args.appName !== undefined) data.appName = args.appName;
        if (args.primaryColor !== undefined) data.primaryColor = args.primaryColor;
        if (args.isLogoTransparent !== undefined) data.isLogoTransparent = args.isLogoTransparent;

        if (args.removeLogo) {
            data.logoStorageId = undefined;
            data.logoUrl = undefined;
            data.isLogoTransparent = undefined;
        } else {
            // Only set these if they are truthy to avoid overwriting with undefined 
            if (args.logoStorageId !== undefined) data.logoStorageId = args.logoStorageId;
            if (resolvedLogoUrl !== undefined) data.logoUrl = resolvedLogoUrl;
        }

        let brandingId;
        if (existing) {
            await ctx.db.patch(existing._id, data);
            brandingId = existing._id;
        } else {
            brandingId = await ctx.db.insert("branding", data);
        }

        // Cascade the logo update to all projects in this organization
        if (args.removeLogo || resolvedLogoUrl !== undefined) {
            const projects = await ctx.db
                .query("projects")
                .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
                .collect();

            for (const proj of projects) {
                await ctx.db.patch(proj._id, { logo: args.removeLogo ? undefined : resolvedLogoUrl });
            }
        }

        return brandingId;
    },
});

// Alias: saveLogo (for backward compat with cached clients)
export const saveLogo = mutation({
    args: {
        orgId: v.optional(v.string()),
        projectId: v.optional(v.string()),
        storageId: v.optional(v.id("_storage")),
        logoStorageId: v.optional(v.id("_storage")),
        logoUrl: v.optional(v.string()),
        appName: v.optional(v.string()),
        primaryColor: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const orgId = args.orgId;
        if (!orgId) return null;

        const logoStorage = args.logoStorageId || args.storageId;

        const existing = await ctx.db
            .query("branding")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .first();

        const data: any = {
            orgId,
            updatedAt: Date.now(),
        };

        if (logoStorage !== undefined) data.logoStorageId = logoStorage;
        if (args.logoUrl !== undefined) data.logoUrl = args.logoUrl;
        if (args.appName !== undefined) data.appName = args.appName;
        if (args.primaryColor !== undefined) data.primaryColor = args.primaryColor;

        if (existing) {
            await ctx.db.patch(existing._id, data);
            return existing._id;
        } else {
            return await ctx.db.insert("branding", data);
        }
    },
});
