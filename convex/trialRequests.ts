// @ts-nocheck — Schema too large for TS type inference (62 tables). Convex validates at runtime.
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const submitRequest = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        organizationType: v.string(),
        organizationName: v.string(),
        employeeCount: v.string(),
        phoneNumber: v.string(),
        details: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("trial_requests", {
            name: args.name,
            email: args.email,
            organizationType: args.organizationType,
            organizationName: args.organizationName,
            employeeCount: args.employeeCount,
            phoneNumber: args.phoneNumber,
            details: args.details,
            status: 'pending',
            createdAt: Date.now(),
        });

        return { success: true };
    },
});

export const updateStatus = mutation({
    args: {
        id: v.id("trial_requests"),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: args.status });
        return { success: true };
    },
});
