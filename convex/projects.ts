import { v } from "convex/values";
import { mutation, query, internalMutation, action } from "./_generated/server";
import { WorkOS } from "@workos-inc/node";
import { internal } from "./_generated/api";
import { checkAuth } from "./auth";

// Auth Helper
// Auth Helper removed, using shared one from ./auth
import { internalQuery } from "./_generated/server";

export const getProjectInternal = internalQuery({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.projectId);
    }
});

// Internal mutation to create project and link to org
export const createInternal = internalMutation({
    args: {
        name: v.string(),
        hypothesis: v.string(),
        localId: v.optional(v.string()),
        orgId: v.string(),
        tokenIdentifier: v.string(), // User ID
        foundingDate: v.optional(v.number()),
        logo: v.optional(v.string()),
        businessStructure: v.optional(v.string()),
        industry: v.optional(v.string()),
        yearsInBusiness: v.optional(v.string()),
        organizationDetails: v.optional(v.string()),
        deploymentId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // 1. Get User — try exact tokenIdentifier first, then fallback for raw subject IDs
        let user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
            .unique();

        // Fallback: caller may have passed raw identity.subject (e.g. "user_01ABC...")
        // while the stored record uses prefixed format ("https://auth.tekimax.ai/...|user_01ABC...")
        if (!user) {
            const allUsers = await ctx.db.query("users").collect();
            user = allUsers.find((u) => u.tokenIdentifier.endsWith(`|${args.tokenIdentifier}`)) || null;
        }

        if (!user) throw new Error("User not found during project creation");

        // 2. Optimistically update User with new Org and Role (in case webhook lags)
        const updates: any = {};
        if (!user.orgIds.includes(args.orgId)) {
            updates.orgIds = [...user.orgIds, args.orgId];
        }

        const currentRoles = user.roles || [];
        if (!currentRoles.find((r: any) => r.orgId === args.orgId)) {
            updates.roles = [...currentRoles, { orgId: args.orgId, role: "Founder" }];
        }

        if (Object.keys(updates).length > 0) {
            await ctx.db.patch(user._id, updates);
        }

        // 3. Generate Slug
        let slug = args.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
        if (!slug) slug = "project";

        // Simple uniqueness check (append random if taken)
        const existing = await ctx.db.query("projects").withIndex("by_slug", q => q.eq("slug", slug)).first();
        if (existing) {
            slug = `${slug}-${Date.now().toString().slice(-4)}`;
        }

        // 3. Create Project
        const projectId = await ctx.db.insert("projects", {
            orgId: args.orgId,
            userId: args.tokenIdentifier,
            creatorId: user._id,
            orgFounderId: args.tokenIdentifier, // Recording the initial founder ID
            name: args.name,
            hypothesis: args.hypothesis,
            slug,
            localId: args.localId,
            updatedAt: Date.now(),
            status: "Active",
            foundingDate: args.foundingDate,
            logo: args.logo,
            businessStructure: args.businessStructure,
            organizationDetails: args.organizationDetails || (
                (args.industry || args.yearsInBusiness)
                    ? JSON.stringify({ industry: args.industry || '', yearsInBusiness: args.yearsInBusiness || '' })
                    : undefined
            ),
            deploymentId: args.deploymentId,
        });

        // 4. Create Default Canvas
        const canvasId = await ctx.db.insert("canvases", {
            projectId,
            orgId: args.orgId,
            name: "Main",
            updatedAt: Date.now()
        });

        // Link Canvas to Project
        await ctx.db.patch(projectId, { currentCanvasId: canvasId });

        // 5. Add creator to team members
        await ctx.db.insert("team_members", {
            projectId,
            orgId: args.orgId,
            name: user.name || "Founder",
            email: user.email || "",
            role: "Founder",
            joinedAt: Date.now(),
            pictureUrl: user.pictureUrl,
            acceptedRole: true,
            status: "Active"
        });

        return projectId;
    }
});

