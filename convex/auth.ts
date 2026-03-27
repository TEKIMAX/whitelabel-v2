// This file is deprecated as AuthKit requires Node.js runtime which conflicts with V8 queries.
// We are moving webhook handling to http.ts and user management to users.ts.
export const authKit = null;

/**
 * Shared helper: find user by identity, trying tokenIdentifier first, then subject fallback.
 */
export async function findUserByIdentity(ctx: any, identity: any) {
    // Primary: identity.tokenIdentifier = "{issuer}|{subject}" (matches users.store() format)
    let user = await ctx.db
        .query("users")
        .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();

    // Fallback: identity.subject = raw WorkOS user ID (matches old webhook-created records)
    if (!user) {
        user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();
    }

    if (!user && identity.email) {
        // We can't guarantee an email index, but we can do a slow scan for debugging if we absolutely have to, 
        // or just log that we failed.
    }

    return user;
}

// Shared Auth Helper
export async function checkAuth(ctx: any) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    let orgId = identity.orgId;

    if (!orgId) {
        // Fallback: Check user record for internal organizations
        const user = await findUserByIdentity(ctx, identity);

        if (user && user.orgIds && user.orgIds.length > 0) {
            // Use the first organization as the active one
            // This handles both WorkOS orgs (starting with "org_") and internal Convex orgs
            orgId = user.orgIds[0];
        }
    }

    if (!orgId) {
        // User has no organization context.
        return null;
    }

    return {
        userId: identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
        orgId: orgId
    };
}

export async function requireAuth(ctx: any) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return identity;
}

export async function verifyProjectAccess(ctx: any, projectId: any) {
    const identity = await requireAuth(ctx);

    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    const user = await findUserByIdentity(ctx, identity);

    if (!user || !user.orgIds.includes(project.orgId)) {
        throw new Error("Unauthorized: You do not have access to this project.");
    }

    return { project, user, orgId: project.orgId, identity };
}

/**
 * Helper to find project by ID or Local ID across all user's organizations
 */
export async function getProjectSafe(ctx: any, projectIdOrLocalId: string) {
    const identity = await requireAuth(ctx);

    // 1. Try as Convex ID
    const normalizedId = ctx.db.normalizeId("projects", projectIdOrLocalId);
    if (normalizedId) {
        // Use verified access check
        const { project } = await verifyProjectAccess(ctx, normalizedId);
        return project;
    }

    // 2. Try as Local ID
    const user = await findUserByIdentity(ctx, identity);

    if (!user || !user.orgIds || user.orgIds.length === 0) return null;

    // Scan for project with this localId in one of the user's orgs
    const candidates = await ctx.db
        .query("projects")
        .withIndex("by_localId", (q: any) => q.eq("localId", projectIdOrLocalId))
        .collect();

    const accessibleProject = candidates.find((p: any) => user.orgIds.includes(p.orgId));

    return accessibleProject || null;
}
