import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAuth } from "./auth";

// ── Storage Quota Queries ──

// Get storage usage for the current user's org
export const getStorageUsage = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const quota = await ctx.db
            .query("storageQuota")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .unique();

        if (!quota) {
            return {
                enabled: false,
                allocatedBytes: 0,
                usedBytes: 0,
                fileCount: 0,
                percentUsed: 0,
                allocatedGB: 0,
                usedGB: 0,
            };
        }

        return {
            ...quota,
            percentUsed: quota.allocatedBytes > 0
                ? Math.round((quota.usedBytes / quota.allocatedBytes) * 100)
                : 0,
            allocatedGB: Math.round((quota.allocatedBytes / (1024 ** 3)) * 100) / 100,
            usedGB: Math.round((quota.usedBytes / (1024 ** 3)) * 100) / 100,
        };
    },
});

// Initialize storage quota for an org
export const initializeQuota = mutation({
    args: {
        orgId: v.string(),
        r2BucketName: v.optional(v.string()),
        allocatedBytes: v.optional(v.number()),
        planTier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        // Check if quota already exists
        const existing = await ctx.db
            .query("storageQuota")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .unique();

        if (existing) {
            return existing._id;
        }

        // Default: 1GB for starter, 5GB for pro, 25GB for enterprise
        const defaultAllocation = {
            starter: 1 * 1024 ** 3,   // 1 GB
            pro: 5 * 1024 ** 3,       // 5 GB
            enterprise: 25 * 1024 ** 3, // 25 GB
        };

        const tier = (args.planTier || "starter") as keyof typeof defaultAllocation;
        const allocation = args.allocatedBytes || defaultAllocation[tier] || defaultAllocation.starter;

        return await ctx.db.insert("storageQuota", {
            orgId: args.orgId,
            r2BucketName: args.r2BucketName,
            enabled: true,
            allocatedBytes: allocation,
            usedBytes: 0,
            fileCount: 0,
            planTier: args.planTier || "starter",
            lastCalculatedAt: Date.now(),
            createdAt: Date.now(),
        });
    },
});

// ── Internal mutations for usage tracking ──

// Increment usage after a file upload
export const incrementUsage = internalMutation({
    args: {
        orgId: v.string(),
        fileSize: v.number(),
    },
    handler: async (ctx, args) => {
        const quota = await ctx.db
            .query("storageQuota")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .unique();

        if (!quota) return;

        await ctx.db.patch(quota._id, {
            usedBytes: quota.usedBytes + args.fileSize,
            fileCount: quota.fileCount + 1,
            lastCalculatedAt: Date.now(),
        });
    },
});

// Decrement usage after a file deletion
export const decrementUsage = internalMutation({
    args: {
        orgId: v.string(),
        fileSize: v.number(),
    },
    handler: async (ctx, args) => {
        const quota = await ctx.db
            .query("storageQuota")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .unique();

        if (!quota) return;

        await ctx.db.patch(quota._id, {
            usedBytes: Math.max(0, quota.usedBytes - args.fileSize),
            fileCount: Math.max(0, quota.fileCount - 1),
            lastCalculatedAt: Date.now(),
        });
    },
});

// Recalculate usage from actual file records (cron/admin)
export const recalculateUsage = internalMutation({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        const quota = await ctx.db
            .query("storageQuota")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .unique();

        if (!quota) return;

        // Count all R2-stored files for this org
        const files = await ctx.db
            .query("files")
            .filter((q) =>
                q.and(
                    q.eq(q.field("orgId"), args.orgId),
                    q.eq(q.field("storageBackend"), "r2")
                )
            )
            .collect();

        const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);

        await ctx.db.patch(quota._id, {
            usedBytes: totalBytes,
            fileCount: files.length,
            lastCalculatedAt: Date.now(),
        });
    },
});
