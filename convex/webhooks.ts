
import { v } from "convex/values";
import { mutation, query, internalAction, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { storeSecretInVault, getSecretFromVault, deleteSecretFromVault } from "./lib/workos";

// --- Mutations & Queries ---

// Used internally by operations
export const createWebhookRecord = internalMutation({
    args: {
        orgId: v.string(),
        url: v.string(),
        eventTypes: v.array(v.string()),
        vaultSecretId: v.string(),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("webhooks", {
            orgId: args.orgId,
            url: args.url,
            eventTypes: args.eventTypes,
            vaultSecretId: args.vaultSecretId, // ID reference to WorkOS Vault
            isActive: true,
            createdAt: Date.now(),
        });
        return id;
    }
});

// Used internally by operations
export const deleteWebhookRecord = internalMutation({
    args: { webhookId: v.id("webhooks") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.webhookId);
    }
});

export const listWebhooks = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("webhooks")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();
    },
});

// --- Actions (Public) ---

export const createWebhookAction = action({
    args: {
        orgId: v.string(),
        url: v.string(),
        eventTypes: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        // 1. Generate Secret (strong random string)
        const secret = "whsec_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

        // 2. Store in Vault
        // We use a truncated Org ID and a random UUID to ensure the Vault Item Name 
        // does not leak the full Org ID or the Webhook URL (PII/Security).
        const safeName = `Webhook - ${args.orgId.slice(0, 3)}... - ${crypto.randomUUID()}`;

        const vaultSecretId = await storeSecretInVault(
            safeName,
            secret,
            args.orgId
        );

        // 3. Store record in DB
        await ctx.runMutation(internal.webhooks.createWebhookRecord, {
            orgId: args.orgId,
            url: args.url,
            eventTypes: args.eventTypes,
            vaultSecretId,
        });

        // 4. Return secret to user (this is the ONLY time they see it)
        return secret;
    },
});

export const deleteWebhookAction = action({
    args: { webhookId: v.id("webhooks"), vaultSecretId: v.string() },
    handler: async (ctx, args) => {
        // 1. Delete from Vault
        await deleteSecretFromVault(args.vaultSecretId);
        // 2. Delete from DB
        await ctx.runMutation(internal.webhooks.deleteWebhookRecord, { webhookId: args.webhookId });
    }
});

// --- Internal Dispatcher ---

export const dispatchWebhook = internalAction({
    args: {
        url: v.string(),
        vaultSecretId: v.string(),
        payload: v.any(), // JSON object
        eventType: v.string(),
        webhookId: v.optional(v.string()), // Optional for logging/debugging
    },
    handler: async (ctx, args) => {
        // 1. Get Secret
        const secret = await getSecretFromVault(args.vaultSecretId);

        // 2. Prepare Payload
        const timestamp = Math.floor(Date.now() / 1000);
        const payloadString = JSON.stringify(args.payload);
        const signatureContent = `${timestamp}.${payloadString}`;

        // 3. Sign
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const algorithm = { name: 'HMAC', hash: 'SHA-256' };

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            algorithm,
            false,
            ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign(
            algorithm,
            cryptoKey,
            encoder.encode(signatureContent)
        );

        // Convert buffer to hex string
        const signatureArray = Array.from(new Uint8Array(signatureBuffer));
        const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const signatureHeader = `t=${timestamp},v1=${signatureHex}`;

        // 4. Send
        const response = await fetch(args.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Pillar-Signature": signatureHeader,
                "X-Pillar-Event": args.eventType
            },
            body: payloadString
        });

        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
        }
    }
});
