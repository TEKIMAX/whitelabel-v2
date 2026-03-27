import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const PRESENCE_TTL = 10000; // 10 seconds

/**
 * Updates the presence for the current user in a specific room.
 * This acts as a "heartbeat".
 */
export const track = mutation({
    args: {
        room: v.string(),
        user: v.string(),
        data: v.any(),
    },
    handler: async (ctx, args) => {
        const { room, user, data } = args;
        const now = Date.now();

        // 1. Check if user already has a presence entry in this room
        const existing = await ctx.db
            .query("presence")
            .withIndex("by_room_user", (q) => q.eq("room", room).eq("user", user))
            .unique();

        if (existing) {
            // 2. Update existing
            await ctx.db.patch(existing._id, {
                updated: now,
                data,
            });
        } else {
            // 3. Create new
            await ctx.db.insert("presence", {
                room,
                user,
                updated: now,
                data,
            });
        }

        // Optional: Clean up old entries (probabilistic or chron)
        // For now, we rely on the list query to just filter them out.
    },
});

/**
 * Lists all active users in a room.
 * "Active" means they have sent a heartbeat recently.
 */
export const list = query({
    args: {
        room: v.string(),
    },
    handler: async (ctx, args) => {
        const { room } = args;
        const now = Date.now();
        const threshold = now - PRESENCE_TTL;

        // Fetch all users in the room who kept updated recently
        // We use the index to filter by room and range scan update time
        const activePresence = await ctx.db
            .query("presence")
            .withIndex("by_room_updated", (q) =>
                q.eq("room", room).gt("updated", threshold)
            )
            .collect();

        return activePresence;
    },
});
