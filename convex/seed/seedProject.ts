import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import {
    PROJECT, CANVAS, GOALS, TEAM_MEMBERS,
    FEATURES, REVENUE_STREAMS, COSTS,
    INTERVIEWS, SCHEDULES,
} from "./exampleVenture";

const SEED_PROJECT_NAME = PROJECT.name; // "Adaptive Whitelabel Platform"

/**
 * Check if seed data exists for the current user.
 */
export const isSeedActive = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return false;
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        return user?.hasSeedData === true;
    },
});

/**
 * Seed an example project with all related data.
 * Sets hasSeedData + seedProjectId on the user record.
 */
export const seedExampleProject = mutation({
    args: {
        orgId: v.string(),
        userId: v.string(),
    },
    handler: async (ctx, { orgId, userId }) => {
        const now = Date.now();

        // 1. Create the project
        const projectId = await ctx.db.insert("projects", {
            orgId,
            userId,
            name: PROJECT.name,
            hypothesis: PROJECT.hypothesis,
            foundingDate: PROJECT.foundingDate,
            revenueModelSettings: PROJECT.revenueModelSettings,
            milestones: PROJECT.milestones,
            expenseLibrary: PROJECT.expenseLibrary,
            updatedAt: now,
            status: "Active",
        });

        // 2. Create the Lean Canvas
        const canvasId = await ctx.db.insert("canvases", {
            projectId,
            orgId,
            name: CANVAS.name,
            problem: CANVAS.problem,
            solution: CANVAS.solution,
            uniqueValueProposition: CANVAS.uniqueValueProposition,
            unfairAdvantage: CANVAS.unfairAdvantage,
            customerSegments: CANVAS.customerSegments,
            keyMetrics: CANVAS.keyMetrics,
            channels: CANVAS.channels,
            costStructure: CANVAS.costStructure,
            revenueStreams: CANVAS.revenueStreams,
            source: "Human",
            updatedAt: now,
        });

        // Point project → canvas
        await ctx.db.patch(projectId, { currentCanvasId: canvasId });

        // 3. Create OKRs (Goals + Key Results)
        for (const goal of GOALS) {
            const { keyResults, ...goalData } = goal;
            const goalId = await ctx.db.insert("goals", {
                projectId,
                orgId,
                ...goalData,
                source: "Human",
                createdAt: now,
            });

            for (const kr of keyResults) {
                await ctx.db.insert("key_results", {
                    goalId,
                    projectId,
                    description: kr.description,
                    target: kr.target,
                    current: kr.current,
                    unit: kr.unit,
                    status: kr.status,
                });
            }
        }

        // 4. Create Team Members
        for (const member of TEAM_MEMBERS) {
            await ctx.db.insert("team_members", {
                projectId,
                orgId,
                name: member.name,
                email: member.email,
                role: member.role,
                education: member.education,
                status: member.status,
                joinedAt: now,
                source: "Human",
            });
        }

        // 5. Create Features (Priority Matrix)
        for (const feature of FEATURES) {
            await ctx.db.insert("features", {
                projectId,
                orgId,
                title: feature.title,
                description: feature.description,
                status: feature.status,
                priority: feature.priority,
                eisenhowerQuadrant: feature.eisenhowerQuadrant,
                tags: feature.tags,
                source: "Human",
                createdAt: now,
            });
        }

        // 6. Revenue Streams
        for (const stream of REVENUE_STREAMS) {
            await ctx.db.insert("revenue_streams", {
                projectId,
                orgId,
                name: stream.name,
                price: stream.price,
                frequency: stream.frequency,
                source: "Human",
            });
        }

        // 7. Costs
        for (const cost of COSTS) {
            await ctx.db.insert("costs", {
                projectId,
                orgId,
                name: cost.name,
                amount: cost.amount,
                frequency: cost.frequency,
                source: "Human",
            });
        }

        // 8. Customer Interviews
        for (const interview of INTERVIEWS) {
            await ctx.db.insert("interviews", {
                projectId,
                orgId,
                customerStatus: interview.customerStatus,
                willingnessToPay: interview.willingnessToPay,
                sentiment: interview.sentiment,
                customData: interview.customData,
                tags: interview.tags,
                segment: interview.segment,
                churnRisk: interview.churnRisk,
                source: "Human",
                createdAt: now,
            });
        }

        // 9. Upcoming Meetings / Schedules
        for (const sched of SCHEDULES) {
            const scheduledAt = now + sched.daysFromNow * 24 * 60 * 60 * 1000;
            await ctx.db.insert("interview_schedules", {
                projectId,
                orgId,
                title: sched.title,
                description: sched.description,
                scheduledAt,
                duration: sched.duration,
                status: sched.status,
                createdAt: now,
            });
        }

        // 10. Mark user as having seed data + ensure orgId is in user's orgIds
        const identity = await ctx.auth.getUserIdentity();
        if (identity) {
            const user = await ctx.db
                .query("users")
                .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
                .unique();
            if (user) {
                const updates: any = {
                    hasSeedData: true,
                    seedProjectId: projectId,
                };
                // Ensure the orgId is in the user's orgIds array
                if (!user.orgIds.includes(orgId)) {
                    updates.orgIds = [...user.orgIds, orgId];
                }
                // Ensure the user has a role for this org
                const currentRoles = user.roles || [];
                if (!currentRoles.find((r: any) => r.orgId === orgId)) {
                    updates.roles = [...currentRoles, { orgId, role: "Founder" }];
                }
                await ctx.db.patch(user._id, updates);
            }
        }

        return { projectId, name: PROJECT.name };
    },
});

/**
 * Cascade delete ALL seed data.
 * Removes the seeded project + all child records across every table.
 */
export const deleteSeedData = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!user || !user.seedProjectId) throw new Error("No seed data found");

        const projectId = user.seedProjectId as any;
        const deleted: Record<string, number> = {};

        // Helper: delete all docs in a table matching projectId via by_project index
        const cascade = async (table: string, indexName = "by_project") => {
            try {
                const docs = await ctx.db
                    .query(table as any)
                    .withIndex(indexName, (q: any) => q.eq("projectId", projectId))
                    .collect();
                for (const doc of docs) {
                    await ctx.db.delete(doc._id);
                }
                deleted[table] = docs.length;
            } catch {
                // Index doesn't exist — skip this table
                deleted[table] = 0;
            }
        };

        // Delete key_results first (needs goalIds)
        const goals = await ctx.db
            .query("goals")
            .withIndex("by_project", (q) => q.eq("projectId", projectId))
            .collect();
        let krCount = 0;
        for (const goal of goals) {
            const krs = await ctx.db
                .query("key_results")
                .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
                .collect();
            for (const kr of krs) {
                await ctx.db.delete(kr._id);
            }
            krCount += krs.length;
        }
        deleted["key_results"] = krCount;

        // Cascade tables with standard by_project index
        await cascade("canvases");
        await cascade("goals");
        await cascade("team_members");
        await cascade("features");
        await cascade("revenue_streams");
        await cascade("costs");
        await cascade("interviews");
        await cascade("interview_schedules");
        await cascade("competitors");
        await cascade("market_data");
        await cascade("bottom_up_data");
        await cascade("deck_slides");

        // documents uses by_project_type (no plain by_project)
        await cascade("documents", "by_project_type");

        // Delete the project itself
        const project = await ctx.db.get(projectId);
        if (project) {
            await ctx.db.delete(project._id);
            deleted["projects"] = 1;
        }

        // Clear seed flags on user
        await ctx.db.patch(user._id, {
            hasSeedData: false,
            seedProjectId: undefined,
        });

        return deleted;
    },
});
