// @ts-nocheck — Schema too large for TS type inference (62 tables). Convex validates at runtime.
import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { authKit } from "./auth";
import { internal } from "./_generated/api";
import { getEntitlements } from "./permissions";


export const updateFromWebhook = internalMutation({
    args: {
        tokenIdentifier: v.string(), // workos_user_id
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        pictureUrl: v.optional(v.string()),
        orgId: v.optional(v.string()), // WorkOS Org ID
        role: v.optional(v.string()), // "admin" or "member"
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", args.tokenIdentifier)
            )
            .unique();

        let shouldUpdateTeamMember = false;

        if (user) {
            // Update existing user
            const updates: any = {};
            if (args.name) updates.name = args.name;
            if (args.email) updates.email = args.email;
            if (args.pictureUrl) updates.pictureUrl = args.pictureUrl;

            // If orgId is provided and not in the list, add it
            if (args.orgId && !user.orgIds.includes(args.orgId)) {
                updates.orgIds = [...user.orgIds, args.orgId];
            }

            // Handle roles
            if (args.orgId && args.role) {
                const currentRoles = user.roles || [];
                const existingRoleIndex = currentRoles.findIndex(r => r.orgId === args.orgId);
                if (existingRoleIndex >= 0) {
                    // Update role if changed
                    const currentRole = currentRoles[existingRoleIndex].role;
                    // Protect "Founder" role from being overwritten by default "member" role from webhook
                    if (currentRole === "Founder" && args.role === "member") {

                    } else if (currentRole !== args.role) {
                        const newRoles = [...currentRoles];
                        newRoles[existingRoleIndex] = { orgId: args.orgId!, role: args.role! };
                        updates.roles = newRoles;
                        if (args.role === "Founder") shouldUpdateTeamMember = true;
                    }
                } else {
                    // Add new role
                    updates.roles = [...currentRoles, { orgId: args.orgId!, role: args.role! }];
                    if (args.role === "Founder") shouldUpdateTeamMember = true;
                }
            }

            await ctx.db.patch(user._id, updates);

            // Auto-activate Founder in team members
            if (shouldUpdateTeamMember && args.email) {
                await ctx.scheduler.runAfter(0, internal.team.updateMemberStatusByInviteId, {
                    email: args.email,
                    status: "Active",
                    acceptedRole: true
                });
            }

            return { userId: user._id, orgIds: updates.orgIds || user.orgIds, roles: updates.roles || user.roles };
        } else {
            // Create new user
            const isInvitedMember = args.role === 'member';
            const roles = args.orgId && args.role ? [{ orgId: args.orgId, role: args.role }] : [];
            const userId = await ctx.db.insert("users", {
                tokenIdentifier: args.tokenIdentifier,
                name: args.name,
                email: args.email,
                pictureUrl: args.pictureUrl,
                orgIds: args.orgId ? [args.orgId] : [],
                roles: roles,
                onboardingStep: isInvitedMember ? 99 : 1,
                onboardingCompleted: isInvitedMember, // Skip onboarding for invited members
            });

            if (args.role === "Founder" && args.email) {
                await ctx.scheduler.runAfter(0, internal.team.updateMemberStatusByInviteId, {
                    email: args.email,
                    status: "Active",
                    acceptedRole: true
                });
            }

            return { userId, orgIds: args.orgId ? [args.orgId] : [], roles };
        }
    },
});

export const removeOrgFromUser = internalMutation({
    args: {
        tokenIdentifier: v.string(),
        orgId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", args.tokenIdentifier)
            )
            .unique();

        if (user) {
            const updates: any = {};

            // Remove from orgIds
            if (user.orgIds && user.orgIds.includes(args.orgId)) {
                updates.orgIds = user.orgIds.filter((id: string) => id !== args.orgId);
            }

            // Remove from roles
            if (user.roles) {
                const newRoles = user.roles.filter((r: any) => r.orgId !== args.orgId);
                if (newRoles.length !== user.roles.length) {
                    updates.roles = newRoles;
                }
            }

            if (Object.keys(updates).length > 0) {
                await ctx.db.patch(user._id, updates);
            }

            // Cleanup Team Members (Fix for Zombie Members)
            if (user.email) {
                const teamMembers = await ctx.db
                    .query("team_members")
                    .withIndex("by_email", (q) => q.eq("email", user.email!))
                    .collect();

                for (const member of teamMembers) {
                    if (member.orgId === args.orgId) {
                        await ctx.db.delete(member._id);
                    }
                }
            }
        }
    }
});