export const markDeleted = internalMutation({
    args: {
        projectId: v.id("projects"),
        orgId: v.string()
    },
    handler: async (ctx, args) => {
        // 1. Get Project to check for Logo
        const project = await ctx.db.get(args.projectId);
        if (project && project.logo && !project.logo.startsWith('http')) {
            try {
                await ctx.storage.delete(project.logo);
            } catch (e) {
            }
        }

        // 2. Mark Project as Deleted
        await ctx.db.patch(args.projectId, {
            status: "Deleted",
            deletedAt: Date.now()
        });

        // 3. Remove OrgId from all Users who have it
        // We can't query by array containment directly in all cases efficiently without an index, 
        // but for now we iterate users who have this orgId if we can, or just scan (might be slow).
        // Better: Assuming 'listByOrg' logic or similar.
        // Actually, we don't have an index on orgIds array elements natively exposed for filter here easily without defining it.
        // Let's use the 'users' table. We can scan for now or assume efficient enough.

        const users = await ctx.db.query("users").collect(); // Potentially slow, but reliable for cleanup

        for (const user of users) {
            let changed = false;
            let newOrgIds = user.orgIds;
            let newRoles = user.roles;

            if (user.orgIds.includes(args.orgId)) {
                newOrgIds = user.orgIds.filter(id => id !== args.orgId);
                changed = true;
            }

            if (user.roles) {
                const filteredRoles = user.roles.filter(r => r.orgId !== args.orgId);
                if (filteredRoles.length !== user.roles.length) {
                    newRoles = filteredRoles;
                    changed = true;
                }
            }

            if (changed) {
                await ctx.db.patch(user._id, {
                    orgIds: newOrgIds,
                    roles: newRoles
                });
            }
        }
    }
});

export const markOrgDeleted = internalMutation({
    args: {
        orgId: v.string()
    },
    handler: async (ctx, args) => {
        // 1. Find all projects for this org
        const projects = await ctx.db
            .query("projects")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();

        for (const project of projects) {
            // Mark project as deleted
            await ctx.db.patch(project._id, {
                status: "Deleted",
                deletedAt: Date.now()
            });

            // Delete logo if exists
            if (project.logo && !project.logo.startsWith('http')) {
                try {
                    await ctx.storage.delete(project.logo);
                } catch (e) {
                }
            }
        }

        // 2. Remove OrgId from all Users who have it
        const users = await ctx.db.query("users").collect();
        for (const user of users) {
            let changed = false;
            let newOrgIds = user.orgIds;
            let newRoles = user.roles;

            if (user.orgIds.includes(args.orgId)) {
                newOrgIds = user.orgIds.filter(id => id !== args.orgId);
                changed = true;
            }

            if (user.roles) {
                const filteredRoles = user.roles.filter(r => r.orgId !== args.orgId);
                if (filteredRoles.length !== user.roles.length) {
                    newRoles = filteredRoles;
                    changed = true;
                }
            }

            if (changed) {
                await ctx.db.patch(user._id, {
                    orgIds: newOrgIds,
                    roles: newRoles
                });
            }
        }
    }
});



