"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { WorkOS } from "@workos-inc/node";

export const fetchAndProcessEvents = internalAction({
    args: {},
    handler: async (ctx) => {
        try {
            if (!process.env.WORKOS_API_KEY) {
                return;
            }

            const workos = new WorkOS(process.env.WORKOS_API_KEY!);

            const cursor = await ctx.runQuery(internal.workos_db.getCursor);

            // Fetch events
            const response = await workos.events.listEvents({
                events: [
                    'user.created',
                    'user.updated',
                    'organization_membership.created',
                    'organization_membership.updated',
                    'organization_membership.deleted',
                ],
                after: cursor || undefined,
                limit: 100,
            });

            if (response.data.length > 0) {
            }

            // Always process batch and save cursor (even if no events, to clear stale cursor)
            const nextCursor = response.listMetadata.after;
            await ctx.runMutation(internal.workos_db.processBatch, {
                events: response.data || [],
                nextCursor: nextCursor || undefined,
            });

            // If there are more pages, schedule immediately
            if (nextCursor) {
                await ctx.scheduler.runAfter(0, internal.workos_events.fetchAndProcessEvents, {});
            }
        } catch (e) {
        }
    },
});
