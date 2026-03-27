import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const forceCreateProject = internalMutation({
    args: {},
    handler: async (ctx) => {
        // Target User: Christian Kaman
        const targetToken = "user_01KCJNXE0XKBEN19W59W9HTM0M";

        // Check if already exists to avoid duplicates
        const existing = await ctx.db.query("projects")
            .withIndex("by_creator", q => q.eq("userId", targetToken))
            .filter(q => q.eq(q.field("name"), "PORTFOLIO"))
            .first();

        if (existing) return "Project 'PORTFOLIO' already exists for this user.";

        // Create Project
        const projectId = await ctx.db.insert("projects", {
            orgId: "personal", // Fallback org
            userId: targetToken,
            name: "PORTFOLIO",
            hypothesis: "Manual Fix Entry",
            updatedAt: Date.now(),
            status: "Active",
            foundingDate: Date.now()
        });

        // Create Canvas
        const canvasId = await ctx.db.insert("canvases", {
            projectId,
            orgId: "personal",
            name: "Main",
            updatedAt: Date.now()
        });
        await ctx.db.patch(projectId, { currentCanvasId: canvasId });

        // Add Member
        await ctx.db.insert("team_members", {
            projectId,
            orgId: "personal",
            name: "Christian Kaman",
            email: "", // Don't have email handy, empty is fine or unique
            role: "Founder",
            joinedAt: Date.now(),
            acceptedRole: true,
            status: "Active"
        });

        return `Created 'PORTFOLIO' project (ID: ${projectId}) for user ${targetToken}`;
    }
});