export const list = query({
    args: {},
    handler: async (ctx) => {

        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }


        // Try tokenIdentifier first (matches users.store() format: "{issuer}|{subject}")
        let user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        // Fallback: try raw subject (for webhook-created users or legacy records)
        if (!user) {
            user = await ctx.db
                .query("users")
                .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
                .unique();
        }

        if (!user) {
            return [];
        }

        // 1. Filter Active Orgs (Exclude Pending)
        const activeOrgIds = (user.orgIds || []).filter(orgId => {
            // Check if specifically pending in roles (if we tracked it there)
            // or check if there is an invitation for this org
            const isPending = user.invitations?.some(i => i.orgId === orgId);
            if (isPending) return false;

            // Check status in roles if available (future proofing)
            // const roleEntry = user.roles?.find(r => r.orgId === orgId);
            // if (roleEntry?.status === 'pending') return false;

            return true;
        });

        // 2. Fetch Projects for Active Orgs
        const projectsOrPromises = activeOrgIds.map(orgId =>
            ctx.db
                .query("projects")
                .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
                .collect()
        );

        const projectsLists = await Promise.all(projectsOrPromises);
        const orgProjects = projectsLists.flat();

        // 2b. Fetch Projects created by me (Safety net for sync issues)
        const myProjects = await ctx.db
            .query("projects")
            .withIndex("by_creator", (q) => q.eq("userId", user.tokenIdentifier))
            .collect();

        // Dedup
        const projectMap = new Map();
        [...orgProjects, ...myProjects].forEach(p => projectMap.set(p._id, p));
        const projects = Array.from(projectMap.values()).filter((p: any) => p.status !== "Deleted");

        // Enrich with dashboard data
        const enrichedProjects = await Promise.all(projects.map(async (p) => {
            const teamMembers = await ctx.db
                .query("team_members")
                .withIndex("by_project", (q) => q.eq("projectId", p._id))
                .filter((q) => q.and(
                    q.neq(q.field("status"), "Deleted"),
                    q.neq(q.field("status"), "Revoked")
                ))
                .take(5); // Take first 5 for preview

            const interviewCount = (await ctx.db
                .query("interviews")
                .withIndex("by_project", (q) => q.eq("projectId", p._id))
                .collect()).length; // Optimization: use count() if available in future, currently collect().length

            const canvasVersions = await ctx.db
                .query("canvases")
                .withIndex("by_project", (q) => q.eq("projectId", p._id))
                .collect();

            const versionCount = canvasVersions.length;

            if (!p.slug) {
                // Lazy Generate Slug (In-Memory Only for now to prevent crash)
                // We cannot patch in a query. We will need a separate mutation to persist this.
                let slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
                if (!slug) slug = "project";
                p.slug = slug;
                // Note: This slug isn't saved yet, so public links won't resolve until backfilled.
            }

            // Resolve Logo URL (Storage ID or External)
            let logoUrl = p.logo;
            if (p.logo && !p.logo.startsWith('http')) {
                logoUrl = await ctx.storage.getUrl(p.logo) || undefined;
            }

            return {
                ...p,
                slug: p.slug, // Ensure explicit return
                logo: logoUrl,
                logoStorageId: p.logo, // Expose raw ID/URL for editing
                teamMembers,
                interviewCount,
                versionCount,
                canvasVersions: canvasVersions.map(v => ({ id: v._id, name: v.name, timestamp: v.updatedAt, data: {} }))
            };
        }));

        // 3. Create Pseudo-Projects for Invitations
        const invitationProjects = (user.invitations || []).map((inv: any) => ({
            _id: `invite-${inv.orgId}`,
            orgId: inv.orgId,
            name: inv.orgName || "Pending Invitation", // Fallback name
            hypothesis: "You have been invited to join this organization.",
            _creationTime: inv.date || Date.now(),
            updatedAt: inv.date || Date.now(),
            teamMembers: [],
            interviewCount: 0,
            versionCount: 0,
            canvasVersions: [],
            isPending: true,
            invitationData: {
                id: inv.id, // Pass ID
                orgName: inv.orgName,
                inviterName: inv.inviterName,
                acceptUrl: inv.acceptUrl,
                token: inv.token,
                date: inv.date,
                email: user.email
            },
            // Defaults to satisfy type
            currentCanvasId: undefined,
            canvas: {}, // Empty
            deckVersions: [],
            customerInterviews: [],
            features: [],
            revenueModel: {},
            market: {},
            competitorAnalysis: {},
            dataSources: [],
            goals: [],
            equityContributions: [],
            safeAgreement: undefined,
            canvasEnabled: false,
            marketResearchEnabled: false
        }));

        return [...invitationProjects, ...enrichedProjects];
    }
});




import { verifyProjectAccess, requireAuth } from "./auth";

/** ... imports ... */

/** ... previous code ... */