// Internal query to lookup user by email (for Stripe webhooks)
export const getUserByEmail = internalQuery({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .filter(q => q.eq(q.field("email"), args.email))
            .first();
    }
});

export const recordInstanceDetails = internalMutation({
    args: {
        email: v.string(),
        instanceUrl: v.string(),
        instanceProjectSlug: v.string(),
    },
    handler: async (ctx, args) => {
        const userToUpdate = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();

        if (userToUpdate) {
            await ctx.db.patch(userToUpdate._id, {
                instanceUrl: args.instanceUrl,
                instanceProjectSlug: args.instanceProjectSlug,
            });
        }
    }
});

// Internal query to lookup user by token identifier
export const getUserByToken = internalQuery({
    args: { tokenIdentifier: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", args.tokenIdentifier))
            .unique();
    }
});

// Internal query to lookup user by Stripe customer ID
export const getUserByStripeCustomerId = internalQuery({
    args: { stripeCustomerId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_stripe_customer_id", q => q.eq("stripeCustomerId", args.stripeCustomerId))
            .first();
    }
});

export const addInvitation = internalMutation({
    args: {
        id: v.string(), // Added ID
        email: v.string(),
        orgId: v.string(),
        role: v.optional(v.string()),
        token: v.optional(v.string()),
        acceptUrl: v.optional(v.string()),
        orgName: v.optional(v.string()),
        inviterName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        // Find user by email (since they might not be authenticated yet or tokenIdentifier might differ)
        const user = await ctx.db
            .query("users")
            .filter(q => q.eq(q.field("email"), args.email))
            .first();

        if (user) {
            const currentInvites = user.invitations || [];
            // Avoid duplicates
            if (!currentInvites.some(i => i.orgId === args.orgId)) {
                await ctx.db.patch(user._id, {
                    invitations: [...currentInvites, {
                        id: args.id, // Store ID
                        orgId: args.orgId,
                        role: args.role,
                        status: 'pending',
                        token: args.token,
                        acceptUrl: args.acceptUrl,
                        orgName: args.orgName,
                        inviterName: args.inviterName,
                        date: Date.now()
                    }]
                });
            }
        }
    }
});

export const resolveInvitation = internalMutation({
    args: {
        email: v.string(),
        orgId: v.string()
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .filter(q => q.eq(q.field("email"), args.email))
            .first();

        if (user && user.invitations) {
            const newInvites = user.invitations.filter(i => i.orgId !== args.orgId);
            if (newInvites.length !== user.invitations.length) {
                await ctx.db.patch(user._id, { invitations: newInvites });
            }
        }
    }
});

export const store = mutation({
    args: {
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        pictureUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return null;
        }

        // If the JWT was issued with org context (org-scoped auth), extract the orgId
        // so we don't have to wait for the WorkOS webhook to link the user to their org.
        const orgIdFromJWT: string | undefined = (identity as any).orgId || (identity as any).org_id || undefined;

        // Check if we've already stored this identity or if we're updating it
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (user !== null) {
            const updates: any = {};
            if (user.name !== args.name) updates.name = args.name;
            if (user.pictureUrl !== args.pictureUrl) updates.pictureUrl = args.pictureUrl;

            // Backfill onboarding fields if missing
            if (user.onboardingStep === undefined) updates.onboardingStep = 99;
            if (user.onboardingCompleted === undefined) updates.onboardingCompleted = true;

            // Eagerly link org from JWT — no need to wait for webhook
            if (orgIdFromJWT && !user.orgIds.includes(orgIdFromJWT)) {
                updates.orgIds = [...user.orgIds, orgIdFromJWT];
                // Also backfill role if not already present
                const currentRoles = user.roles || [];
                if (!currentRoles.some((r: any) => r.orgId === orgIdFromJWT)) {
                    updates.roles = [...currentRoles, { orgId: orgIdFromJWT, role: 'member' }];
                }
            }

            if (Object.keys(updates).length > 0) {
                await ctx.db.patch(user._id, updates);
            }
            return user._id;
        }

        // New user — seed orgIds immediately from JWT if available
        const userId = await ctx.db.insert("users", {
            tokenIdentifier: identity.tokenIdentifier,
            name: args.name,
            email: args.email,
            pictureUrl: args.pictureUrl,
            orgIds: orgIdFromJWT ? [orgIdFromJWT] : [],
            roles: orgIdFromJWT ? [{ orgId: orgIdFromJWT, role: 'member' }] : [],
            status: "active",
            onboardingStep: 99,
            onboardingCompleted: true,
            subscriptionStatus: "trialing",
            subscriptionTier: "starter",
            endsOn: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3-day trial
        });

        return userId;
    },
});

