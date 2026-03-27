
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectSafe, requireAuth, verifyProjectAccess, findUserByIdentity } from "./auth";

export const getInterviews = query({
    args: { projectId: v.string() }, // localId
    handler: async (ctx: any, args: any) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return [];

        const records = await ctx.db
            .query("interviews")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .collect();

        // Flatten for frontend
        return records.map((r: any) => {
            const custom = JSON.parse(r.customData || "{}");
            // Map schema field to display key for frontend compatibility
            if (r.willingnessToPay) {
                custom['Willingness to Pay ($)'] = r.willingnessToPay;
            }
            return {
                id: r._id,
                customerStatus: r.customerStatus,
                sentiment: r.sentiment,
                aiAnalysis: r.aiAnalysis,
                willingnessToPay: r.willingnessToPay,
                tags: r.tags || [],
                segment: r.segment,
                churnRisk: r.churnRisk,
                lastContactAt: r.lastContactAt,
                nextFollowUpAt: r.nextFollowUpAt,
                createdAt: r.createdAt,
                ...custom // Spread dynamic fields (Name, Role, etc.)
            };
        });
    },
});

export const addInterview = mutation({
    args: {
        projectId: v.string(), // localId
        customerStatus: v.string(),
        customData: v.string(), // JSON
        willingnessToPay: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        segment: v.optional(v.string()),
        churnRisk: v.optional(v.string()),
        lastContactAt: v.optional(v.number()),
        nextFollowUpAt: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);

        if (!project) {
            throw new Error("Project not found");
        }

        const newId = await ctx.db.insert("interviews", {
            projectId: project._id,
            orgId: project.orgId,
            customerStatus: args.customerStatus,
            customData: args.customData,
            willingnessToPay: args.willingnessToPay,
            tags: args.tags,
            segment: args.segment,
            churnRisk: args.churnRisk,
            lastContactAt: args.lastContactAt,
            nextFollowUpAt: args.nextFollowUpAt,
            createdAt: Date.now()
        });
        return newId;
    }
});

export const updateInterview = mutation({
    args: {
        id: v.id("interviews"),
        customerStatus: v.optional(v.string()),
        sentiment: v.optional(v.string()),
        aiAnalysis: v.optional(v.string()),
        customData: v.optional(v.string()),
        willingnessToPay: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        segment: v.optional(v.string()),
        churnRisk: v.optional(v.string()),
        lastContactAt: v.optional(v.number()),
        nextFollowUpAt: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const { id, ...fields } = args;
        const record = await ctx.db.get(id);
        if (!record) return;

        const user = await findUserByIdentity(ctx, identity);

        if (!user || !user.orgIds.includes(record.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(id, fields);
    }
});

export const deleteInterview = mutation({
    args: { id: v.id("interviews") },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const record = await ctx.db.get(args.id);
        if (!record) return;

        const user = await findUserByIdentity(ctx, identity);

        if (!user || !user.orgIds.includes(record.orgId)) {
            throw new Error("Unauthorized");
        }
        await ctx.db.delete(args.id);
    }
});

// --- Video Interview Logic ---

export const generateUploadUrl = mutation(async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
});

export const saveVideoInterview = mutation({
    args: {
        projectId: v.string(), // localId
        name: v.string(),
        email: v.string(),
        waiverFileId: v.optional(v.id("_storage")),
        videoFileId: v.optional(v.id("_storage")),
        linkedInterviewId: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);

        if (!project) throw new Error("Project not found");

        await ctx.db.insert("video_interviews", {
            projectId: project._id,
            orgId: project.orgId,
            name: args.name,
            email: args.email,
            waiverFileId: args.waiverFileId,
            videoFileId: args.videoFileId,
            linkedInterviewId: args.linkedInterviewId,
            createdAt: Date.now()
        });
    }
});

