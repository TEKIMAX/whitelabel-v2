import { v } from "convex/values";
import { mutation, query, internalMutation, action } from "./_generated/server";
import { requireAuth } from "./auth";
import { internal } from "./_generated/api";

// Generate a random token for share links
function generateToken(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

// ── Create a shareable download link ──
// When R2 is available, clones the file to R2 for secure external serving.
export const createShareableLink = mutation({
    args: {
        storageId: v.id("_storage"),
        fileName: v.string(),
        maxUses: v.optional(v.number()),
        expiresInMs: v.optional(v.number()),
        password: v.optional(v.string()),
        contentType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        // Verify the storage file exists
        const url = await ctx.storage.getUrl(args.storageId);
        if (!url) {
            throw new Error("Storage file not found");
        }

        const token = generateToken();
        const now = Date.now();
        const r2Key = `shares/${token}/${args.fileName}`;

        const linkId = await ctx.db.insert("shareLinks", {
            storageId: args.storageId,
            token,
            fileName: args.fileName,
            createdBy: identity.subject,
            expiresAt: args.expiresInMs ? now + args.expiresInMs : undefined,
            maxUses: args.maxUses,
            useCount: 0,
            password: args.password,
            contentType: args.contentType,
            createdAt: now,
        });

        // Schedule R2 clone (runs async — share link works immediately via Convex storage fallback)
        await ctx.scheduler.runAfter(0, internal.r2.cloneToR2, {
            storageId: args.storageId as string,
            r2Key,
            contentType: args.contentType,
            fileName: args.fileName,
        });

        // Schedule setting the R2 key on the share link after clone completes
        await ctx.scheduler.runAfter(5000, internal.filesControl.setR2Key, {
            linkId,
            r2Key,
        });

        // Build the download URL
        const siteUrl = process.env.SITE_URL || process.env.CONVEX_SITE_URL || "";
        const downloadUrl = siteUrl.includes("convex.site")
            ? `${siteUrl}/api/share/${token}`
            : `${siteUrl}/share/${token}`;

        return {
            token,
            url: downloadUrl,
            expiresAt: args.expiresInMs ? now + args.expiresInMs : null,
            maxUses: args.maxUses || null,
            hasPassword: !!args.password,
        };
    },
});

// ── Internal: Set R2 key on share link after clone completes ──
export const setR2Key = internalMutation({
    args: {
        linkId: v.id("shareLinks"),
        r2Key: v.string(),
    },
    handler: async (ctx, args) => {
        const link = await ctx.db.get(args.linkId);
        if (link) {
            await ctx.db.patch(args.linkId, { r2Key: args.r2Key });
        }
    },
});

// ── Get active share links for a specific file ──
export const getShareLinksForFile = query({
    args: {
        storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const now = Date.now();
        const links = await ctx.db
            .query("shareLinks")
            .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
            .collect();

        const siteUrl = process.env.SITE_URL || process.env.CONVEX_SITE_URL || "";

        return links
            .filter(l => {
                const expired = l.expiresAt && l.expiresAt < now;
                const exhausted = l.maxUses && l.useCount >= l.maxUses;
                return !expired && !exhausted;
            })
            .map(l => ({
                _id: l._id,
                token: l.token,
                url: siteUrl.includes("convex.site")
                    ? `${siteUrl}/api/share/${l.token}`
                    : `${siteUrl}/share/${l.token}`,
                expiresAt: l.expiresAt ?? null,
                maxUses: l.maxUses ?? null,
                useCount: l.useCount,
                hasPassword: !!l.password,
                createdAt: l.createdAt,
            }));
    },
});

// ── Delete/unshare a share link ──
export const deleteShareLink = mutation({
    args: {
        linkId: v.id("shareLinks"),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        const link = await ctx.db.get(args.linkId);
        if (!link) throw new Error("Share link not found");
        await ctx.db.delete(args.linkId);
        return { success: true };
    },
});

// ── Get set of storageIds that have active share links ──
export const getSharedStorageIds = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const now = Date.now();
        const links = await ctx.db.query("shareLinks").collect();

        const activeIds = new Set<string>();
        for (const link of links) {
            const expired = link.expiresAt && link.expiresAt < now;
            const exhausted = link.maxUses && link.useCount >= link.maxUses;
            if (!expired && !exhausted) {
                activeIds.add(link.storageId);
            }
        }
        return Array.from(activeIds);
    },
});

// ── Cleanup expired share links (called by cron) ──
export const cleanupExpiredGrants = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const allLinks = await ctx.db.query("shareLinks").collect();

        let deleted = 0;
        for (const link of allLinks) {
            const expired = link.expiresAt && link.expiresAt < now;
            const exhausted = link.maxUses && link.useCount >= link.maxUses;
            if (expired || exhausted) {
                // Schedule R2 object deletion if it exists
                if (link.r2Key) {
                    await ctx.scheduler.runAfter(0, internal.r2.deleteR2Object, {
                        r2Key: link.r2Key,
                    });
                }
                await ctx.db.delete(link._id);
                deleted++;
            }
        }
        return { deleted };
    },
});

// ── Get download analytics for a file's share links ──
export const getDownloadAnalytics = query({
    args: {
        storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        // Get all share links for this file
        const links = await ctx.db
            .query("shareLinks")
            .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
            .collect();

        // Get download events for each link
        const events = [];
        for (const link of links) {
            const linkEvents = await ctx.db
                .query("downloadEvents")
                .withIndex("by_shareLink", (q) => q.eq("shareLinkId", link._id))
                .collect();
            events.push(...linkEvents);
        }

        // Sort by most recent
        events.sort((a, b) => b.downloadedAt - a.downloadedAt);
        return events;
    },
});