export const get = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        // Inline access check — returns null instead of throwing (Convex catches thrown errors before JS try-catch)
        const project: any = await ctx.db.get(args.projectId);
        if (!project) return null;

        let user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!user) {
            user = await ctx.db
                .query("users")
                .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
                .unique();
        }
        if (!user || !user.orgIds.includes(project.orgId)) return null;

        const orgId = project.orgId;

        // Fetch Active Canvas
        let activeCanvas: any = null;
        if (project.currentCanvasId) {
            activeCanvas = await ctx.db.get(project.currentCanvasId);
        } else {
            // Fallback: Try to find "Main" or first canvas
            activeCanvas = await ctx.db
                .query("canvases")
                .withIndex("by_project", (q) => q.eq("projectId", project._id))
                .first();
        }

        // Map fields to frontend format (from active canvas or project fallback)
        const canvas: Record<string, string> = {
            "Problem": activeCanvas?.problem || project.problem || "",
            "Customer Segments": activeCanvas?.customerSegments || project.customerSegments || "",
            "Unique Value Proposition": activeCanvas?.uniqueValueProposition || project.uniqueValueProposition || "",
            "Solution": activeCanvas?.solution || project.solution || "",
            "Unfair Advantage": activeCanvas?.unfairAdvantage || project.unfairAdvantage || "",
            "Revenue Streams": activeCanvas?.revenueStreams || project.revenueStreams || "",
            "Cost Structure": activeCanvas?.costStructure || project.costStructure || "",
            "Key Metrics": activeCanvas?.keyMetrics || project.keyMetrics || "",
            "Channels": activeCanvas?.channels || project.channels || ""
        };

        const teamMembers = await ctx.db
            .query("team_members")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect();

        // Fetch all canvases (versions)
        const canvases = await ctx.db
            .query("canvases")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect();

        // Fetch Market Data
        const marketData = await ctx.db
            .query("market_data")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .first();

        // Fetch Bottom-Up Data
        const bottomUpData = await ctx.db
            .query("bottom_up_data")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .first();

        // Fetch Competitor Data
        const competitorConfig = await ctx.db
            .query("competitor_config")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .first();

        const competitors = await ctx.db
            .query("competitors")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect();

        const interviews = await ctx.db
            .query("interviews")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect();

        return {
            id: project._id,
            orgId: project.orgId,
            name: project.name,
            hypothesis: project.hypothesis,
            createdAt: project._creationTime,
            lastModified: project.updatedAt,
            currentCanvasId: project.currentCanvasId || activeCanvas?._id,
            canvas,
            canvasVersions: canvases.map(c => ({
                id: c._id,
                name: c.name,
                timestamp: c.updatedAt,
                data: {
                    "Problem": c.problem || "",
                    "Customer Segments": c.customerSegments || "",
                    "Unique Value Proposition": c.uniqueValueProposition || "",
                    "Solution": c.solution || "",
                    "Unfair Advantage": c.unfairAdvantage || "",
                    "Revenue Streams": c.revenueStreams || "",
                    "Cost Structure": c.costStructure || "",
                    "Key Metrics": c.keyMetrics || "",
                    "Channels": c.channels || ""
                }
            })),
            deckVersions: [], // Todo: fetch
            customerInterviews: interviews.map(i => {
                const custom = JSON.parse(i.customData || "{}");
                return {
                    id: i._id,
                    customerStatus: i.customerStatus,
                    sentiment: i.sentiment,
                    aiAnalysis: i.aiAnalysis,
                    ...custom
                };
            }),
            features: (await ctx.db
                .query("features")
                .withIndex("by_project", (q) => q.eq("projectId", project._id))
                .collect()).map(f => ({
                    ...f,
                    id: f._id
                })),
            revenueModel: {
                businessModelType: 'SaaS',
                modelDescription: '',
                startingUsers: 0,
                monthlyGrowthRate: 0,
                churnRate: 0,
                cac: 0,
                revenueStreams: (await ctx.db
                    .query("revenue_streams")
                    .withIndex("by_project", (q) => q.eq("projectId", project._id))
                    .collect()).map(s => ({ ...s, id: s._id })),
                costStructure: (await ctx.db
                    .query("costs")
                    .withIndex("by_project", (q) => q.eq("projectId", project._id))
                    .collect()).map(c => ({ ...c, id: c._id })),
                ...JSON.parse(project.revenueModelSettings || "{}")
            },
            revenueModelVersions: project.revenueModelVersions ? JSON.parse(project.revenueModelVersions) : [],
            currentRevenueModelId: project.currentRevenueModelId,
            market: marketData ? {
                tam: marketData.tam,
                sam: marketData.sam,
                som: marketData.som,
                reportContent: marketData.reportContent,
                keywords: marketData.keywords || [],
                tags: marketData.tags || [],
                creatorProfile: marketData.creatorProfile,
                source: marketData.source,
                status: marketData.status,
                updatedAt: marketData.updatedAt
            } : { tam: 0, sam: 0, som: 0, reportContent: '', keywords: [], tags: [] },
            marketVersions: [],
            bottomUpSizing: bottomUpData ? {
                tam: bottomUpData.tam,
                sam: bottomUpData.sam,
                som: bottomUpData.som,
                reportContent: bottomUpData.reportContent,
                keywords: bottomUpData.keywords || [],
                tags: bottomUpData.tags || [],
                creatorProfile: bottomUpData.creatorProfile,
                source: bottomUpData.source,
                workflowId: bottomUpData.workflowId,
                status: bottomUpData.status,
                updatedAt: bottomUpData.updatedAt
            } : { tam: 0, sam: 0, som: 0, reportContent: '', keywords: [], tags: [] },
            competitorAnalysis: {
                attributes: competitorConfig?.attributes || ['Price', 'Features'],
                analysisSummary: competitorConfig?.analysisSummary || '',
                competitors: competitors.map(c => ({
                    id: c._id,
                    name: c.name,
                    ...JSON.parse(c.attributesData)
                }))
            },
            whitePaperContent: project.whitePaperContent || '',
            businessPlanContent: project.businessPlanContent || '',
            customerDiscoveryTitle: project.customerDiscoveryTitle || "Customer Discovery",

            dataSources: [],
            teamMembers: teamMembers.map((m: any) => ({
                id: m._id,
                name: m.name,
                email: m.email,
                role: m.role,
                pictureUrl: m.pictureUrl,
                allowedPages: m.allowedPages,
                status: m.status,
                acceptedRole: m.acceptedRole,
            })),
            safeAgreement: project.safeAgreement ? JSON.parse(project.safeAgreement) : {
                amountRaising: 0,
                valuationCap: 0,
                discountRate: 20,
                postMoney: true,
                proRataRights: false,
                companyAddress: '',
                stateOfIncorporation: 'Delaware',
                repName: '',
            },
            goals: await Promise.all((await ctx.db
                .query("goals")
                .withIndex("by_project", (q) => q.eq("projectId", project._id))
                .collect()).map(async (g) => {
                    const krs = await ctx.db
                        .query("key_results")
                        .withIndex("by_goal", (q) => q.eq("goalId", g._id))
                        .collect();
                    return {
                        ...g,
                        id: g._id,
                        keyResults: krs.map((k) => ({ ...k, id: k._id }))
                    };
                })),
            equityContributions: project.equityContributions ? JSON.parse(project.equityContributions) : [],
            businessStructure: project.businessStructure,
            organizationDetails: project.organizationDetails,
            canvasEnabled: project.canvasEnabled,
            marketResearchEnabled: project.marketResearchEnabled,
            milestones: project.milestones || [],
            journeyStoryContent: project.journeyStoryContent,
            journeyStoryVersions: project.journeyStoryVersions || [],
            journeyStorySource: project.journeyStorySource,
            foundingDate: project.foundingDate,
            stripeAccountId: project.stripeAccountId,
            stripeConnectedAt: project.stripeConnectedAt,
            stripeData: project.stripeData ? JSON.parse(project.stripeData) : null,
            expenseLibrary: project.expenseLibrary || [],
            targetHumanRatio: project.targetHumanRatio,
        };
    }
});

