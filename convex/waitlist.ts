import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const joinWaitlist = mutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        // Check if email already exists
        const existing = await ctx.db
            .query("waitlist")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existing) {
            // Already on the list, just return success
            return { success: true, message: "You are already on the waitlist!" };
        }

        await ctx.db.insert("waitlist", {
            email: args.email,
            createdAt: Date.now(),
        });

        return { success: true, message: "Successfully joined the waitlist!" };
    },
});
