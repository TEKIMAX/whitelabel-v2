import { internalQuery } from "./_generated/server";

export const inspect = internalQuery({
    args: {},
    handler: async (ctx) => {
        const projects = await ctx.db.query("projects").collect();
        const users = await ctx.db.query("users").collect();
        return {
            projectCount: projects.length,
            userCount: users.length,
            projects: projects.map(p => ({ id: p._id, name: p.name, orgId: p.orgId })),
            users: users.map(u => ({ id: u._id, name: u.name, email: u.email, invitationCount: u.invitations?.length || 0 }))
        };
    },
});