export const saveStripeAccount = internalMutation({
    args: {
        projectId: v.string(), // ID or Local ID
        stripeAccountId: v.string(),
        stripeData: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        // We use internal mutation so we bypass RBAC check here? 
        // Or we should verify. Since it's internal called by Action which verifies auth, it's okay.
        // But Action args.projectId might be loose.

        // Resolve ID
        const project = await ctx.db.normalizeId("projects", args.projectId)
            ? await ctx.db.get(args.projectId as any)
            : await ctx.db.query("projects").withIndex("by_localId", q => q.eq("localId", args.projectId)).first();

        if (!project) throw new Error("Project not found");

        await ctx.db.patch(project._id, {
            stripeAccountId: args.stripeAccountId,
            stripeConnectedAt: Date.now(),
            ...(args.stripeData && { stripeData: args.stripeData })
        });
    }
});

export const update = mutation({
    args: {
        id: v.id("projects"),
        updates: v.object({
            name: v.optional(v.string()),
            logo: v.optional(v.string()),
            hypothesis: v.optional(v.string()),
            revenueModelSettings: v.optional(v.string()),
            whitePaperContent: v.optional(v.string()),
            businessPlanContent: v.optional(v.string()),
            capTableScenarios: v.optional(v.string()),
            customerDiscoveryTitle: v.optional(v.string()),

            safeAgreement: v.optional(v.string()),
            equityContributions: v.optional(v.string()),

            canvasEnabled: v.optional(v.boolean()),
            marketResearchEnabled: v.optional(v.boolean()),
            revenueModelVersions: v.optional(v.string()),
            currentRevenueModelId: v.optional(v.string()),
            vestingSettings: v.optional(v.string()),
            totalShares: v.optional(v.number()),
            targetHumanRatio: v.optional(v.number()),

            milestones: v.optional(v.array(v.object({
                id: v.string(),
                title: v.string(),
                date: v.number(),
                type: v.string(),
                description: v.string(),
                isMonumental: v.boolean(),
                isFeatured: v.optional(v.boolean()),
                tags: v.optional(v.array(v.string())),
                imageUrl: v.optional(v.string()),
                tractionType: v.optional(v.string()),
                theme: v.optional(v.string()),
                documents: v.optional(v.array(v.object({
                    id: v.string(),
                    name: v.string(),
                    type: v.string(),
                    url: v.optional(v.string())
                }))),
                creatorProfile: v.optional(v.object({
                    name: v.string(),
                    avatarUrl: v.optional(v.string()),
                    userId: v.string()
                })),
                source: v.optional(v.string())
            }))),
            journeyStoryContent: v.optional(v.string()),
            journeyStoryVersions: v.optional(v.array(v.object({
                id: v.string(),
                content: v.string(),
                createdAt: v.number(),
                name: v.optional(v.string())
            }))),
            journeyStorySource: v.optional(v.string()),
            foundingDate: v.optional(v.number()),

            expenseLibrary: v.optional(v.array(v.object({
                id: v.string(),
                name: v.string(),
                amount: v.number(),
                frequency: v.string(),
                category: v.optional(v.string()),
                growthRate: v.optional(v.number()),
                source: v.optional(v.string())
            }))),

            // Blog Settings
            blogSettings: v.optional(v.object({
                title: v.optional(v.string()),
                description: v.optional(v.string()),
                coverImage: v.optional(v.string()),
                themeColor: v.optional(v.string()),
                sidebarTextColor: v.optional(v.string()),
                mainHeroImage: v.optional(v.string())
            })),

            // AI Frequencies
            strategyFrequencyDays: v.optional(v.number()),
            memoFrequencyDays: v.optional(v.number()),
            lastStrategyGeneratedAt: v.optional(v.number())
        })
    },
    handler: async (ctx, args) => {
        // Verify access to the project before updating
        const { user, orgId } = await verifyProjectAccess(ctx, args.id);

        // Enforce RBAC: Only 'Founder' or 'Admin' can update project details
        const userRole = user.roles?.find((r: any) => r.orgId === orgId)?.role;
        if (!userRole || !['Founder', 'Admin'].includes(userRole)) {
            throw new Error("Unauthorized: Only Admins or Founders can edit project settings.");
        }

        // Handle Logo Deletion on Update
        if (args.updates.logo !== undefined) {
            const currentProject = await ctx.db.get(args.id);
            if (currentProject && currentProject.logo && !currentProject.logo.startsWith('http') && currentProject.logo !== args.updates.logo) {
                try {
                    await ctx.storage.delete(currentProject.logo);
                } catch (e) {
                }
            }
        }

        // Apply updates with audit tracking
        await ctx.db.patch(args.id, {
            ...args.updates,
            updatedAt: Date.now(),
            updatedBy: user.tokenIdentifier // Track who made this change
        });

        // Log to Activity Log
        const project = await ctx.db.get(args.id);
        await ctx.db.insert("activity_log", {
            projectId: args.id,
            orgId,
            userId: user.tokenIdentifier,
            userName: user.name || "Unknown",
            action: "UPDATE",
            entityType: "project",
            entityId: args.id as string,
            entityName: project?.name || "Project",
            changes: JSON.stringify(Object.keys(args.updates)),
            timestamp: Date.now()
        });

        // Webhook Trigger: journey.milestone_updated
        if (args.updates.milestones) {
            const webhooks = await ctx.db
                .query("webhooks")
                .withIndex("by_org", (q) => q.eq("orgId", orgId))
                .filter((q) => q.eq(q.field("isActive"), true))
                .collect();

            for (const webhook of webhooks) {
                if (webhook.eventTypes.includes("journey.milestone_updated") || webhook.eventTypes.includes("all")) {
                    await ctx.scheduler.runAfter(0, internal.webhooks.dispatchWebhook, {
                        webhookId: webhook._id,
                        url: webhook.url,
                        vaultSecretId: webhook.vaultSecretId,
                        eventType: "journey.milestone_updated",
                        payload: {
                            projectId: args.id,
                            orgId,
                            milestones: args.updates.milestones,
                            action: "updated",
                            timestamp: Date.now()
                        }
                    });
                }
            }
        }
    }
});

