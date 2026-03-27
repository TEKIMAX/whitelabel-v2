import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, getProjectSafe, verifyProjectAccess } from "./auth";

export const getDocuments = query({
    args: {
        projectId: v.string(),
        recipientId: v.optional(v.string()) // Filter by recipient
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return [];

        let q = ctx.db.query("legal_documents")
            .withIndex("by_project", q => q.eq("projectId", project._id));

        // Filter manually if recipientId is not part of the index or just fetch all and filter in memory if small
        // For now, fetch all by project and filter in memory
        const docs = await q.collect();

        if (args.recipientId) {
            return docs.filter(d => d.recipientId === args.recipientId).map(d => ({
                ...d,
                id: d._id,
                // Ensure legacy fields are handled
                type: d.type || "Legacy",
                recipientId: d.recipientId || "Unknown",
                content: d.content || "",
                variables: d.variables ? JSON.parse(d.variables) : {},
                fields: d.fields ? JSON.parse(d.fields) : []
            }));
        }

        return docs.map(d => ({
            ...d,
            id: d._id,
            type: d.type || "Legacy",
            recipientId: d.recipientId || "Unknown",
            content: d.content || "",
            variables: d.variables ? JSON.parse(d.variables) : {},
            fields: d.fields ? JSON.parse(d.fields) : []
        }));
    }
});

export const createDocument = mutation({
    args: {
        projectId: v.string(),
        type: v.string(),
        recipientId: v.string(),
        content: v.optional(v.string()),
        variables: v.optional(v.string()), // JSON
        attachmentUrl: v.optional(v.string()), // Storage ID or URL
        fields: v.optional(v.string()), // JSON
        name: v.optional(v.string()), // File name
        fileId: v.optional(v.id("files")), // Link to file record if created
        status: v.optional(v.string()),
        source: v.optional(v.string()), // 'AI' | 'Human'
    },
    handler: async (ctx, args) => {
        const { orgId } = await verifyProjectAccess(ctx, args.projectId); // verifyProjectAccess handles auth and project check

        const projectId = (await getProjectSafe(ctx, args.projectId))?._id;
        if (!projectId) throw new Error("Project not found");

        await ctx.db.insert("legal_documents", {
            projectId: projectId,
            orgId,
            type: args.type,
            recipientId: args.recipientId,
            status: args.status || "Pending Signature", // Or "Uploaded" if just a file
            content: args.content || "",
            variables: args.variables,
            attachmentUrl: args.attachmentUrl,
            fields: args.fields,
            name: args.name,
            fileId: args.fileId,
            source: args.source,
            createdAt: Date.now()
        });
    }
});

export const signDocument = mutation({
    args: {
        id: v.id("legal_documents"),
        content: v.optional(v.string()), // Updated content with signature block (Text mode)
        fields: v.optional(v.string()) // Updated fields with signature (Visual mode)
    },
    handler: async (ctx, args) => {
        // Signature might be public/recipient, so strict org check might be skipped if using access key logic later
        // For now, assume auth or key validation (omitted here for brevity)
        // await requireAuth(ctx);

        const updates: any = {
            status: "Signed",
            signedAt: Date.now()
        };

        if (args.content) updates.content = args.content;
        if (args.fields) updates.fields = args.fields;

        await ctx.db.patch(args.id, updates);
    }
});

export const deleteDocument = mutation({
    args: { id: v.id("legal_documents") },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        const doc = await ctx.db.get(args.id);
        if (doc && doc.attachmentUrl && !doc.attachmentUrl.startsWith("http")) {
            // Assume strict storage ID if not URL
            try {
                // Check if it looks like a storage ID? 
                // ctx.storage.delete(doc.attachmentUrl as Id<"_storage">);
            } catch (e) { }
        }
        await ctx.db.delete(args.id);
    }
});

export const generateAccessKey = mutation({
    args: { id: v.id("legal_documents"), email: v.string() },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        // Generate simple 6-char key
        const key = Math.random().toString(36).substring(2, 8).toUpperCase();
        await ctx.db.patch(args.id, {
            accessKey: key,
            recipientEmail: args.email
        });
        return key;
    }
});

export const verifyAccess = query({
    args: { id: v.id("legal_documents"), key: v.string(), email: v.string() },
    handler: async (ctx, args) => {
        const doc = await ctx.db.get(args.id);
        if (!doc) return false;
        if (doc.accessKey === args.key && doc.recipientEmail?.toLowerCase() === args.email.toLowerCase()) {
            return true;
        }
        return false;
    }
});
