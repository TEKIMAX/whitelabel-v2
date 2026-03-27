// @ts-nocheck — Schema too large for TS type inference (62 tables). Convex validates at runtime.
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyProjectAccess, requireAuth } from "./auth";

export const getTeam = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args): Promise<any> => {
        const { project } = await verifyProjectAccess(ctx, args.projectId);

        return await ctx.db
            .query("team_members")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .collect();
    },
});

export const getMember = query({
    args: { id: v.id("team_members") },
    handler: async (ctx, args): Promise<any> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const member = await ctx.db.get(args.id);
        if (!member) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || !user.orgIds.includes(member.orgId)) {
            return null;
        }

        return member;
    },
});

export const addMember = mutation({
    args: {
        projectId: v.id("projects"),
        name: v.string(),
        email: v.string(),
        role: v.string(),
        pictureUrl: v.optional(v.string()),
        education: v.optional(v.string()),
        schools: v.optional(v.string()),
        acceptedRole: v.optional(v.boolean()),
        status: v.optional(v.string()),
        workosInvitationId: v.optional(v.string()),
        allowedPages: v.optional(v.array(v.string())),
        source: v.optional(v.string()), // 'AI' | 'Human'
    },
    handler: async (ctx, args) => {
        const { project, orgId } = await verifyProjectAccess(ctx, args.projectId);

        const memberId = await ctx.db.insert("team_members", {
            projectId: args.projectId,
            orgId: orgId, // Use the verified project's orgId
            name: args.name,
            email: args.email,
            role: args.role,
            pictureUrl: args.pictureUrl,
            education: args.education,
            schools: args.schools,
            acceptedRole: args.acceptedRole,
            status: args.status || (args.acceptedRole ? "Active" : "Pending"),
            workosInvitationId: args.workosInvitationId,
            allowedPages: args.allowedPages,
            source: args.source,
            joinedAt: Date.now(),
        });

        return memberId;
    },
});

export const updateMember = mutation({
    args: {
        id: v.id("team_members"),
        updates: v.object({
            name: v.optional(v.string()),
            email: v.optional(v.string()),
            role: v.optional(v.string()),
            pictureUrl: v.optional(v.string()),
            education: v.optional(v.string()),
            schools: v.optional(v.string()),
            acceptedRole: v.optional(v.boolean()),
            status: v.optional(v.string()),
            workosInvitationId: v.optional(v.string()),
            source: v.optional(v.string()), // 'AI' | 'Human'
        }),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        // Verify access to member's project/org
        const member = await ctx.db.get(args.id);
        if (!member) throw new Error("Member not found");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || !user.orgIds.includes(member.orgId)) {
            throw new Error("Unauthorized");
        }


        await ctx.db.patch(args.id, args.updates);
    },
});

export const deleteMember = mutation({
    args: { id: v.id("team_members") },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        const member = await ctx.db.get(args.id);
        if (!member) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || !user.orgIds.includes(member.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.id);
    },
});

export const updateBusinessStructure = mutation({
    args: {
        projectId: v.id("projects"),
        structure: v.string(),
    },
    handler: async (ctx, args) => {
        await verifyProjectAccess(ctx, args.projectId);

        await ctx.db.patch(args.projectId, {
            businessStructure: args.structure,
            updatedAt: Date.now(),
        });
    },
});

export const updateOrganizationDetails = mutation({
    args: {
        projectId: v.id("projects"),
        details: v.string(), // JSON string
    },
    handler: async (ctx, args) => {
        await verifyProjectAccess(ctx, args.projectId);

        await ctx.db.patch(args.projectId, {
            organizationDetails: args.details,
            updatedAt: Date.now(),
        });
    },
});

export const updateMemberStatusByInviteId = internalMutation({
    args: {
        workosInvitationId: v.optional(v.string()),
        email: v.optional(v.string()),
        status: v.string(),
        acceptedRole: v.boolean(),
        name: v.optional(v.string()),
        pictureUrl: v.optional(v.string()),
        projectId: v.optional(v.id("projects")),
        orgId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let member = null;

        if (args.workosInvitationId) {
            member = await ctx.db
                .query("team_members")
                .withIndex("by_workosInvitationId", (q) => q.eq("workosInvitationId", args.workosInvitationId!))
                .first();
        }

        if (!member && args.email && args.projectId) {
            // CRITICAL FIX: Check if member exists in THIS project specifically
            member = await ctx.db
                .query("team_members")
                .withIndex("by_project", (q) => q.eq("projectId", args.projectId!))
                .filter(q => q.eq(q.field("email"), args.email!))
                .first();
        } else if (!member && args.email) {
            // Fallback (shouldn't be hit often if projectId is provided)
            member = await ctx.db
                .query("team_members")
                .withIndex("by_email", (q) => q.eq("email", args.email!))
                .first();
        }



        if (member) {

            let updates: any = {
                status: args.status,
                acceptedRole: args.acceptedRole,
                // Update basic info if provided (e.g. from webhook)
                ...(args.name ? { name: args.name } : {}),
                ...(args.pictureUrl ? { pictureUrl: args.pictureUrl } : {}),
            };

            // If we don't have a picture yet, try to find the user by email to get it
            if (!updates.pictureUrl && !member.pictureUrl && member.email) {
                const user = await ctx.db
                    .query("users")
                    .filter(q => q.eq(q.field("email"), member.email))
                    .first();

                if (user && user.pictureUrl) {
                    updates.pictureUrl = user.pictureUrl;
                }
                if (user && user.name && !updates.name && member.name === "Pending User") {
                    updates.name = user.name;
                }
            }

            await ctx.db.patch(member._id, updates);
        } else if (args.projectId && args.orgId && args.email && args.name) {
            // Member not found, but we have enough info to create one (upsert from webhook)

            await ctx.db.insert("team_members", {
                projectId: args.projectId,
                orgId: args.orgId,
                name: args.name,
                email: args.email,
                role: "Member", // Default role for auto-created members
                pictureUrl: args.pictureUrl,
                status: args.status,
                acceptedRole: args.acceptedRole,
                workosInvitationId: args.workosInvitationId,
                joinedAt: Date.now(),
            });
        } else {

        }
    },
});

/**
 * Update the role of a team member across all projects in an org.
 * Called from the organization_membership.updated webhook handler.
 */
export const updateMemberRole = internalMutation({
    args: {
        email: v.string(),
        orgId: v.string(),
        role: v.string(),
    },
    handler: async (ctx, args) => {
        // Find all team_members with this email in this org
        const members = await ctx.db
            .query("team_members")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .collect();

        let updated = 0;
        for (const member of members) {
            if (member.orgId === args.orgId && member.role !== args.role) {
                await ctx.db.patch(member._id, { role: args.role });
                updated++;
            }
        }

        return { updated };
    },
});