export const migratePersonalProjects = mutation({
    args: { targetOrgId: v.string() },
    handler: async (ctx, args) => {
        const auth = await checkAuth(ctx);
        if (!auth) throw new Error("Unauthenticated");
        const { userId } = auth;

        // Find all projects where orgId is "personal" and userId matches
        const personalProjects = await ctx.db
            .query("projects")
            .withIndex("by_org", (q) => q.eq("orgId", "personal"))
            .filter((q) => q.eq(q.field("userId"), userId))
            .collect();

        for (const project of personalProjects) {
            await ctx.db.patch(project._id, { orgId: args.targetOrgId });

            // Update team_members
            const teamMembers = await ctx.db
                .query("team_members")
                .withIndex("by_project", (q) => q.eq("projectId", project._id))
                .collect();

            for (const member of teamMembers) {
                await ctx.db.patch(member._id, { orgId: args.targetOrgId });
            }
        }
    }
});

export const backfillProjectSlugs = mutation({
    args: {},
    handler: async (ctx) => {
        const projects = await ctx.db.query("projects").collect();
        for (const p of projects) {
            if (!p.slug) {
                let slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
                if (!slug) slug = "project";

                const existing = await ctx.db.query("projects").withIndex("by_slug", q => q.eq("slug", slug)).first();
                if (existing && existing._id !== p._id) {
                    slug = `${slug}-${Date.now().toString().slice(-4)}`;
                }
                await ctx.db.patch(p._id, { slug });
            }
        }
    }
});

