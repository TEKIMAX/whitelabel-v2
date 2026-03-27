
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectSafe, requireAuth } from "./auth";

export const getEvents = query({
    args: { projectId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return [];

        const events = await ctx.db
            .query("calendar_events")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect();

        return events.map(e => ({ ...e, id: e._id }));
    }
});

export const addEvent = mutation({
    args: {
        projectId: v.string(),
        orgId: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        start: v.number(),
        end: v.number(),
        type: v.string(), // 'meeting', 'task', 'milestone', or custom
        customType: v.optional(v.string()),
        locationType: v.optional(v.string()), // 'in-person' | 'online'
        meetingUrl: v.optional(v.string()),
        allDay: v.boolean(),
        source: v.optional(v.string()), // 'AI' | 'Human'
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        const eventId = await ctx.db.insert("calendar_events", {
            projectId: project._id,
            orgId: project.orgId,
            title: args.title,
            description: args.description,
            start: args.start,
            end: args.end,
            type: args.type,
            customType: args.customType,
            locationType: args.locationType,
            meetingUrl: args.meetingUrl,
            allDay: args.allDay,
            source: args.source,
            createdAt: Date.now(),
        });

        return eventId;
    }
});

export const updateEvent = mutation({
    args: {
        id: v.id("calendar_events"),
        orgId: v.optional(v.string()),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        start: v.optional(v.number()),
        end: v.optional(v.number()),
        type: v.optional(v.string()),
        customType: v.optional(v.string()),
        locationType: v.optional(v.string()),
        meetingUrl: v.optional(v.string()),
        allDay: v.optional(v.boolean()),
        source: v.optional(v.string()), // 'AI' | 'Human'
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    }
});

export const deleteEvent = mutation({
    args: { id: v.id("calendar_events") },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        await ctx.db.delete(args.id);
    }
});