export const getUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return null;
        }
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) return null;

        // Determine current role (fallback to first role or "User")
        let role = "User";
        if (user.roles && user.roles.length > 0) {
            role = user.roles[0].role;
        }

        return {
            ...user,
            role,
            // Robust defaults for missing fields
            onboardingStep: user.onboardingStep ?? 1,
            onboardingCompleted: user.onboardingCompleted ?? false,
            // Entitlements
            entitlements: getEntitlements(user)
        };
    },
});

export const setCurrentOrg = mutation({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) throw new Error("User not found");
        if (!user.orgIds.includes(args.orgId)) throw new Error("Not a member of this org");

        await ctx.db.patch(user._id, { currentOrgId: args.orgId });
    },
});

export const listByOrg = query({
    args: { orgId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.orgId) return [];

        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!currentUser || !currentUser.orgIds.includes(args.orgId!)) {
            return [];
        }

        const users = await ctx.db.query("users").collect();
        // Filter users who have the orgId in their orgIds array
        return users.filter(u => u.orgIds.includes(args.orgId!));
    },
});



export const removeOrgFromUserByEmail = internalMutation({
    args: {
        email: v.string(),
        orgId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .filter(q => q.eq(q.field("email"), args.email))
            .first();

        if (user) {
            const updates: any = {};

            // Remove from orgIds
            if (user.orgIds && user.orgIds.includes(args.orgId)) {
                updates.orgIds = user.orgIds.filter((id: string) => id !== args.orgId);
            }

            // Remove from roles
            if (user.roles) {
                const newRoles = user.roles.filter((r: any) => r.orgId !== args.orgId);
                if (newRoles.length !== user.roles.length) {
                    updates.roles = newRoles;
                }
            }

            if (Object.keys(updates).length > 0) {
                await ctx.db.patch(user._id, updates);
            }
        }
    }
});

export const getProjectsByOrgId = internalQuery({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("projects")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();
    },
});

export const updateOnboardingStep = mutation({
    args: {
        step: v.number(),
        name: v.optional(v.string()),
        data: v.optional(v.object({
            role: v.optional(v.string()), // CEO, Founder...
            orgSize: v.optional(v.string()),
            yearsInBusiness: v.optional(v.string()),
            industry: v.optional(v.string()),
            startupName: v.optional(v.string()),
            hypothesis: v.optional(v.string()),
            foundingYear: v.optional(v.string()),
            aiInteractionStyle: v.optional(v.string()),
            enableR2Storage: v.optional(v.boolean()),
        }))
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) throw new Error("User not found");

        const updates: any = { onboardingStep: args.step };

        if (args.name) {
            updates.name = args.name;
        }

        if (args.data) {
            updates.onboardingData = {
                ...(user.onboardingData || {}),
                ...args.data
            };
        }

        await ctx.db.patch(user._id, updates);
    }
});

export const completeOnboarding = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) throw new Error("User not found");

        await ctx.db.patch(user._id, { onboardingCompleted: true });
    }
});

export const registerPublicKey = mutation({
    args: { publicKey: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) throw new Error("User not found");

        await ctx.db.patch(user._id, { publicKey: args.publicKey });
        return { success: true };
    }
});

