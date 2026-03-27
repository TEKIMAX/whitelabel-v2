
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getCooperationStats = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const { projectId } = args;

        // Parallelize simple count queries
        const [
            allFeatures,
            allCompetitors,
            allDataSources,
            allDocuments,
            marketData,
            project,
            allCanvases,
            allGoals,
            allInterviews,
            allRevenueStreams,
            allCosts,
            allBusinessPlans,
            allCalendarEvents,
            allTeamMembers,
            allLegalDocs,
            bottomUpData,
        ] = await Promise.all([
            ctx.db.query("features").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("competitors").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("data_sources").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("documents").withIndex("by_project_type", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("market_data").withIndex("by_project", (q) => q.eq("projectId", projectId)).first(),
            ctx.db.get(projectId),
            ctx.db.query("canvases").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("goals").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("interviews").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("revenue_streams").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("costs").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("business_plans").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("calendar_events").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("team_members").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("legal_documents").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("bottom_up_data").withIndex("by_project", (q) => q.eq("projectId", projectId)).first(),
        ]);

        const WEIGHTS = {
            MACRO: 10,
            MID: 5,
            MICRO: 1
        };

        let humanCount = 0;
        let aiCount = 0;

        // Breakdown Analyzers
        const featureUsage: Record<string, { human: number, ai: number, weight: number }> = {};
        const tagCounts: Record<string, number> = {};

        const addAction = (name: string, isAI: boolean, weight: number) => {
            if (!featureUsage[name]) featureUsage[name] = { human: 0, ai: 0, weight: weight };
            if (isAI) {
                aiCount += weight;
                featureUsage[name].ai++;
            } else {
                humanCount += weight;
                featureUsage[name].human++;
            }
        };

        const processTags = (tags: any) => {
            if (!tags) return;
            if (Array.isArray(tags)) {
                tags.forEach((t: any) => {
                    const name = typeof t === 'string' ? t : t.name;
                    if (name) {
                        tagCounts[name] = (tagCounts[name] || 0) + 1;
                    }
                });
            }
        };

        const checkSource = (source: string | undefined, tags: any) => {
            const isAITag = Array.isArray(tags) && tags.some((t: any) => (typeof t === 'string' ? t : t.name) === 'AI Assisted');
            return source === 'AI' || isAITag;
        };

        // 1. Features (Priority Matrix) -> Micro
        allFeatures.forEach(f => {
            const isAI = checkSource(f.source, f.tags);
            addAction('Priority Matrix', isAI, WEIGHTS.MICRO);
            processTags(f.tags);
        });

        // 2. Competitors (Competitive Matrix) -> Micro
        allCompetitors.forEach(c => {
            const isAI = checkSource(c.source, c.tags);
            addAction('Competitive Matrix', isAI, WEIGHTS.MICRO);
            processTags(c.tags);
        });

        // 3. Data Sources -> Micro
        allDataSources.forEach(d => {
            const isAI = checkSource(d.source, d.tags);
            addAction('Data Sources', isAI, WEIGHTS.MICRO);
            processTags(d.tags);
        });

        // 4. Documents -> Mid
        allDocuments.forEach(d => {
            const isAI = checkSource(undefined, d.tags);
            addAction('Documents', isAI, WEIGHTS.MID);
            processTags(d.tags);
        });

        // 4b. Legal Documents -> Mid
        allLegalDocs.forEach(d => {
            const isAI = (d as any).source === 'AI';
            addAction('Legal Docs', isAI, WEIGHTS.MID);
        });

        // 5. Market Data (Top-Down Sizing) -> Macro
        if (marketData) {
            const isAI = checkSource(marketData.source, marketData.tags);
            addAction('Market Research', isAI, WEIGHTS.MACRO);
            processTags(marketData.tags);
            processTags(marketData.keywords);
        }

        // 5b. Bottom Up Data -> Macro
        if (bottomUpData) {
            const isAI = checkSource(bottomUpData.source, bottomUpData.tags);
            addAction('Bottom-Up Sizing', isAI, WEIGHTS.MACRO);
            processTags(bottomUpData.tags);
            processTags(bottomUpData.keywords);
        }

        // 6. Project-level fields
        if (project) {
            // Journey Story
            if (project.journeyStorySource) {
                const isAI = project.journeyStorySource === 'AI';
                addAction('Journey Story', isAI, WEIGHTS.MID);
            }

            // Milestones (inside project)
            if (project.milestones) {
                project.milestones.forEach((m: any) => {
                    const isAI = checkSource(m.source, m.tags);
                    addAction('Timeline', isAI, WEIGHTS.MICRO);
                    processTags(m.tags);
                });
            }

            // Operating Expenses (expenseLibrary inside project)
            if (project.expenseLibrary) {
                project.expenseLibrary.forEach((e: any) => {
                    const isAI = e.source === 'AI';
                    addAction('Operating Expenses', isAI, WEIGHTS.MICRO);
                });
            }
        }

        // 7. Business Model Canvas -> Macro
        allCanvases.forEach(c => {
            const isAI = (c as any).source === 'AI';
            addAction('Canvas', isAI, WEIGHTS.MACRO);
        });

        // 8. Goals & Objectives (OKRs) -> Mid
        allGoals.forEach(g => {
            const isAI = (g as any).source === 'AI';
            addAction('Goals & OKRs', isAI, WEIGHTS.MID);
        });

        // 9. Customer Discovery (Interviews) -> Micro
        allInterviews.forEach(i => {
            const isAI = (i as any).source === 'AI';
            addAction('Customer Discovery', isAI, WEIGHTS.MICRO);
        });

        // 10. Financial Forecast (Revenue Streams + Costs) -> Micro
        allRevenueStreams.forEach(r => {
            const isAI = (r as any).source === 'AI';
            addAction('Financial Forecast', isAI, WEIGHTS.MICRO);
        });
        allCosts.forEach(c => {
            const isAI = (c as any).source === 'AI';
            addAction('Financial Forecast', isAI, WEIGHTS.MICRO);
        });

        // 11. Business Plans -> Macro
        allBusinessPlans.forEach(bp => {
            const isAI = (bp as any).source === 'AI';
            addAction('Business Plan', isAI, WEIGHTS.MACRO);
        });

        // 12. Calendar -> Micro
        allCalendarEvents.forEach(e => {
            const isAI = (e as any).source === 'AI';
            addAction('Calendar', isAI, WEIGHTS.MICRO);
        });

        // 13. Team Members -> Mid
        allTeamMembers.forEach(t => {
            const isAI = (t as any).source === 'AI';
            addAction('Team / Roles', isAI, WEIGHTS.MID);
        });

        const total = humanCount + aiCount;
        const aiRatio = total > 0 ? (aiCount / total) * 100 : 0;
        const humanRatio = total > 0 ? (humanCount / total) * 100 : 0;

        return {
            humanCount,
            aiCount,
            total,
            aiRatio,
            humanRatio,
            featureUsage,
            tagCounts
        };
    }
});

