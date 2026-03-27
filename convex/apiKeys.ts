import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Helper for hashing
function arrayBufferToHex(buffer: ArrayBuffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

export const create = mutation({
    args: {
        projectId: v.id("projects"),
        name: v.string(),
        scopes: v.array(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const project = await ctx.db.get(args.projectId);
        if (!project || project.userId !== identity.subject) {
            throw new Error("Unauthorized access to project");
        }

        // Generate a random key
        const rawKey = "sk_live_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // Hash the key using Web Crypto API (SHA-256)
        const keyBuffer = new TextEncoder().encode(rawKey);
        const hashBuffer = await crypto.subtle.digest("SHA-256", keyBuffer);
        const hashedKey = arrayBufferToHex(hashBuffer);

        const keyId = await ctx.db.insert("api_keys", {
            projectId: args.projectId,
            orgId: project.orgId,
            name: args.name,
            key: hashedKey, // Storing HASH, not raw key
            preview: rawKey.substring(0, 8) + "...",
            scopes: args.scopes,
            createdAt: Date.now(),
            createdBy: identity.subject
        });

        return { keyId, rawKey }; // Return rawKey ONLY here
    }
});

export const list = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        return await ctx.db
            .query("api_keys")
            .withIndex("by_project", q => q.eq("projectId", args.projectId))
            .collect();
    }
});

export const revoke = mutation({
    args: { id: v.id("api_keys") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const key = await ctx.db.get(args.id);
        if (!key) return;

        // Verify ownership via project
        const project = await ctx.db.get(key.projectId);
        if (!project || project.userId !== identity.subject) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.id);
    }
});

export const validate = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        // Hash the incoming key to match stored hash
        const keyBuffer = new TextEncoder().encode(args.key);
        const hashBuffer = await crypto.subtle.digest("SHA-256", keyBuffer);
        const hashedKey = arrayBufferToHex(hashBuffer);

        const keyRecord = await ctx.db
            .query("api_keys")
            .withIndex("by_key", q => q.eq("key", hashedKey))
            .first();

        return keyRecord;
    }
});