/**
 * Build the Convex-compatible tokenIdentifier from a raw WorkOS user ID.
 * Must match the logic in auth config / workos.ts
 */
function getConvexTokenIdentifier(workosUserId: string): string {
    const issuerDomain = process.env.WORKOS_ISSUER_DOMAIN || "auth.tekimax.ai";
    return `https://${issuerDomain}/user_management/${process.env.WORKOS_CLIENT_ID}|${workosUserId}`;
}

/**
 * Called by the BRAIN Control Plane (Medusa admin panel) provisioning workflow.
 * Upserts a user by WorkOS token identifier and sets subscription/org data.
 */
export const provisionFromBrain = internalMutation({
    args: {
        workosId: v.string(),
        email: v.string(),
        organizationId: v.string(),
        organizationName: v.string(),
        features: v.array(v.string()),
        models: v.array(v.object({
            modelId: v.string(),
            modelName: v.string(),
            providerId: v.string(),
            providerName: v.string(),
            baseUrl: v.optional(v.string()),
        })),
        stripeCustomerId: v.string(),
        subscriptionStatus: v.string(),
    },
    handler: async (ctx, args) => {
        const fullTokenIdentifier = getConvexTokenIdentifier(args.workosId);

        // Look up user by WorkOS token identifier
        let user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", fullTokenIdentifier))
            .unique();

        if (!user) {
            // Fallback: look up by email
            user = await ctx.db
                .query("users")
                .filter(q => q.eq(q.field("email"), args.email))
                .first();
        }

        const subscriptionData: any = {
            subscriptionStatus: args.subscriptionStatus,
            stripeCustomerId: args.stripeCustomerId,
            subscriptionTier: "starter",
        };

        if (user) {
            // Update existing user with subscription + org data
            const updates: any = {
                ...subscriptionData,
                email: args.email,
                tokenIdentifier: fullTokenIdentifier, // Ensure token identifier is set correctly
            };

            // Add org if not already present
            if (!user.orgIds.includes(args.organizationId)) {
                updates.orgIds = [...user.orgIds, args.organizationId];
            }

            // Set Founder role for this org
            const currentRoles = user.roles || [];
            if (!currentRoles.some((r: any) => r.orgId === args.organizationId)) {
                updates.roles = [...currentRoles, { orgId: args.organizationId, role: "Founder" }];
            }

            await ctx.db.patch(user._id, updates);
            return { userId: user._id, created: false };
        } else {
            // Create new user
            const userId = await ctx.db.insert("users", {
                tokenIdentifier: fullTokenIdentifier,
                email: args.email,
                orgIds: [args.organizationId],
                roles: [{ orgId: args.organizationId, role: "Founder" }],
                onboardingStep: 1,
                onboardingCompleted: false,
                ...subscriptionData,
            });
            return { userId, created: true };
        }
    },
});

// --- TEMPORARY: Diagnostic + Cleanup for duplicate users ---
export const debugUserByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const users = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("email"), args.email))
            .collect();
        return users.map(u => ({
            _id: u._id,
            tokenIdentifier: u.tokenIdentifier,
            email: u.email,
            name: u.name,
            orgIds: u.orgIds,
            roles: u.roles,
            onboardingStep: u.onboardingStep,
            onboardingCompleted: u.onboardingCompleted,
            invitations: u.invitations,
            subscriptionStatus: u.subscriptionStatus,
        }));
    },
});

