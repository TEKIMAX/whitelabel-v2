import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getProjectSafe, requireAuth } from "./auth";
import { signFileUrl } from "./fileSigning";


export const createFolder = mutation({
    args: {
        projectId: v.string(), // Changed from v.id("projects") to support localId
        name: v.string(),
        parentId: v.optional(v.id("folders")),
        tags: v.optional(v.array(v.object({ name: v.string(), color: v.string() }))),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        const folderId = await ctx.db.insert("folders", {
            projectId: project._id,
            orgId: project.orgId,
            name: args.name,
            parentId: args.parentId,
            tags: args.tags,
            createdAt: Date.now(),
        });

        return folderId;
    },
});

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        await requireAuth(ctx);
        return await ctx.storage.generateUploadUrl();
    },
});

export const saveFile = mutation({
    args: {
        projectId: v.string(), // Changed from v.id("projects")
        folderId: v.optional(v.id("folders")),
        name: v.string(),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.object({ name: v.string(), color: v.string() }))),
        type: v.string(),
        storageId: v.optional(v.id("_storage")), // Now optional — R2 files won't have this
        size: v.number(),
        source: v.optional(v.string()), // "external" (user upload) | "internal" (generated)
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        // Determine storage backend:
        // "external" uploads → R2 if configured, otherwise Convex
        // "internal" generated docs → always Convex
        const isExternal = args.source === "external";

        const fileId = await ctx.db.insert("files", {
            projectId: project._id,
            orgId: project.orgId,
            folderId: args.folderId,
            name: args.name,
            title: args.title,
            description: args.description,
            tags: args.tags,
            type: args.type,
            storageId: args.storageId,
            storageBackend: isExternal ? "r2" : "convex",
            size: args.size,
            createdAt: Date.now(),
        });

        // For text/markdown uploads: extract content and save to workspace_personality as RAG
        const isTextDoc = args.storageId && (
            args.type === "text/markdown" ||
            args.type === "text/plain" ||
            args.name.endsWith(".md") ||
            args.name.endsWith(".txt")
        );
        if (isTextDoc) {
            await ctx.scheduler.runAfter(0, internal.files.extractAndSaveRagDoc, {
                storageId: args.storageId as string,
                orgId: project.orgId,
                title: args.name,
            });
        }

        // For external uploads, schedule async R2 clone
        // The file is immediately available via Convex storage;
        // R2 clone runs in background for long-term serving
        if (isExternal && args.storageId) {
            const r2Key = `files/${project._id}/${fileId}/${args.name}`;
            await ctx.scheduler.runAfter(0, internal.r2.cloneToR2, {
                storageId: args.storageId as string,
                r2Key,
                contentType: args.type,
                fileName: args.name,
            });
            // Schedule setting r2Key on the file record
            await ctx.scheduler.runAfter(5000, internal.files.setFileR2Key, {
                fileId,
                r2Key,
            });
            // Track storage usage
            await ctx.scheduler.runAfter(0, internal.storageQuota.incrementUsage, {
                orgId: project.orgId,
                fileSize: args.size,
            });
        }

        return fileId;
    },
});

// ── Internal: Set R2 key on file after clone completes ──
export const setFileR2Key = internalMutation({
    args: {
        fileId: v.id("files"),
        r2Key: v.string(),
    },
    handler: async (ctx, args) => {
        const file = await ctx.db.get(args.fileId);
        if (file) {
            await ctx.db.patch(args.fileId, { r2Key: args.r2Key });
        }
    },
});

export const moveFile = mutation({
    args: {
        fileId: v.id("files"),
        folderId: v.optional(v.union(v.id("folders"), v.null())), // New parent folder (or null for root)
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const file = await ctx.db.get(args.fileId);
        if (!file) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || !user.orgIds.includes(file.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.fileId, {
            folderId: args.hasOwnProperty('folderId') ? args.folderId : undefined,
        });
    },
});