export const getVideoInterviews = query({
    args: { projectId: v.string() }, // localId or _id
    handler: async (ctx: any, args: any) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return [];

        const interviews = await ctx.db
            .query("video_interviews")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .filter((q: any) => q.eq(q.field("orgId"), project.orgId)) // Redundant if by_project is enough but safe
            .collect();

        // Enhance with URLs
        return await Promise.all(interviews.map(async (i: any) => ({
            ...i,
            waiverUrl: i.waiverFileId ? await ctx.storage.getUrl(i.waiverFileId) : null,
            videoUrl: i.videoFileId ? await ctx.storage.getUrl(i.videoFileId) : null
        })));
    }
});

export const deleteVideoInterview = mutation({
    args: { id: v.id("video_interviews") },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const interview = await ctx.db.get(args.id);
        if (!interview) return;

        const user = await findUserByIdentity(ctx, identity);

        if (!user || !user.orgIds.includes(interview.orgId)) {
            throw new Error("Unauthorized");
        }

        if (interview.waiverFileId) await ctx.storage.delete(interview.waiverFileId);
        if (interview.videoFileId) await ctx.storage.delete(interview.videoFileId);
        await ctx.db.delete(args.id);
    }
});

export const updateVideoInterview = mutation({
    args: {
        id: v.id("video_interviews"),
        linkedInterviewId: v.optional(v.string()),
        videoFileId: v.optional(v.id("_storage")),
        waiverFileId: v.optional(v.id("_storage"))
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const { id, ...fields } = args;
        const record = await ctx.db.get(id);
        if (!record) return;

        const user = await findUserByIdentity(ctx, identity);

        if (!user || !user.orgIds.includes(record.orgId)) {
            throw new Error("Unauthorized");
        }

        // Cleanup old files if being replaced
        if (args.videoFileId && record.videoFileId && args.videoFileId !== record.videoFileId) {
            await ctx.storage.delete(record.videoFileId);
        }
        if (args.waiverFileId && record.waiverFileId && args.waiverFileId !== record.waiverFileId) {
            await ctx.storage.delete(record.waiverFileId);
        }

        await ctx.db.patch(id, fields);
    }
});

export const bulkAddInterviews = mutation({
    args: {
        projectId: v.string(),
        interviews: v.array(v.object({
            customerStatus: v.string(),
            customData: v.string(),
            willingnessToPay: v.optional(v.string())
        })),
        signature: v.optional(v.string()),
        publicKey: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        await Promise.all(args.interviews.map((i: any) =>
            ctx.db.insert("interviews", {
                projectId: project._id,
                orgId: project.orgId,
                customerStatus: i.customerStatus,
                customData: i.customData,
                willingnessToPay: i.willingnessToPay,
                createdAt: Date.now()
            })
        ));

        // Log Activity with Signature
        const user = await findUserByIdentity(ctx, identity);

        await ctx.db.insert("activity_log", {
            projectId: project._id,
            orgId: project.orgId,
            userId: identity.subject,
            userName: user?.name || "Unknown User",
            action: "CREATE",
            entityType: "customer_profiles",
            entityId: project._id, // Associated with project
            entityName: `${args.interviews.length} Customer Profiles`,
            changes: `Created ${args.interviews.length} customer profiles via AI Suggestion`,
            signature: args.signature,
            publicKey: args.publicKey,
            timestamp: Date.now()
        });
    }
});

export const bulkDeleteInterviews = mutation({
    args: { ids: v.array(v.id("interviews")) },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const user = await findUserByIdentity(ctx, identity);

        if (!user) throw new Error("Unauthorized");

        await Promise.all(args.ids.map(async (id: any) => {
            const record = await ctx.db.get(id);
            if (record && user.orgIds.includes(record.orgId)) {
                await ctx.db.delete(id);
            }
        }));
    }
});

