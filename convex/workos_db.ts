import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the current cursor from the database.
 */
export const getCursor = (internalQuery as any)({
    args: {},
    handler: async (ctx: any) => {
        const cursorRecord = await ctx.db.query("workos_cursors").order("desc").first();
        return cursorRecord?.cursor || null;
    },
});

/**
 * Update steps to handling WorkOS events
 */
export const processBatch = (internalMutation as any)({
    args: {
        events: v.any(), // Array of WorkOS Events
        nextCursor: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {

        for (const event of args.events) {
            try {
                const { event: eventType, data } = event;

                if (eventType === "user.created" || eventType === "user.updated") {
                    const user = data;
                    const tokenIdentifier = user.id;

                    const existingUser = await ctx.db
                        .query("users")
                        .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", tokenIdentifier))
                        .unique();

                    const userData = {
                        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                        email: user.email,
                        ...(user.profilePictureUrl ? { pictureUrl: user.profilePictureUrl } : {}),
                    };

                    if (existingUser) {
                        await ctx.db.patch(existingUser._id, userData);
                    } else {
                        // Create new user
                        await ctx.db.insert("users", {
                            tokenIdentifier,
                            ...userData,
                            orgIds: [],
                            status: "active",
                            onboardingStep: 1,
                            onboardingCompleted: false,
                        });
                    }
                }
                else if (eventType === "organization_membership.created" || eventType === "organization_membership.updated") {
                    const membership = data;
                    const user = await ctx.db
                        .query("users")
                        .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", membership.user_id))
                        .unique();

                    if (user) {
                        const updates: any = {};
                        // Update user's orgIds
                        if (!user.orgIds.includes(membership.organization_id)) {
                            updates.orgIds = [...user.orgIds, membership.organization_id];
                        }
                        // Update role if available
                        if (membership.role?.slug) {
                            const roleSlug = membership.role.slug;
                            const displayRole = roleSlug === 'admin' ? 'Admin' : roleSlug === 'founder' ? 'Founder' : 'Member';
                            const currentRoles = user.roles || [];
                            const existingIdx = currentRoles.findIndex((r: any) => r.orgId === membership.organization_id);
                            if (existingIdx >= 0) {
                                if (currentRoles[existingIdx].role !== displayRole) {
                                    const newRoles = [...currentRoles];
                                    newRoles[existingIdx] = { orgId: membership.organization_id, role: displayRole };
                                    updates.roles = newRoles;
                                }
                            } else {
                                updates.roles = [...currentRoles, { orgId: membership.organization_id, role: displayRole }];
                            }
                        }
                        if (Object.keys(updates).length > 0) {
                            await ctx.db.patch(user._id, updates);
                        }
                    }
                }
            } catch (err) {
            }
        }

        // Update Cursor after processing batch
        // Always delete old cursor first to avoid duplicates
        const existingCursors = await ctx.db.query("workos_cursors").collect();
        for (const c of existingCursors) {
            await ctx.db.delete(c._id);
        }

        if (args.nextCursor) {
            // Save cursor for next batch (pagination)
            await ctx.db.insert("workos_cursors", {
                cursor: args.nextCursor,
                lastSyncedAt: Date.now()
            });
        } else if (args.events.length > 0) {
            // No more pages - save the last event ID as cursor for next run
            const lastEvent = args.events[args.events.length - 1];
            const lastEventId = lastEvent?.id;
            if (lastEventId) {
                await ctx.db.insert("workos_cursors", {
                    cursor: lastEventId,
                    lastSyncedAt: Date.now()
                });
            }
        }
    },
});