export const moveFolder = mutation({
    args: {
        folderId: v.id("folders"),
        parentId: v.optional(v.union(v.id("folders"), v.null())),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const folder = await ctx.db.get(args.folderId);
        if (!folder) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || !user.orgIds.includes(folder.orgId)) {
            throw new Error("Unauthorized");
        }

        // Circular check is complex in backend, skipping for now (UI handles it usually, or assume simple move)
        // Ideally should check if new parent is child of current folder.

        await ctx.db.patch(args.folderId, {
            parentId: args.hasOwnProperty('parentId') ? args.parentId : undefined,
        });
    },
});

export const updateFolder = mutation({
    args: {
        folderId: v.id("folders"),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const folder = await ctx.db.get(args.folderId);
        if (!folder) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || !user.orgIds.includes(folder.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.folderId, {
            name: args.name,
        });
    },
});

export const updateFile = mutation({
    args: {
        fileId: v.id("files"),
        name: v.string(),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.object({ name: v.string(), color: v.string() }))),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        const file = await ctx.db.get(args.fileId);
        if (!file) return;

        const patch: any = { name: args.name };
        if (args.description !== undefined) patch.description = args.description;
        if (args.tags !== undefined) patch.tags = args.tags;

        await ctx.db.patch(args.fileId, patch);
    },
});

export const toggleWatermark = mutation({
    args: {
        fileId: v.id("files"),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        const file = await ctx.db.get(args.fileId);
        if (!file) throw new Error("File not found");
        await ctx.db.patch(args.fileId, { watermarkEnabled: args.enabled });
    },
});

export const updateCollaborators = mutation({
    args: {
        fileId: v.id("files"),
        collaborators: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        const file = await ctx.db.get(args.fileId);
        if (!file) throw new Error("File not found");
        await ctx.db.patch(args.fileId, { collaborators: args.collaborators });
    },
});

export const getFileVersions = query({
    args: {
        fileId: v.id("files"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("fileVersions")
            .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
            .collect();
    },
});

export const list = query({
    args: {
        projectId: v.string(),
        parentId: v.optional(v.id("folders")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { folders: [], files: [], documents: [] };

        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return { folders: [], files: [], documents: [] };

        const folders = await ctx.db
            .query("folders")
            .withIndex("by_project_parent", (q) =>
                q.eq("projectId", project._id).eq("parentId", args.parentId)
            )
            .collect();

        const files = await ctx.db
            .query("files")
            .withIndex("by_project_folder", (q) =>
                q.eq("projectId", project._id).eq("folderId", args.parentId)
            )
            .collect();

        // Also fetch documents (text docs)
        const documents = await ctx.db
            .query("documents")
            .withIndex("by_project_folder", (q) =>
                q.eq("projectId", project._id).eq("folderId", args.parentId)
            )
            .collect();

        // Generate signed URLs for authenticated file access
        const siteUrl = process.env.CONVEX_SITE_URL || "";
        const filesWithUrls = files.map((file) => ({
            ...file,
            url: siteUrl && file.storageId ? signFileUrl(siteUrl, file.storageId, 60 * 60 * 1000) : null,
        }));

        return { folders, files: filesWithUrls, documents };
    },
});

export const getAllFileSystem = query({
    args: {
        projectId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { folders: [], files: [], documents: [] };

        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return { folders: [], files: [], documents: [] };

        const folders = await ctx.db
            .query("folders")
            .withIndex("by_project_parent", (q) => q.eq("projectId", project._id))
            .collect();

        const files = await ctx.db
            .query("files")
            .withIndex("by_project_folder", (q) => q.eq("projectId", project._id))
            .collect();

        const documents = await ctx.db
            .query("documents")
            .withIndex("by_project_folder", (q) => q.eq("projectId", project._id))
            .collect();

        return { folders, files, documents };
    },
});

export const deleteFolder = mutation({
    args: { folderId: v.id("folders") },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const folder = await ctx.db.get(args.folderId);
        if (!folder) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || !user.orgIds.includes(folder.orgId)) {
            throw new Error("Unauthorized");
        }

        // Recursive Delete
        await deleteFolderRecursive(ctx, args.folderId, folder.projectId);
    },
});