// Update interview with tags/segment/churn
export const updateInterviewTags = mutation({
    args: {
        id: v.id("interviews"),
        tags: v.optional(v.array(v.string())),
        segment: v.optional(v.string()),
        churnRisk: v.optional(v.string()),
        lastContactAt: v.optional(v.number()),
        nextFollowUpAt: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const { id, ...fields } = args;
        const record = await ctx.db.get(id);
        if (!record) return;

        const user = await findUserByIdentity(ctx, identity);
        if (!user || !user.orgIds.includes(record.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(id, fields);
    }
});

// --- Interview Templates ---

export const getInterviewTemplates = query({
    args: { projectId: v.string() },
    handler: async (ctx: any, args: any) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return [];

        return await ctx.db
            .query("interview_templates")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .collect();
    }
});

export const createInterviewTemplate = mutation({
    args: {
        projectId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        questions: v.array(v.object({
            id: v.string(),
            question: v.string(),
            category: v.optional(v.string()),
            order: v.number(),
        })),
        targetSegment: v.optional(v.string()),
        isDefault: v.optional(v.boolean()),
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        const user = await findUserByIdentity(ctx, identity);

        return await ctx.db.insert("interview_templates", {
            projectId: project._id,
            orgId: project.orgId,
            name: args.name,
            description: args.description,
            questions: args.questions,
            targetSegment: args.targetSegment,
            isDefault: args.isDefault,
            createdAt: Date.now(),
            createdBy: identity.subject,
        });
    }
});

export const updateInterviewTemplate = mutation({
    args: {
        id: v.id("interview_templates"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        questions: v.optional(v.array(v.object({
            id: v.string(),
            question: v.string(),
            category: v.optional(v.string()),
            order: v.number(),
        }))),
        targetSegment: v.optional(v.string()),
        isDefault: v.optional(v.boolean()),
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const { id, ...fields } = args;
        const template = await ctx.db.get(id);
        if (!template) return;

        const user = await findUserByIdentity(ctx, identity);
        if (!user || !user.orgIds.includes(template.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(id, fields);
    }
});

export const deleteInterviewTemplate = mutation({
    args: { id: v.id("interview_templates") },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const template = await ctx.db.get(args.id);
        if (!template) return;

        const user = await findUserByIdentity(ctx, identity);
        if (!user || !user.orgIds.includes(template.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.id);
    }
});

// --- Interview Schedules ---

export const getInterviewSchedules = query({
    args: { projectId: v.string() },
    handler: async (ctx: any, args: any) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return [];

        return await ctx.db
            .query("interview_schedules")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .order("asc")
            .collect();
    }
});

export const getUpcomingSchedules = query({
    args: { projectId: v.string() },
    handler: async (ctx: any, args: any) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return [];

        const now = Date.now();
        const schedules = await ctx.db
            .query("interview_schedules")
            .withIndex("by_scheduled", (q: any) => q.eq("projectId", project._id))
            .collect();

        return schedules.filter((s: any) => s.scheduledAt > now && s.status === 'scheduled');
    }
});

export const createInterviewSchedule = mutation({
    args: {
        projectId: v.string(),
        interviewId: v.optional(v.id("interviews")),
        title: v.string(),
        description: v.optional(v.string()),
        scheduledAt: v.number(),
        duration: v.optional(v.number()),
        location: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        return await ctx.db.insert("interview_schedules", {
            projectId: project._id,
            orgId: project.orgId,
            interviewId: args.interviewId,
            title: args.title,
            description: args.description,
            scheduledAt: args.scheduledAt,
            duration: args.duration,
            status: 'scheduled',
            location: args.location,
            notes: args.notes,
            reminderSent: false,
            createdAt: Date.now(),
            createdBy: identity.subject,
        });
    }
});

export const updateInterviewSchedule = mutation({
    args: {
        id: v.id("interview_schedules"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        scheduledAt: v.optional(v.number()),
        duration: v.optional(v.number()),
        status: v.optional(v.string()),
        location: v.optional(v.string()),
        notes: v.optional(v.string()),
        reminderSent: v.optional(v.boolean()),
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const { id, ...fields } = args;
        const schedule = await ctx.db.get(id);
        if (!schedule) return;

        const user = await findUserByIdentity(ctx, identity);
        if (!user || !user.orgIds.includes(schedule.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(id, fields);
    }
});

export const deleteInterviewSchedule = mutation({
    args: { id: v.id("interview_schedules") },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const schedule = await ctx.db.get(args.id);
        if (!schedule) return;

        const user = await findUserByIdentity(ctx, identity);
        if (!user || !user.orgIds.includes(schedule.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.id);
    }
});

// --- Email Templates ---

export const getEmailTemplates = query({
    args: { projectId: v.string() },
    handler: async (ctx: any, args: any) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return [];

        return await ctx.db
            .query("email_templates")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .collect();
    }
});

export const createEmailTemplate = mutation({
    args: {
        projectId: v.string(),
        name: v.string(),
        subject: v.string(),
        body: v.string(),
        type: v.string(),
        variables: v.optional(v.array(v.string())),
        isDefault: v.optional(v.boolean()),
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        return await ctx.db.insert("email_templates", {
            projectId: project._id,
            orgId: project.orgId,
            name: args.name,
            subject: args.subject,
            body: args.body,
            type: args.type,
            variables: args.variables,
            isDefault: args.isDefault,
            createdAt: Date.now(),
            createdBy: identity.subject,
        });
    }
});

export const updateEmailTemplate = mutation({
    args: {
        id: v.id("email_templates"),
        name: v.optional(v.string()),
        subject: v.optional(v.string()),
        body: v.optional(v.string()),
        type: v.optional(v.string()),
        variables: v.optional(v.array(v.string())),
        isDefault: v.optional(v.boolean()),
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const { id, ...fields } = args;
        const template = await ctx.db.get(id);
        if (!template) return;

        const user = await findUserByIdentity(ctx, identity);
        if (!user || !user.orgIds.includes(template.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(id, fields);
    }
});

export const deleteEmailTemplate = mutation({
    args: { id: v.id("email_templates") },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const template = await ctx.db.get(args.id);
        if (!template) return;

        const user = await findUserByIdentity(ctx, identity);
        if (!user || !user.orgIds.includes(template.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.id);
    }
});

// --- Email Outreach ---

export const getEmailOutreach = query({
    args: { projectId: v.string() },
    handler: async (ctx: any, args: any) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) return [];

        return await ctx.db
            .query("email_outreach")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .order("desc")
            .collect();
    }
});

export const createEmailOutreach = mutation({
    args: {
        projectId: v.string(),
        interviewId: v.optional(v.id("interviews")),
        templateId: v.optional(v.id("email_templates")),
        recipientEmail: v.string(),
        recipientName: v.optional(v.string()),
        subject: v.string(),
        body: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) throw new Error("Project not found");

        return await ctx.db.insert("email_outreach", {
            projectId: project._id,
            orgId: project.orgId,
            interviewId: args.interviewId,
            templateId: args.templateId,
            recipientEmail: args.recipientEmail,
            recipientName: args.recipientName,
            subject: args.subject,
            body: args.body,
            status: 'draft',
            createdAt: Date.now(),
            createdBy: identity.subject,
        });
    }
});

export const updateEmailOutreach = mutation({
    args: {
        id: v.id("email_outreach"),
        status: v.optional(v.string()),
        sentAt: v.optional(v.number()),
        openedAt: v.optional(v.number()),
        repliedAt: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const { id, ...fields } = args;
        const email = await ctx.db.get(id);
        if (!email) return;

        const user = await findUserByIdentity(ctx, identity);
        if (!user || !user.orgIds.includes(email.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(id, fields);
    }
});

export const deleteEmailOutreach = mutation({
    args: { id: v.id("email_outreach") },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const email = await ctx.db.get(args.id);
        if (!email) return;

        const user = await findUserByIdentity(ctx, identity);
        if (!user || !user.orgIds.includes(email.orgId)) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.id);
    }
});


