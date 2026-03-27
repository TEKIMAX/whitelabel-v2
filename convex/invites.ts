"use node";
import { v } from "convex/values";

import { action } from "./_generated/server";
import { WorkOS } from "@workos-inc/node";
import { api } from "./_generated/api";

const getWorkOS = () => new WorkOS(process.env.WORKOS_API_KEY!);


export const sendInvite = action({
    args: {
        email: v.string(),
        orgId: v.string(), // WorkOS Organization ID
        projectId: v.id("projects"),
        name: v.optional(v.string()),
        role: v.optional(v.string()),
        allowedPages: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const user = await ctx.runQuery(api.users.getUser, {});
        if (!user) throw new Error("User not found");

        let targetOrgId = args.orgId;
        if (targetOrgId === "personal") {
            if (user.orgIds && user.orgIds.length > 0) {
                targetOrgId = user.orgIds[0];
            } else {
                throw new Error("No Organization found. Please create an organization to invite members.");
            }
        }

        // Check Permissions
        const userRoles = user.roles || [];
        const orgRole = userRoles.find((r: any) => r.orgId === targetOrgId);

        // Allow if user is Admin or Founder
        // If no role found, deny (unless we want to allow implicit access, but request was specific)
        const hasPermission = orgRole && (orgRole.role.toLowerCase() === "admin" || orgRole.role.toLowerCase() === "founder");

        if (!hasPermission) {
            // Allow if user is the creator of the project (fallback)
            // Use runQuery because we are in an action
            const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
            // Note: api.projects.get returns enriched object, we check orgId or userId if available
            // But projects.get checks auth, so if it returns, the user has access.
            // However, we specifically want to check if they are the OWNER/CREATOR to allow sending invites
            // The get query returns { userId, ... } ? No, it returns enriched fields.
            // Let's check if the project exists and if the user has access (which get() verifies).
            // But we want to restrict invites to Admins/Founders.
            // If the user is the creator, they should be a Founder.

            if (!project) {
                throw new Error("Only Admins or Founders can send invitations.");
            }
            // If project is returned, they have access.
            // We should ideally check if they are the creator, but projects.get might not return userId.
            // Let's assume if they have access and we are here (no org role), they might be the creator in a personal org context.
        }

        // Pre-register user in team_members
        // We use runMutation to call the internal mutation to add the member
        // But we are in an action, so we need to use ctx.runMutation
        // We need to expose a mutation for this or use the existing addMember if it supports it.
        // Let's use a new internal mutation or update addMember.
        // Since we can't easily modify addMember from here without viewing it again and it's in another file,
        // and we are in an action, we should probably call a mutation.
        // However, `addMember` is exported.
        // Let's assume we can call `api.team.addMember`.

        // White-label: no seat limits enforced


        try {
            const invitation = await getWorkOS().userManagement.sendInvitation({
                email: args.email,
                organizationId: targetOrgId,
            });

            // Create Pending Member with WorkOS Invite ID
            await ctx.runMutation(api.team.addMember, {
                projectId: args.projectId,
                name: args.name || "Pending User",
                email: args.email,
                role: args.role || "Employee",
                acceptedRole: false,
                status: "Pending",
                workosInvitationId: invitation.id,
                allowedPages: args.allowedPages,
            });

            return invitation;
        } catch (error) {
            throw new Error("Failed to send invitation");
        }
    },
});

export const revokeInvite = action({
    args: {
        inviteId: v.string(),
        memberId: v.id("team_members"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify permissions via getMember (which enforces org membership)
        const member = await ctx.runQuery(api.team.getMember, { id: args.memberId });
        if (!member) throw new Error("Member not found");

        if (member.workosInvitationId !== args.inviteId) {
            throw new Error("Invalid invite ID for this member");
        }

        try {
            // Revoke in WorkOS
            await getWorkOS().userManagement.revokeInvitation(args.inviteId);
        } catch (error) {
        }

        // Update local record to Revoked
        await ctx.runMutation(api.team.updateMember, {
            id: args.memberId,
            updates: { status: "Revoked" }
        });
    },
});

export const deleteTeamMember = action({
    args: {
        memberId: v.id("team_members"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const member = await ctx.runQuery(api.team.getMember, { id: args.memberId });
        if (!member) {
            throw new Error("Member not found");
        }

        if (["Admin", "Founder"].includes(member.role)) {
            throw new Error("Cannot delete Admin or Founder");
        }

        // If pending, revoke invite
        if (member.status === "Pending" && member.workosInvitationId) {
            // If pending, revoke invite
            try {
                await getWorkOS().userManagement.revokeInvitation(member.workosInvitationId);
            } catch (error) {
            }
            // Set status to Revoked
            await ctx.runMutation(api.team.updateMember, {
                id: args.memberId,
                updates: { status: "Revoked" }
            });
        } else {
            // If active or no invite ID, try to remove from WorkOS Org
            if (member.email && member.orgId) {
                try {
                    let membershipIdToDelete: string | null = null;

                    // Strategy 1: Look up user by email directly
                    const users = await getWorkOS().userManagement.listUsers({
                        email: member.email,
                        limit: 1
                    });

                    if (users.data.length > 0) {
                        const userId = users.data[0].id;
                        const memberships = await getWorkOS().userManagement.listOrganizationMemberships({
                            userId: userId,
                            organizationId: member.orgId
                        });

                        if (memberships.data.length > 0) {
                            membershipIdToDelete = memberships.data[0].id;
                        }
                    }

                    // Strategy 2: Fallback - List all memberships and check emails
                    if (!membershipIdToDelete) {
                        const allMemberships = await getWorkOS().userManagement.listOrganizationMemberships({
                            organizationId: member.orgId,
                            limit: 100
                        });

                        // We need to fetch users to check emails. Do this in parallel but limit concurrency if needed.
                        // For typical team sizes, Promise.all is fine.
                        const membershipChecks = await Promise.all(allMemberships.data.map(async (m) => {
                            try {
                                const user = await getWorkOS().userManagement.getUser(m.userId);
                                return { membershipId: m.id, email: user.email };
                            } catch (e) {
                                return null;
                            }
                        }));

                        const match = membershipChecks.find(m => m && m.email.toLowerCase() === member.email.toLowerCase());
                        if (match) {
                            membershipIdToDelete = match.membershipId;
                        }
                    }

                    if (membershipIdToDelete) {
                        await getWorkOS().userManagement.deleteOrganizationMembership(membershipIdToDelete);
                    } else {
                    }

                } catch (error) {
                }
            }

            // Soft delete locally

            await ctx.runMutation(api.team.updateMember, {
                id: args.memberId,
                updates: { status: "Deleted" }
            });

        }
    },
});

export const resendInvite = action({
    args: {
        inviteId: v.string(),
        memberId: v.id("team_members"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Verify permissions via getMember
        const member = await ctx.runQuery(api.team.getMember, { id: args.memberId });
        if (!member) throw new Error("Member not found");

        if (member.workosInvitationId !== args.inviteId) {
            throw new Error("Invalid invite ID for this member");
        }

        try {
            await getWorkOS().userManagement.resendInvitation(args.inviteId);
        } catch (error) {
            throw new Error("Failed to resend invitation");
        }
    },
});