export const getPublicBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const project = await ctx.db
            .query("projects")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (!project) return null;

        return {
            _id: project._id,
            name: project.name,
            slug: project.slug,
            orgId: project.orgId,
            blogSettings: project.blogSettings,
        };
    }
});

export const updateFinancialSnapshot = mutation({
    args: {
        projectId: v.id("projects"),
        cac: v.number(),
        ltv: v.number(),
        arpu: v.number(),
        revenue: v.string(),
        burnRate: v.string(),
        margin: v.string(),
        signature: v.optional(v.string()),
        publicKey: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { project, orgId, user } = await verifyProjectAccess(ctx, args.projectId);

        const settings = JSON.parse(project.revenueModelSettings || "{}");
        const updatedSettings = {
            ...settings,
            cac: args.cac,
            ltv: args.ltv,
            arpu: args.arpu,
            revenue: args.revenue,
            burnRate: args.burnRate,
            margin: args.margin,
            updatedAt: Date.now()
        };

        await ctx.db.patch(args.projectId, {
            revenueModelSettings: JSON.stringify(updatedSettings),
            updatedAt: Date.now()
        });

        // Log Activity with Signature
        await ctx.db.insert("activity_log", {
            projectId: args.projectId,
            orgId,
            userId: user.tokenIdentifier,
            userName: user.name || "Unknown User",
            action: "UPDATE",
            entityType: "financial_model",
            entityId: args.projectId as string,
            entityName: "Financial Snapshot",
            changes: "Updated financial metrics via AI Suggestion",
            signature: args.signature,
            publicKey: args.publicKey,
            timestamp: Date.now()
        });
    }
});