export const fixDuplicateUsers = internalMutation({
    args: {
        email: v.string(),
        keepTokenIdentifier: v.string(), // The tokenIdentifier of the record to KEEP
        mergeOrgId: v.optional(v.string()), // Org from admin to add
        mergeRole: v.optional(v.string()), // Role to assign
    },
    handler: async (ctx, args) => {
        const users = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("email"), args.email))
            .collect();

        if (users.length <= 1) return { message: "No duplicates found", count: users.length };

        // Find the record to keep
        const keepUser = users.find(u => u.tokenIdentifier === args.keepTokenIdentifier);
        if (!keepUser) return { error: "keepTokenIdentifier not found", available: users.map(u => u.tokenIdentifier) };

        // Merge data from all records into the keeper
        let mergedOrgIds = [...(keepUser.orgIds || [])];
        let mergedRoles = [...(keepUser.roles || [])];

        for (const u of users) {
            if (u._id === keepUser._id) continue;
            // Merge orgIds
            for (const orgId of (u.orgIds || [])) {
                if (!mergedOrgIds.includes(orgId)) mergedOrgIds.push(orgId);
            }
            // Merge roles
            for (const role of (u.roles || [])) {
                if (!mergedRoles.find((r: any) => r.orgId === role.orgId)) mergedRoles.push(role);
            }
            // Delete duplicate
            await ctx.db.delete(u._id);
        }

        // Add specified org/role if provided
        if (args.mergeOrgId && !mergedOrgIds.includes(args.mergeOrgId)) {
            mergedOrgIds.push(args.mergeOrgId);
        }
        if (args.mergeOrgId && args.mergeRole) {
            if (!mergedRoles.find((r: any) => r.orgId === args.mergeOrgId)) {
                mergedRoles.push({ orgId: args.mergeOrgId, role: args.mergeRole });
            }
        }

        // Update the kept record
        await ctx.db.patch(keepUser._id, {
            orgIds: mergedOrgIds,
            roles: mergedRoles,
            onboardingCompleted: true,
            onboardingStep: 99,
        });

        return {
            kept: keepUser._id,
            deleted: users.filter(u => u._id !== keepUser._id).map(u => u._id),
            mergedOrgIds,
            mergedRoles,
        };
    },
});

// --- TEMPORARY: Purge ALL data for testing ---
export const purgeAllData = internalMutation({
    args: {},
    handler: async (ctx) => {
        const tables = [
            "users", "projects", "canvases", "canvas_versions", "goals", "key_results",
            "market_data", "bottom_up_data", "competitor_config", "competitors",
            "interviews", "features", "revenue_streams", "costs", "revenue_versions",
            "deck_slides", "deck_versions", "documents", "data_sources", "team_members",
            "equity_contributions", "safe_settings", "video_interviews", "organizations",
            "architecture_nodes", "folders", "files", "legal_documents", "roles", "usage",
            "ideation_workspaces", "waitlist", "presence", "posts", "blog_categories",
            "pages", "viewCounts", "siteConfig", "pageViews", "activeSessions",
            "business_plans", "business_plan_versions", "branding", "story_progress",
            "chats", "messages", "webhooks", "workos_cursors", "divisions",
            "notifications", "model_config", "security_events", "founder_profile",
            "initiatives", "initiative_comments", "project_memory",
        ];

        const results: Record<string, number> = {};
        for (const table of tables) {
            try {
                const docs = await ctx.db.query(table as any).collect();
                for (const doc of docs) {
                    await ctx.db.delete(doc._id);
                }
                results[table] = docs.length;
            } catch (e) {
                results[table] = -1; // table doesn't exist or error
            }
        }
        return results;
    },
});

// --- TEMPORARY: Admin helpers for org setup ---
export const adminListUsersByOrg = internalQuery({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        const users = await ctx.db.query("users").collect();
        const filtered = args.orgId === 'all' ? users : users.filter(u => u.orgIds.includes(args.orgId));
        return filtered.map(u => ({
            _id: u._id,
            email: u.email,
            name: u.name,
            tokenIdentifier: u.tokenIdentifier?.slice(-30),
            orgIds: u.orgIds,
        }));
    }
});

export const adminAddOrgToUser = internalMutation({
    args: { userId: v.id("users"), orgId: v.string(), role: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");
        const orgIds = user.orgIds.includes(args.orgId) ? user.orgIds : [...user.orgIds, args.orgId];
        const roles = user.roles || [];
        if (!roles.find((r: any) => r.orgId === args.orgId)) {
            roles.push({ orgId: args.orgId, role: args.role || "member" });
        }
        await ctx.db.patch(args.userId, { orgIds, roles });
        return { orgIds, roles };
    }
});

export const adminDeleteUser = internalMutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.userId);
    }
});
