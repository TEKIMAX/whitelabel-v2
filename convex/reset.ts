import { internalMutation } from "./_generated/server";

export const purgeAll = internalMutation({
    args: {},
    handler: async (ctx) => {
        const tables = [
            "projects",
            "canvases",
            "canvas_versions",
            "goals",
            "key_results",
            "market_data",
            "competitor_config",
            "competitors",
            "interviews",
            "features",
            "revenue_streams",
            "costs",
            "revenue_versions",
            "deck_slides",
            "deck_versions",
            "documents",
            "data_sources",
            "team_members",
            "equity_contributions",
            "safe_settings",
            "video_interviews",
            "users",
            "organizations",
            "architecture_nodes",
            "folders",
            "files",
            "legal_documents",
            "roles",
            "usage",
            "ideation_workspaces",
            "waitlist",
            "presence",
            "posts",
            "pages",
            "viewCounts",
            "siteConfig",
            "pageViews",
            "activeSessions",
            "blog_categories",
            "business_plans",
            "business_plan_versions",
            "story_progress",
            "chats",
            "messages",
            "webhooks",
            "divisions",
            "initiatives",
            "initiative_comments"
        ];

        for (const table of tables) {
            const documents = await ctx.db.query(table as any).collect();
            for (const doc of documents) {
                await ctx.db.delete(doc._id);
            }
        }


    },
});