// Time-series data for the Human vs AI cooperation graph
export const getCooperationTimeline = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const { projectId } = args;

        // Collect all items with timestamps and source info
        const [
            allFeatures,
            allCompetitors,
            allDataSources,
            allDocuments,
            marketData,
            project,
            allCanvases,
            allGoals,
            allInterviews,
            allRevenueStreams,
            allCosts,
            allBusinessPlans,
            allCalendarEvents,
            allTeamMembers,
            allLegalDocs,
            bottomUpData,
        ] = await Promise.all([
            ctx.db.query("features").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("competitors").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("data_sources").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("documents").withIndex("by_project_type", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("market_data").withIndex("by_project", (q) => q.eq("projectId", projectId)).first(),
            ctx.db.get(projectId),
            ctx.db.query("canvases").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("goals").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("interviews").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("revenue_streams").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("costs").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("business_plans").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("calendar_events").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("team_members").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("legal_documents").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect(),
            ctx.db.query("bottom_up_data").withIndex("by_project", (q) => q.eq("projectId", projectId)).first(),
        ]);

        const checkSource = (source: string | undefined, tags: any) => {
            const isAITag = Array.isArray(tags) && tags.some((t: any) => (typeof t === 'string' ? t : t.name) === 'AI Assisted');
            return source === 'AI' || isAITag;
        };

        // Build a flat list of {timestamp, isAI, feature}
        const events: { ts: number; isAI: boolean; feature: string }[] = [];

        allFeatures.forEach(f => events.push({ ts: f.createdAt || f._creationTime, isAI: checkSource(f.source, f.tags), feature: 'Priority Matrix' }));
        allCompetitors.forEach(c => events.push({ ts: c._creationTime, isAI: checkSource(c.source, c.tags), feature: 'Competitive Matrix' }));
        allDataSources.forEach(d => events.push({ ts: d.timestamp || d._creationTime, isAI: checkSource(d.source, d.tags), feature: 'Data Sources' }));
        allDocuments.forEach(d => events.push({ ts: d._creationTime, isAI: checkSource(undefined, d.tags), feature: 'Documents' }));
        allLegalDocs.forEach(d => events.push({ ts: d._creationTime, isAI: (d as any).source === 'AI', feature: 'Legal Docs' }));
        
        if (marketData) events.push({ ts: marketData._creationTime, isAI: checkSource(marketData.source, marketData.tags), feature: 'Market Research' });
        if (bottomUpData) events.push({ ts: bottomUpData._creationTime, isAI: checkSource(bottomUpData.source, bottomUpData.tags), feature: 'Bottom-Up Sizing' });
        
        allCanvases.forEach(c => events.push({ ts: c._creationTime, isAI: (c as any).source === 'AI', feature: 'Canvas' }));
        allGoals.forEach(g => events.push({ ts: g.createdAt || g._creationTime, isAI: (g as any).source === 'AI', feature: 'Goals & OKRs' }));
        allInterviews.forEach(i => events.push({ ts: i.createdAt || i._creationTime, isAI: (i as any).source === 'AI', feature: 'Customer Discovery' }));
        allRevenueStreams.forEach(r => events.push({ ts: r._creationTime, isAI: (r as any).source === 'AI', feature: 'Financial Forecast' }));
        allCosts.forEach(c => events.push({ ts: c._creationTime, isAI: (c as any).source === 'AI', feature: 'Financial Forecast' }));
        allBusinessPlans.forEach(bp => events.push({ ts: bp._creationTime, isAI: (bp as any).source === 'AI', feature: 'Business Plan' }));
        allCalendarEvents.forEach(e => events.push({ ts: e._creationTime, isAI: (e as any).source === 'AI', feature: 'Calendar' }));
        allTeamMembers.forEach(t => events.push({ ts: t._creationTime, isAI: (t as any).source === 'AI', feature: 'Team / Roles' }));

        if (project) {
            if (project.journeyStorySource) {
                events.push({ ts: project._creationTime, isAI: project.journeyStorySource === 'AI', feature: 'Journey Story' });
            }
            if (project.milestones) {
                project.milestones.forEach((m: any) => events.push({ ts: m.date || 0, isAI: checkSource(m.source, m.tags), feature: 'Timeline' }));
            }
            if (project.expenseLibrary) {
                project.expenseLibrary.forEach((e: any) => events.push({ ts: project._creationTime, isAI: e.source === 'AI', feature: 'Operating Expenses' }));
            }
        }

        // Sort by timestamp
        events.sort((a, b) => a.ts - b.ts);

        // Group into weeks
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const earliestTs = events.length > 0 ? events[0].ts : now - 12 * weekMs;
        const startWeek = Math.floor(earliestTs / weekMs);
        const endWeek = Math.floor(now / weekMs);

        const timeline: { week: string; human: number; ai: number; cumHuman: number; cumAI: number }[] = [];
        let cumHuman = 0;
        let cumAI = 0;

        for (let w = startWeek; w <= endWeek; w++) {
            const weekStart = w * weekMs;
            const weekEnd = weekStart + weekMs;
            const weekDate = new Date(weekStart);
            const label = `${weekDate.toLocaleString('en', { month: 'short' })} ${weekDate.getDate()}`;

            let weekHuman = 0;
            let weekAI = 0;

            events.forEach(e => {
                if (e.ts >= weekStart && e.ts < weekEnd) {
                    if (e.isAI) weekAI++;
                    else weekHuman++;
                }
            });

            cumHuman += weekHuman;
            cumAI += weekAI;

            timeline.push({
                week: label,
                human: weekHuman,
                ai: weekAI,
                cumHuman,
                cumAI,
            });
        }

        // Limit to last 12 weeks if too many
        const result = timeline.length > 12 ? timeline.slice(-12) : timeline;

        return result;
    }
});

export const getLatestReport = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("cooperation_reports")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .order("desc")
            .first();
    }
});

import { mutation } from "./_generated/server";

export const saveReport = mutation({
    args: {
        projectId: v.id("projects"),
        content: v.string(),
        stats: v.object({
            humanRatio: v.number(),
            aiRatio: v.number(),
            humanCount: v.number(),
            aiCount: v.number(),
        })
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const project = await ctx.db.get(args.projectId);
        if (!project) throw new Error("Project not found");

        return await ctx.db.insert("cooperation_reports", {
            projectId: args.projectId,
            orgId: project.orgId,
            content: args.content,
            stats: args.stats,
            createdAt: Date.now(),
            createdBy: identity.subject,
        });
    }
});
