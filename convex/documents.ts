
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectSafe, requireAuth, findUserByIdentity } from "./auth";

// Create a new document (text-based)
export const createDocument = mutation({
    args: {
        projectId: v.string(), // localId or convexId
        folderId: v.optional(v.id("folders")),
        title: v.string(),
        content: v.optional(v.string()),
        tags: v.optional(v.array(v.object({ name: v.string(), color: v.string() }))),
        type: v.string(), // 'doc', 'WhitePaper', 'BusinessPlan'
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        const user = await findUserByIdentity(ctx, identity);

        if (!user) throw new Error("User not found");

        const docId = await ctx.db.insert("documents", {
            projectId: project._id,
            orgId: project.orgId,
            folderId: args.folderId,
            title: args.title,
            type: args.type,
            content: args.content || "",
            tags: args.tags,
            updatedAt: Date.now(),
            // Security Init
            creatorId: user._id, // Set creator
            isLocked: false,
            collaborators: [],
            signers: [],
        });

        return docId;
    }
});

// Update an existing document
export const updateDocument = mutation({
    args: {
        id: v.id("documents"),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        folderId: v.optional(v.union(v.id("folders"), v.null())), // Use for moving docs
        tags: v.optional(v.array(v.object({ name: v.string(), color: v.string() }))),
        // Security Updates
        isLocked: v.optional(v.boolean()),
        collaborators: v.optional(v.array(v.string())),
        signers: v.optional(v.array(v.object({
            userId: v.string(),
            role: v.optional(v.string()),
            status: v.string(),
            signedAt: v.optional(v.number()),
            ipAddress: v.optional(v.string())
        }))),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        const doc = await ctx.db.get(args.id);
        if (!doc) throw new Error("Document not found");

        const user = await findUserByIdentity(ctx, identity);

        // 1. Basic Org Access Check
        if (!user || !user.orgIds.includes(doc.orgId)) {
            throw new Error("Unauthorized");
        }

        // 2. Determine Ownership
        // If creatorId is set, check match.
        // If creatorId is NOT set (legacy), we treat the current user as an "owner" for the purpose of
        // allowing them to claim it or unlock it, effectively defaulting to Org-wide trust for legacy items.
        // Alternatively, we could strictly require creatorId, but that locks everyone out of legacy docs.
        const isOwner = !doc.creatorId || doc.creatorId === user._id;
        const isCollaborator = doc.collaborators && doc.collaborators.includes(user._id);

        // 3. Strict Access Control (If not legacy)
        // If creatorId IS set, strict check.
        if (doc.creatorId && !isOwner && !isCollaborator) {
            throw new Error("Unauthorized: Restricted Access");
        }

        // 4. Locked Check
        if (doc.isLocked) {
            // If locked, usually read-only for everyone.
            // BUT, if the user IS the owner, we can allow them to edit (Power User / Admin override).
            // If not owner, strictly block edits.
            if (!isOwner) {
                throw new Error("Document is locked");
            }
            // Owner proceeds (can edit content or unlock).
        }

        // 5. Locking/Unlocking Logic
        // If we are locking the document, and it doesn't have a creatorId, we should set it to the current user.
        // This "claims" the document for the person locking it.
        let newCreatorId = undefined;
        if (args.isLocked === true && !doc.creatorId) {
            newCreatorId = user._id;
        }

        await ctx.db.patch(args.id, {
            ...(args.title !== undefined && { title: args.title }),
            ...(args.content !== undefined && { content: args.content }),
            ...(args.hasOwnProperty('folderId') && { folderId: args.folderId }),
            ...(args.tags !== undefined && { tags: args.tags }),
            ...(args.isLocked !== undefined && { isLocked: args.isLocked }),
            ...(args.collaborators !== undefined && { collaborators: args.collaborators }),
            ...(args.signers !== undefined && { signers: args.signers }),
            ...(newCreatorId !== undefined && { creatorId: newCreatorId }),
            updatedAt: Date.now(),
        });
    }
});

// Sign a document
export const signDocument = mutation({
    args: {
        id: v.id("documents"),
        signerId: v.string(), // The user ID signing
        role: v.optional(v.string()),
        signatureData: v.string(), // Base64 or Text
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const doc = await ctx.db.get(args.id);
        if (!doc) throw new Error("Document not found");

        const user = await findUserByIdentity(ctx, identity);

        if (!user || user._id !== args.signerId) {
            throw new Error("Unauthorized: Identity mismatch");
        }

        // Update Signers List
        const currentSigners = doc.signers || [];
        // Check if already in list
        const existingIndex = currentSigners.findIndex(s => s.userId === args.signerId);

        const now = Date.now();
        // For IP, we can't easily get it in a standard mutation, so we'll use a placeholder or system verifiction
        const ip = "Verified System Login (" + (identity.subject.slice(-4)) + ")";

        let newSigners = [...currentSigners];
        if (existingIndex >= 0) {
            newSigners[existingIndex] = {
                ...newSigners[existingIndex],
                status: 'signed',
                signedAt: now,
                ipAddress: ip
            };
        } else {
            newSigners.push({
                userId: args.signerId,
                role: args.role,
                status: 'signed',
                signedAt: now,
                ipAddress: ip
            });
        }

        await ctx.db.patch(args.id, {
            signers: newSigners,
            updatedAt: now
        });

        return { success: true, timestamp: now, ip };
    }
});

// Delete a document
export const deleteDocument = mutation({
    args: { id: v.id("documents") },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const doc = await ctx.db.get(args.id);
        if (!doc) return;

        const user = await findUserByIdentity(ctx, identity);

        if (!user || !user.orgIds.includes(doc.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.id);
    }
});

export const getDocument = query({
    args: { id: v.id("documents") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const doc = await ctx.db.get(args.id);
        if (!doc) return null;

        // Verify Org Access
        // We can optimize this by passing orgId in identity subject if we trusting it, 
        // but robust check queries user.
        // For read speed, we assume tokenIdentifier validation in middleware/auth suffices for identity,
        // but we must check if user belongs to doc.orgId.
        const user = await findUserByIdentity(ctx, identity);

        if (!user || !user.orgIds.includes(doc.orgId)) return null;

        return doc;
    }
});
