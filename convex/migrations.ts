import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const migrateTags = mutation({
    args: {},
    handler: async (ctx) => {
        const folders = await ctx.db.query("folders").collect();
        const files = await ctx.db.query("files").collect();

        for (const folder of folders) {
            if (folder.tags && folder.tags.length > 0) {
                // Check if the first tag is a string (simple check)
                if (typeof folder.tags[0] === 'string') {
                    const newTags = (folder.tags as any[]).map((tag: string) => ({
                        name: tag,
                        color: '#6B7280' // Default gray
                    }));
                    await ctx.db.patch(folder._id, { tags: newTags });
                }
            }
        }

        for (const file of files) {
            if (file.tags && file.tags.length > 0) {
                if (typeof file.tags[0] === 'string') {
                    const newTags = (file.tags as any[]).map((tag: string) => ({
                        name: tag,
                        color: '#6B7280' // Default gray
                    }));
                    await ctx.db.patch(file._id, { tags: newTags });
                }
            }
        }

        return "Migration complete";
    },
});