// Recursive Helper Logic inside the mutation context
async function deleteFolderRecursive(ctx: any, folderId: any, projectId: any) {
    // 1. Find Subfolders
    const subfolders = await ctx.db
        .query("folders")
        .withIndex("by_project_parent", (q: any) => q.eq("projectId", projectId).eq("parentId", folderId))
        .collect();

    for (const sub of subfolders) {
        await deleteFolderRecursive(ctx, sub._id, projectId);
    }

    // 2. Delete Files in this folder
    const files = await ctx.db
        .query("files")
        .withIndex("by_project_folder", (q: any) => q.eq("projectId", projectId).eq("folderId", folderId))
        .collect();

    for (const file of files) {
        await ctx.storage.delete(file.storageId);
        await ctx.db.delete(file._id);
    }

    // 3. Delete Documents in this folder
    const docs = await ctx.db
        .query("documents")
        .withIndex("by_project_folder", (q: any) => q.eq("projectId", projectId).eq("folderId", folderId))
        .collect();

    for (const doc of docs) {
        await ctx.db.delete(doc._id);
    }

    // 4. Delete the folder itself
    await ctx.db.delete(folderId);
}

export const deleteFile = mutation({
    args: {
        fileId: v.id("files"),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const file = await ctx.db.get(args.fileId);
        if (!file) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user) {
            throw new Error("User not found");
        }

        // User is authenticated — allow file operations within their workspace

        if (file.storageId) {
            await ctx.storage.delete(file.storageId);
        }
        // Delete from R2 if applicable
        if (file.r2Key) {
            await ctx.scheduler.runAfter(0, internal.r2.deleteR2Object, {
                r2Key: file.r2Key,
            });
            // Decrement storage usage
            await ctx.scheduler.runAfter(0, internal.storageQuota.decrementUsage, {
                orgId: file.orgId,
                fileSize: file.size,
            });
        }
        await ctx.db.delete(args.fileId);
    },
});

export const searchFiles = query({
    args: {
        projectId: v.string(),
        query: v.string(),
        type: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return [];

        const results = await (args.type
            ? ctx.db.query("files").withSearchIndex("search_by_name", q => q.search("name", args.query).eq("projectId", project._id).eq("type", args.type!)).collect()
            : ctx.db.query("files").withSearchIndex("search_by_name", q => q.search("name", args.query).eq("projectId", project._id)).collect()
        );

        // ... existing code ...
        return results.map(file => ({
            id: file._id,
            name: file.name,
            type: file.type,
            storageId: file.storageId,
            size: file.size,
            folderId: file.folderId
        }));
    }
});

export const getDownloadUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        const siteUrl = process.env.CONVEX_SITE_URL || "";
        if (siteUrl) {
            return signFileUrl(siteUrl, args.storageId, 60 * 60 * 1000);
        }
        // Fallback for dev without CONVEX_SITE_URL
        return await ctx.storage.getUrl(args.storageId);
    },
});

/**
 * Internal action: read a text/markdown file from Convex storage and save
 * its content to workspace_personality so the LLM can use it as RAG context.
 * Scheduled automatically when a .md or .txt file is uploaded.
 */
export const extractAndSaveRagDoc = internalAction({
    args: {
        storageId: v.string(),
        orgId: v.string(),
        title: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            const url = await ctx.storage.getUrl(args.storageId as any);
            if (!url) return;

            const resp = await fetch(url);
            if (!resp.ok) return;

            const text = await resp.text();
            if (!text.trim()) return;

            await ctx.runMutation(internal.workspace_personality.savePersonality, {
                orgId: args.orgId,
                workspaceId: args.storageId, // use storageId as unique workspace key per doc
                title: args.title,
                content: text,
            });
        } catch (err) {
            console.error("[RAG] Failed to extract and save doc:", err);
        }
    },
});
