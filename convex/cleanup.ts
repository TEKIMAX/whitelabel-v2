import { internalMutation } from "./_generated/server";

// CRITICAL: This function is referenced by a Cron Job. Do not remove.
export const purgeOldDeletedProjects = internalMutation({
    args: {},
    handler: async () => {
        // Placeholder implementation to satisfy build/cron requirements.
    }
});

export const clearBadAccount = internalMutation({
    args: {},
    handler: async (ctx) => {
        const projects = await ctx.db.query("projects").collect();
        let cleared = 0;
        // The NEW bad account from logs: acct_1SptZjE3zemG75hd
        const badId = 'acct_1SptZjE3zemG75hd';

        for (const p of projects) {
            if (p.stripeAccountId === badId) {
                await ctx.db.patch(p._id, {
                    stripeAccountId: undefined,
                    stripeConnectedAt: undefined,
                    stripeData: undefined
                });
                cleared++;
            }
        }
        return `Cleared ${cleared} projects with ID ${badId}`;
    }
});
