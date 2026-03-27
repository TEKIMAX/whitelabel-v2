
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectSafe, requireAuth, verifyProjectAccess } from "./auth";

/*
export const updateSettings = mutation({
    args: {
        projectId: v.string(),
        valuationCap: v.number(),
        amountRaising: v.number(),
        discountRate: v.number(),
        postMoney: v.boolean(),
        companyAddress: v.string(),
        stateOfIncorporation: v.string(),
        repName: v.string(),
        investorName: v.string()
    },
    handler: async (ctx: any, args: any) => {
        // ... (refactor if uncommented)
    }
});
*/

// Equity Logic
export const addTeamMember = mutation({
    args: { projectId: v.string(), name: v.string(), email: v.string(), role: v.string() },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const project = await getProjectSafe(ctx, args.projectId);

        if (!project) throw new Error("Project not found");

        // Check if member already exists to prevent duplicates? 
        // For now, just insert.

        const id = await ctx.db.insert("team_members", {
            projectId: project._id,
            orgId: project.orgId,
            name: args.name,
            email: args.email,
            role: args.role,
            joinedAt: Date.now()
        });

        return id;
    }
});

export const deleteTeamMember = mutation({
    args: { id: v.id("team_members") },
    handler: async (ctx: any, args: any) => {
        const identity = await requireAuth(ctx);
        const member = await ctx.db.get(args.id);
        if (!member) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || !user.orgIds.includes(member.orgId)) {
            throw new Error("Unauthorized");
        }
        await ctx.db.delete(args.id);
    }
});

// Deprecated: equity_contributions are now stored in projects table JSON
// Keeping for backward compatibility or migration if needed
/*
export const addContribution = mutation({
    args: {
        projectId: v.string(),
        memberId: v.id("team_members"),
        type: v.string(),
        value: v.number(),
        multiplier: v.number(),
        description: v.string()
    },
    handler: async (ctx: any, args: any) => {
        // ... implementation
    }
});
*/
